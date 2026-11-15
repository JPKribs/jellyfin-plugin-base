using System;
using System.Diagnostics.CodeAnalysis;
using System.IO;
using System.Threading;
using System.Threading.Tasks;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// A read through wrapper that fails once more than a set number of bytes has been read.
/// Wrap a body from another machine so one that sends more than it promised cannot fill the disk.
/// </summary>
/// <remarks>
/// The read that crosses the limit throws an <see cref="IOException"/>, so a copy stops there with part of the data written.
/// The wrapper does not own the inner stream and never disposes it. It cannot seek or write.
/// </remarks>
public sealed class CappedReadStream : Stream
{
    [SuppressMessage("Usage", "CA2213:Disposable fields should be disposed", Justification = "The caller owns the inner stream.")]
    private readonly Stream _inner;
    private readonly long _max;
    private long _read;

    /// <summary>
    /// Initializes a new instance of the <see cref="CappedReadStream"/> class.
    /// </summary>
    /// <param name="inner">The stream to read from. It is not disposed by this wrapper.</param>
    /// <param name="max">The most bytes that may be read, zero or more.</param>
    public CappedReadStream(Stream inner, long max)
    {
        ArgumentNullException.ThrowIfNull(inner);
        ArgumentOutOfRangeException.ThrowIfNegative(max);
        _inner = inner;
        _max = max;
    }

    /// <inheritdoc />
    public override bool CanRead => _inner.CanRead;

    /// <inheritdoc />
    public override bool CanSeek => false;

    /// <inheritdoc />
    public override bool CanWrite => false;

    /// <inheritdoc />
    public override long Length => throw new NotSupportedException();

    /// <inheritdoc />
    public override long Position
    {
        get => throw new NotSupportedException();
        set => throw new NotSupportedException();
    }

    /// <inheritdoc />
    public override void Flush()
    {
    }

    /// <inheritdoc />
    public override int Read(byte[] buffer, int offset, int count) => Count(_inner.Read(buffer, offset, count));

    /// <inheritdoc />
    public override async Task<int> ReadAsync(byte[] buffer, int offset, int count, CancellationToken cancellationToken)
        => Count(await _inner.ReadAsync(buffer.AsMemory(offset, count), cancellationToken).ConfigureAwait(false));

    /// <inheritdoc />
    public override async ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken cancellationToken = default)
        => Count(await _inner.ReadAsync(buffer, cancellationToken).ConfigureAwait(false));

    /// <inheritdoc />
    public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();

    /// <inheritdoc />
    public override void SetLength(long value) => throw new NotSupportedException();

    /// <inheritdoc />
    public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();

    private int Count(int read)
    {
        _read += read;
        if (_read > _max)
        {
            throw new IOException($"The stream held more than the {_max} bytes allowed.");
        }

        return read;
    }
}
