using System;
using System.Buffers;
using System.Diagnostics;
using System.IO;
using System.Threading;
using System.Threading.Tasks;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// Copies a stream with an optional speed limit.
/// </summary>
/// <remarks>
/// <see cref="CopyThrottledAsync"/> is the preferred copy, since several copies can share one <see cref="SpeedBucket"/> and follow a rate that changes.
/// <see cref="CopyWithSpeedLimitAsync"/> limits one copy on its own.
/// </remarks>
public static class StreamUtilities
{
    private const int DefaultBufferSize = 81920;

    private static readonly TimeSpan DefaultRecheck = TimeSpan.FromSeconds(30);

    /// <summary>
    /// Gets the idle timeout that suits a download, two minutes with no data.
    /// </summary>
    public static TimeSpan DefaultIdleTimeout { get; } = TimeSpan.FromMinutes(2);

    /// <summary>
    /// Copies <paramref name="source"/> to <paramref name="destination"/>, pausing between reads to keep to <paramref name="bytesPerSecond"/>.
    /// </summary>
    /// <remarks>
    /// A <paramref name="bytesPerSecond"/> of zero or less disables the limit and copies at full speed.
    /// The pause is based on the time since the copy began, so it holds the average rate and allows a short burst after a slow read.
    /// A pause of 10 milliseconds or less is skipped. Neither stream is disposed.
    /// Prefer <see cref="CopyThrottledAsync"/> when several copies must share one limit.
    /// </remarks>
    /// <param name="source">The stream to read.</param>
    /// <param name="destination">The stream to write.</param>
    /// <param name="bytesPerSecond">The most bytes per second on average, or zero or less for no limit.</param>
    /// <param name="cancellationToken">The cancellation token, which stops the copy and the pauses.</param>
    /// <returns>A task that completes when the source has been copied.</returns>
    public static async Task CopyWithSpeedLimitAsync(
        Stream source,
        Stream destination,
        long bytesPerSecond,
        CancellationToken cancellationToken = default)
    {
        if (bytesPerSecond <= 0)
        {
            await source.CopyToAsync(destination, cancellationToken).ConfigureAwait(false);
            return;
        }

        var buffer = new byte[DefaultBufferSize];
        var stopwatch = Stopwatch.StartNew();
        long totalBytesRead = 0;

        int bytesRead;
        while ((bytesRead = await source.ReadAsync(buffer, cancellationToken).ConfigureAwait(false)) > 0)
        {
            await destination.WriteAsync(buffer.AsMemory(0, bytesRead), cancellationToken).ConfigureAwait(false);
            totalBytesRead += bytesRead;

            var expectedTime = (double)totalBytesRead / bytesPerSecond * 1000;
            var actualTime = stopwatch.ElapsedMilliseconds;

            if (actualTime < expectedTime)
            {
                var delay = (int)Math.Min(expectedTime - actualTime, int.MaxValue);
                if (delay > 10)
                {
                    await Task.Delay(delay, cancellationToken).ConfigureAwait(false);
                }
            }
        }
    }

    /// <summary>
    /// Copies <paramref name="source"/> to <paramref name="destination"/> under a <see cref="SpeedBucket"/> that other copies may share, so the limit is the total across them.
    /// The rate is read again as the copy runs, so a long copy follows a schedule as its hours begin and end.
    /// </summary>
    /// <remarks>
    /// With no <paramref name="rate"/> the bucket keeps the rate it has. With one, the rate is read when the copy starts and again whenever <paramref name="recheck"/> has passed, and a value above zero is set on the bucket.
    /// A rate of zero or less lifts the limit until the next check, and the bucket is not charged for those bytes.
    /// Neither stream is disposed.
    /// </remarks>
    /// <param name="source">The stream to read.</param>
    /// <param name="destination">The stream to write.</param>
    /// <param name="bucket">The shared rate.</param>
    /// <param name="rate">An optional function that gives the current bytes per second, or zero or less for no limit.</param>
    /// <param name="recheck">How often to call <paramref name="rate"/>. 30 seconds by default.</param>
    /// <param name="cancellationToken">The cancellation token, which stops the copy and the waits.</param>
    /// <returns>A task that completes when the source has been copied.</returns>
    public static Task CopyThrottledAsync(
        Stream source,
        Stream destination,
        SpeedBucket bucket,
        Func<long>? rate = null,
        TimeSpan? recheck = null,
        CancellationToken cancellationToken = default)
        => CopyThrottledAsync(source, destination, bucket, rate, recheck ?? DefaultRecheck, Task.Delay, static () => Stopwatch.GetElapsedTime(0), cancellationToken);

