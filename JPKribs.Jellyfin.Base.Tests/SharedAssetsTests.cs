using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>Verifies that <see cref="SharedAssets"/> finds the embedded shared asset whatever namespace the targets file put it under.</summary>
public class SharedAssetsTests
{
    /// <summary>
    /// The plugin class's own namespace wins when the asset is embedded there, and a namespace that matches nothing falls back to the one resource with that suffix.
    /// True: plugins whose namespace is the root namespace resolve exactly, and others still find their asset.
    /// False: a lookup could pick another resource or return nothing.
    /// </summary>
    [Fact]
    public void ResolveResourceName_PrefersThePluginNamespace()
    {
        var assembly = typeof(SharedAssetsTests).Assembly;

        Assert.Equal("Other.Root.Namespace.Configuration.jpkribs_shared.css", SharedAssets.ResolveResourceName(assembly, "Other.Root.Namespace", "jpkribs_shared.css"));
        Assert.Equal("Other.Root.Namespace.Configuration.jpkribs_shared.css", SharedAssets.ResolveResourceName(assembly, "Unrelated", "jpkribs_shared.css"));
    }

    /// <summary>
    /// An asset that is not embedded keeps the name built from the plugin's namespace.
    /// True: the failure points at the name a plugin was expected to embed.
    /// False: the name would be empty or another resource.
    /// </summary>
    [Fact]
    public void ResolveResourceName_NothingFoundKeepsTheNamespaceName()
    {
        var assembly = typeof(SharedAssetsTests).Assembly;

        Assert.Equal("Unrelated.Configuration.missing.css", SharedAssets.ResolveResourceName(assembly, "Unrelated", "missing.css"));
    }
}
