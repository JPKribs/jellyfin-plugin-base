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
}
