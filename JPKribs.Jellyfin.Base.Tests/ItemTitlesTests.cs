using MediaBrowser.Controller.Entities.Movies;
using MediaBrowser.Controller.Entities.TV;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>Verifies that <see cref="ItemTitles"/> names library items the way Jellyfin names them in its own lists.</summary>
public class ItemTitlesTests
{
    /// <summary>
    /// An episode is named by its series and number, a movie by its name, and an episode with no numbers has no code.
    /// True: items are named the way Jellyfin names them.
    /// False: an episode would be named by its own title alone.
    /// </summary>
    [Fact]
    public void TitleOf_NamesEpisodesBySeries()
    {
        var episode = new Episode { Name = "Pilot", SeriesName = "The Show", ParentIndexNumber = 1, IndexNumber = 2 };

        Assert.Equal("The Show S01E02", ItemTitles.TitleOf(episode));
        Assert.Equal("The Show S01E02 - Pilot", ItemTitles.LineOf(episode));
        Assert.Equal("Only A (2021)", ItemTitles.TitleOf(new Movie { Name = "Only A (2021)" }));
        Assert.Null(ItemTitles.EpisodeCode(new Episode { Name = "Special" }));
    }

    /// <summary>
    /// A season is named by its series and its own name.
    /// True: "Season 1" alone never names a season in a list.
    /// False: the series would be missing from the title.
    /// </summary>
    [Fact]
    public void TitleOf_NamesSeasonsBySeries()
    {
        var season = new Season { Name = "Season 1", SeriesName = "The Show" };

        Assert.Equal("The Show Season 1", ItemTitles.TitleOf(season));
        Assert.Equal("The Show Season 1", ItemTitles.LineOf(season));
        Assert.Equal("Season 1", ItemTitles.TitleOf(new Season { Name = "Season 1" }));
    }

    /// <summary>
    /// An episode missing its series or its numbers falls back to what it has.
    /// True: the title still names the episode as well as it can.
    /// False: the title would show an empty series or a missing code.
    /// </summary>
    [Fact]
    public void TitleOf_FallsBackWhenTheSeriesOrTheCodeIsMissing()
    {
        Assert.Equal("S01E02 Pilot", ItemTitles.TitleOf(new Episode { Name = "Pilot", ParentIndexNumber = 1, IndexNumber = 2 }));
        Assert.Equal("The Show Pilot", ItemTitles.TitleOf(new Episode { Name = "Pilot", SeriesName = "The Show" }));
        Assert.Equal("Pilot", ItemTitles.TitleOf(new Episode { Name = "Pilot" }));
        Assert.Equal("The Show Pilot", ItemTitles.LineOf(new Episode { Name = "Pilot", SeriesName = "The Show" }));
    }

    /// <summary>
    /// The episode code pads the season and number to two digits.
    /// True: codes sort and read like S01E02.
    /// False: a single digit would give S1E2.
    /// </summary>
    [Fact]
    public void EpisodeCode_PadsToTwoDigits()
    {
        Assert.Equal("S01E02", ItemTitles.EpisodeCode(new Episode { ParentIndexNumber = 1, IndexNumber = 2 }));
        Assert.Equal("S12E103", ItemTitles.EpisodeCode(new Episode { ParentIndexNumber = 12, IndexNumber = 103 }));
        Assert.Null(ItemTitles.EpisodeCode(new Episode { ParentIndexNumber = 1 }));
    }
}
