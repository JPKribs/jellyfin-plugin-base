using System;
using System.Reflection;

namespace JPKribs.Jellyfin.Base;

/// <summary>Finds the shared assets the targets file embeds into the plugin assembly.</summary>
internal static class SharedAssets
{
    /// <summary>
    /// Finds the embedded resource name of a shared asset.
    /// The targets file names it <c>$(RootNamespace).Configuration.&lt;file&gt;</c>.
    /// </summary>
    /// <remarks>The plugin class's namespace is tried first, since it usually is the root namespace. Otherwise the one resource with that suffix is used.</remarks>
    /// <param name="assembly">The plugin assembly.</param>
    /// <param name="pluginNamespace">The plugin class's namespace.</param>
    /// <param name="fileName">The asset file name, such as <c>jpkribs_shared.css</c>.</param>
    /// <returns>The resource name, or the namespace-based name when no resource matches.</returns>
    internal static string ResolveResourceName(Assembly assembly, string? pluginNamespace, string fileName)
    {
        var expected = pluginNamespace + ".Configuration." + fileName;
        var names = assembly.GetManifestResourceNames();
        if (Array.IndexOf(names, expected) >= 0)
        {
            return expected;
        }

        var suffix = ".Configuration." + fileName;
        var matches = Array.FindAll(names, n => n.EndsWith(suffix, StringComparison.Ordinal));
        return matches.Length == 1 ? matches[0] : expected;
    }
}
