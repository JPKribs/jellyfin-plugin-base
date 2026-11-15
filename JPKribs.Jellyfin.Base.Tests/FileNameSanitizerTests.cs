using System;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>Verifies that <see cref="FileNameSanitizer"/> makes a name safe on every OS with the same fixed set of replacements.</summary>
public class FileNameSanitizerTests
{
    /// <summary>
    /// Path separators and wildcard characters are removed from a name.
    /// True: a name can never walk out of its folder.
    /// False: a slash or colon would survive into the file name.
    /// </summary>
    [Fact]
    public void Sanitize_StripsPathAndInvalidChars()
    {
        var s = FileNameSanitizer.Sanitize("a/b:c*d?");

        Assert.DoesNotContain('/', s);
        Assert.DoesNotContain(':', s);
        Assert.Contains('a', s);
        Assert.Contains('d', s);
    }

    /// <summary>
    /// A null or blank name becomes a generated name.
    /// True: the result is always a usable file name.
    /// False: an empty file name would be returned.
    /// </summary>
    [Theory]
    [InlineData(null)]
    [InlineData("   ")]
    public void Sanitize_BlankBecomesUnnamed(string? input)
        => Assert.StartsWith("unnamed_", FileNameSanitizer.Sanitize(input), StringComparison.Ordinal);

    /// <summary>
    /// Both path separators and the Windows reserved characters are replaced on every OS.
    /// True: a name made on Linux stays valid on Windows.
    /// False: a backslash survived on Linux and macOS.
    /// </summary>
    [Theory]
    [InlineData("a\\b.mkv", "a_b.mkv")]
    [InlineData("a/b.mkv", "a_b.mkv")]
    [InlineData("C:\\Movies\\Film.mkv", "C_Movies_Film.mkv")]
    [InlineData("<a>|\"b\"?*.txt", "_a_b_.txt")]
    [InlineData("tab\there", "tab_here")]
    [InlineData("plain name.mp3", "plain name.mp3")]
    public void Sanitize_ReplacesTheFixedSetOnEveryOs(string input, string expected)
        => Assert.Equal(expected, FileNameSanitizer.Sanitize(input));

    /// <summary>
    /// A chosen replacement character is used, runs of it collapse to one, and edge spaces and dots are trimmed.
    /// True: the name stays tidy whatever replacement the caller picks.
    /// False: a run of invalid characters would leave a run of replacements.
    /// </summary>
    [Theory]
    [InlineData("a:b", '-', "a-b")]
    [InlineData("a::b", '_', "a_b")]
    [InlineData("a**b", '-', "a-b")]
    [InlineData(" .name. ", '_', "name")]
    public void Sanitize_UsesTheReplacementAndTidiesTheEdges(string input, char replacement, string expected)
        => Assert.Equal(expected, FileNameSanitizer.Sanitize(input, replacement));

    /// <summary>
    /// A Windows reserved device name gets an underscore after its name, and any extension is kept.
    /// True: the file can be created on Windows.
    /// False: a name such as CON would be rejected there.
    /// </summary>
    [Theory]
    [InlineData("CON.txt", "CON_.txt")]
    [InlineData("aux", "aux_")]
    [InlineData("com1.log", "com1_.log")]
    [InlineData("console.txt", "console.txt")]
    public void Sanitize_SuffixesReservedNames(string input, string expected)
        => Assert.Equal(expected, FileNameSanitizer.Sanitize(input));

    /// <summary>
    /// A name over 200 characters is cut and keeps its extension.
    /// True: the name fits every file system and still opens by type.
    /// False: the extension would be cut off or the name left too long.
    /// </summary>
    [Fact]
    public void Sanitize_CutsLongNamesButKeepsTheExtension()
    {
        var s = FileNameSanitizer.Sanitize(new string('a', 300) + ".mkv");

        Assert.Equal(200, s.Length);
        Assert.EndsWith(".mkv", s, StringComparison.Ordinal);
    }

    /// <summary>
    /// A temp name joins the item id and the file name of the original path, each made safe.
    /// True: the temp file is unique per item and keeps a readable name.
    /// False: a path or a colon in either part would reach the temp file name.
    /// </summary>
    [Fact]
    public void SanitizeTempFileName_JoinsTheIdAndTheFileName()
    {
        Assert.Equal("a_b_Movie.mkv", FileNameSanitizer.SanitizeTempFileName("a:b", "/media/x/Movie.mkv"));
        Assert.Equal("id_Movie.mkv", FileNameSanitizer.SanitizeTempFileName("id", "Movie.mkv"));
    }

    /// <summary>
    /// A missing original path gives a generated file name after the id.
    /// True: the temp name is still usable.
    /// False: the name would end with the bare id and an underscore.
    /// </summary>
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    public void SanitizeTempFileName_MissingPathGetsAGeneratedName(string? path)
    {
        var name = FileNameSanitizer.SanitizeTempFileName("id", path);

        Assert.StartsWith("id_unnamed_", name, StringComparison.Ordinal);
        Assert.Equal("id_unnamed_".Length + 32, name.Length);
    }
}
