using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;
using NSubstitute;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>Verifies that <see cref="PluginBase{TPlugin, TConfiguration}"/> guards the configuration with one lock and registers the shared asset pages.</summary>
public sealed class PluginBaseTests : IDisposable
{
    private readonly string _dir = Path.Combine(Path.GetTempPath(), "jpk-plugin-" + Guid.NewGuid().ToString("N"));

    public PluginBaseTests() => Directory.CreateDirectory(_dir);

    public sealed class TestConfiguration : BasePluginConfiguration
    {
        public string Value { get; set; } = string.Empty;
    }

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

    private static IXmlSerializer Xml()
    {
        var xml = Substitute.For<IXmlSerializer>();
        xml.DeserializeFromFile(Arg.Any<Type>(), Arg.Any<string>()).Returns(new TestConfiguration { Value = "old" });
        return xml;
    }

    private TestPlugin NewPlugin(IXmlSerializer? xml = null) => new(Paths(), xml ?? Xml());

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

        public IEnumerable<PluginPageInfo> Shared(string prefix) => GetSharedPages(prefix);

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

    /// <summary>
    /// A save runs the hook with the incoming and stored configurations before the incoming one replaces the stored one.
    /// True: a plugin can normalize or protect values on the way in.
    /// False: the stored configuration would be replaced before the hook could change it.
    /// </summary>
    [Fact]
    public void UpdateConfiguration_RunsHookBeforeReplacing()
    {
        var plugin = NewPlugin();
        Assert.Equal("old", plugin.Configuration.Value);

        plugin.UpdateConfiguration(new TestConfiguration { Value = "  new  " });

        Assert.Equal(("  new  ", "old"), Assert.Single(plugin.Calls));
        Assert.Equal("new", plugin.Configuration.Value);
    }

    /// <summary>
    /// A hook that throws rejects the save and keeps the stored configuration.
    /// True: invalid input never replaces a good configuration.
    /// False: a rejected save would still change what is stored.
    /// </summary>
    [Fact]
    public void UpdateConfiguration_HookThrowKeepsStored()
    {
        var plugin = NewPlugin();
        _ = plugin.Configuration;

        Assert.Throws<ArgumentException>(() => plugin.UpdateConfiguration(new TestConfiguration { Value = "reject" }));

        Assert.Equal("old", plugin.Configuration.Value);
    }

    /// <summary>
    /// A save waits for a mutation that holds the configuration lock.
    /// True: a dashboard save cannot interleave with a plugin's own change.
    /// False: the save would run in the middle of the mutation.
    /// </summary>
    [Fact]
    public async Task UpdateConfiguration_SerializesWithMutateConfiguration()
    {
        var plugin = NewPlugin();
        _ = plugin.Configuration;
        var inMutation = new ManualResetEventSlim();
        var release = new ManualResetEventSlim();
        var saveStarted = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        string? seenAfterRelease = null;

        var mutation = Task.Run(() => plugin.MutateConfiguration(configuration =>
        {
            inMutation.Set();
            release.Wait();
            seenAfterRelease = configuration.Value;
            return false;
        }));
        inMutation.Wait();

        var save = Task.Run(() =>
        {
            saveStarted.SetResult();
            plugin.UpdateConfiguration(new TestConfiguration { Value = "saved" });
        });
        await saveStarted.Task;
        Assert.False(save.IsCompleted);

        release.Set();
        await Task.WhenAll(mutation, save);

        // The mutation still held the lock when it read, so the save had not applied yet.
        Assert.Equal("old", seenAfterRelease);
        Assert.Equal("saved", plugin.Configuration.Value);
    }

    /// <summary>
    /// A mutation saves the configuration only when it returns true.
    /// True: a change that reports no edit costs no write.
    /// False: every mutation would rewrite the configuration file.
    /// </summary>
    [Fact]
    public void MutateConfiguration_SavesOnlyWhenTheMutationReturnsTrue()
    {
        var xml = Xml();
        var plugin = NewPlugin(xml);

        plugin.MutateConfiguration(c =>
        {
            c.Value = "unsaved";
            return false;
        });
        xml.DidNotReceive().SerializeToFile(Arg.Any<object>(), Arg.Any<string>());

        plugin.MutateConfiguration(c =>
        {
            c.Value = "saved";
            return true;
        });
        xml.Received(1).SerializeToFile(Arg.Any<object>(), Arg.Any<string>());
        Assert.Equal("saved", plugin.Configuration.Value);
    }

    /// <summary>
    /// A read returns the projection of the current configuration.
    /// True: a plugin reads a value under the same lock the writers use.
    /// False: the read would return a stale or unrelated value.
    /// </summary>
    [Fact]
    public void ReadConfiguration_ReturnsTheProjection()
    {
        var plugin = NewPlugin();

        Assert.Equal(3, plugin.ReadConfiguration(c => c.Value.Length));
        Assert.Throws<ArgumentNullException>(() => plugin.ReadConfiguration<int>(null!));
    }

    /// <summary>
    /// The instance accessor returns the plugin that was constructed.
    /// True: code outside DI reaches the running plugin.
    /// False: Instance would be null or another plugin.
    /// </summary>
    [Fact]
    public void Instance_IsTheConstructedPlugin()
    {
        var plugin = NewPlugin();

        Assert.Same(plugin, PluginBase<TestPlugin, TestConfiguration>.Instance);
    }

    /// <summary>
    /// The shared asset pages point at the resources the targets file embedded, even when the plugin class's namespace differs from the project's root namespace.
    /// True: Jellyfin serves the shared CSS and JS.
    /// False: the pages would point at resources that do not exist.
    /// </summary>
    [Fact]
    public void GetSharedPages_FindsAssetsEmbeddedUnderAnotherRootNamespace()
    {
        var plugin = NewPlugin();

        var pages = plugin.Shared("x").ToList();

        Assert.Equal(new[] { "x_jpkribs_shared.css", "x_jpkribs_shared.js" }, pages.Select(p => p.Name));
        var assembly = typeof(TestPlugin).Assembly;
        foreach (var page in pages)
        {
            Assert.StartsWith("Other.Root.Namespace.Configuration.", page.EmbeddedResourcePath, StringComparison.Ordinal);
            using var stream = assembly.GetManifestResourceStream(page.EmbeddedResourcePath);
            Assert.NotNull(stream);
        }
    }
}
