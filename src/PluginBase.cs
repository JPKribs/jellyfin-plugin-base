using System;
using System.Collections.Generic;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// Base class for JPKribs Jellyfin plugins, with a singleton accessor, a locked configuration read and mutate pair, and a locked save hook.
/// It also registers the shared CSS and JS pages that this package embeds into the plugin's assembly.
/// </summary>
/// <remarks><see cref="Instance"/> is set by the constructor and never cleared.</remarks>
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
    /// Mutates the configuration under the plugin's configuration lock and saves it when asked.
    /// </summary>
    /// <param name="mutate">The mutation to apply. It returns <c>true</c> to persist the change.</param>
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
    /// Reads from the configuration under the same lock as <see cref="MutateConfiguration"/>, so a read cannot interleave with a mutation.
    /// </summary>
    /// <typeparam name="T">The type of the value read.</typeparam>
    /// <param name="read">The projection that picks the value out of the configuration.</param>
    /// <returns>The projected value.</returns>
    public T ReadConfiguration<T>(Func<TConfiguration, T> read)
    {
        ArgumentNullException.ThrowIfNull(read);
        lock (_configLock)
        {
            return read(Configuration);
        }
    }

    /// <summary>
    /// Replaces and persists the configuration under the same lock as <see cref="MutateConfiguration"/>, so a save from the dashboard cannot interleave with a mutation.
    /// It runs <see cref="OnConfigurationSaving"/> first.
    /// </summary>
    /// <remarks>Override <see cref="OnConfigurationSaving"/> rather than this to validate, normalize, or protect secrets on the way in. A configuration that is not a <typeparamref name="TConfiguration"/> throws <see cref="InvalidCastException"/>.</remarks>
    /// <param name="configuration">The incoming configuration.</param>
    public override void UpdateConfiguration(BasePluginConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(configuration);
        lock (_configLock)
        {
            var incoming = (TConfiguration)configuration;
            OnConfigurationSaving(incoming, Configuration);
            base.UpdateConfiguration(incoming);
        }
    }

    /// <summary>
    /// Runs under the configuration lock before an incoming configuration replaces the stored one.
    /// Change <paramref name="incoming"/> to change what is saved, such as resolving kept secrets against <paramref name="stored"/>, or throw to reject the save and keep the stored configuration.
    /// </summary>
    /// <param name="incoming">The configuration about to be saved.</param>
    /// <param name="stored">The configuration currently in effect.</param>
    protected virtual void OnConfigurationSaving(TConfiguration incoming, TConfiguration stored)
    {
    }

    /// <inheritdoc />
    public abstract IEnumerable<PluginPageInfo> GetPages();

    /// <summary>
    /// Builds the page registrations for the shared <c>jpkribs_shared.css</c> and <c>jpkribs_shared.js</c> assets that this package embeds into the plugin assembly.
    /// Each page name starts with the prefix, so the server wide <c>configurationpage</c> registry never collides across plugins.
    /// </summary>
    /// <param name="prefix">A per plugin prefix. The page markup uses the same name, such as <c>configurationpage?name=PREFIX_jpkribs_shared.css</c>.</param>
    /// <returns>The shared asset page registrations.</returns>
    protected IEnumerable<PluginPageInfo> GetSharedPages(string prefix)
    {
        // The assets are embedded under the project's root namespace, which may differ from the plugin class's, so the names are looked up.
        var type = GetType();
        yield return new PluginPageInfo
        {
            Name = prefix + "_jpkribs_shared.css",
            EmbeddedResourcePath = SharedAssets.ResolveResourceName(type.Assembly, type.Namespace, "jpkribs_shared.css")
        };

        yield return new PluginPageInfo
        {
            Name = prefix + "_jpkribs_shared.js",
            EmbeddedResourcePath = SharedAssets.ResolveResourceName(type.Assembly, type.Namespace, "jpkribs_shared.js")
        };
    }
}
