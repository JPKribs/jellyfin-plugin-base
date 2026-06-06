using System;
using System.Collections.Generic;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// Base class for JPKribs Jellyfin plugins. Provides the singleton accessor, a lock-guarded
/// configuration read/mutate pair, and registration of the shared CSS/JS assets that this package
/// injects into the consuming plugin's assembly.
/// </summary>
/// <typeparam name="TPlugin">The concrete plugin type.</typeparam>
/// <typeparam name="TConfiguration">The plugin configuration type.</typeparam>
public abstract class PluginBase<TPlugin, TConfiguration> : BasePlugin<TConfiguration>, IHasWebPages
    where TPlugin : PluginBase<TPlugin, TConfiguration>
    where TConfiguration : BasePluginConfiguration, new()
{
    private readonly object _configLock = new();

    /// <summary>
    /// Initializes a new instance of the <see cref="PluginBase{TPlugin, TConfiguration}"/> class.
    /// </summary>
    /// <param name="applicationPaths">The application paths.</param>
    /// <param name="xmlSerializer">The XML serializer.</param>
    protected PluginBase(IApplicationPaths applicationPaths, IXmlSerializer xmlSerializer)
        : base(applicationPaths, xmlSerializer)
    {
        Instance = (TPlugin)this;
    }

#pragma warning disable CA1000 // Singleton accessor is the established Jellyfin plugin pattern.
    /// <summary>Gets the current plugin instance.</summary>
    public static TPlugin? Instance { get; private set; }
#pragma warning restore CA1000

    /// <summary>
    /// Atomically mutates and (optionally) persists the configuration under a per-plugin lock.
    /// </summary>
    /// <param name="mutate">Mutation to apply; return <c>true</c> to persist the change.</param>
    public void MutateConfiguration(Func<TConfiguration, bool> mutate)
    {
        ArgumentNullException.ThrowIfNull(mutate);
        lock (_configLock)
        {
            if (mutate(Configuration))
            {
                SaveConfiguration();
            }
        }
    }

    /// <summary>
    /// Reads from the configuration under the same lock (safe against concurrent mutation).
    /// </summary>
    /// <typeparam name="T">The read result type.</typeparam>
    /// <param name="read">The read projection.</param>
    /// <returns>The projected value.</returns>
    public T ReadConfiguration<T>(Func<TConfiguration, T> read)
    {
        ArgumentNullException.ThrowIfNull(read);
        lock (_configLock)
        {
            return read(Configuration);
        }
    }

    /// <inheritdoc />
    public abstract IEnumerable<PluginPageInfo> GetPages();

    /// <summary>
    /// Page registrations for the shared <c>jpkribs_shared.css</c>/<c>jpkribs_shared.js</c> assets that
    /// this package embeds into the plugin assembly. The page name is prefixed per plugin so the
    /// configurationpage registry, which is server wide, never collides across installed plugins.
    /// </summary>
    /// <param name="prefix">A per plugin prefix; reference the same name from the page markup, for example <c>configurationpage?name=PREFIX_jpkribs_shared.css</c>.</param>
    /// <returns>The shared asset page registrations.</returns>
    protected IEnumerable<PluginPageInfo> GetSharedPages(string prefix)
    {
        var ns = GetType().Namespace;
        yield return new PluginPageInfo
        {
            Name = prefix + "_jpkribs_shared.css",
            EmbeddedResourcePath = ns + ".Configuration.jpkribs_shared.css"
        };

        yield return new PluginPageInfo
        {
            Name = prefix + "_jpkribs_shared.js",
            EmbeddedResourcePath = ns + ".Configuration.jpkribs_shared.js"
        };
    }
}
