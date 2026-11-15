using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>Verifies that <see cref="StreamUtilities"/> copies a whole stream, with or without a speed limit, and that a shared bucket holds the total rate.</summary>
public class StreamUtilitiesTests
{
    private static byte[] Data(int length)
    {
        var data = new byte[length];
        for (var i = 0; i < length; i++)
        {
            data[i] = (byte)(i % 251);
        }

        return data;
    }

    /// <summary>
    /// A limit of zero or less copies every byte at full speed.
    /// True: no limit means the stream is copied whole.
    /// False: a zero limit would divide by zero or copy nothing.
    /// </summary>
    [Theory]
    [InlineData(0L)]
    [InlineData(-1L)]
    public async Task CopyWithSpeedLimitAsync_NoLimit_CopiesEverything(long limit)
    {
        var data = Data(200_000);
        using var source = new MemoryStream(data);
        using var destination = new MemoryStream();

        await StreamUtilities.CopyWithSpeedLimitAsync(source, destination, limit);

        Assert.Equal(data, destination.ToArray());
    }

    /// <summary>
    /// A limit far above the stream's size copies every byte across several buffers without waiting.
    /// True: a high limit does not slow the copy or lose bytes at a buffer boundary.
    /// False: the copy would stop after the first buffer or wait.
    /// </summary>
    [Fact]
    public async Task CopyWithSpeedLimitAsync_HighLimit_CopiesEverything()
    {
        var data = Data(200_000);
        using var source = new MemoryStream(data);
        using var destination = new MemoryStream();

        await StreamUtilities.CopyWithSpeedLimitAsync(source, destination, 1_000_000_000L);

        Assert.Equal(data, destination.ToArray());
    }

    /// <summary>
    /// An empty source copies nothing and finishes.
    /// True: an empty file is not an error.
    /// False: the copy would hang or throw.
    /// </summary>
    [Fact]
    public async Task CopyWithSpeedLimitAsync_EmptySource_CopiesNothing()
    {
        using var source = new MemoryStream();
        using var destination = new MemoryStream();

        await StreamUtilities.CopyWithSpeedLimitAsync(source, destination, 1_000_000_000L);

        Assert.Equal(0, destination.Length);
    }

    /// <summary>
    /// A cancelled token stops the copy, with or without a limit.
    /// True: a shutdown stops a long transfer.
    /// False: the copy would run to the end.
    /// </summary>
    [Theory]
    [InlineData(0L)]
    [InlineData(1_000_000_000L)]
    public async Task CopyWithSpeedLimitAsync_CancelledToken_Throws(long limit)
    {
        using var source = new MemoryStream(Data(1000));
        using var destination = new MemoryStream();
        using var cts = new CancellationTokenSource();
        await cts.CancelAsync();

        await Assert.ThrowsAnyAsync<OperationCanceledException>(
            () => StreamUtilities.CopyWithSpeedLimitAsync(source, destination, limit, cts.Token));
    }

    /// <summary>
    /// The source and destination are left open.
    /// True: the caller decides when to dispose them.
    /// False: the copy would close a stream the caller still needs.
    /// </summary>
    [Fact]
    public async Task CopyWithSpeedLimitAsync_LeavesStreamsOpen()
    {
        using var source = new MemoryStream(Data(10));
        using var destination = new MemoryStream();

        await StreamUtilities.CopyWithSpeedLimitAsync(source, destination, 1_000_000_000L);

        Assert.True(source.CanRead);
        Assert.True(destination.CanWrite);
    }

    private static async Task<List<TimeSpan>> CopyAsync(
        byte[] data,
        SpeedBucket bucket,
        Func<long>? rate,
        TimeSpan recheck,
        Func<TimeSpan> clock,
        MemoryStream? destination = null)
    {
        var waits = new List<TimeSpan>();
        using var source = new MemoryStream(data);
        destination ??= new MemoryStream();

        await StreamUtilities.CopyThrottledAsync(
            source,
            destination,
            bucket,
            rate,
            recheck,
            (wait, _) =>
            {
                waits.Add(wait);
                return Task.CompletedTask;
            },
            clock,
            CancellationToken.None);

        return waits;
    }

