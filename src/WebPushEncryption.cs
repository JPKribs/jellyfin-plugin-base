using System;
using System.Buffers.Binary;
using System.Buffers.Text;
using System.Security.Cryptography;
using System.Text;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// Encrypts a web push message for one browser subscription, as RFC 8291 sets out, in one <c>aes128gcm</c> record (RFC 8188).
/// </summary>
public static class WebPushEncryption
{
    /// <summary>The record size every message is written with, which is also the most a push service takes.</summary>
    public const int RecordSize = 4096;

    /// <summary>The largest plaintext one record holds: the record size less the 86 octet header, the 16 octet tag, and the padding delimiter.</summary>
    public const int MaxPlaintextLength = RecordSize - 86 - 16 - 1;

    private static readonly byte[] KeyInfoPrefix = Encoding.ASCII.GetBytes("WebPush: info\0");
    private static readonly byte[] CekInfo = Encoding.ASCII.GetBytes("Content-Encoding: aes128gcm\0");
    private static readonly byte[] NonceInfo = Encoding.ASCII.GetBytes("Content-Encoding: nonce\0");

    /// <summary>
    /// Encrypts a message with a new key pair and salt, for the body of a push with <c>Content-Encoding: aes128gcm</c>.
    /// </summary>
    /// <param name="plaintext">The message, at most <see cref="MaxPlaintextLength"/> octets.</param>
    /// <param name="p256dh">The subscription's P-256 public key, base64url, as the browser gives it.</param>
    /// <param name="auth">The subscription's 16 octet authentication secret, base64url.</param>
    /// <returns>The body to send.</returns>
    /// <exception cref="ArgumentException">A key is not valid, or the message is too long.</exception>
    public static byte[] Encrypt(ReadOnlySpan<byte> plaintext, string p256dh, string auth)
    {
        using var sender = ECDiffieHellman.Create(ECCurve.NamedCurves.nistP256);
        return Encrypt(plaintext, p256dh, auth, sender, RandomNumberGenerator.GetBytes(16));
    }

    // Encrypts with a given sender key pair and salt, so a test can check the result against RFC 8291's example.
    internal static byte[] Encrypt(ReadOnlySpan<byte> plaintext, string p256dh, string auth, ECDiffieHellman sender, byte[] salt)
    {
        ArgumentNullException.ThrowIfNull(sender);
        ArgumentNullException.ThrowIfNull(salt);
        if (plaintext.Length > MaxPlaintextLength)
        {
            throw new ArgumentException("The message is longer than one record holds.", nameof(plaintext));
        }

        var receiverKey = DecodeKey(p256dh, 65, nameof(p256dh));
        var authSecret = DecodeKey(auth, 16, nameof(auth));
        if (receiverKey[0] != 0x04)
        {
            throw new ArgumentException("The key is not an uncompressed P-256 point.", nameof(p256dh));
        }

        using var receiver = ECDiffieHellman.Create(new ECParameters
        {
            Curve = ECCurve.NamedCurves.nistP256,
            Q = new ECPoint { X = receiverKey[1..33], Y = receiverKey[33..65] }
        });
        var senderKey = PublicKey(sender);
        var secret = sender.DeriveRawSecretAgreement(receiver.PublicKey);

        // key_info = "WebPush: info" || 0x00 || ua_public || as_public
        var keyInfo = new byte[KeyInfoPrefix.Length + 65 + 65];
        KeyInfoPrefix.CopyTo(keyInfo, 0);
        receiverKey.CopyTo(keyInfo, KeyInfoPrefix.Length);
        senderKey.CopyTo(keyInfo, KeyInfoPrefix.Length + 65);
        var ikm = HKDF.DeriveKey(HashAlgorithmName.SHA256, secret, 32, authSecret, keyInfo);

        var prk = HKDF.Extract(HashAlgorithmName.SHA256, ikm, salt);
        var cek = HKDF.Expand(HashAlgorithmName.SHA256, prk, 16, CekInfo);
        var nonce = HKDF.Expand(HashAlgorithmName.SHA256, prk, 12, NonceInfo);

        // One record, the last, so the plaintext ends with the 0x02 delimiter and no padding.
        var record = new byte[plaintext.Length + 1];
        plaintext.CopyTo(record);
        record[^1] = 0x02;

        // header = salt (16) || rs (4) || idlen (1) || keyid (65)
        var body = new byte[16 + 4 + 1 + 65 + record.Length + 16];
        salt.CopyTo(body, 0);
        BinaryPrimitives.WriteUInt32BigEndian(body.AsSpan(16, 4), RecordSize);
        body[20] = 65;
        senderKey.CopyTo(body, 21);
        using var aes = new AesGcm(cek, 16);
        aes.Encrypt(nonce, record, body.AsSpan(86, record.Length), body.AsSpan(86 + record.Length, 16));
        return body;
    }

    // The uncompressed form of a P-256 public key: 0x04, then X and Y.
    internal static byte[] PublicKey(ECAlgorithm key)
    {
        var p = key.ExportParameters(false);
        var point = new byte[65];
        point[0] = 0x04;
        p.Q.X!.CopyTo(point, 1);
        p.Q.Y!.CopyTo(point, 33);
        return point;
    }

    private static byte[] DecodeKey(string value, int length, string name)
    {
        byte[] bytes;
        try
        {
            bytes = Base64Url.DecodeFromChars((value ?? string.Empty).Trim().TrimEnd('='));
        }
        catch (FormatException ex)
        {
            throw new ArgumentException("The key is not base64url.", name, ex);
        }

        return bytes.Length == length ? bytes : throw new ArgumentException("The key is not " + length.ToString(System.Globalization.CultureInfo.InvariantCulture) + " octets.", name);
    }
}
