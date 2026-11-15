using System.Collections.Generic;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>Verifies that <see cref="StringNormalizationUtility"/> turns a string list into a canonical sorted array or null.</summary>
public class StringNormalizationUtilityTests
{
    /// <summary>
    /// Null, an empty list, and a list of only blank entries all become null.
    /// True: two lists with nothing in them compare equal.
    /// False: an empty list and a null would differ.
    /// </summary>
    [Fact]
    public void NormalizeStringArray_NullAndEmptyCollapseToNull()
    {
        Assert.Null(StringNormalizationUtility.NormalizeStringArray(null));
        Assert.Null(StringNormalizationUtility.NormalizeStringArray(new List<string>()));
        Assert.Null(StringNormalizationUtility.NormalizeStringArray(new List<string> { "  ", string.Empty }));
    }

    /// <summary>
    /// Blank entries are dropped and the rest are sorted ignoring case.
    /// True: the same entries in any order give the same array.
    /// False: the order of the input would change the result.
    /// </summary>
    [Fact]
    public void NormalizeStringArray_FiltersWhitespaceAndSortsCaseInsensitively()
        => Assert.Equal(
            new[] { "Alpha", "beta" },
            StringNormalizationUtility.NormalizeStringArray(new List<string> { "beta", " ", "Alpha" }));

    /// <summary>
    /// Entries are not trimmed and duplicates are kept.
    /// True: the entries come back exactly as given.
    /// False: an entry would be altered or merged without the caller asking.
    /// </summary>
    [Fact]
    public void NormalizeStringArray_DoesNotTrimOrRemoveDuplicates()
        => Assert.Equal(
            new[] { " a", "a", "a" },
            StringNormalizationUtility.NormalizeStringArray(new List<string> { "a", " a", "a" }));
}
