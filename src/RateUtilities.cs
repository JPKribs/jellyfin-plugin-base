using System;

namespace JPKribs.Jellyfin.Base;

/// <summary>Speeds, kept in Mbps the way video bitrates are, and turned into bytes for a throttle.</summary>
public static class RateUtilities
{
    /// <summary>A speed in Mbps as bytes per second. 0 or less is no limit, returned as 0.</summary>
    /// <param name="mbps">The speed in megabits per second.</param>
    /// <returns>Bytes per second, or 0 for no limit.</returns>
    public static long MbpsToBytesPerSecond(int mbps) => Math.Max(0, mbps) * 1_000_000L / 8;

    /// <summary>
    /// A speed kept in binary KB, MB, or GB per second as Mbps, rounded up so a limit never becomes no
    /// limit. For moving an older setting to Mbps. A unit of Mbps is returned as it is.
    /// </summary>
    /// <param name="value">The speed.</param>
    /// <param name="unit">KB, MB, GB, or Mbps. Anything else counts as MB.</param>
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
        return (int)Math.Min(int.MaxValue, Math.Max(1, (long)Math.Ceiling(bytes * 8 / 1_000_000d)));
    }
}
