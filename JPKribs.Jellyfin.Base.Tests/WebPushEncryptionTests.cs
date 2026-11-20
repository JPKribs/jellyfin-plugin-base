using System;
using System.Buffers.Binary;
using System.Buffers.Text;
using System.Security.Cryptography;
using System.Text;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>Verifies that <see cref="WebPushEncryption"/> writes the <c>aes128gcm</c> body RFC 8291 sets out, which a browser can decrypt.</summary>
public class WebPushEncryptionTests
{
    // RFC 8291, section 5 and Appendix A.
    private const string Plaintext = "When I grow up, I want to be a watermelon";
    private const string ReceiverPublic = "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4";
    private const string ReceiverPrivate = "q1dXpw3UpT5VOmu_cf_v6ih07Aems3njxI-JWgLcM94";
    private const string SenderPublic = "BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8";
    private const string SenderPrivate = "yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw";
    private const string Salt = "DGv6ra1nlYgDCS1FRnbzlw";
    private const string AuthSecret = "BTBZMqHH6r4Tts7J_aSIgg";
    private const string Body =
        "DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27ml"
        + "mlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPT"
        + "pK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN";

    /// <summary>
    /// With the example's sender key and salt, the body is the example's body, octet for octet.
    /// True: every key derivation, the header, the padding delimiter, and the cipher follow RFC 8291.
    /// False: a browser would fail to decrypt the push and drop it.
    /// </summary>
    [Fact]
    public void Encrypt_WithTheRfcKeysAndSalt_GivesTheRfcBody()
    {
        using var sender = Key(SenderPrivate, SenderPublic);

        var body = WebPushEncryption.Encrypt(Encoding.ASCII.GetBytes(Plaintext), ReceiverPublic, AuthSecret, sender, Base64Url.DecodeFromChars(Salt));

        Assert.Equal(Base64Url.DecodeFromChars(Body), body);
        Assert.Equal(86 + Plaintext.Length + 1 + 16, body.Length);
    }

    /// <summary>
    /// A body made with a new key pair and salt opens with the receiver's private key, and its header names the record size and the sender's key.
    /// True: a real push decrypts in the browser.
    /// False: only the fixed example would work.
    /// </summary>
    [Fact]
    public void Encrypt_WithANewKeyAndSalt_DecryptsWithTheReceiversKey()
    {
        var text = "{\"title\":\"Approved\",\"body\":\"Dune (2021) was approved.\"}";

        var body = WebPushEncryption.Encrypt(Encoding.UTF8.GetBytes(text), ReceiverPublic, AuthSecret);
        var again = WebPushEncryption.Encrypt(Encoding.UTF8.GetBytes(text), ReceiverPublic, AuthSecret);

        Assert.Equal(4096u, BinaryPrimitives.ReadUInt32BigEndian(body.AsSpan(16, 4)));
        Assert.Equal(65, body[20]);
        Assert.Equal(text, Decrypt(body, ReceiverPrivate, ReceiverPublic, AuthSecret));
        Assert.NotEqual(body, again);
    }

    /// <summary>
    /// A message longer than one record holds is refused, and the longest that fits is encrypted.
    /// True: a push always fits the 4096 octets a push service takes.
    /// False: a push service would refuse it with 413.
    /// </summary>
    [Fact]
    public void Encrypt_RefusesAMessageLongerThanOneRecord()
    {
        var fits = WebPushEncryption.Encrypt(new byte[WebPushEncryption.MaxPlaintextLength], ReceiverPublic, AuthSecret);

        Assert.Equal(4096, fits.Length);
        Assert.Throws<ArgumentException>(() => WebPushEncryption.Encrypt(new byte[WebPushEncryption.MaxPlaintextLength + 1], ReceiverPublic, AuthSecret));
    }

    /// <summary>
    /// A key of the wrong length or form, or text that is not base64url, is refused with an argument error.
    /// True: a bad subscription fails one push, which the notifier removes.
    /// False: a bad key would throw something the notifier does not expect.
    /// </summary>
    [Theory]
    [InlineData("BCVxsr7N", AuthSecret)]
    [InlineData("AiVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4", AuthSecret)]
    [InlineData(ReceiverPublic, "BTBZMqHH6r4Tts7J")]
    [InlineData(ReceiverPublic, "not base64 !")]
    public void Encrypt_RefusesKeysThatAreNotValid(string p256dh, string auth)
    {
        Assert.Throws<ArgumentException>(() => WebPushEncryption.Encrypt("x"u8, p256dh, auth));
    }

    internal static ECDiffieHellman Key(string privateKey, string publicKey)
    {
        var point = Base64Url.DecodeFromChars(publicKey);
        return ECDiffieHellman.Create(new ECParameters
        {
            Curve = ECCurve.NamedCurves.nistP256,
            D = Base64Url.DecodeFromChars(privateKey),
            Q = new ECPoint { X = point[1..33], Y = point[33..65] }
        });
    }

    // Decrypts a body as the browser does, per RFC 8291, independently of the code under test.
    [System.Diagnostics.CodeAnalysis.SuppressMessage("Security", "CA5390:Do not hard-code encryption key", Justification = "The tests decrypt with RFC 8291's fixed example keys on purpose.")]
    internal static string Decrypt(byte[] body, string receiverPrivate, string receiverPublic, string auth)
    {
        var salt = body[..16];
        var idLength = body[20];
        var senderKey = body[21..(21 + idLength)];
        using var receiver = Key(receiverPrivate, receiverPublic);
        using var sender = ECDiffieHellman.Create(new ECParameters
        {
            Curve = ECCurve.NamedCurves.nistP256,
            Q = new ECPoint { X = senderKey[1..33], Y = senderKey[33..65] }
        });
        var secret = receiver.DeriveRawSecretAgreement(sender.PublicKey);
        var info = new byte[14 + 65 + 65];
        Encoding.ASCII.GetBytes("WebPush: info\0").CopyTo(info, 0);
        Base64Url.DecodeFromChars(receiverPublic).CopyTo(info, 14);
        senderKey.CopyTo(info, 79);
        var ikm = HKDF.DeriveKey(HashAlgorithmName.SHA256, secret, 32, Base64Url.DecodeFromChars(auth), info);
        var prk = HKDF.Extract(HashAlgorithmName.SHA256, ikm, salt);
        var cek = HKDF.Expand(HashAlgorithmName.SHA256, prk, 16, Encoding.ASCII.GetBytes("Content-Encoding: aes128gcm\0"));
        var nonce = HKDF.Expand(HashAlgorithmName.SHA256, prk, 12, Encoding.ASCII.GetBytes("Content-Encoding: nonce\0"));
        var start = 21 + idLength;
        var cipher = body[start..^16];
        var plain = new byte[cipher.Length];
        using var aes = new AesGcm(cek, 16);
        aes.Decrypt(nonce, cipher, body[^16..], plain);
        Assert.Equal(0x02, plain[^1]);
        return Encoding.UTF8.GetString(plain, 0, plain.Length - 1);
    }
}
