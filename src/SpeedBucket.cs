using System;
using System.Diagnostics;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// A rate in bytes per second that several streams can share.
/// Each read takes its bytes from the bucket, and a read that takes more than the bucket holds waits until the rate has made up the difference.
/// </summary>
/// <remarks>
/// A burst of <c>burstSeconds</c> of the rate is let through after the bucket has sat idle, so a player fills its first buffer at once.
/// It is one burst for everything that shares the bucket, however many requests a player splits its reading into, and idle time never banks more than the burst.
/// The bucket only reports the wait. The caller does the waiting, so a test controls the clock and never sleeps.
/// </remarks>
public sealed class SpeedBucket
{
    private readonly Func<TimeSpan> _now;
    private readonly object _lock = new();
    private long _bytesPerSecond;
    private double _held;
    private TimeSpan _at;

    /// <summary>
    /// Initializes a new instance of the <see cref="SpeedBucket"/> class.
    /// </summary>
    /// <param name="bytesPerSecond">The rate, which must be above zero.</param>
    /// <param name="burstSeconds">How many seconds of the rate may be sent at once after the bucket has been idle. 0 by default, which allows no burst. It must be finite and not negative.</param>
    /// <param name="now">The clock, as the time since any fixed point. A monotonic system clock by default.</param>
    public SpeedBucket(long bytesPerSecond, double burstSeconds = 0, Func<TimeSpan>? now = null)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(bytesPerSecond);
        ArgumentOutOfRangeException.ThrowIfNegative(burstSeconds);
        if (!double.IsFinite(burstSeconds))
        {
            throw new ArgumentOutOfRangeException(nameof(burstSeconds), burstSeconds, "The burst must be a finite number of seconds.");
        }

        _now = now ?? (static () => Stopwatch.GetElapsedTime(0));
        _bytesPerSecond = bytesPerSecond;
        BurstSeconds = burstSeconds;
        _held = bytesPerSecond * burstSeconds;
        _at = _now();
    }

    /// <summary>Gets how many seconds of the rate may be sent at once after the bucket has been idle.</summary>
    public double BurstSeconds { get; }

    /// <summary>Gets when the bucket was last taken from, on its own clock.</summary>
    public TimeSpan LastUsed
    {
        get
        {
            lock (_lock)
            {
                return _at;
            }
        }
    }

    /// <summary>
    /// Changes the rate, such as when a bandwidth schedule's hours begin.
    /// The next read uses it, with the bytes the bucket already holds.
    /// </summary>
    /// <param name="bytesPerSecond">The new rate, which must be above zero.</param>
    public void SetRate(long bytesPerSecond)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(bytesPerSecond);
        lock (_lock)
        {
            _bytesPerSecond = bytesPerSecond;
        }
    }

    /// <summary>
    /// Takes bytes that were just read, and says how long to wait before reading more.
    /// </summary>
    /// <param name="bytes">The bytes read, zero or more.</param>
    /// <returns>The wait, or zero while the bucket still holds bytes.</returns>
    public TimeSpan Take(int bytes)
    {
        ArgumentOutOfRangeException.ThrowIfNegative(bytes);
        lock (_lock)
        {
            var now = _now();
            _held = Math.Min(_bytesPerSecond * BurstSeconds, _held + ((now - _at).TotalSeconds * _bytesPerSecond));
            _at = now;
            _held -= bytes;
            return _held < 0 ? TimeSpan.FromSeconds(-_held / _bytesPerSecond) : TimeSpan.Zero;
        }
    }
}
