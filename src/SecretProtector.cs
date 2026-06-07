using System;
using System.Security.Cryptography;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Logging;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// Encrypts plugin secrets at rest with ASP.NET Core Data Protection. Stored values carry a version
/// prefix so pre-migration plaintext is detected and transparently upgraded.
/// <para>
/// This is defense-in-depth: the protection key lives in the Jellyfin data directory, so it guards
/// against leaked/synced configuration files and backups, not against an attacker with full host access.
/// </para>
/// <para>
/// Construct one per plugin with a stable, unique <c>purpose</c> (e.g. the plugin's namespace) so each
/// plugin's secrets are isolated. The <see cref="IDataProtectionProvider"/> is optional: when the host
/// does not supply one the protector degrades to a no-op (plaintext) with a logged warning, so a plugin
/// never fails to load over it.
/// </para>
/// </summary>
public sealed class SecretProtector
{
    private const string Prefix = "enc:v1:";
    private readonly IDataProtector? _protector;
    private readonly ILogger _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="SecretProtector"/> class.
    /// </summary>
    /// <param name="purpose">A stable, plugin-unique purpose string used to isolate the protection key.</param>
    /// <param name="logger">The logger.</param>
    /// <param name="dataProtection">The data protection provider, when the host supplies one.</param>
    public SecretProtector(string purpose, ILogger logger, IDataProtectionProvider? dataProtection = null)
    {
        ArgumentException.ThrowIfNullOrEmpty(purpose);
        ArgumentNullException.ThrowIfNull(logger);

        _logger = logger;
        _protector = dataProtection?.CreateProtector(purpose);
        if (_protector is null)
        {
            _logger.LogWarning("Data Protection is unavailable; secrets for {Purpose} will remain in plaintext at rest.", purpose);
        }
    }

    /// <summary>Returns true when the stored value is an encrypted blob.</summary>
    /// <param name="value">The stored value.</param>
    /// <returns>Whether the value is encrypted.</returns>
    public static bool IsProtected(string? value)
        => value is not null && value.StartsWith(Prefix, StringComparison.Ordinal);

    /// <summary>Encrypts a plaintext secret. No-ops on empty, already-encrypted, or unavailable provider.</summary>
    /// <param name="value">The plaintext secret.</param>
    /// <returns>The encrypted blob, or the input unchanged when nothing to do.</returns>
    public string Protect(string? value)
    {
        if (string.IsNullOrEmpty(value) || IsProtected(value) || _protector is null)
        {
            return value ?? string.Empty;
        }

        return Prefix + _protector.Protect(value);
    }

    /// <summary>Decrypts a stored secret. Plaintext (pre-migration) input is returned unchanged.</summary>
    /// <param name="value">The stored value.</param>
    /// <returns>The plaintext secret, or empty when it cannot be decrypted.</returns>
    public string Unprotect(string? value)
    {
        if (string.IsNullOrEmpty(value) || !IsProtected(value))
        {
            return value ?? string.Empty;
        }

        if (_protector is null)
        {
            return string.Empty;
        }

        try
        {
            return _protector.Unprotect(value[Prefix.Length..]);
        }
        catch (CryptographicException ex)
        {
            _logger.LogWarning(ex, "Failed to decrypt a stored secret; the protection key may have changed.");
            return string.Empty;
        }
    }
}
