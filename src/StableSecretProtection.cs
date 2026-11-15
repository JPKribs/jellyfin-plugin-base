using System;
using System.Collections.Generic;
using System.IO;
using MediaBrowser.Common.Configuration;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// Builds the Data Protection provider behind <see cref="SecretProtector"/>, so encrypted secrets survive changes in how the Jellyfin host is launched.
/// </summary>
/// <remarks>
/// <para>
/// By default ASP.NET Data Protection derives its application discriminator from the host's content root
/// path and stores keys in a per user profile directory, <c>~/.aspnet/DataProtection-Keys</c>. Both move
/// when the install is updated, switched between the desktop app and a service, or run under Docker, and
/// every previously encrypted secret then fails to decrypt with "payload was invalid". This class pins both. Keys
/// live in a fixed directory under the Jellyfin plugin configurations folder, which persists with the config they
/// protect, including across Docker rebuilds through the data volume, and the application name is constant.
/// </para>
/// <para>
/// The key ring is written as unencrypted XML in that folder, beside the configuration files. Encryption
/// therefore keeps a secret out of a configuration file that leaves the folder on its own, such as one shared in a support
/// request, pasted into an issue, or copied by a tool that takes only the XML. Anyone who can read the plugin
/// configurations folder, or a backup that carries the <c>&lt;plugin&gt;.Keys</c> folder with it, can decrypt.
/// The keys are not moved or re-wrapped, since that would make every stored secret unreadable.
/// </para>
/// <para>
/// <see cref="CreateProtector"/> derives the key folder (<c>&lt;plugin&gt;.Keys</c>), application name
/// (<c>&lt;plugin&gt;</c>), and purpose (<c>&lt;plugin&gt;.Secrets.v1</c>) from one plugin name. Changing
/// that name makes every stored secret unreadable, so pass the plugin's assembly name and never change it.
/// </para>
/// <para>
/// <see cref="Build"/> caches providers by key folder only, so a second call with another application name for the same folder gets the first provider.
/// </para>
/// </remarks>
public static class StableSecretProtection
{
    // One provider per key folder, so the plugin and the DI container read the same key ring. The cache also keeps each container alive for the process lifetime.
    private static readonly Dictionary<string, IDataProtectionProvider> _providers = new(StringComparer.Ordinal);
    private static readonly object _providersLock = new();

    /// <summary>Gets the key folder a plugin's secrets are protected under.</summary>
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
    /// Builds the protector for a plugin's stored secrets.
    /// Every caller in a plugin that passes the same name reads and writes the same key ring, so the plugin class and the DI container can each build one.
    /// </summary>
    /// <param name="paths">Jellyfin's application paths, or <c>null</c> when unavailable, and then secrets stay in plaintext.</param>
    /// <param name="pluginName">The plugin's stable name, such as <c>Jellyfin.Plugin.DynamicDns</c>.</param>
    /// <param name="logger">The logger for the protector and for a key store that could not be created.</param>
    /// <returns>The protector. Check <see cref="SecretProtector.IsAvailable"/> to learn whether it encrypts.</returns>
    public static SecretProtector CreateProtector(IApplicationPaths? paths, string pluginName, ILogger logger)
    {
        ArgumentException.ThrowIfNullOrEmpty(pluginName);
        ArgumentNullException.ThrowIfNull(logger);

        var provider = paths is null ? null : Build(KeyDirectory(paths, pluginName), pluginName, logger);
        return new SecretProtector(pluginName + ".Secrets.v1", logger, provider);
    }

    /// <summary>
    /// Builds a provider that encrypts with a plugin managed, launch independent key stored in <paramref name="keyDirectory"/>.
    /// </summary>
    /// <remarks>When the key store cannot be created the result is <c>null</c>, and the caller falls back to plaintext rather than reaching outside the data folder for keys.</remarks>
    /// <param name="keyDirectory">The fixed key storage directory under the data folder.</param>
    /// <param name="applicationName">The constant Data Protection application name.</param>
    /// <param name="logger">The logger that reports a key store that could not be created.</param>
    /// <returns>A provider to hand to <see cref="SecretProtector"/>, or <c>null</c> when none is available.</returns>
    public static IDataProtectionProvider? Build(string keyDirectory, string applicationName, ILogger logger)
    {
        ArgumentException.ThrowIfNullOrEmpty(keyDirectory);
        ArgumentException.ThrowIfNullOrEmpty(applicationName);
        ArgumentNullException.ThrowIfNull(logger);

        lock (_providersLock)
        {
            if (_providers.TryGetValue(keyDirectory, out var cached))
            {
                return cached;
            }

            ServiceProvider? container = null;
            try
            {
                Directory.CreateDirectory(keyDirectory);
                var services = new ServiceCollection();
                services.AddDataProtection()
                    .PersistKeysToFileSystem(new DirectoryInfo(keyDirectory))
                    .SetApplicationName(applicationName);

                container = services.BuildServiceProvider();
                var provider = container.GetRequiredService<IDataProtectionProvider>();
                _providers.Add(keyDirectory, provider);
                container = null;
                return provider;
            }
            catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or ArgumentException or NotSupportedException or InvalidOperationException)
            {
                // A key store the host will not give us is not fatal, so the caller falls back to plaintext.
                logger.LogWarning(ex, "Could not initialize plugin-managed Data Protection keys at {Path}; secrets will be stored in plaintext.", keyDirectory);
                return null;
            }
            finally
            {
                // A container that never reached the cache is released here.
                container?.Dispose();
            }
        }
    }
}
