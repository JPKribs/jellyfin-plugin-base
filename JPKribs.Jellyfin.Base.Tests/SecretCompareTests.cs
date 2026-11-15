using System;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>Verifies that <see cref="SecretCompare"/> never matches an empty secret and makes tokens of the right size and alphabet.</summary>
public class SecretCompareTests
{
#pragma warning disable CA1307 // The two argument overload is the one under test.
    private static bool Plain(string? a, string? b) => SecretCompare.FixedTimeEquals(a, b);
#pragma warning restore CA1307

    /// <summary>
    /// Two equal non-empty secrets match, and different ones do not.
    /// True: a caller sending the right key passes and a wrong key does not.
    /// False: a wrong key would pass, or the right one would fail.
    /// </summary>
    [Theory]
    [InlineData("secret", "secret", true)]
    [InlineData("secret", "secreT", false)]
    [InlineData("secret", "secre", false)]
    [InlineData("secret", "secrets", false)]
    [InlineData("héllo", "héllo", true)]
    [InlineData("héllo", "hello", false)]
    public void FixedTimeEquals_ComparesTheBytes(string a, string b, bool expected)
    {
        Assert.Equal(expected, Plain(a, b));
    }

    /// <summary>
    /// A null or empty secret never matches, not even another empty one.
    /// True: an unset stored secret cannot be satisfied by an empty input.
    /// False: a missing key would let an empty request through.
    /// </summary>
    [Theory]
    [InlineData(null, null)]
    [InlineData("", "")]
    [InlineData(null, "")]
    [InlineData("", null)]
    [InlineData("secret", null)]
    [InlineData(null, "secret")]
    [InlineData("secret", "")]
    [InlineData("", "secret")]
    public void FixedTimeEquals_NeverMatchesNullOrEmpty(string? a, string? b)
    {
        Assert.False(Plain(a, b));
        Assert.False(SecretCompare.FixedTimeEquals(a, b, StringComparison.OrdinalIgnoreCase));
        Assert.False(SecretCompare.FixedTimeEquals(a, b, StringComparison.Ordinal));
    }

    /// <summary>
    /// The ordinal form matches the plain form, and the ignore case form matches tokens that differ only in case.
    /// True: a hex token matches however its case was written.
    /// False: an upper case hex token would not match its lower case copy.
    /// </summary>
    [Theory]
    [InlineData("abc123", "ABC123", StringComparison.OrdinalIgnoreCase, true)]
    [InlineData("abc123", "abc124", StringComparison.OrdinalIgnoreCase, false)]
    [InlineData("abc123", "ABC123", StringComparison.Ordinal, false)]
    [InlineData("abc123", "abc123", StringComparison.Ordinal, true)]
    public void FixedTimeEquals_WithAComparison_NormalizesCase(string a, string b, StringComparison comparison, bool expected)
    {
        Assert.Equal(expected, SecretCompare.FixedTimeEquals(a, b, comparison));
    }

    /// <summary>
    /// A comparison that depends on the culture is refused.
    /// True: a caller cannot pick a comparison that cannot be made constant time.
    /// False: a culture sensitive comparison would be treated as ordinal.
    /// </summary>
    [Theory]
    [InlineData(StringComparison.CurrentCulture)]
    [InlineData(StringComparison.CurrentCultureIgnoreCase)]
    [InlineData(StringComparison.InvariantCulture)]
    [InlineData(StringComparison.InvariantCultureIgnoreCase)]
    public void FixedTimeEquals_WithACultureComparison_Throws(StringComparison comparison)
    {
        Assert.Throws<ArgumentException>(() => SecretCompare.FixedTimeEquals("a", "a", comparison));
    }

    /// <summary>
    /// A hex token has twice as many lowercase hex characters as bytes, and two tokens differ.
    /// True: 32 bytes give 64 characters from the lowercase hex alphabet.
    /// False: the token would be the wrong size or alphabet, or repeat.
    /// </summary>
    [Theory]
    [InlineData(1)]
    [InlineData(16)]
    [InlineData(32)]
    public void NewTokenHex_HasTwoCharactersPerByte(int bytes)
    {
        var token = SecretCompare.NewTokenHex(bytes);

        Assert.Equal(bytes * 2, token.Length);
        Assert.All(token, c => Assert.True(char.IsAsciiHexDigitLower(c)));
        Assert.NotEqual(token, SecretCompare.NewTokenHex(bytes));
    }

    /// <summary>
    /// A base 64 URL token has no padding and only URL safe characters.
    /// True: 32 bytes give 43 characters that can go in a URL or a header.
    /// False: the token would carry plus, slash, or equals signs.
    /// </summary>
    [Theory]
    [InlineData(1, 2)]
    [InlineData(16, 22)]
    [InlineData(32, 43)]
    [InlineData(33, 44)]
    public void NewTokenBase64Url_IsUnpaddedAndUrlSafe(int bytes, int length)
    {
        var token = SecretCompare.NewTokenBase64Url(bytes);

        Assert.Equal(length, token.Length);
        Assert.All(token, c => Assert.True(char.IsAsciiLetterOrDigit(c) || c is '-' or '_'));
        Assert.NotEqual(token, SecretCompare.NewTokenBase64Url(bytes));
    }

    /// <summary>
    /// A token of no bytes is refused.
    /// True: a bad size fails where it is asked for.
    /// False: an empty token would pass for a secret.
    /// </summary>
    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void NewToken_WithNoBytes_Throws(int bytes)
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => SecretCompare.NewTokenHex(bytes));
        Assert.Throws<ArgumentOutOfRangeException>(() => SecretCompare.NewTokenBase64Url(bytes));
    }

    /// <summary>
    /// A new token compares equal to itself and not to another token.
    /// True: a token that was issued can be checked later.
    /// False: the comparison and the generator would disagree on the alphabet.
    /// </summary>
    [Fact]
    public void NewToken_RoundTripsThroughFixedTimeEquals()
    {
        var token = SecretCompare.NewTokenHex(32);

        Assert.True(SecretCompare.FixedTimeEquals(token, token.ToUpperInvariant(), StringComparison.OrdinalIgnoreCase));
        Assert.False(Plain(token, SecretCompare.NewTokenHex(32)));
        Assert.Equal(64, token.Length);
    }

    /// <summary>
    /// Strings that differ only in a lone surrogate are not equal.
    /// True: each lone surrogate is its own value.
    /// False: both would encode to the same replacement bytes and compare equal.
    /// </summary>
    [Fact]
    public void FixedTimeEquals_LoneSurrogatesThatDifferAreNotEqual()
    {
        Assert.False(SecretCompare.FixedTimeEquals("a\uD800", "a\uD801", StringComparison.Ordinal));
        Assert.False(SecretCompare.FixedTimeEquals("a\uD800", "a\uDC00", StringComparison.Ordinal));
        Assert.False(SecretCompare.FixedTimeEquals("\uD800", "\uD801", StringComparison.Ordinal));
        Assert.True(SecretCompare.FixedTimeEquals("a\uD800", "a\uD800", StringComparison.Ordinal));
        Assert.True(SecretCompare.FixedTimeEquals("k\U0001F600", "k\U0001F600", StringComparison.Ordinal));
    }
}
