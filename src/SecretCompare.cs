using System;
using System.Buffers.Text;
using System.Security.Cryptography;
using System.Runtime.InteropServices;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// Compares secrets without a timing signal and makes new random tokens.
/// Use it for an API key, a token, or a signature, and never compare one with <c>==</c>.
/// </summary>
/// <remarks>
/// The comparison takes the same time for any two values of the same length, so it does not show how many leading bytes matched.
/// It does show the length, since values of different lengths are refused at once, which is fine for tokens of a fixed size.
/// The UTF-16 code units are compared as they are, so two strings that differ only in a lone surrogate are never equal.
/// </remarks>
public static class SecretCompare
{
    /// <summary>
    /// Compares two secrets in constant time over their UTF-16 code units.
    /// </summary>
    /// <remarks>A <c>null</c> or empty value never matches, not even another empty value, so an unset secret cannot be satisfied by an empty input.</remarks>
    /// <param name="a">The first secret, such as the stored one.</param>
    /// <param name="b">The second secret, such as the one a caller sent.</param>
    /// <returns><c>true</c> when both are non-empty and equal, otherwise <c>false</c>.</returns>
    public static bool FixedTimeEquals(string? a, string? b)
    {
        return Equal(a, b);
    }

    /// <summary>
    /// Compares two secrets in constant time after normalizing their case when asked.
    /// </summary>
    /// <remarks>
    /// Only <see cref="StringComparison.Ordinal"/> and <see cref="StringComparison.OrdinalIgnoreCase"/> are accepted, since a culture sensitive comparison cannot be made constant time.
    /// The ignore case form upper cases both sides with the invariant culture first, so the case of a hex token does not matter.
    /// </remarks>
    /// <param name="a">The first secret.</param>
    /// <param name="b">The second secret.</param>
    /// <param name="comparison">Either <see cref="StringComparison.Ordinal"/> or <see cref="StringComparison.OrdinalIgnoreCase"/>.</param>
    /// <returns><c>true</c> when both are non-empty and equal under the comparison, otherwise <c>false</c>.</returns>
    public static bool FixedTimeEquals(string? a, string? b, StringComparison comparison)
    {
        switch (comparison)
        {
            case StringComparison.Ordinal:
                return Equal(a, b);
            case StringComparison.OrdinalIgnoreCase:
                return Equal(a?.ToUpperInvariant(), b?.ToUpperInvariant());
            default:
                throw new ArgumentException("Only Ordinal and OrdinalIgnoreCase can be compared in constant time.", nameof(comparison));
        }
    }

    /// <summary>
    /// Makes a random token from the system's cryptographic generator, written as lowercase hex.
    /// </summary>
    /// <param name="bytes">The number of random bytes, so the token is twice as many characters. 32 gives 256 bits.</param>
    /// <returns>The token.</returns>
    public static string NewTokenHex(int bytes)
    {
        ArgumentOutOfRangeException.ThrowIfLessThan(bytes, 1);
        return Convert.ToHexStringLower(RandomNumberGenerator.GetBytes(bytes));
    }

    /// <summary>
    /// Makes a random token from the system's cryptographic generator, written as URL safe base 64 with no padding.
    /// </summary>
    /// <param name="bytes">The number of random bytes. 32 gives 256 bits in 43 characters.</param>
    /// <returns>The token, which holds only letters, digits, <c>-</c>, and <c>_</c>.</returns>
    public static string NewTokenBase64Url(int bytes)
    {
        ArgumentOutOfRangeException.ThrowIfLessThan(bytes, 1);
        return Base64Url.EncodeToString(RandomNumberGenerator.GetBytes(bytes));
    }

    private static bool Equal(string? a, string? b)
    {
        if (string.IsNullOrEmpty(a) || string.IsNullOrEmpty(b))
        {
            return false;
        }

        return CryptographicOperations.FixedTimeEquals(MemoryMarshal.AsBytes(a.AsSpan()), MemoryMarshal.AsBytes(b.AsSpan()));
    }
}
