using System;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>
/// Tests that <see cref="UtcTime"/> writes and reads stored times as UTC text.
/// </summary>
public class UtcTimeTests
{
    /// <summary>
    /// A time with no zone is read as UTC, a local time is converted, and both format the same way.
    /// True: every stored time is UTC text ending in Z, so a database compares them in time order.
    /// False: a time with no zone shifts by the server's offset, or sorts out of order against UTC text.
    /// </summary>
    [Fact]
    public void Format_WritesUtcWithZ()
    {
        var utc = new DateTime(2026, 10, 4, 12, 0, 0, DateTimeKind.Utc);

        Assert.Equal("2026-10-04T12:00:00.0000000Z", UtcTime.Format(utc));
        Assert.Equal("2026-10-04T12:00:00.0000000Z", UtcTime.Format(DateTime.SpecifyKind(utc, DateTimeKind.Unspecified)));
        Assert.Equal("2026-10-04T12:00:00.0000000Z", UtcTime.Format(utc.ToLocalTime()));
    }

    /// <summary>
    /// Stored text parses to UTC whatever form it was written in, and text that is not a time is reported.
    /// True: a row written without a zone reads back as the same instant.
    /// False: old rows read back hours off.
    /// </summary>
    [Theory]
    [InlineData("2026-10-04T12:00:00.0000000Z")]
    [InlineData("2026-10-04T12:00:00.0000000")]
    [InlineData("2026-10-04T14:00:00.0000000+02:00")]
    public void TryParse_ReadsEveryStoredFormAsUtc(string text)
    {
        Assert.True(UtcTime.TryParse(text, out var parsed));
        Assert.Equal(DateTimeKind.Utc, parsed.Kind);
        Assert.Equal(new DateTime(2026, 10, 4, 12, 0, 0, DateTimeKind.Utc), parsed);
        Assert.Equal(parsed, UtcTime.Parse(text));
    }

    /// <summary>
    /// Text that is not a time fails TryParse with the minimum value, and Parse throws.
    /// True: a bad row is reported, never read as a real time.
    /// False: garbage would read as the year 1 or the current time.
    /// </summary>
    [Fact]
    public void BadText_IsReported()
    {
        Assert.False(UtcTime.TryParse("not a time", out var bad));
        Assert.Equal(DateTime.MinValue, bad);
        Assert.False(UtcTime.TryParse(null, out _));
        Assert.Throws<FormatException>(() => UtcTime.Parse("not a time"));
    }
}
