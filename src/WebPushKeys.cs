using System;
using System.Buffers.Text;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// The server's VAPID key pair (RFC 8292), which signs every web push so a push service knows it comes from the server a browser
/// subscribed to. The plugin generates it once and keeps it in its configuration, the private key encrypted.
/// </summary>
public sealed class WebPushKeys
{
    /// <summary>The contact a push service is given when the plugin sets none and the server's address is not https.</summary>
    public const string DefaultContact = "https://jellyfin.org";

    private WebPushKeys(string publicKey, string privateKey, string contact)
    {
        PublicKey = publicKey;
        PrivateKey = privateKey;
        Contact = contact;
    }

    /// <summary>Gets the public key, base64url, which a page subscribes with.</summary>
    public string PublicKey { get; }

    /// <summary>Gets the private key, base64url. Store it only through <see cref="ProtectPrivateKey"/>.</summary>
    public string PrivateKey { get; }

    /// <summary>Gets the contact a push service can reach the server's administrator at, a <c>mailto:</c> or https address.</summary>
    public string Contact { get; }

    /// <summary>
    /// Makes a new key pair.
    /// </summary>
    /// <param name="contact">The administrator's contact, as <see cref="ContactFor"/> reads it.</param>
    /// <param name="serverUrl">The server's address, the contact when none is set and it is https.</param>
    /// <returns>The keys.</returns>
    public static WebPushKeys Generate(string? contact = null, string? serverUrl = null)
    {
        using var key = ECDsa.Create(ECCurve.NamedCurves.nistP256);
        var p = key.ExportParameters(true);
        return new WebPushKeys(Base64Url.EncodeToString(WebPushEncryption.PublicKey(key)), Base64Url.EncodeToString(p.D), ContactFor(contact, serverUrl));
    }

    /// <summary>
    /// Reads the keys a plugin stored.
    /// </summary>
    /// <param name="publicKey">The stored public key.</param>
    /// <param name="protectedPrivateKey">The stored private key, as <see cref="ProtectPrivateKey"/> gave it.</param>
    /// <param name="secrets">The plugin's protector.</param>
    /// <param name="contact">The administrator's contact, as <see cref="ContactFor"/> reads it.</param>
    /// <param name="serverUrl">The server's address, the contact when none is set and it is https.</param>
    /// <returns>The keys, or <c>null</c> when none are stored or they do not form a pair.</returns>
    public static WebPushKeys? FromStored(string? publicKey, string? protectedPrivateKey, SecretProtector secrets, string? contact = null, string? serverUrl = null)
    {
        ArgumentNullException.ThrowIfNull(secrets);
        var privateKey = secrets.Unprotect(protectedPrivateKey);
        if (string.IsNullOrEmpty(publicKey) || string.IsNullOrEmpty(privateKey))
        {
            return null;
        }

        var keys = new WebPushKeys(publicKey.Trim(), privateKey.Trim(), ContactFor(contact, serverUrl));
        try
        {
            // A signature only the public key's own private key could make proves the two belong together.
            using var key = keys.Signer();
            var point = Base64Url.DecodeFromChars(keys.PublicKey);
            using var verifier = ECDsa.Create(new ECParameters { Curve = ECCurve.NamedCurves.nistP256, Q = new ECPoint { X = point[1..33], Y = point[33..65] } });
            var probe = "{\"probe\":true}"u8;
            return verifier.VerifyData(probe, key.SignData(probe, HashAlgorithmName.SHA256), HashAlgorithmName.SHA256) ? keys : null;
        }
        catch (Exception ex) when (ex is CryptographicException or FormatException or ArgumentException)
        {
            return null;
        }
    }

