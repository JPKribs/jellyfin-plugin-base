using System;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>Verifies that <see cref="StringUtilities"/> escapes text so it cannot break out of a JavaScript string or a script block.</summary>
public class StringUtilitiesTests
{
    /// <summary>
    /// Quotes, backslashes, line breaks, and a closing script tag are all neutralized.
    /// True: hostile text cannot close the string or the script block.
    /// False: a quote or a closing tag would survive into the page.
    /// </summary>
    [Fact]
    public void EscapeJsString_NeutralizesQuotesAndScriptBreakout()
    {
        var escaped = StringUtilities.EscapeJsString("</script>\"'\\\r\n");

        Assert.DoesNotContain("</script>", escaped, StringComparison.Ordinal);
        Assert.DoesNotContain("\r", escaped, StringComparison.Ordinal);
        Assert.DoesNotContain("\n", escaped, StringComparison.Ordinal);
        Assert.Contains("\\x3C", escaped, StringComparison.Ordinal);
        Assert.Contains("\\\"", escaped, StringComparison.Ordinal);
        Assert.Contains("\\'", escaped, StringComparison.Ordinal);
        Assert.Contains("\\r", escaped, StringComparison.Ordinal);
        Assert.Contains("\\n", escaped, StringComparison.Ordinal);
    }

    /// <summary>
    /// The JavaScript line separators are escaped.
    /// True: they cannot end a string literal early.
    /// False: a raw separator would be a syntax error in older engines.
    /// </summary>
    [Fact]
    public void EscapeJsString_EscapesLineSeparators()
    {
        var escaped = StringUtilities.EscapeJsString("a\u2028b\u2029c");

        Assert.Equal("a\\u2028b\\u2029c", escaped);
    }

    /// <summary>
    /// Null and empty input give an empty string.
    /// True: a missing value embeds as an empty literal.
    /// False: a null would throw or print as text.
    /// </summary>
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    public void EscapeJsString_EmptyInputReturnsEmpty(string? input)
        => Assert.Equal(string.Empty, StringUtilities.EscapeJsString(input));

    /// <summary>
    /// Angle brackets, ampersands, tabs, backspaces, and form feeds each become an escape sequence.
    /// True: no markup character reaches an inline script.
    /// False: a raw angle bracket or ampersand would stay in the output.
    /// </summary>
    [Theory]
    [InlineData("<", "\\x3C")]
    [InlineData(">", "\\x3E")]
    [InlineData("&", "\\x26")]
    [InlineData("\t", "\\t")]
    [InlineData("\b", "\\b")]
    [InlineData("\f", "\\f")]
    [InlineData("\\", "\\\\")]
    public void EscapeJsString_EscapesEachSpecialCharacter(string input, string expected)
        => Assert.Equal(expected, StringUtilities.EscapeJsString(input));

    /// <summary>
    /// Plain text is returned unchanged.
    /// True: only dangerous characters are touched.
    /// False: ordinary text would be altered.
    /// </summary>
    [Fact]
    public void EscapeJsString_LeavesPlainTextAlone()
        => Assert.Equal("Hello, world 123", StringUtilities.EscapeJsString("Hello, world 123"));
}
