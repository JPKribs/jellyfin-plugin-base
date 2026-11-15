using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>Verifies that <see cref="RateUtilities"/> turns Mbps into bytes per second and older binary units into Mbps rounded up.</summary>
public class RateUtilitiesTests
{
    /// <summary>
    /// Speeds in Mbps become bytes, and older binary units become Mbps rounded up.
    /// True: a throttle gets the right byte rate and an older setting keeps a limit.
    /// False: a limit would be off or would round down to no limit.
    /// </summary>
    [Fact]
    public void Rates_ConvertBetweenUnits()
    {
        Assert.Equal(5_000_000, RateUtilities.MbpsToBytesPerSecond(40));
        Assert.Equal(0, RateUtilities.MbpsToBytesPerSecond(-1));
        Assert.Equal(84, RateUtilities.ToMbps(10, "MB"));
        Assert.Equal(1, RateUtilities.ToMbps(1, "KB"));
        Assert.Equal(40, RateUtilities.ToMbps(40, "Mbps"));
        Assert.Equal(0, RateUtilities.ToMbps(0, "GB"));
    }

    /// <summary>
    /// The unit is matched in any case, an unknown or missing unit counts as MB, and gigabytes convert with binary steps.
    /// True: an older setting converts the way its unit says.
    /// False: a lower case unit or a missing one would convert wrongly.
    /// </summary>
    [Theory]
    [InlineData(10, "mb", 84)]
    [InlineData(10, null, 84)]
    [InlineData(10, "unknown", 84)]
    [InlineData(1, "GB", 8590)]
    [InlineData(40, "MBPS", 40)]
    [InlineData(-5, "MB", 0)]
    public void ToMbps_HandlesUnitCaseAndUnknownUnits(int value, string? unit, int expected)
        => Assert.Equal(expected, RateUtilities.ToMbps(value, unit));

    /// <summary>
    /// A very large megabyte value is capped at the largest int.
    /// True: an absurd setting still gives a valid limit.
    /// False: the value would overflow.
    /// </summary>
    [Fact]
    public void ToMbps_CapsAtIntMax()
        => Assert.Equal(int.MaxValue, RateUtilities.ToMbps(int.MaxValue, "MB"));

    /// <summary>
    /// A very large gigabyte or megabyte value is capped at the largest int and never wraps to a small number.
    /// True: an absurd setting still gives the largest limit.
    /// False: the byte count would overflow and give 1, which is a crawl and not a cap.
    /// </summary>
    [Theory]
    [InlineData(int.MaxValue, "GB")]
    [InlineData(2_000_000_000, "GB")]
    [InlineData(1_100_000_000, "GB")]
    [InlineData(1_073_741_824, "gb")]
    [InlineData(int.MaxValue, "MB")]
    [InlineData(int.MaxValue, null)]
    public void ToMbps_WithAHugeValue_CapsAtIntMax(int value, string? unit)
        => Assert.Equal(int.MaxValue, RateUtilities.ToMbps(value, unit));

    /// <summary>
    /// Values just under the cap still convert exactly.
    /// True: 100 GB is 858,993 Mbps rounded up and 1 KB is 1.
    /// False: the wider math would change a result that was already right.
    /// </summary>
    [Theory]
    [InlineData(100, "GB", 858_994)]
    [InlineData(200, "GB", 1_717_987)]
    [InlineData(1, "KB", 1)]
    [InlineData(1000, "KB", 9)]
    public void ToMbps_KeepsExactResultsBelowTheCap(int value, string unit, int expected)
        => Assert.Equal(expected, RateUtilities.ToMbps(value, unit));
}
