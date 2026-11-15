using System;
using System.Collections.Concurrent;
using System.IO;
using System.Linq;
using System.Threading;
using MediaBrowser.Common.Configuration;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>Verifies that <see cref="StableSecretProtection"/> builds one launch independent key ring per plugin that keeps encrypted secrets readable.</summary>
public sealed class StableSecretProtectionTests : IDisposable
{
    private readonly string _dir = Path.Combine(Path.GetTempPath(), "base-stable-" + Guid.NewGuid().ToString("N"));

    public StableSecretProtectionTests() => Directory.CreateDirectory(_dir);

    public void Dispose()
    {
        if (Directory.Exists(_dir))
        {
            Directory.Delete(_dir, true);
        }
    }

    private IApplicationPaths Paths()
    {
        var paths = Substitute.For<IApplicationPaths>();
        paths.PluginConfigurationsPath.Returns(_dir);
        return paths;
    }

    /// <summary>
    /// A protector encrypts, round trips a secret, and keeps its keys in the plugin's key folder.
    /// True: secrets are encrypted at rest and survive a restart.
    /// False: the secret would be stored in plaintext or the keys kept elsewhere.
    /// </summary>
    [Fact]
    public void CreateProtector_EncryptsAndRoundTrips()
    {
        var protector = StableSecretProtection.CreateProtector(Paths(), "Test.Plugin.RoundTrip", NullLogger.Instance);

        Assert.True(protector.IsAvailable);
        var stored = protector.Protect("hunter2");
        Assert.True(SecretProtector.IsProtected(stored));
        Assert.Equal("hunter2", protector.Unprotect(stored));
        Assert.True(Directory.Exists(Path.Combine(_dir, "Test.Plugin.RoundTrip.Keys")));
    }

    /// <summary>
    /// Two protectors built under one name read each other's secrets.
    /// True: the plugin class and the DI container each build a protector and a secret one writes the other can read.
    /// False: each would use its own key.
    /// </summary>
    [Fact]
    public void CreateProtector_SameNameSharesKeys()
    {
        var first = StableSecretProtection.CreateProtector(Paths(), "Test.Plugin.Shared", NullLogger.Instance);
        var second = StableSecretProtection.CreateProtector(Paths(), "Test.Plugin.Shared", NullLogger.Instance);

        Assert.Equal("token", second.Unprotect(first.Protect("token")));
    }

    /// <summary>
    /// Protectors built under different names cannot read each other's secrets.
    /// True: one plugin cannot decrypt another's secrets.
    /// False: plugins would share one key.
    /// </summary>
    [Fact]
    public void CreateProtector_DifferentNamesAreIsolated()
    {
        var first = StableSecretProtection.CreateProtector(Paths(), "Test.Plugin.One", NullLogger.Instance);
        var second = StableSecretProtection.CreateProtector(Paths(), "Test.Plugin.Two", NullLogger.Instance);

        Assert.Equal(string.Empty, second.Unprotect(first.Protect("token")));
    }

    /// <summary>
    /// Without application paths the protector stores plaintext.
    /// True: a plugin still loads when the host gives no paths.
    /// False: the protector would throw.
    /// </summary>
    [Fact]
    public void CreateProtector_WithoutPathsDegradesToPlaintext()
    {
        var protector = StableSecretProtection.CreateProtector(null, "Test.Plugin.None", NullLogger.Instance);

        Assert.False(protector.IsAvailable);
        Assert.Equal("plain", protector.Protect("plain"));
    }

    /// <summary>
    /// The key folder sits in the plugin configurations folder and is named after the plugin.
    /// True: keys persist with the configuration they protect.
    /// False: the keys would move with the launch method.
    /// </summary>
    [Fact]
    public void KeyDirectory_IsUnderThePluginConfigurationsFolder()
    {
        Assert.Equal(Path.Join(_dir, "Test.Plugin.Keys"), StableSecretProtection.KeyDirectory(Paths(), "Test.Plugin"));
        Assert.Throws<ArgumentException>(() => StableSecretProtection.KeyDirectory(Paths(), string.Empty));
    }

    /// <summary>
    /// Callers racing on the first build of a key folder all get the one provider.
    /// True: the plugin class and DI share one key ring.
    /// False: a second container would be built and leaked.
    /// </summary>
    [Fact]
    public void Build_ConcurrentCallersShareOneProvider()
    {
        var keys = Path.Combine(_dir, "Race.Keys");
        using var start = new ManualResetEventSlim();
        var results = new ConcurrentBag<object?>();
        var threads = Enumerable.Range(0, 16).Select(_ => new Thread(() =>
        {
            start.Wait();
            results.Add(StableSecretProtection.Build(keys, "Test.Plugin.Race", NullLogger.Instance));
        })).ToList();
        threads.ForEach(t => t.Start());
        start.Set();
        threads.ForEach(t => t.Join());

        var first = results.First();
        Assert.NotNull(first);
        Assert.All(results, r => Assert.Same(first, r));
    }

    /// <summary>
    /// A key ring already on disk keeps decrypting what was stored with it, after the provider is rebuilt.
    /// True: existing encrypted secrets survive an upgrade.
    /// False: every stored secret would read back empty.
    /// </summary>
    [Fact]
    public void Build_ExistingKeyRingStillDecrypts()
    {
        var paths = Paths();
        var stored = StableSecretProtection.CreateProtector(paths, "Test.Plugin.Existing", NullLogger.Instance).Protect("hunter2");

        var services = new ServiceCollection();
        services.AddDataProtection()
            .PersistKeysToFileSystem(new DirectoryInfo(StableSecretProtection.KeyDirectory(paths, "Test.Plugin.Existing")))
            .SetApplicationName("Test.Plugin.Existing");
        using var container = services.BuildServiceProvider();
        var provider = container.GetRequiredService<IDataProtectionProvider>();

        Assert.Equal("hunter2", new SecretProtector("Test.Plugin.Existing.Secrets.v1", NullLogger.Instance, provider).Unprotect(stored));
    }

    /// <summary>
    /// A key folder that cannot be created gives no provider.
    /// True: the caller falls back to plaintext instead of failing.
    /// False: a bad path would throw out of plugin startup.
    /// </summary>
    [Fact]
    public void Build_UncreatableKeyFolderGivesNull()
    {
        var blocker = Path.Combine(_dir, "blocker");
        File.WriteAllText(blocker, "a file where a folder is needed");

        var provider = StableSecretProtection.Build(Path.Combine(blocker, "keys"), "Test.Plugin.Blocked", NullLogger.Instance);

        Assert.Null(provider);
    }
}
