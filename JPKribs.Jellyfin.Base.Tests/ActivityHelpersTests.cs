using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Threading.Tasks;
using Jellyfin.Database.Implementations.Entities;
using MediaBrowser.Controller.Entities.Movies;
using MediaBrowser.Controller.Entities.TV;
using MediaBrowser.Model.Activity;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>Activity summaries, their wording, item titles, speeds, and folder containment.</summary>
public class ActivityHelpersTests
{
    /// <summary>
    /// Every summary reads the same way: a title case name with the count, and sources listed with their
    /// counts, the largest first.
    /// True: entries from every plugin look alike and read at a glance.
    /// False: names would differ in shape, or sources come in no useful order.
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
    /// Events for one outcome become one entry when flushed, named by their count, and nothing is written
    /// for an outcome that had no events.
    /// True: a busy run leaves one line per outcome.
    /// False: the log would fill with a line per item, or with empty summaries.
    /// </summary>
    [Fact]
    public async Task Summary_WritesOneEntryPerOutcome()
    {
        var written = new ConcurrentQueue<ActivityLog>();
        var manager = Substitute.For<IActivityManager>();
        manager.CreateAsync(Arg.Do<ActivityLog>(written.Enqueue)).Returns(Task.CompletedTask);
        var logger = new ActivityLogger(manager, NullLogger<ActivityLogger>.Instance);
        var synced = new ActivityOutcome("Test.Synced", "Synced", t => $"{ActivityText.Count(t.Total, "item")} {ActivityText.WasOrWere(t.Total)} synced from {ActivityText.CountedList(t.Sources)}");
        var skipped = new ActivityOutcome("Test.Skipped", "Skipped", t => $"skipped: {ActivityText.CountedList(t.Reasons)}", LogLevel.Warning);
        using var summary = new ActivitySummary(logger, TimeSpan.FromHours(1));

        summary.Add(synced, "source-a");
        summary.Add(synced, "source-b");
        summary.Add(synced, "source-a");
        summary.Add(skipped, "source-a", "filtered out");
        summary.Flush();
        await WaitFor(() => written.Count >= 2);

        var entries = new Dictionary<string, ActivityLog>();
        foreach (var e in written)
        {
            entries[e.Type] = e;
        }

        Assert.Equal("3 Items Synced", entries["Test.Synced"].Name);
        Assert.Equal("3 items were synced from source-a (2), source-b (1)", entries["Test.Synced"].ShortOverview);
        Assert.Equal("1 Item Skipped", entries["Test.Skipped"].Name);
        Assert.Equal("Skipped: filtered out (1)", entries["Test.Skipped"].ShortOverview);

        summary.Flush();
        await Task.Delay(50);
        Assert.Equal(2, written.Count);
    }

    /// <summary>
    /// Events waiting when the summary is disposed are written then, and events after it are dropped.
    /// True: a server stopping mid-run still records what happened.
    /// False: the last summary would be lost on every restart.
    /// </summary>
    [Fact]
    public async Task Summary_WritesWhatIsWaitingOnDispose()
    {
        var written = new ConcurrentQueue<ActivityLog>();
        var manager = Substitute.For<IActivityManager>();
        manager.CreateAsync(Arg.Do<ActivityLog>(written.Enqueue)).Returns(Task.CompletedTask);
        var logger = new ActivityLogger(manager, NullLogger<ActivityLogger>.Instance);
        var outcome = new ActivityOutcome("Test.Done", "Done", t => "done");
        var summary = new ActivitySummary(logger, TimeSpan.FromHours(1));

        summary.Add(outcome, "here");
        summary.Dispose();
        summary.Add(outcome, "here");
        await WaitFor(() => !written.IsEmpty);

        Assert.Equal("1 Item Done", Assert.Single(written).Name);
    }

    /// <summary>Items are named the way Jellyfin names them.</summary>
    [Fact]
    public void Titles_NameEpisodesBySeries()
    {
        var episode = new Episode { Name = "Pilot", SeriesName = "The Show", ParentIndexNumber = 1, IndexNumber = 2 };
        Assert.Equal("The Show S01E02", ItemTitles.TitleOf(episode));
        Assert.Equal("The Show S01E02 - Pilot", ItemTitles.LineOf(episode));
        Assert.Equal("Only A (2021)", ItemTitles.TitleOf(new Movie { Name = "Only A (2021)" }));
        Assert.Null(ItemTitles.EpisodeCode(new Episode { Name = "Special" }));
    }

    /// <summary>Speeds in Mbps become bytes, and older binary units become Mbps rounded up.</summary>
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

    /// <summary>A folder is inside another only by whole folder names.</summary>
    [Theory]
    [InlineData("/media/movies/cache", true)]
    [InlineData("/media/movies", true)]
    [InlineData("/media/movies-cache", false)]
    [InlineData("/cache", false)]
    public void Paths_MatchWholeFolders(string folder, bool inside)
    {
        Assert.Equal(inside, PathContainment.IsUnderAny(folder, new[] { "/media/movies/", "/media/shows" }));
    }

    private static async Task WaitFor(Func<bool> condition)
    {
        for (var i = 0; i < 100 && !condition(); i++)
        {
            await Task.Delay(20);
        }
    }
}
