using System.Collections.Generic;
using JPKribs.Jellyfin.Base;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>Tests for the generic helpers promoted into the base (formatting, hashing, sanitizing, paging).</summary>
public class PromotedUtilitiesTests
{
    // MARK: FormatUtilities

    [Theory]
    [InlineData(0L, "0.00 B")]
    [InlineData(512L, "512.00 B")]
    [InlineData(1024L, "1.00 KB")]
    [InlineData(1536L, "1.50 KB")]
    [InlineData(1048576L, "1.00 MB")]
    [InlineData(1073741824L, "1.00 GB")]
    public void FormatBytes_Formats(long bytes, string expected)
        => Assert.Equal(expected, FormatUtilities.FormatBytes(bytes));

    [Fact]
    public void TruncateForLog_HandlesEmptyAndLong()
    {
        Assert.Equal("(empty)", FormatUtilities.TruncateForLog(null));
        Assert.Equal("(empty)", FormatUtilities.TruncateForLog(string.Empty));
        Assert.Equal("abc", FormatUtilities.TruncateForLog("abc", 10));

        var truncated = FormatUtilities.TruncateForLog(new string('x', 50), 10);
        Assert.Equal(11, truncated.Length); // 10 chars + the ellipsis
        Assert.EndsWith("…", truncated, System.StringComparison.Ordinal);
    }

    // MARK: HashUtilities — 32-char lowercase fingerprint (first 16 bytes of UTF-8 SHA-256)

    [Theory]
    [InlineData("", "e3b0c44298fc1c149afbf4c8996fb924")]
    [InlineData("abc", "ba7816bf8f01cfea414140de5dae2223")]
    public void ComputeSha256Hash_MatchesKnownVectors(string input, string expected)
    {
        var hash = HashUtilities.ComputeSha256Hash(input);
        Assert.Equal(32, hash.Length);
        Assert.Equal(expected, hash);
    }

    [Fact]
    public void ComputeSha256Hash_IsDeterministic()
        => Assert.Equal(HashUtilities.ComputeSha256Hash("payload"), HashUtilities.ComputeSha256Hash("payload"));

    // MARK: FileNameSanitizer

    [Fact]
    public void Sanitize_StripsPathAndInvalidChars()
    {
        var s = FileNameSanitizer.Sanitize("a/b:c*d?");
        Assert.DoesNotContain('/', s);
        Assert.DoesNotContain(':', s);
        Assert.Contains('a', s);
        Assert.Contains('d', s);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("   ")]
    public void Sanitize_BlankBecomesUnnamed(string? input)
        => Assert.StartsWith("unnamed_", FileNameSanitizer.Sanitize(input), System.StringComparison.Ordinal);

    // MARK: StringNormalizationUtility

    [Fact]
    public void NormalizeStringArray_NullAndEmptyCollapseToNull()
    {
        Assert.Null(StringNormalizationUtility.NormalizeStringArray(null));
        Assert.Null(StringNormalizationUtility.NormalizeStringArray(new List<string>()));
        Assert.Null(StringNormalizationUtility.NormalizeStringArray(new List<string> { "  ", string.Empty }));
    }

    [Fact]
    public void NormalizeStringArray_FiltersWhitespaceAndSortsCaseInsensitively()
        => Assert.Equal(
            new[] { "Alpha", "beta" },
            StringNormalizationUtility.NormalizeStringArray(new List<string> { "beta", " ", "Alpha" }));

    // MARK: PagedResult page metadata (promoted enrichment)

    [Fact]
    public void PagedResult_ComputesPageMetadataFromSkipTake()
    {
        var r = new PagedResult<int>(new[] { 1, 2, 3 }, totalCount: 25, skip: 10, take: 5);
        Assert.Equal(3, r.Page);        // skip 10 / take 5 => page 3 (1-based)
        Assert.Equal(5, r.PageSize);
        Assert.Equal(5, r.TotalPages);  // ceil(25 / 5)
        Assert.True(r.HasMore);         // 10 + 3 < 25
    }

    [Fact]
    public void PagedResult_TwoArgCtor_IsASinglePage()
    {
        var r = new PagedResult<int>(new[] { 1, 2 }, 2);
        Assert.Equal(1, r.Page);
        Assert.Equal(1, r.TotalPages);
        Assert.False(r.HasMore);
    }

    [Fact]
    public void ToPagedResult_CarriesPageMetadata()
    {
        var source = new List<int>();
        for (var i = 0; i < 100; i++)
        {
            source.Add(i);
        }

        var page = source.ToPagedResult(new PagedQuery { Skip = 20, Take = 10 });
        Assert.Equal(3, page.Page);
        Assert.Equal(10, page.TotalPages);
        Assert.True(page.HasMore);
    }
}
