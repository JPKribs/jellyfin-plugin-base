using System;

namespace JPKribs.Jellyfin.Base;

/// <summary>Converts speeds kept in Mbps, the way video bitrates are, into bytes for a throttle.</summary>
public static class RateUtilities
{
    /// <summary>Converts a speed in Mbps to bytes per second. A speed of 0 or less is no limit and gives 0.</summary>
    /// <param name="mbps">The speed in megabits per second.</param>
    /// <returns>Bytes per second, or 0 for no limit.</returns>
    public static long MbpsToBytesPerSecond(int mbps) => Math.Max(0, mbps) * 1_000_000L / 8;

    /// <summary>
    /// Converts a speed kept in binary KB, MB, or GB per second to Mbps, rounded up so a limit never becomes no limit.
    /// It moves an older setting to Mbps, and a value already in Mbps is returned as it is.
    /// </summary>
    /// <remarks>Binary units are used on the input side (1 KB is 1024 bytes) and decimal megabits on the output side. The result is capped at <see cref="int.MaxValue"/> for any value, including a very large GB or MB value that no longer overflows the byte count on the way to the cap.</remarks>
    /// <param name="value">The speed.</param>
    /// <param name="unit">KB, MB, GB, or Mbps, in any case. <c>null</c> or any other text counts as MB.</param>
    /// <returns>The speed in Mbps, or 0 for no limit.</returns>
    public static int ToMbps(int value, string? unit)
    {
        if (value <= 0 || string.Equals(unit, "Mbps", StringComparison.OrdinalIgnoreCase))
        {
            return Math.Max(0, value);
        }

        var bytes = unit?.ToUpperInvariant() switch
        {
            "KB" => value * 1024L,
            "GB" => value * 1024L * 1024L * 1024L,
            _ => value * 1024L * 1024L
        };
        return (int)Math.Min(int.MaxValue, Math.Max(1, (long)Math.Ceiling(bytes * 8d / 1_000_000d)));
    }
}