    /// <summary>
    /// A shared copy writes every byte, and a bucket with a large burst makes it wait for nothing.
    /// True: a high limit does not slow the copy or lose bytes at a buffer boundary.
    /// False: the copy would stop after the first buffer or wait.
    /// </summary>
    [Fact]
    public async Task CopyThrottledAsync_WithinTheBurst_CopiesEverythingWithoutWaiting()
    {
        var data = Data(200_000);
        using var destination = new MemoryStream();

        var waits = await CopyAsync(data, new SpeedBucket(100_000, 100, () => TimeSpan.Zero), null, TimeSpan.FromSeconds(30), () => TimeSpan.Zero, destination);

        Assert.Equal(data, destination.ToArray());
        Assert.Empty(waits);
    }

    /// <summary>
    /// A copy past the bucket's burst waits for the debt after each block, and the last wait covers every byte copied.
    /// True: 200,000 bytes at 100,000 bytes a second end with a two second wait.
    /// False: the copy would run faster than the shared limit.
    /// </summary>
    [Fact]
    public async Task CopyThrottledAsync_PastTheBurst_WaitsForTheDebt()
    {
        var waits = await CopyAsync(Data(200_000), new SpeedBucket(100_000, 0, () => TimeSpan.Zero), null, TimeSpan.FromSeconds(30), () => TimeSpan.Zero);

        Assert.Equal(3, waits.Count);
        Assert.Equal(TimeSpan.FromSeconds(2), waits[2]);
        Assert.True(waits[0] < waits[1] && waits[1] < waits[2]);
    }

    /// <summary>
    /// Two copies that share a bucket share its rate.
    /// True: the second copy waits for the debt the first one left.
    /// False: each copy would get the full rate, so the limit would not be a total.
    /// </summary>
    [Fact]
    public async Task CopyThrottledAsync_SharesTheBucketBetweenCopies()
    {
        var bucket = new SpeedBucket(1000, 0, () => TimeSpan.Zero);

        var first = await CopyAsync(Data(1000), bucket, null, TimeSpan.FromSeconds(30), () => TimeSpan.Zero);
        var second = await CopyAsync(Data(1000), bucket, null, TimeSpan.FromSeconds(30), () => TimeSpan.Zero);

        Assert.Equal(new[] { TimeSpan.FromSeconds(1) }, first);
        Assert.Equal(new[] { TimeSpan.FromSeconds(2) }, second);
    }

    /// <summary>
    /// The rate function is read when the copy starts and sets the bucket's rate.
    /// True: a copy started with a rate of 100,000 waits as 100,000 bytes a second.
    /// False: the bucket would keep the rate it was made with.
    /// </summary>
    [Fact]
    public async Task CopyThrottledAsync_AppliesTheRateAtTheStart()
    {
        var bucket = new SpeedBucket(1, 0, () => TimeSpan.Zero);

        var waits = await CopyAsync(Data(1000), bucket, () => 1000, TimeSpan.FromSeconds(30), () => TimeSpan.Zero);

        Assert.Equal(new[] { TimeSpan.FromSeconds(1) }, waits);
    }

    /// <summary>
    /// The rate is read again after the recheck interval and a new value takes effect for the next block.
    /// True: a copy that starts with no limit is limited once the scheduled hours begin.
    /// False: a long download would keep the rate it started with.
    /// </summary>
    [Fact]
    public async Task CopyThrottledAsync_FollowsARateThatChanges()
    {
        var rates = new Queue<long>(new long[] { 0, 100_000 });
        long last = 0;
        var calls = 0;
        var now = TimeSpan.Zero;

        var waits = await CopyAsync(
            Data(200_000),
            new SpeedBucket(1, 0, () => TimeSpan.Zero),
            () =>
            {
                calls++;
                last = rates.Count > 0 ? rates.Dequeue() : last;
                return last;
            },
            TimeSpan.FromSeconds(5),
            () => now += TimeSpan.FromSeconds(10));

        Assert.Equal(3, waits.Count);
        Assert.Equal(TimeSpan.FromSeconds(2), waits[2]);
        Assert.Equal(4, calls);
    }

