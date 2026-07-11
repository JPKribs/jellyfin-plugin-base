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
    /// <summary>
    /// Sentinel a config page posts back in a secret field to mean "keep the stored value unchanged", so a
    /// plugin never has to round-trip the real secret to the browser. Pair it with the matching JS constant
    /// (<c>SECRET_KEPT</c> in the shared bundle) and feed incoming values through
    /// <see cref="ResolveIncoming(string?, string?)"/>.
    /// </summary>
    public const string KeptSentinel = "__JPK_SECRET_KEPT__";

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

    /// <summary>
    /// Resolves a secret submitted from a config page against what is already stored. The page shows a
    /// placeholder rather than the real secret and posts back <see cref="KeptSentinel"/> when the admin left
    /// the field untouched: in that case the stored (already-encrypted) value is kept as-is. Any other value
    /// is a new secret and is encrypted; an empty string clears it. The result is always the value to persist.
    /// </summary>
    /// <param name="incoming">The value posted from the client (possibly the sentinel).</param>
    /// <param name="storedProtected">The currently-stored value (encrypted or legacy plaintext).</param>
    /// <returns>The value to store: unchanged when kept, freshly encrypted when replaced, empty when cleared.</returns>
    public string ResolveIncoming(string? incoming, string? storedProtected)
    {
        if (string.Equals(incoming, KeptSentinel, StringComparison.Ordinal))
        {
            return storedProtected ?? string.Empty;
        }

        return Protect(incoming);
    }

    /// <summary>Returns true when a non-empty secret is stored (so a page can show its placeholder).</summary>
    /// <param name="storedProtected">The stored value.</param>
    /// <returns>Whether a secret is present.</returns>
    public static bool HasSecret(string? storedProtected) => !string.IsNullOrEmpty(storedProtected);
}