    internal static async Task CopyThrottledAsync(
        Stream source,
        Stream destination,
        SpeedBucket bucket,
        Func<long>? rate,
        TimeSpan recheck,
        Func<TimeSpan, CancellationToken, Task> delay,
        Func<TimeSpan> clock,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(source);
        ArgumentNullException.ThrowIfNull(destination);
        ArgumentNullException.ThrowIfNull(bucket);

        var buffer = ArrayPool<byte>.Shared.Rent(DefaultBufferSize);
        try
        {
            var limited = Apply(bucket, rate);
            var checkedAt = clock();
            int read;
            while ((read = await source.ReadAsync(buffer.AsMemory(0, DefaultBufferSize), cancellationToken).ConfigureAwait(false)) > 0)
            {
                await destination.WriteAsync(buffer.AsMemory(0, read), cancellationToken).ConfigureAwait(false);
                if (rate is not null && clock() - checkedAt > recheck)
                {
                    limited = Apply(bucket, rate);
                    checkedAt = clock();
                }

                if (limited && bucket.Take(read) is { } wait && wait > TimeSpan.Zero)
                {
                    await delay(wait, cancellationToken).ConfigureAwait(false);
                }
            }
        }
        finally
        {
            ArrayPool<byte>.Shared.Return(buffer);
        }
    }

    /// <summary>
    /// Runs a copy under an idle timeout, so a source that stops sending fails the copy instead of hanging it.
    /// An <see cref="System.Net.Http.HttpClient"/> timeout ends once the headers arrive, so a body that stalls part way needs this.
    /// </summary>
    /// <remarks>
    /// The timer starts with the copy and starts again after every read that returns bytes.
    /// A copy that receives nothing for <paramref name="idleTimeout"/> fails with an <see cref="IOException"/>, which a retry treats as transient.
    /// Pass <paramref name="copy"/> to run another copy under the watch, such as <see cref="CopyThrottledAsync(Stream, Stream, SpeedBucket, Func{long}?, TimeSpan?, CancellationToken)"/>, so throttling and stall detection share one copy.
    /// A cancellation through <paramref name="cancellationToken"/> is reported as a cancellation, never as a stall. Neither stream is disposed.
    /// </remarks>
    /// <param name="source">The stream to read.</param>
    /// <param name="destination">The stream to write.</param>
    /// <param name="idleTimeout">How long the source may send nothing. <see cref="DefaultIdleTimeout"/> suits a download.</param>
    /// <param name="copy">The copy to run, given the watched source, the destination, and the watch's token. A plain copy by default.</param>
    /// <param name="cancellationToken">The cancellation token, which stops the copy without reporting a stall.</param>
    /// <returns>A task that completes when the source has been copied.</returns>
    /// <exception cref="IOException">The source sent nothing for <paramref name="idleTimeout"/>.</exception>
    public static async Task CopyWithIdleTimeoutAsync(
        Stream source,
        Stream destination,
        TimeSpan idleTimeout,
        Func<Stream, Stream, CancellationToken, Task>? copy = null,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(source);
        ArgumentNullException.ThrowIfNull(destination);
        ArgumentOutOfRangeException.ThrowIfLessThanOrEqual(idleTimeout, TimeSpan.Zero);
        copy ??= static (from, to, token) => from.CopyToAsync(to, token);

        using var stall = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        stall.CancelAfter(idleTimeout);
        var watched = new IdleWatchStream(source, () => stall.CancelAfter(idleTimeout));
        try
        {
            await copy(watched, destination, stall.Token).ConfigureAwait(false);
        }
        catch (Exception ex) when (stall.IsCancellationRequested && !cancellationToken.IsCancellationRequested)
        {
            throw new IOException("The copy stalled. No data arrived for " + idleTimeout.TotalSeconds.ToString("F0", System.Globalization.CultureInfo.InvariantCulture) + " seconds.", ex);
        }
    }

    private static bool Apply(SpeedBucket bucket, Func<long>? rate)
    {
        if (rate is null)
        {
            return true;
        }

        var current = rate();
        if (current <= 0)
        {
            return false;
        }

        bucket.SetRate(current);
        return true;
    }

    // A read through wrapper that calls back after every read that returns bytes, so the idle timer can start again.
    // It does not own the inner stream.
    private sealed class IdleWatchStream : Stream
    {
        [System.Diagnostics.CodeAnalysis.SuppressMessage("Usage", "CA2213:Disposable fields should be disposed", Justification = "The caller owns the inner stream.")]
        private readonly Stream _inner;
        private readonly Action _onData;

        public IdleWatchStream(Stream inner, Action onData)
        {
            _inner = inner;
            _onData = onData;
        }

        public override bool CanRead => _inner.CanRead;

        public override bool CanSeek => false;

        public override bool CanWrite => false;

        public override long Length => throw new NotSupportedException();

        public override long Position
        {
            get => throw new NotSupportedException();
            set => throw new NotSupportedException();
        }

        public override void Flush()
        {
        }

        public override int Read(byte[] buffer, int offset, int count) => Advance(_inner.Read(buffer, offset, count));

        public override int Read(Span<byte> buffer) => Advance(_inner.Read(buffer));

        public override async Task<int> ReadAsync(byte[] buffer, int offset, int count, CancellationToken cancellationToken)
            => Advance(await _inner.ReadAsync(buffer.AsMemory(offset, count), cancellationToken).ConfigureAwait(false));

        public override async ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken cancellationToken = default)
            => Advance(await _inner.ReadAsync(buffer, cancellationToken).ConfigureAwait(false));

        public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();

        public override void SetLength(long value) => throw new NotSupportedException();

        public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();

        private int Advance(int read)
        {
            if (read > 0)
            {
                _onData();
            }

            return read;
        }
    }
}
