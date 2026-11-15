using System;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>Verifies that <see cref="SpeedBucket"/> lets a burst through, then holds a rate, and reads its time from a clock the test controls.</summary>
public class SpeedBucketTests
{
    private sealed class Clock
    {
        public TimeSpan Now { get; set; }
    }

    /// <summary>
    /// A new bucket holds its burst, so a read inside it waits for nothing.
    /// True: the first three seconds of a stream at 100 bytes a second go through unthrottled.
    /// False: every stream would crawl from its first byte.
    /// </summary>
    [Fact]
    public void Take_WithinTheBurst_DoesNotWait()
    {
        var clock = new Clock();
        var bucket = new SpeedBucket(100, 3, () => clock.Now);

        Assert.Equal(TimeSpan.Zero, bucket.Take(300));
    }

    /// <summary>
    /// A read past the burst waits for the time the missing bytes take at the rate.
    /// True: 100 bytes over the burst at 100 bytes a second waits one second.
    /// False: a stream would run faster than its limit.
    /// </summary>
    [Fact]
    public void Take_PastTheBurst_WaitsForTheDebt()
    {
        var clock = new Clock();
        var bucket = new SpeedBucket(100, 3, () => clock.Now);
        bucket.Take(300);

        Assert.Equal(TimeSpan.FromSeconds(1), bucket.Take(100));
        Assert.Equal(TimeSpan.FromSeconds(2), bucket.Take(100));
    }

    /// <summary>
    /// A bucket made with no burst holds a stream to its rate from the first byte.
    /// True: 100 bytes at 100 bytes a second waits one second.
    /// False: the default would allow a burst the caller did not ask for.
    /// </summary>
    [Fact]
    public void Take_WithNoBurst_WaitsFromTheFirstByte()
    {
        var clock = new Clock();
        var bucket = new SpeedBucket(100, now: () => clock.Now);

        Assert.Equal(0, bucket.BurstSeconds);
        Assert.Equal(TimeSpan.FromSeconds(1), bucket.Take(100));
        clock.Now = TimeSpan.FromSeconds(1);
        Assert.Equal(TimeSpan.FromSeconds(1), bucket.Take(100));
    }

    /// <summary>
    /// Time passing pays the debt back at the rate.
    /// True: after two seconds a 100 byte debt is cleared and 50 bytes are free again.
    /// False: a stream that slowed down would never speed up.
    /// </summary>
    [Fact]
    public void Take_AfterTimePasses_RepaysTheDebt()
    {
        var clock = new Clock();
        var bucket = new SpeedBucket(100, 3, () => clock.Now);
        bucket.Take(300);
        bucket.Take(100);
        clock.Now = TimeSpan.FromSeconds(2);

        Assert.Equal(TimeSpan.Zero, bucket.Take(50));
    }

    /// <summary>
    /// Idle time never banks more than the burst.
    /// True: after a long pause only three seconds of bytes are free, and one byte more waits 10 milliseconds.
    /// False: a stream paused for an hour could then read at full speed for an hour.
    /// </summary>
    [Fact]
    public void Take_AfterALongIdle_HoldsOnlyTheBurst()
    {
        var clock = new Clock();
        var bucket = new SpeedBucket(100, 3, () => clock.Now);
        clock.Now = TimeSpan.FromHours(1);
        Assert.Equal(TimeSpan.Zero, bucket.Take(300));

        Assert.Equal(TimeSpan.FromSeconds(0.01), bucket.Take(1));
    }

    /// <summary>
    /// Two streams that share a bucket share its burst and its rate.
    /// True: a player that splits its reading over several requests gets the limit once, not once for each.
    /// False: opening more requests would get around the limit.
    /// </summary>
    [Fact]
    public void Take_IsSharedAcrossCallers()
    {
        var clock = new Clock();
        var bucket = new SpeedBucket(1000, 3, () => clock.Now);

        Assert.Equal(TimeSpan.Zero, bucket.Take(3000));
        Assert.Equal(TimeSpan.FromSeconds(1), bucket.Take(1000));
        Assert.Equal(TimeSpan.FromSeconds(2), bucket.Take(1000));
    }

    /// <summary>
    /// A new rate applies to the next read, with the burst the bucket already holds.
    /// True: doubling the rate halves the wait for the same debt.
    /// False: a changed speed limit would not apply to streams already open.
    /// </summary>
    [Fact]
    public void SetRate_ChangesTheWaitOfTheNextRead()
    {
        var clock = new Clock();
        var bucket = new SpeedBucket(100, 3, () => clock.Now);
        bucket.SetRate(200);

        Assert.Equal(TimeSpan.FromSeconds(0.5), bucket.Take(400));
    }

    /// <summary>
    /// The bucket remembers when it was last used.
    /// True: an idle bucket can be told apart from a busy one and dropped.
    /// False: buckets would pile up for streams that ended.
    /// </summary>
    [Fact]
    public void LastUsed_FollowsTheClockAtTheLastTake()
    {
        var clock = new Clock { Now = TimeSpan.FromSeconds(5) };
        var bucket = new SpeedBucket(100, 3, () => clock.Now);
        Assert.Equal(TimeSpan.FromSeconds(5), bucket.LastUsed);
        clock.Now = TimeSpan.FromSeconds(9);

        bucket.Take(1);

        Assert.Equal(TimeSpan.FromSeconds(9), bucket.LastUsed);
    }

    /// <summary>
    /// Without a clock the bucket uses the system clock, and a burst still passes.
    /// True: a bucket made with just a rate and a burst works.
    /// False: the default clock would be missing.
    /// </summary>
    [Fact]
    public void Take_WithTheSystemClock_LetsTheBurstThrough()
    {
        var bucket = new SpeedBucket(1_000_000, 3);

        Assert.Equal(TimeSpan.Zero, bucket.Take(3_000_000));
        Assert.Equal(3, bucket.BurstSeconds);
    }

    /// <summary>
    /// A rate that is zero or negative, a negative burst, and a negative read are refused.
    /// True: a bad value fails where it is set.
    /// False: a zero rate would divide by zero on the first throttled read.
    /// </summary>
    [Fact]
    public void BadValues_Throw()
    {
        var bucket = new SpeedBucket(100, 0, () => TimeSpan.Zero);

        Assert.Throws<ArgumentOutOfRangeException>(() => new SpeedBucket(0));
        Assert.Throws<ArgumentOutOfRangeException>(() => new SpeedBucket(-5));
        Assert.Throws<ArgumentOutOfRangeException>(() => new SpeedBucket(100, -1));
        Assert.Throws<ArgumentOutOfRangeException>(() => bucket.SetRate(0));
        Assert.Throws<ArgumentOutOfRangeException>(() => bucket.Take(-1));
    }

    /// <summary>
    /// A burst that is NaN or infinite is rejected.
    /// True: the bucket never holds a NaN or infinite number of bytes.
    /// False: a NaN burst would pass the negative check and break every wait.
    /// </summary>
    [Theory]
    [InlineData(double.NaN)]
    [InlineData(double.PositiveInfinity)]
    [InlineData(double.NegativeInfinity)]
    public void Constructor_RejectsANonFiniteBurst(double burst)
        => Assert.Throws<ArgumentOutOfRangeException>(() => new SpeedBucket(100, burst));
}
