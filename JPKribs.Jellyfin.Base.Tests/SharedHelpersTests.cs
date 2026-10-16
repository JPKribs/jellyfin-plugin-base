using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using JPKribs.Jellyfin.Base;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Controller;
using MediaBrowser.Model.Activity;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;
using MediaBrowser.Model.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>
/// Tests for the helpers promoted from the plugins' own copies: stable secret protection, the DI extensions,
/// the locked configuration save hook, public page responses, task triggers, and the conditional store update.
/// </summary>
// Both classes construct ActivityLogger, which sets the static ActivityLogger.Current, so they run in one collection.
[Collection("ActivityLogger.Current")]
public sealed class SharedHelpersTests : IDisposable
{
    private readonly string _dir = Path.Combine(Path.GetTempPath(), "jpk-shared-" + Guid.NewGuid().ToString("N"));

    public SharedHelpersTests() => Directory.CreateDirectory(_dir);

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

    // MARK: StableSecretProtection

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

    [Fact]
    public void CreateProtector_SameNameSharesKeys()
    {
        // The plugin class and the DI container each build a protector; a secret one writes the other must read.
        var first = StableSecretProtection.CreateProtector(Paths(), "Test.Plugin.Shared", NullLogger.Instance);
        var second = StableSecretProtection.CreateProtector(Paths(), "Test.Plugin.Shared", NullLogger.Instance);

        Assert.Equal("token", second.Unprotect(first.Protect("token")));
    }

    [Fact]
    public void CreateProtector_DifferentNamesAreIsolated()
    {
        var first = StableSecretProtection.CreateProtector(Paths(), "Test.Plugin.One", NullLogger.Instance);
        var second = StableSecretProtection.CreateProtector(Paths(), "Test.Plugin.Two", NullLogger.Instance);

        Assert.Equal(string.Empty, second.Unprotect(first.Protect("token")));
    }

    [Fact]
    public void CreateProtector_WithoutPathsDegradesToPlaintext()
    {
        var protector = StableSecretProtection.CreateProtector(null, "Test.Plugin.None", NullLogger.Instance);

        Assert.False(protector.IsAvailable);
        Assert.Equal("plain", protector.Protect("plain"));
    }

    // MARK: ServiceCollectionExtensions

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

    // MARK: PluginBase.OnConfigurationSaving

    public sealed class TestConfiguration : BasePluginConfiguration
    {
        public string Value { get; set; } = string.Empty;
    }

    private sealed class TestPlugin : PluginBase<TestPlugin, TestConfiguration>
    {
        public TestPlugin(IApplicationPaths paths, IXmlSerializer xml)
            : base(paths, xml)
        {
        }

        public override Guid Id => Guid.Parse("6b1d7c4e-0a1f-4f7e-9b55-1f1e5d0c2a11");

        public override string Name => "Test";

        public List<(string Incoming, string Stored)> Calls { get; } = new();

        public override IEnumerable<PluginPageInfo> GetPages() => Array.Empty<PluginPageInfo>();

        protected override void OnConfigurationSaving(TestConfiguration incoming, TestConfiguration stored)
        {
            Calls.Add((incoming.Value, stored.Value));
            if (incoming.Value == "reject")
            {
                throw new ArgumentException("rejected");
            }

            incoming.Value = incoming.Value.Trim();
        }
    }

    private TestPlugin NewPlugin()
    {
        var xml = Substitute.For<IXmlSerializer>();
        xml.DeserializeFromFile(Arg.Any<Type>(), Arg.Any<string>()).Returns(new TestConfiguration { Value = "old" });
        return new TestPlugin(Paths(), xml);
    }

    [Fact]
    public void UpdateConfiguration_RunsHookBeforeReplacing()
    {
        var plugin = NewPlugin();
        Assert.Equal("old", plugin.Configuration.Value);

        plugin.UpdateConfiguration(new TestConfiguration { Value = "  new  " });

        Assert.Equal(("  new  ", "old"), Assert.Single(plugin.Calls));
        Assert.Equal("new", plugin.Configuration.Value);
    }

    [Fact]
    public void UpdateConfiguration_HookThrowKeepsStored()
    {
        var plugin = NewPlugin();
        _ = plugin.Configuration;

        Assert.Throws<ArgumentException>(() => plugin.UpdateConfiguration(new TestConfiguration { Value = "reject" }));
        Assert.Equal("old", plugin.Configuration.Value);
    }

