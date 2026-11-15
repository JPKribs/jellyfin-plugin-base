using System;
using System.IO;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Model.Activity;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>Verifies that <see cref="ServiceCollectionExtensions"/> registers the activity logger and the secret protector.</summary>
[Collection("ActivityLogger.Current")]
public sealed class ServiceCollectionExtensionsTests : IDisposable
{
    private readonly string _dir = Path.Combine(Path.GetTempPath(), "base-di-" + Guid.NewGuid().ToString("N"));

    public ServiceCollectionExtensionsTests() => Directory.CreateDirectory(_dir);

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
    /// The secret protector registered in DI shares its key ring with a protector built directly under the same name.
    /// True: the plugin class and the container read each other's secrets.
    /// False: a secret written by one would not decrypt in the other.
    /// </summary>
    [Fact]
    public void AddPluginSecretProtector_SharesKeysWithDirectProtector()
    {
        using var provider = new ServiceCollection()
            .AddSingleton(Paths())
            .AddSingleton<ILoggerFactory>(NullLoggerFactory.Instance)
            .AddPluginSecretProtector("Test.Plugin.Di")
            .BuildServiceProvider();

        var fromDi = provider.GetRequiredService<SecretProtector>();
        var direct = StableSecretProtection.CreateProtector(Paths(), "Test.Plugin.Di", NullLogger.Instance);

        Assert.True(fromDi.IsAvailable);
        Assert.Equal("key", direct.Unprotect(fromDi.Protect("key")));
    }

    /// <summary>
    /// The activity logger is a singleton, and once resolved it is also the current logger.
    /// True: code inside and outside DI writes through one logger.
    /// False: each resolve would build a new logger.
    /// </summary>
    [Fact]
    public void AddActivityLogger_RegistersSingletonAndCurrent()
    {
        using var provider = new ServiceCollection()
            .AddSingleton(Substitute.For<IActivityManager>())
            .AddSingleton(typeof(ILogger<>), typeof(NullLogger<>))
            .AddActivityLogger()
            .BuildServiceProvider();

        var logger = provider.GetRequiredService<ActivityLogger>();

        Assert.Same(logger, provider.GetRequiredService<ActivityLogger>());
        Assert.Same(logger, ActivityLogger.Current);
    }

    /// <summary>
    /// A missing service collection, or a missing or empty plugin name, is rejected.
    /// True: a misconfigured registration fails at once.
    /// False: it would fail when the container is first used.
    /// </summary>
    [Fact]
    public void Add_RejectsBadArguments()
    {
        Assert.Throws<ArgumentNullException>(() => ServiceCollectionExtensions.AddActivityLogger(null!));
        Assert.Throws<ArgumentNullException>(() => ServiceCollectionExtensions.AddPluginSecretProtector(null!, "Plugin"));
        Assert.Throws<ArgumentException>(() => new ServiceCollection().AddPluginSecretProtector(string.Empty));
    }
}
