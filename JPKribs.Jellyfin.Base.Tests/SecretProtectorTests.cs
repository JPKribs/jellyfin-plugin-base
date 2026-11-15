using System;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>Verifies that <see cref="SecretProtector"/> encrypts secrets at rest and resolves what a config page posts back.</summary>
public class SecretProtectorTests
{
    private static SecretProtector WithProvider() => new("test.purpose", NullLogger.Instance, new EphemeralDataProtectionProvider());

    /// <summary>
    /// The kept sentinel keeps the stored value as it is.
    /// True: a page that left the field alone does not change the secret.
    /// False: the sentinel would be stored as the new secret.
    /// </summary>
    [Fact]
    public void ResolveIncoming_KeepsStoredOnSentinel()
    {
        var protector = new SecretProtector("test.purpose", NullLogger.Instance);

        var kept = protector.ResolveIncoming(SecretProtector.KeptSentinel, "enc:v1:existing");

        Assert.Equal("enc:v1:existing", kept);
    }

    /// <summary>
    /// Any other value is stored as the new secret, and plaintext when no provider is available.
    /// True: an edited secret replaces the old one.
    /// False: the old secret would stay.
    /// </summary>
    [Fact]
    public void ResolveIncoming_ReplacesWithNewValue()
    {
        var protector = new SecretProtector("test.purpose", NullLogger.Instance);

        var replaced = protector.ResolveIncoming("brand-new", "enc:v1:existing");

        Assert.Equal("brand-new", replaced);
    }

    /// <summary>
    /// An empty value clears the secret.
    /// True: an admin can remove a stored secret.
    /// False: the stored value would stay after a clear.
    /// </summary>
    [Fact]
    public void ResolveIncoming_EmptyClears()
    {
        var protector = new SecretProtector("test.purpose", NullLogger.Instance);

        Assert.Equal(string.Empty, protector.ResolveIncoming(string.Empty, "enc:v1:existing"));
    }

    /// <summary>
    /// A secret is present when the stored value is not null or empty.
    /// True: a page shows its placeholder only when a secret exists.
    /// False: an empty field would show a placeholder.
    /// </summary>
    [Theory]
    [InlineData(null, false)]
    [InlineData("", false)]
    [InlineData("enc:v1:x", true)]
    public void HasSecret_IsTrueForANonEmptyValue(string? stored, bool expected)
        => Assert.Equal(expected, SecretProtector.HasSecret(stored));

    /// <summary>
    /// With a provider a secret is encrypted behind the version prefix and decrypts back.
    /// True: a stored secret is not readable in the configuration file.
    /// False: the secret would be stored in plaintext or lost.
    /// </summary>
    [Fact]
    public void ProtectAndUnprotect_RoundTripWithAProvider()
    {
        var protector = WithProvider();

        var stored = protector.Protect("hunter2");

        Assert.True(protector.IsAvailable);
        Assert.StartsWith("enc:v1:", stored, StringComparison.Ordinal);
        Assert.DoesNotContain("hunter2", stored, StringComparison.Ordinal);
        Assert.Equal("hunter2", protector.Unprotect(stored));
        Assert.Equal(stored, protector.Protect(stored));
        Assert.Equal(string.Empty, protector.Protect(null));
    }

    /// <summary>
    /// Plaintext from before encryption is read as it is, and a blob that cannot be decrypted reads as empty.
    /// True: an old configuration still loads and a wrong key does not throw.
    /// False: an old secret would be lost or a bad blob would throw.
    /// </summary>
    [Fact]
    public void Unprotect_ReadsPlaintextAndEmptiesAnUndecryptableBlob()
    {
        var protector = WithProvider();

        Assert.Equal("legacy", protector.Unprotect("legacy"));
        Assert.Equal(string.Empty, protector.Unprotect(null));
        Assert.Equal(string.Empty, protector.Unprotect("enc:v1:not-a-real-payload"));
    }

    /// <summary>
    /// Without a provider nothing is encrypted and an encrypted value reads as empty.
    /// True: the plugin still loads when the host supplies no Data Protection.
    /// False: the protector would throw or return the ciphertext.
    /// </summary>
    [Fact]
    public void WithoutAProvider_ProtectIsANoOpAndUnprotectOfABlobIsEmpty()
    {
        var protector = new SecretProtector("test.purpose", NullLogger.Instance);

        Assert.False(protector.IsAvailable);
        Assert.Equal("plain", protector.Protect("plain"));
        Assert.Equal(string.Empty, protector.Unprotect("enc:v1:abc"));
    }

    /// <summary>
    /// A value is encrypted only when it starts with the version prefix.
    /// True: encrypted and plaintext values are told apart.
    /// False: a plaintext value would be taken for a blob.
    /// </summary>
    [Theory]
    [InlineData(null, false)]
    [InlineData("", false)]
    [InlineData("plain", false)]
    [InlineData("ENC:V1:x", false)]
    [InlineData("enc:v1:x", true)]
    public void IsProtected_LooksForTheVersionPrefix(string? value, bool expected)
        => Assert.Equal(expected, SecretProtector.IsProtected(value));

    /// <summary>
    /// A new value is encrypted when it is resolved against a provider.
    /// True: a secret posted from a page is encrypted before it is stored.
    /// False: it would be stored in plaintext.
    /// </summary>
    [Fact]
    public void ResolveIncoming_EncryptsANewValueWithAProvider()
    {
        var protector = WithProvider();

        var stored = protector.ResolveIncoming("new-secret", "enc:v1:old");

        Assert.True(SecretProtector.IsProtected(stored));
        Assert.Equal("new-secret", protector.Unprotect(stored));
    }

    /// <summary>
    /// A missing or empty purpose, or a missing logger, is rejected.
    /// True: a misconfigured protector fails at once.
    /// False: secrets would share one key.
    /// </summary>
    [Fact]
    public void Constructor_RejectsABadPurposeOrLogger()
    {
        Assert.Throws<ArgumentException>(() => new SecretProtector(string.Empty, NullLogger.Instance));
        Assert.Throws<ArgumentNullException>(() => new SecretProtector("purpose", null!));
    }
}
