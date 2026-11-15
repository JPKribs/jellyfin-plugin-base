using System;
using System.Collections.Generic;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>Verifies that <see cref="ActivityText"/> gives every activity entry the same wording.</summary>
public class ActivityTextTests
{
    /// <summary>
    /// Every summary reads the same way, with a title case name and the count, and sources listed with their counts, the largest first.
    /// True: entries from every plugin look alike and read at a glance.
    /// False: names would differ in shape, or sources would come in no useful order.
    /// </summary>
    [Fact]
    public void Text_HasOneShape()
    {
        Assert.Equal("1 Item Synced", ActivityText.SummaryName(1, "Synced"));
        Assert.Equal("12 Items Not Synced", ActivityText.SummaryName(12, "Not Synced"));
        Assert.Equal("3 Entries Added", ActivityText.SummaryName(3, "Added", "Entry"));
        Assert.Equal("1 change", ActivityText.Count(1, "change"));
        Assert.Equal("3 playlists", ActivityText.Count(3, "playlist"));
        Assert.Equal("were", ActivityText.WasOrWere(2));
        Assert.Equal("a (9), b (3), c (3)", ActivityText.CountedList(new Dictionary<string, int> { ["c"] = 3, ["a"] = 9, ["b"] = 3 }));
        Assert.Equal("Paused for now", ActivityText.Sentence("  paused for now. "));
    }

    /// <summary>
    /// A noun takes the plural form its ending calls for, and a count of one keeps it singular.
    /// True: "entries", "days", and "ITEMS" read correctly in an entry.
    /// False: a noun ending in y would become "entrys" or a vowel and y would become "daies".
    /// </summary>
    [Theory]
    [InlineData(0, "item", "0 items")]
    [InlineData(1, "entry", "1 entry")]
    [InlineData(2, "entry", "2 entries")]
    [InlineData(2, "Entry", "2 Entries")]
    [InlineData(2, "ENTRY", "2 ENTRIES")]
    [InlineData(2, "day", "2 days")]
    [InlineData(2, "Item", "2 Items")]
    [InlineData(2, "ITEM", "2 ITEMS")]
    public void Count_PluralizesTheNoun(int count, string noun, string expected)
        => Assert.Equal(expected, ActivityText.Count(count, noun));

    /// <summary>
    /// Sources and reasons with a count of zero or less are left out, and an empty list gives an empty string.
    /// True: only things that happened are listed.
    /// False: an entry would name a source with no events.
    /// </summary>
    [Fact]
    public void CountedList_LeavesOutZeroCountsAndEmptyInput()
    {
        Assert.Equal("a (2)", ActivityText.CountedList(new Dictionary<string, int> { ["a"] = 2, ["b"] = 0, ["c"] = -1 }));
        Assert.Equal(string.Empty, ActivityText.CountedList(new Dictionary<string, int>()));
        Assert.Throws<ArgumentNullException>(() => ActivityText.CountedList(null!));
    }

    /// <summary>
    /// A blank or null sentence is returned as it is, and trailing full stops are removed.
    /// True: a missing overview stays missing and a finished sentence ends with no full stop.
    /// False: a blank overview would be altered or an entry would end in a full stop.
    /// </summary>
    [Fact]
    public void Sentence_KeepsBlankInputAndDropsTrailingFullStops()
    {
        Assert.Null(ActivityText.Sentence(null));
        Assert.Equal("   ", ActivityText.Sentence("   "));
        Assert.Equal("Done", ActivityText.Sentence("done.."));
        Assert.Equal(string.Empty, ActivityText.Sentence("..."));
    }

    /// <summary>
    /// A name needs an outcome and a noun, and a count needs a noun.
    /// True: an empty word fails at once.
    /// False: an entry would be written with a missing word.
    /// </summary>
    [Fact]
    public void Names_RejectEmptyWords()
    {
        Assert.Throws<ArgumentException>(() => ActivityText.SummaryName(1, string.Empty));
        Assert.Throws<ArgumentException>(() => ActivityText.SummaryName(1, "Synced", string.Empty));
        Assert.Throws<ArgumentException>(() => ActivityText.Count(1, string.Empty));
    }
}
