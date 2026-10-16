using System;
using MediaBrowser.Common.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// Registers the base helpers a plugin's <c>IPluginServiceRegistrator</c> would otherwise wire by hand.
/// </summary>
public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Registers <see cref="ActivityLogger"/> as a singleton. Once resolved it is also reachable through
    /// <see cref="ActivityLogger.Current"/> for the callers outside DI, such as the plugin class.
    /// </summary>
    /// <param name="services">The service collection.</param>
    /// <returns>The same service collection.</returns>
    public static IServiceCollection AddActivityLogger(this IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);
        return services.AddSingleton<ActivityLogger>();
    }

    /// <summary>
    /// Registers a <see cref="SecretProtector"/> singleton built by
    /// <see cref="StableSecretProtection.CreateProtector"/>, so it shares a key ring with the protector the
    /// plugin class builds under the same <paramref name="pluginName"/>.
    /// </summary>
    /// <param name="services">The service collection.</param>
    /// <param name="pluginName">The plugin's stable name, such as <c>Jellyfin.Plugin.DynamicDns</c>. Never change it.</param>
    /// <returns>The same service collection.</returns>
    public static IServiceCollection AddPluginSecretProtector(this IServiceCollection services, string pluginName)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentException.ThrowIfNullOrEmpty(pluginName);

        return services.AddSingleton(sp =>
        {
            var logger = sp.GetRequiredService<ILoggerFactory>().CreateLogger(pluginName + ".SecretProtector");
            return StableSecretProtection.CreateProtector(sp.GetService<IApplicationPaths>(), pluginName, logger);
        });
    }
}