    [Fact]
    public async Task UpdateConfiguration_SerializesWithMutateConfiguration()
    {
        var plugin = NewPlugin();
        _ = plugin.Configuration;
        var inMutation = new ManualResetEventSlim();
        var release = new ManualResetEventSlim();

        var mutation = Task.Run(() => plugin.MutateConfiguration(_ =>
        {
            inMutation.Set();
            release.Wait();
            return false;
        }));
        inMutation.Wait();

        var save = Task.Run(() => plugin.UpdateConfiguration(new TestConfiguration { Value = "saved" }));
        await Task.Delay(100);
        Assert.False(save.IsCompleted); // blocked on the lock the mutation holds

        release.Set();
        await Task.WhenAll(mutation, save);
        Assert.Equal("saved", plugin.Configuration.Value);
    }

    // MARK: StatusPage content

    [Fact]
    public void StatusPage_RendersRawContent()
    {
        var html = StatusPage.Render("Heading", "Message", content: "<form id=\"f\"></form>");
        Assert.Contains("<form id=\"f\"></form>", html, StringComparison.Ordinal);
    }

    // MARK: PublicPage

    [Fact]
    public void ApplyHardeningHeaders_SetsHeaders()
    {
        var context = new DefaultHttpContext();
        PublicPage.ApplyHardeningHeaders(context.Response);

        Assert.Equal("no-referrer", context.Response.Headers["Referrer-Policy"]);
        Assert.Equal("no-store", context.Response.Headers["Cache-Control"]);
        Assert.Equal("noindex, nofollow", context.Response.Headers["X-Robots-Tag"]);
    }

    [Fact]
    public void Favicon_ServesFileWithCacheHeader()
    {
        File.WriteAllBytes(Path.Combine(_dir, "favicon.ico"), new byte[] { 7, 8 });
        var paths = Substitute.For<IServerApplicationPaths>();
        paths.WebPath.Returns(_dir);
        var context = new DefaultHttpContext();

        var result = Assert.IsType<FileContentResult>(PublicPage.Favicon(paths, context.Response));

        Assert.Equal(new byte[] { 7, 8 }, result.FileContents);
        Assert.Equal("public, max-age=86400", context.Response.Headers["Cache-Control"]);
    }

    [Fact]
    public void Favicon_MissingIsNotFound()
    {
        var paths = Substitute.For<IServerApplicationPaths>();
        paths.WebPath.Returns(Path.Combine(_dir, "missing"));

        Assert.IsType<NotFoundResult>(PublicPage.Favicon(paths, new DefaultHttpContext().Response));
    }

    // MARK: PluginScheduledTask triggers

    private sealed class TriggerTask : PluginScheduledTask
    {
        public override string Name => "Trigger";

        public override string Key => "Trigger";

        public override string Description => "Trigger";

        public override Task ExecuteAsync(IProgress<double> progress, CancellationToken cancellationToken) => Task.CompletedTask;

        public override IEnumerable<TaskTriggerInfo> GetDefaultTriggers()
        {
            yield return OnStartup();
            yield return Daily(TimeSpan.FromHours(3));
        }
    }

    [Fact]
    public void Triggers_BuildStartupAndDaily()
    {
        var triggers = new TriggerTask().GetDefaultTriggers().ToArray();

        Assert.Equal(TaskTriggerInfoType.StartupTrigger, triggers[0].Type);
        Assert.Equal(TaskTriggerInfoType.DailyTrigger, triggers[1].Type);
        Assert.Equal(TimeSpan.FromHours(3).Ticks, triggers[1].TimeOfDayTicks);
    }

    // MARK: JsonFileStore.UpdateIf

    public sealed class Counter
    {
        public int Count { get; set; }
    }

    [Fact]
    public void UpdateIf_SavesOnlyWhenMutationReportsChange()
    {
        var path = Path.Combine(_dir, "counter.json");
        var store = new JsonFileStore<Counter>(path, NullLogger.Instance);

        Assert.False(store.UpdateIf(c => false));
        Assert.False(File.Exists(path));

        Assert.True(store.UpdateIf(c =>
        {
            c.Count++;
            return true;
        }));
        Assert.Equal(1, store.Load().Count);
    }

    [Fact]
    public void Load_CorruptFileStartsFreshWithLogger()
    {
        var path = Path.Combine(_dir, "corrupt.json");
        File.WriteAllText(path, "{ not json");

        Assert.Equal(0, new JsonFileStore<Counter>(path, NullLogger.Instance).Load().Count);
    }
}
