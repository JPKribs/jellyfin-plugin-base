using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// Reads a stream into memory with a size limit, so a body from another machine cannot fill the memory.
/// </summary>
public static class StreamLimits
{
    private const int ChunkBytes = 81920;

    /// <summary>
    /// Reads a stream to its end and returns the bytes, or <c>null</c> when it holds more than <paramref name="max"/>.
    /// A seekable stream that is already known to be too long is refused without reading it.
    /// </summary>
    /// <remarks>
    /// Exactly <paramref name="max"/> bytes is accepted. The stream is read from its current position and is not disposed.
    /// A read that fails or is cancelled throws as usual, and only an oversize body gives <c>null</c>.
    /// A byte array cannot hold more than <see cref="Array.MaxLength"/> bytes, so a larger <paramref name="max"/> counts as that, and a stream longer than an array can hold gives <c>null</c> instead of running out of memory.
    /// </remarks>
    /// <param name="stream">The stream to read.</param>
    /// <param name="max">The most bytes to accept, zero or more.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The bytes, or <c>null</c> when the stream is longer than the limit.</returns>
    public static async Task<byte[]?> ReadCappedAsync(Stream stream, long max, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(stream);
        ArgumentOutOfRangeException.ThrowIfNegative(max);

        max = Math.Min(max, Array.MaxLength);
        if (stream.CanSeek && stream.Length - stream.Position > max)
        {
            return null;
        }

        using var buffer = new MemoryStream();
        var chunk = new byte[ChunkBytes];
        int read;
        while ((read = await stream.ReadAsync(chunk, cancellationToken).ConfigureAwait(false)) > 0)
        {
            if (buffer.Length + read > max)
            {
                return null;
            }

            await buffer.WriteAsync(chunk.AsMemory(0, read), cancellationToken).ConfigureAwait(false);
        }

        return buffer.ToArray();
    }
}