    /// <summary>
    /// Reads the contact a push service is given: a <c>mailto:</c> address, or an email address made into one, or an https address.
    /// Anything else gives the server's address when it is https, else <see cref="DefaultContact"/>.
    /// </summary>
    /// <param name="contact">The administrator's contact.</param>
    /// <param name="serverUrl">The server's address.</param>
    /// <returns>The contact.</returns>
    public static string ContactFor(string? contact, string? serverUrl = null)
    {
        var value = (contact ?? string.Empty).Trim();
        if (value.Length > 0 && !value.Contains(':', StringComparison.Ordinal) && IsEmail(value))
        {
            return "mailto:" + value;
        }

        if (value.StartsWith("mailto:", StringComparison.OrdinalIgnoreCase) && IsEmail(value[7..]))
        {
            return "mailto:" + value[7..];
        }

        if (IsHttps(value))
        {
            return value;
        }

        var server = (serverUrl ?? string.Empty).Trim().TrimEnd('/');
        return IsHttps(server) ? server : DefaultContact;
    }

    /// <summary>
    /// Encrypts the private key for the plugin's configuration.
    /// </summary>
    /// <param name="secrets">The plugin's protector.</param>
    /// <returns>The value to store.</returns>
    public string ProtectPrivateKey(SecretProtector secrets)
    {
        ArgumentNullException.ThrowIfNull(secrets);
        return secrets.Protect(PrivateKey);
    }

    /// <summary>
    /// Builds the <c>Authorization</c> header value of a push to an endpoint, <c>vapid t=&lt;token&gt;, k=&lt;public key&gt;</c>, with a token
    /// that lasts 12 hours.
    /// </summary>
    /// <param name="endpoint">The subscription's endpoint, whose origin is the token's audience.</param>
    /// <param name="now">The time now.</param>
    /// <returns>The header value.</returns>
    public string Authorization(string endpoint, DateTimeOffset now)
        => "vapid t=" + CreateToken(endpoint, now.AddHours(12)) + ", k=" + PublicKey;

    /// <summary>
    /// Builds the signed token (a JWT with ES256) a push to an endpoint carries.
    /// </summary>
    /// <param name="endpoint">The subscription's endpoint, whose origin is the token's audience.</param>
    /// <param name="expires">When the token stops being valid, at most 24 hours ahead.</param>
    /// <returns>The token.</returns>
    public string CreateToken(string endpoint, DateTimeOffset expires)
    {
        var audience = new Uri(endpoint, UriKind.Absolute).GetLeftPart(UriPartial.Authority);
        var header = Base64Url.EncodeToString("{\"typ\":\"JWT\",\"alg\":\"ES256\"}"u8);
        var claims = Base64Url.EncodeToString(JsonSerializer.SerializeToUtf8Bytes(new VapidClaims(audience, expires.ToUnixTimeSeconds(), Contact)));
        var signed = header + "." + claims;
        using var key = Signer();
        var signature = key.SignData(Encoding.ASCII.GetBytes(signed), HashAlgorithmName.SHA256, DSASignatureFormat.IeeeP1363FixedFieldConcatenation);
        return signed + "." + Base64Url.EncodeToString(signature);
    }

    private ECDsa Signer()
    {
        var point = Base64Url.DecodeFromChars(PublicKey);
        var d = Base64Url.DecodeFromChars(PrivateKey);
        if (point.Length != 65 || point[0] != 0x04 || d.Length != 32)
        {
            throw new ArgumentException("The keys are not a P-256 pair.");
        }

        return ECDsa.Create(new ECParameters
        {
            Curve = ECCurve.NamedCurves.nistP256,
            D = d,
            Q = new ECPoint { X = point[1..33], Y = point[33..65] }
        });
    }

    private static bool IsEmail(string value)
    {
        var at = value.IndexOf('@', StringComparison.Ordinal);
        return at > 0 && at < value.Length - 3 && value.IndexOf('.', at) > at + 1 && !value.Any(c => char.IsWhiteSpace(c) || char.IsControl(c));
    }

    private static bool IsHttps(string value)
        => Uri.TryCreate(value, UriKind.Absolute, out var uri) && uri.Scheme == Uri.UriSchemeHttps && string.IsNullOrEmpty(uri.UserInfo);

    private sealed record VapidClaims(
        [property: System.Text.Json.Serialization.JsonPropertyName("aud")] string Audience,
        [property: System.Text.Json.Serialization.JsonPropertyName("exp")] long Expires,
        [property: System.Text.Json.Serialization.JsonPropertyName("sub")] string Subject);
}
