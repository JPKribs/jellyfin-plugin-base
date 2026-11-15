using System;
using System.Security.Cryptography;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Logging;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// Encrypts plugin secrets at rest with ASP.NET Core Data Protection.
/// A stored value carries a version prefix, so plaintext from before encryption is detected and upgraded.
/// </summary>
/// <remarks>
/// <para>
/// This is defense in depth, not a vault. With <see cref="StableSecretProtection"/> the key ring is stored
/// unencrypted in the plugin configurations folder, beside the configuration it protects. It keeps secrets out
/// of a configuration file that travels on its own, such as one shared for support, pasted into an issue, or copied without its
/// folder. It does not protect against anyone who can read that folder, a backup that includes the key ring,
/// or an attacker with access to the host.
/// </para>
/// <para>
/// Construct one per plugin with a stable, unique <c>purpose</c>, such as the plugin's namespace, so each
/// plugin's secrets are isolated. The <see cref="IDataProtectionProvider"/> is optional. When the host
/// does not supply one the protector stores plaintext and logs a warning, so a plugin never fails to load over it.
/// </para>
/// <para>
/// Any plaintext that starts with <c>enc:v1:</c> is read as encrypted, and the prefix must stay stable or existing secrets become unreadable.
/// </para>
/// </remarks>
public sealed class SecretProtector
{
    /// <summary>
    /// The value a config page posts back in a secret field to mean "keep the stored value unchanged", so the real secret never goes to the browser.
    /// It matches the <c>SECRET_KEPT</c> constant in the shared JS bundle. Feed incoming values through <see cref="ResolveIncoming(string?, string?)"/>.
    /// </summary>
    public const string KeptSentinel = "__JPK_SECRET_KEPT__";

    private const string Prefix = "enc:v1:";
    private readonly IDataProtector? _protector;
    private readonly ILogger _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="SecretProtector"/> class.
    /// </summary>
    /// <param name="purpose">A stable, plugin unique purpose string that isolates the protection key.</param>
    /// <param name="logger">The logger that reports a missing provider and a failed decryption.</param>
    /// <param name="dataProtection">The data protection provider, or <c>null</c> when the host supplies none.</param>
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

    /// <summary>
    /// Gets a value indicating whether this protector encrypts.
    /// It is <c>false</c> when the host supplied no Data Protection provider, and then <see cref="Protect"/> leaves secrets in plaintext.
    /// </summary>
    public bool IsAvailable => _protector is not null;

    /// <summary>Checks whether a stored value is an encrypted blob, by its <c>enc:v1:</c> prefix.</summary>
    /// <param name="value">The stored value.</param>
    /// <returns><c>true</c> when the value starts with the prefix, otherwise <c>false</c>.</returns>
    public static bool IsProtected(string? value)
        => value is not null && value.StartsWith(Prefix, StringComparison.Ordinal);

    /// <summary>Encrypts a plaintext secret. An empty or already encrypted value, or an unavailable provider, leaves it unchanged.</summary>
    /// <param name="value">The plaintext secret.</param>
    /// <returns>The encrypted blob, or the input unchanged when there is nothing to do. <c>null</c> gives an empty string.</returns>
    public string Protect(string? value)
    {
        if (string.IsNullOrEmpty(value) || IsProtected(value) || _protector is null)
        {
            return value ?? string.Empty;
        }

        return Prefix + _protector.Protect(value);
    }

    /// <summary>Decrypts a stored secret. Input that is not encrypted is returned unchanged.</summary>
    /// <param name="value">The stored value.</param>
    /// <returns>The plaintext secret, or an empty string when it cannot be decrypted or no provider is available.</returns>
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
    /// Resolves a secret submitted from a config page against what is already stored.
    /// The page shows a placeholder and posts back <see cref="KeptSentinel"/> when the field was left untouched, and then the stored value is kept as it is.
    /// </summary>
    /// <remarks>Any other value is a new secret and is encrypted, and an empty string clears it. The result is always the value to persist.</remarks>
    /// <param name="incoming">The value posted from the client, possibly the sentinel.</param>
    /// <param name="storedProtected">The stored value, encrypted or plaintext.</param>
    /// <returns>The value to store, which is unchanged when kept, encrypted when replaced, and empty when cleared.</returns>
    public string ResolveIncoming(string? incoming, string? storedProtected)
    {
        if (string.Equals(incoming, KeptSentinel, StringComparison.Ordinal))
        {
            return storedProtected ?? string.Empty;
        }

        return Protect(incoming);
    }

    /// <summary>Checks whether a secret is stored, so a page can show its placeholder.</summary>
    /// <param name="storedProtected">The stored value.</param>
    /// <returns><c>true</c> when the value is not <c>null</c> or empty, otherwise <c>false</c>.</returns>
    public static bool HasSecret(string? storedProtected) => !string.IsNullOrEmpty(storedProtected);
}