    /// <summary>
    /// A rate of zero lifts the limit, and the bucket is not charged for the bytes copied meanwhile.
    /// True: an unlimited hour copies at full speed and leaves the bucket's time alone.
    /// False: unlimited bytes would run up a debt that slows the next limited copy.
    /// </summary>
    [Fact]
    public async Task CopyThrottledAsync_WithARateOfZero_DoesNotWaitOrTouchTheBucket()
    {
        var clock = TimeSpan.FromSeconds(42);
        var bucket = new SpeedBucket(100, 0, () => clock);
        clock = TimeSpan.FromSeconds(99);

        var waits = await CopyAsync(Data(200_000), bucket, () => 0, TimeSpan.FromSeconds(30), () => TimeSpan.Zero);

        Assert.Empty(waits);
        Assert.Equal(TimeSpan.FromSeconds(42), bucket.LastUsed);
    }

    /// <summary>
    /// The rate function is not called again before the recheck interval has passed.
    /// True: a copy that is quick costs one call.
    /// False: the schedule would be looked up for every block.
    /// </summary>
    [Fact]
    public async Task CopyThrottledAsync_DoesNotRecheckTooSoon()
    {
        var calls = 0;

        await CopyAsync(Data(500_000), new SpeedBucket(1, 1000, () => TimeSpan.Zero), () =>
        {
            calls++;
            return 1000;
        }, TimeSpan.FromSeconds(30), () => TimeSpan.Zero);

        Assert.Equal(1, calls);
    }

    /// <summary>
    /// The public overload copies with the real clock and delay, and leaves both streams open.
    /// True: a plain call works and the caller disposes its streams.
    /// False: the default delay or clock would be missing, or a stream would be closed.
    /// </summary>
    [Fact]
    public async Task CopyThrottledAsync_PublicOverload_CopiesAndLeavesStreamsOpen()
    {
        var data = Data(1000);
        using var source = new MemoryStream(data);
        using var destination = new MemoryStream();

        await StreamUtilities.CopyThrottledAsync(source, destination, new SpeedBucket(1_000_000, 10), () => 1_000_000, TimeSpan.FromSeconds(1));

        Assert.Equal(data, destination.ToArray());
        Assert.True(source.CanRead);
        Assert.True(destination.CanWrite);
    }

    /// <summary>
    /// A cancelled token stops the copy, and a missing argument is refused.
    /// True: a shutdown stops a long transfer.
    /// False: the copy would run to the end.
    /// </summary>
    [Fact]
    public async Task CopyThrottledAsync_RejectsCancellationAndBadArguments()
    {
        using var cts = new CancellationTokenSource();
        await cts.CancelAsync();
        using var source = new MemoryStream(Data(10));
        using var destination = new MemoryStream();
        var bucket = new SpeedBucket(100);

        await Assert.ThrowsAnyAsync<OperationCanceledException>(
            () => StreamUtilities.CopyThrottledAsync(source, destination, bucket, null, null, cts.Token));
        await Assert.ThrowsAsync<ArgumentNullException>(() => StreamUtilities.CopyThrottledAsync(null!, destination, bucket));
        await Assert.ThrowsAsync<ArgumentNullException>(() => StreamUtilities.CopyThrottledAsync(source, null!, bucket));
        await Assert.ThrowsAsync<ArgumentNullException>(() => StreamUtilities.CopyThrottledAsync(source, destination, null!));
    }
}
