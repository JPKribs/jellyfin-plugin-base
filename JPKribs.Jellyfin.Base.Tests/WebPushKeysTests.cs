using System;
using System.Buffers.Text;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>Verifies that <see cref="WebPushKeys"/> makes a P-256 pair, keeps it encrypted, and signs the VAPID token RFC 8292 sets out.</summary>
public class WebPushKeysTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 20, 12, 0, 0, TimeSpan.Zero);

    /// <summary>
    /// A new pair is an uncompressed P-256 public key and a 32 octet private key, both base64url with no padding.
    /// True: a browser's pushManager.subscribe takes the public key.
    /// False: the page could not subscribe.
    /// </summary>
    [Fact]
    public void Generate_MakesAP256PairInBase64Url()
    {
        var keys = WebPushKeys.Generate();

        Assert.Equal(65, Base64Url.DecodeFromChars(keys.PublicKey).Length);
        Assert.Equal(0x04, Base64Url.DecodeFromChars(keys.PublicKey)[0]);
        Assert.Equal(32, Base64Url.DecodeFromChars(keys.PrivateKey).Length);
        Assert.DoesNotContain('=', keys.PublicKey);
        Assert.NotEqual(keys.PublicKey, WebPushKeys.Generate().PublicKey);
    }

    /// <summary>
    /// The token is a JWT with the ES256 header, the endpoint's origin as its audience, its expiry, and the contact, and its signature verifies with the public key.
    /// True: a push service accepts the push as coming from the server the browser subscribed to.
    /// False: the push service would answer 401 or 403.
    /// </summary>
    [Fact]
    public void CreateToken_IsAnEs256JwtThePublicKeyVerifies()
    {
        var keys = WebPushKeys.Generate("admin@example.com");

        var token = keys.CreateToken("https://push.example.net:8443/push/JzLQ3raZ?x=1", Now.AddHours(12));

        var parts = token.Split('.');
        Assert.Equal(3, parts.Length);
        using var header = JsonDocument.Parse(Base64Url.DecodeFromChars(parts[0]));
        Assert.Equal("JWT", header.RootElement.GetProperty("typ").GetString());
        Assert.Equal("ES256", header.RootElement.GetProperty("alg").GetString());
        using var claims = JsonDocument.Parse(Base64Url.DecodeFromChars(parts[1]));
        Assert.Equal("https://push.example.net:8443", claims.RootElement.GetProperty("aud").GetString());
        Assert.Equal(Now.AddHours(12).ToUnixTimeSeconds(), claims.RootElement.GetProperty("exp").GetInt64());
        Assert.Equal("mailto:admin@example.com", claims.RootElement.GetProperty("sub").GetString());
        var signature = Base64Url.DecodeFromChars(parts[2]);
        Assert.Equal(64, signature.Length);
        using var verifier = Verifier(keys.PublicKey);
        Assert.True(verifier.VerifyData(Encoding.ASCII.GetBytes(parts[0] + "." + parts[1]), signature, HashAlgorithmName.SHA256, DSASignatureFormat.IeeeP1363FixedFieldConcatenation));
        Assert.False(verifier.VerifyData(Encoding.ASCII.GetBytes(parts[0] + "." + parts[0]), signature, HashAlgorithmName.SHA256, DSASignatureFormat.IeeeP1363FixedFieldConcatenation));
    }

    /// <summary>
    /// The header is "vapid t=token, k=public key", with a token that lasts 12 hours.
    /// True: the push carries the form RFC 8292 names.
    /// False: a push service would refuse the authorization.
    /// </summary>
    [Fact]
    public void Authorization_IsVapidWithTheTokenAndKey()
    {
        var keys = WebPushKeys.Generate();

        var value = keys.Authorization("https://fcm.googleapis.com/fcm/send/abc", Now);

        Assert.StartsWith("vapid t=", value, StringComparison.Ordinal);
        Assert.EndsWith(", k=" + keys.PublicKey, value, StringComparison.Ordinal);
        var token = value["vapid t=".Length..value.IndexOf(',', StringComparison.Ordinal)];
        using var claims = JsonDocument.Parse(Base64Url.DecodeFromChars(token.Split('.')[1]));
        Assert.Equal(Now.AddHours(12).ToUnixTimeSeconds(), claims.RootElement.GetProperty("exp").GetInt64());
        Assert.Equal("https://fcm.googleapis.com", claims.RootElement.GetProperty("aud").GetString());
    }

    /// <summary>
    /// The private key is stored encrypted, reads back as the same pair, and a pair that does not match or is missing reads as none.
    /// True: the keys survive a restart and never sit in plain text.
    /// False: every subscription would break on restart, or a mismatched pair would sign pushes no browser accepts.
    /// </summary>
    [Fact]
    public void FromStored_ReadsTheProtectedPairBackAndRefusesAMismatch()
    {
        var secrets = new SecretProtector("test.purpose", NullLogger.Instance, new EphemeralDataProtectionProvider());
        var keys = WebPushKeys.Generate();
        var stored = keys.ProtectPrivateKey(secrets);

        var read = WebPushKeys.FromStored(keys.PublicKey, stored, secrets, "https://jf.example.com");

        Assert.True(SecretProtector.IsProtected(stored));
        Assert.NotNull(read);
        Assert.Equal(keys.PrivateKey, read.PrivateKey);
        Assert.Equal("https://jf.example.com", read.Contact);
        Assert.Null(WebPushKeys.FromStored(WebPushKeys.Generate().PublicKey, stored, secrets));
        Assert.Null(WebPushKeys.FromStored(keys.PublicKey, string.Empty, secrets));
        Assert.Null(WebPushKeys.FromStored("not a key", stored, secrets));
    }

    /// <summary>
    /// The contact is a mailto address, an email made into one, or an https address, and otherwise the server's https address or the default.
    /// True: the sub claim is always one a push service accepts.
    /// False: a plain http or local contact would be refused by some push services.
    /// </summary>
    [Theory]
    [InlineData("admin@example.com", null, "mailto:admin@example.com")]
    [InlineData("mailto:admin@example.com", null, "mailto:admin@example.com")]
    [InlineData("https://example.com/contact", null, "https://example.com/contact")]
    [InlineData("", "https://jf.example.com/", "https://jf.example.com")]
    [InlineData("not a contact", "http://192.168.1.2:8096", WebPushKeys.DefaultContact)]
    [InlineData(null, null, WebPushKeys.DefaultContact)]
    [InlineData("mailto:nobody", null, WebPushKeys.DefaultContact)]
    public void ContactFor_GivesAContactAPushServiceTakes(string? contact, string? server, string expected)
    {
        Assert.Equal(expected, WebPushKeys.ContactFor(contact, server));
    }

    private static ECDsa Verifier(string publicKey)
    {
        var point = Base64Url.DecodeFromChars(publicKey);
        return ECDsa.Create(new ECParameters { Curve = ECCurve.NamedCurves.nistP256, Q = new ECPoint { X = point[1..33], Y = point[33..65] } });
    }
}
