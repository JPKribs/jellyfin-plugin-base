using JPKribs.Jellyfin.Base;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>Tests for the body-parsing helpers on <see cref="JpkHttp"/>.</summary>
public class JpkHttpTests
{
    [Theory]
    [InlineData("1.2.3.4 good", "1.2.3.4")]
    [InlineData("  spaced\tlater", "spaced")]
    [InlineData("\nleading", "leading")]
    [InlineData("", "")]
    [InlineData("   ", "")]
    public void FirstToken_ReturnsLeadingToken(string body, string expected)
    {
        Assert.Equal(expected, JpkHttp.FirstToken(body));
    }

    [Theory]
    [InlineData("first\nsecond", "first")]
    [InlineData("  only  ", "only")]
    [InlineData("no newline", "no newline")]
    public void FirstLine_ReturnsFirstLineTrimmed(string body, string expected)
    {
        Assert.Equal(expected, JpkHttp.FirstLine(body));
    }
}
