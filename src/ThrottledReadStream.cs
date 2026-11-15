using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// A read through wrapper that holds reads to the rate of a <see cref="SpeedBucket"/>, which other streams may share.
/// It stays seekable when the inner stream is, so a response that serves byte ranges from it still can.
/// </summary>
/// <remarks>
/// The wrapper owns the inner stream and disposes it. A synchronous read sleeps for the wait, so prefer the asynchronous read on a server thread.
/// </remarks>
public sealed class ThrottledReadStream : Stream
{
    private readonly Stream _inner;
    private readonly SpeedBucket _bucket;
    private readonly Func<TimeSpan, CancellationToken, Task> _delay;
    private readonly Action<TimeSpan> _sleep;
    private int _disposed;

    /// <summary>
    /// Initializes a new instance of the <see cref="ThrottledReadStream"/> class.
    /// </summary>
    /// <param name="inner">The stream to read from. It is disposed with this wrapper.</param>
    /// <param name="bucket">The rate, shared with any other stream held to it.</param>
    public ThrottledReadStream(Stream inner, SpeedBucket bucket)
        : this(inner, bucket, Task.Delay, Thread.Sleep)
    {
    }

    internal ThrottledReadStream(Stream inner, SpeedBucket bucket, Func<TimeSpan, CancellationToken, Task> delay, Action<TimeSpan> sleep)
    {
        ArgumentNullException.ThrowIfNull(inner);
        ArgumentNullException.ThrowIfNull(bucket);
        _inner = inner;
        _bucket = bucket;
        _delay = delay;
        _sleep = sleep;
    }

    /// <inheritdoc />
    public override bool CanRead => _inner.CanRead;

    /// <inheritdoc />
    public override bool CanSeek => _inner.CanSeek;

    /// <inheritdoc />
    public override bool CanWrite => false;

    /// <inheritdoc />
    public override long Length => _inner.Length;

    /// <inheritdoc />
    public override long Position
    {
        get => _inner.Position;
        set => _inner.Position = value;
    }

    /// <inheritdoc />
    public override void Flush()
    {
    }

    /// <inheritdoc />
    public override int Read(byte[] buffer, int offset, int count)
    {
        var read = _inner.Read(buffer, offset, count);
        var wait = _bucket.Take(read);
        if (wait > TimeSpan.Zero)
        {
            _sleep(wait);
        }

        return read;
    }

    /// <inheritdoc />
    public override Task<int> ReadAsync(byte[] buffer, int offset, int count, CancellationToken cancellationToken)
        => ReadAsync(buffer.AsMemory(offset, count), cancellationToken).AsTask();

    /// <inheritdoc />
    public override async ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken cancellationToken = default)
    {
        var read = await _inner.ReadAsync(buffer, cancellationToken).ConfigureAwait(false);
        var wait = _bucket.Take(read);
        if (wait > TimeSpan.Zero)
        {
            await _delay(wait, cancellationToken).ConfigureAwait(false);
        }

        return read;
    }

    /// <inheritdoc />
    public override long Seek(long offset, SeekOrigin origin) => _inner.Seek(offset, origin);

    /// <inheritdoc />
    public override void SetLength(long value) => throw new NotSupportedException();

    /// <inheritdoc />
    public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();

    /// <inheritdoc />
    public override async ValueTask DisposeAsync()
    {
        if (Interlocked.Exchange(ref _disposed, 1) == 0)
        {
            await _inner.DisposeAsync().ConfigureAwait(false);
        }

        await base.DisposeAsync().ConfigureAwait(false);
    }

    /// <inheritdoc />
    protected override void Dispose(bool disposing)
    {
        if (disposing && Interlocked.Exchange(ref _disposed, 1) == 0)
        {
            _inner.Dispose();
        }

        base.Dispose(disposing);
    }
}
