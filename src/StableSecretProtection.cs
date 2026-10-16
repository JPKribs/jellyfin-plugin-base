using System;
using System.Collections.Concurrent;
using System.IO;
using MediaBrowser.Common.Configuration;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// Builds the Data Protection provider behind <see cref="SecretProtector"/> so encrypted secrets survive
/// changes in how the Jellyfin host is launched.
/// <para>
/// By default ASP.NET Data Protection derives its application discriminator from the host's content-root
/// path and stores keys in a per-user profile directory (<c>~/.aspnet/DataProtection-Keys</c>). Both move
/// when the install is updated, switched between the desktop app and a service, or run under Docker, and
/// every previously encrypted secret then fails to decrypt with "payload was invalid". This pins both: keys
/// live in a fixed directory under the Jellyfin plugin configurations folder (persisted with the config they
/// protect, including across Docker rebuilds via the data volume) and the application name is constant.
/// </para>
/// <para>
/// <see cref="CreateProtector"/> derives the key folder (<c>&lt;plugin&gt;.Keys</c>), application name
/// (<c>&lt;plugin&gt;</c>), and purpose (<c>&lt;plugin&gt;.Secrets.v1</c>) from one plugin name. Changing
/// that name makes every stored secret unreadable, so pass the plugin's assembly name and never change it.
/// </para>
/// </summary>
public static class StableSecretProtection
{
    // One provider per key folder. The plugin and the DI container each build a protector, and both must
    // read the same key ring. The cache also holds the key-ring container for the process lifetime so it is
    // never collected out from under a protector.
    private static readonly ConcurrentDictionary<string, IDataProtectionProvider> _providers = new(StringComparer.Ordinal);

    /// <summary>Returns the key folder a plugin's secrets are protected under.</summary>
    /// <param name="paths">Jellyfin's application paths.</param>
    /// <param name="pluginName">The plugin's stable name, such as <c>Jellyfin.Plugin.DynamicDns</c>.</param>
    /// <returns>The key folder path.</returns>
    public static string KeyDirectory(IApplicationPaths paths, string pluginName)
    {
        ArgumentNullException.ThrowIfNull(paths);
        ArgumentException.ThrowIfNullOrEmpty(pluginName);
        return Path.Join(paths.PluginConfigurationsPath, pluginName + ".Keys");
    }

    /// <summary>
    /// Builds the protector for a plugin's stored secrets. Every caller in a plugin that passes the same
    /// name reads and writes the same key ring, so the plugin class and the DI container can each build one.
    /// </summary>
    /// <param name="paths">Jellyfin's application paths, or <c>null</c> when unavailable, in which case secrets stay in plaintext.</param>
    /// <param name="pluginName">The plugin's stable name, such as <c>Jellyfin.Plugin.DynamicDns</c>.</param>
    /// <param name="logger">Logger for diagnostics.</param>
    /// <returns>The protector. Check <see cref="SecretProtector.IsAvailable"/> to learn whether it encrypts.</returns>
    public static SecretProtector CreateProtector(IApplicationPaths? paths, string pluginName, ILogger logger)
    {
        ArgumentException.ThrowIfNullOrEmpty(pluginName);
        ArgumentNullException.ThrowIfNull(logger);

        var provider = paths is null ? null : Build(KeyDirectory(paths, pluginName), pluginName, logger);
        return new SecretProtector(pluginName + ".Secrets.v1", logger, provider);
    }

    /// <summary>
    /// Returns a provider that encrypts with a plugin-managed, launch-independent key stored in
    /// <paramref name="keyDirectory"/>, or <c>null</c> when that store can't be created (the caller then
    /// degrades to plaintext rather than reaching outside the data folder for keys).
    /// </summary>
    /// <param name="keyDirectory">Fixed key-storage directory under the data folder.</param>
    /// <param name="applicationName">The constant Data Protection application name.</param>
    /// <param name="logger">Logger for diagnostics.</param>
    /// <returns>A provider to hand to <see cref="SecretProtector"/>, or <c>null</c> if unavailable.</returns>
    public static IDataProtectionProvider? Build(string keyDirectory, string applicationName, ILogger logger)
    {
        ArgumentException.ThrowIfNullOrEmpty(keyDirectory);
        ArgumentException.ThrowIfNullOrEmpty(applicationName);
        ArgumentNullException.ThrowIfNull(logger);

        if (_providers.TryGetValue(keyDirectory, out var cached))
        {
            return cached;
        }

        try
        {
            Directory.CreateDirectory(keyDirectory);
            var services = new ServiceCollection();
            services.AddDataProtection()
                .PersistKeysToFileSystem(new DirectoryInfo(keyDirectory))
                .SetApplicationName(applicationName);

#pragma warning disable CA2000 // The container owns the key ring for the process lifetime; the cache keeps it alive.
            var container = services.BuildServiceProvider();
#pragma warning restore CA2000
            return _providers.GetOrAdd(keyDirectory, container.GetRequiredService<IDataProtectionProvider>());
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or ArgumentException or NotSupportedException or InvalidOperationException)
        {
            // A key store the host won't give us (bad path, no permission, no Data Protection service) is not
            // fatal: the caller falls back to plaintext rather than reaching outside the data folder for keys.
            logger.LogWarning(ex, "Could not initialize plugin-managed Data Protection keys at {Path}; secrets will be stored in plaintext.", keyDirectory);
            return null;
        }
    }
}
