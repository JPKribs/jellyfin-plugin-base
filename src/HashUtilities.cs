using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// Content fingerprints built from SHA-256, for comparing content and not for security.
/// </summary>
/// <remarks>
/// The <c>ComputeSha256Hash</c> overloads and <c>ComputeSha256HashAsync</c> return only the first 32 hex characters, which is 128 bits of the 256 bit hash, and a result never equals a full SHA-256 hex digest.
/// <see cref="Sha256Hex"/> returns up to the full 64 characters.
/// </remarks>
public static class HashUtilities
{
    /// <summary>
    /// Computes a 32 character lowercase hex fingerprint of a stream.
    /// </summary>
    /// <remarks>The stream is read from its current position to its end. It is not rewound and not disposed.</remarks>
    /// <param name="stream">The stream to read.</param>
    /// <returns>The fingerprint.</returns>
    public static string ComputeSha256Hash(Stream stream)
    {
        using var sha256 = SHA256.Create();
        var hashBytes = sha256.ComputeHash(stream);
        return System.Convert.ToHexString(hashBytes).ToLowerInvariant()[..32];
    }

    /// <summary>
    /// Computes a 32 character lowercase hex fingerprint of a string encoded as UTF-8.
    /// </summary>
    /// <param name="value">The text to fingerprint. <c>null</c> counts as empty.</param>
    /// <returns>The fingerprint.</returns>
    public static string ComputeSha256Hash(string? value)
    {
        var bytes = Encoding.UTF8.GetBytes(value ?? string.Empty);
        var hashBytes = SHA256.HashData(bytes);
        return System.Convert.ToHexString(hashBytes).ToLowerInvariant()[..32];
    }

    /// <summary>
    /// Computes the SHA-256 of a stream and counts its bytes in one pass, without blocking a thread.
    /// The hash is the same 32 character fingerprint <see cref="ComputeSha256Hash(Stream)"/> gives.
    /// </summary>
    /// <remarks>The stream is read from its current position to its end. It is not rewound and not disposed.</remarks>
    /// <param name="stream">The stream to read.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The fingerprint and the number of bytes that were read.</returns>
    public static async Task<(string Hash, long Length)> ComputeSha256HashAsync(Stream stream, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(stream);

        using var sha256 = IncrementalHash.CreateHash(HashAlgorithmName.SHA256);
        var buffer = new byte[81920];
        long length = 0;
        int read;
        while ((read = await stream.ReadAsync(buffer, cancellationToken).ConfigureAwait(false)) > 0)
        {
            sha256.AppendData(buffer, 0, read);
            length += read;
        }

        return (System.Convert.ToHexString(sha256.GetHashAndReset()).ToLowerInvariant()[..32], length);
    }

    /// <summary>
    /// Computes the SHA-256 of a string encoded as UTF-8, as lowercase hex, optionally cut to a shorter length.
    /// </summary>
    /// <param name="value">The text to hash. <c>null</c> counts as empty.</param>
    /// <param name="length">The number of leading hex characters to return, from 1 to 64. 64 by default, which is the whole digest.</param>
    /// <returns>The lowercase hex digest.</returns>
    public static string Sha256Hex(string? value, int length = 64)
    {
        ArgumentOutOfRangeException.ThrowIfLessThan(length, 1);
        ArgumentOutOfRangeException.ThrowIfGreaterThan(length, 64);

        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(value ?? string.Empty));
        return System.Convert.ToHexString(hash).ToLowerInvariant()[..length];
    }
}
