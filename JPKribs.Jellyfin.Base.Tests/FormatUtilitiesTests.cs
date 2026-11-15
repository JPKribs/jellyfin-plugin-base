using System;
using System.Globalization;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>Verifies that <see cref="FormatUtilities"/> formats byte counts and makes caller text safe for a log line.</summary>
public class FormatUtilitiesTests
{
    /// <summary>
    /// A byte count is shown with the largest unit that keeps it at 1 or more, to two decimals.
    /// True: sizes read as "1.50 KB" or "1.00 GB".
    /// False: a size would be shown in the wrong unit or precision.
    /// </summary>
    [Theory]
    [InlineData(0L, "0.00 B")]
    [InlineData(512L, "512.00 B")]
    [InlineData(1024L, "1.00 KB")]
    [InlineData(1536L, "1.50 KB")]
    [InlineData(1048576L, "1.00 MB")]
    [InlineData(1073741824L, "1.00 GB")]
    [InlineData(1099511627776L, "1.00 TB")]
    [InlineData(-5L, "-5.00 B")]
    public void FormatBytes_Formats(long bytes, string expected)
        => Assert.Equal(expected, FormatUtilities.FormatBytes(bytes));

    /// <summary>
    /// The decimal separator is always a period, whatever the current culture is.
    /// True: a culture that writes a comma still gets "1.50 KB", so logs read the same on every server.
    /// False: the output would change with the server's language.
    /// </summary>
    [Fact]
    public void FormatBytes_IgnoresTheCurrentCulture()
    {
        var culture = (CultureInfo)CultureInfo.InvariantCulture.Clone();
        culture.NumberFormat.NumberDecimalSeparator = ",";
        culture.NumberFormat.NegativeSign = "~";
        var previous = CultureInfo.CurrentCulture;
        try
        {
            CultureInfo.CurrentCulture = culture;

            Assert.Equal("1.50 KB", FormatUtilities.FormatBytes(1536));
            Assert.Equal("-5.00 B", FormatUtilities.FormatBytes(-5));
        }
        finally
        {
            CultureInfo.CurrentCulture = previous;
        }
    }

    /// <summary>
    /// Empty input, control characters, and long text are all made safe to log.
    /// True: a newline cannot forge a log entry and a long value cannot flood the log.
    /// False: caller text would reach the log unchanged.
    /// </summary>
    [Fact]
    public void SanitizeForLog_HandlesEmptyLongAndControlCharacters()
    {
        Assert.Equal("[empty]", FormatUtilities.SanitizeForLog(null));
        Assert.Equal("[empty]", FormatUtilities.SanitizeForLog(string.Empty));
        Assert.Equal("abc", FormatUtilities.SanitizeForLog("abc", 10));
        Assert.Equal("forgedentry", FormatUtilities.SanitizeForLog("forged\r\nentry"));

        var truncated = FormatUtilities.SanitizeForLog(new string('x', 50), 10);
        Assert.Equal(13, truncated.Length);
        Assert.EndsWith("...", truncated, StringComparison.Ordinal);
    }

    /// <summary>
    /// Text exactly at the length is kept whole, and text made only of control characters gives an empty string.
    /// True: the edges behave as documented.
    /// False: the boundary would cut one character early or give "[empty]".
    /// </summary>
    [Fact]
    public void SanitizeForLog_KeepsTextAtTheLengthAndEmptiesControlOnlyText()
    {
        Assert.Equal("abcde", FormatUtilities.SanitizeForLog("abcde", 5));
        Assert.Equal("abcde...", FormatUtilities.SanitizeForLog("abcdef", 5));
        Assert.Equal(string.Empty, FormatUtilities.SanitizeForLog("\r\n\t"));
        Assert.Throws<ArgumentOutOfRangeException>(() => FormatUtilities.SanitizeForLog("abc", -1));
    }

    /// <summary>
    /// A lone surrogate is replaced with U+FFFD, and a whole pair is kept.
    /// True: the result is valid text that XML and a UTF-8 encoder accept.
    /// False: a broken half of a pair would reach the log or a stored document.
    /// </summary>
    [Fact]
    public void SanitizeForLog_ReplacesLoneSurrogatesAndKeepsPairs()
    {
        Assert.Equal("a\uFFFDb", FormatUtilities.SanitizeForLog("a\uD800b"));
        Assert.Equal("a\uFFFDb", FormatUtilities.SanitizeForLog("a\uDC00b"));
        Assert.Equal("a\uFFFD", FormatUtilities.SanitizeForLog("a\uD800"));
        Assert.Equal("a\U0001F600b", FormatUtilities.SanitizeForLog("a\U0001F600b"));
        Assert.Equal("\uFFFD\U0001F600", FormatUtilities.SanitizeForLog("\uDC00\U0001F600"));
    }

    /// <summary>
    /// A cut never splits a surrogate pair.
    /// True: a pair that would cross the limit is left out whole, before the dots.
    /// False: half a pair would end the text.
    /// </summary>
    [Fact]
    public void SanitizeForLog_NeverCutsASurrogatePair()
    {
        Assert.Equal("ab...", FormatUtilities.SanitizeForLog("ab\U0001F600cd", 3));
        Assert.Equal("ab\U0001F600...", FormatUtilities.SanitizeForLog("ab\U0001F600cd", 4));
        Assert.Equal("ab\U0001F600", FormatUtilities.SanitizeForLog("ab\U0001F600", 4));
        Assert.Equal("...", FormatUtilities.SanitizeForLog("\U0001F600", 1));
    }

    /// <summary>
    /// Characters XML cannot hold are removed, and tab, newline, and the C1 controls go with the other control characters.
    /// True: the result can be saved in an XML document.
    /// False: U+0000, U+000B, U+FFFE, or U+FFFF would make the document unreadable.
    /// </summary>
    [Fact]
    public void SanitizeForLog_RemovesCharactersXmlCannotHold()
    {
        Assert.Equal("ab", FormatUtilities.SanitizeForLog("a\0b"));
        Assert.Equal("ab", FormatUtilities.SanitizeForLog("a\u000Bb"));
        Assert.Equal("ab", FormatUtilities.SanitizeForLog("a\u000Cb"));
        Assert.Equal("ab", FormatUtilities.SanitizeForLog("a\u001Fb"));
        Assert.Equal("ab", FormatUtilities.SanitizeForLog("a\uFFFEb"));
        Assert.Equal("ab", FormatUtilities.SanitizeForLog("a\uFFFFb"));
        Assert.Equal("ab", FormatUtilities.SanitizeForLog("a\u0085b"));
        Assert.Equal("a b", FormatUtilities.SanitizeForLog("a b"));
    }

    /// <summary>
    /// Text with every kind of bad character still ends up as well formed XML text.
    /// True: the result loads into an XML writer without an error.
    /// False: a character the document cannot hold would make the writer throw.
    /// </summary>
    [Fact]
    public void SanitizeForLog_ResultIsValidXmlText()
    {
        var hostile = "a\0\u0001\uD800\uDC00\uFFFE\uFFFF\U0001F600\uDBFFz";

        var clean = FormatUtilities.SanitizeForLog(hostile);

        Assert.Equal("a\uD800\uDC00\U0001F600\uFFFDz", clean);
        Assert.Equal(clean, new System.Xml.Linq.XElement("x", clean).Value);
    }

    /// <summary>
    /// A maximum length of zero keeps nothing and adds the dots, and a null input stays "[empty]".
    /// True: the edges behave as documented.
    /// False: a zero length would throw or keep a character.
    /// </summary>
    [Fact]
    public void SanitizeForLog_HandlesAZeroLengthAndNull()
    {
        Assert.Equal("...", FormatUtilities.SanitizeForLog("abc", 0));
        Assert.Equal("[empty]", FormatUtilities.SanitizeForLog(null, 0));
        Assert.Equal(string.Empty, FormatUtilities.SanitizeForLog("\0\u0001", 0));
    }

    /// <summary>
    /// Line and paragraph separators and the bidirectional formatting controls are removed.
    /// True: caller text cannot start a new line in a viewer or reorder the text around it.
    /// False: U+2028 would split a log line, and a bidi control would disguise the text that follows.
    /// </summary>
    [Theory]
    [InlineData("\u2028")]
    [InlineData("\u2029")]
    [InlineData("\u200E")]
    [InlineData("\u200F")]
    [InlineData("\u061C")]
    [InlineData("\u202A")]
    [InlineData("\u202B")]
    [InlineData("\u202C")]
    [InlineData("\u202D")]
    [InlineData("\u202E")]
    [InlineData("\u2066")]
    [InlineData("\u2067")]
    [InlineData("\u2068")]
    [InlineData("\u2069")]
    public void SanitizeForLog_RemovesLineSeparatorsAndBidiControls(string hostile)
    {
        Assert.Equal("ab", FormatUtilities.SanitizeForLog("a" + hostile + "b"));
        Assert.Equal("a\u2060b", FormatUtilities.SanitizeForLog("a\u2060b"));
    }
}
