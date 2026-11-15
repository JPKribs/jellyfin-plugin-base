using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Threading.Tasks;
using Jellyfin.Database.Implementations.Entities;
using MediaBrowser.Model.Activity;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>Verifies that <see cref="ActivitySummary"/> sums events into one activity entry per outcome.</summary>
[Collection("ActivityLogger.Current")]
public class ActivitySummaryTests
{
    private static (ActivityLogger Logger, ConcurrentQueue<ActivityLog> Written) Create()
    {
        var written = new ConcurrentQueue<ActivityLog>();
        var manager = Substitute.For<IActivityManager>();
        manager.CreateAsync(Arg.Do<ActivityLog>(written.Enqueue)).Returns(Task.CompletedTask);
        return (new ActivityLogger(manager, NullLogger<ActivityLogger>.Instance), written);
    }

    /// <summary>
    /// Events for one outcome become one entry when flushed, named by their count, and nothing is written for an outcome that had no events.
    /// True: a busy run leaves one line per outcome.
    /// False: the log would fill with a line per item, or with empty summaries.
    /// </summary>
    [Fact]
    public void Flush_WritesOneEntryPerOutcome()
    {
        var (logger, written) = Create();
        var synced = new ActivityOutcome("Test.Synced", "Synced", t => $"{ActivityText.Count(t.Total, "item")} {ActivityText.WasOrWere(t.Total)} synced from {ActivityText.CountedList(t.Sources)}");
        var skipped = new ActivityOutcome("Test.Skipped", "Skipped", t => $"skipped: {ActivityText.CountedList(t.Reasons)}", LogLevel.Warning);
        using var summary = new ActivitySummary(logger, TimeSpan.FromHours(1));

        summary.Add(synced, "source-a");
        summary.Add(synced, "source-b");
        summary.Add(synced, "source-a");
        summary.Add(skipped, "source-a", "filtered out");
        summary.Flush();

        var entries = new Dictionary<string, ActivityLog>();
        foreach (var e in written)
        {
            entries[e.Type] = e;
        }

        Assert.Equal("3 Items Synced", entries["Test.Synced"].Name);
        Assert.Equal("3 items were synced from source-a (2), source-b (1)", entries["Test.Synced"].ShortOverview);
        Assert.Equal("1 Item Skipped", entries["Test.Skipped"].Name);
        Assert.Equal("Skipped: filtered out (1)", entries["Test.Skipped"].ShortOverview);
        Assert.Equal(LogLevel.Warning, entries["Test.Skipped"].LogSeverity);

        summary.Flush();
        Assert.Equal(2, written.Count);
    }

    /// <summary>
    /// Events waiting when the summary is disposed are written then, and events after it are dropped.
    /// True: a server stopping mid-run still records what happened.
    /// False: the last summary would be lost on every restart.
    /// </summary>
    [Fact]
    public void Dispose_WritesWhatIsWaitingAndDropsLaterEvents()
    {
        var (logger, written) = Create();
        var outcome = new ActivityOutcome("Test.Done", "Done", t => "done");
        var summary = new ActivitySummary(logger, TimeSpan.FromHours(1));

        summary.Add(outcome, "here");
        summary.Dispose();
        summary.Add(outcome, "here");
        summary.Flush();

        Assert.Equal("1 Item Done", Assert.Single(written).Name);
    }

    /// <summary>
    /// An outcome's noun names the entries, so a plugin can count something other than items.
    /// True: the entry reads "2 Playlists Synced".
    /// False: every entry would say "Items".
    /// </summary>
    [Fact]
    public void Flush_NamesTheEntryWithTheOutcomeNoun()
    {
        var (logger, written) = Create();
        var outcome = new ActivityOutcome("Test.Playlists", "Synced", t => "synced", Noun: "Playlist");
        using var summary = new ActivitySummary(logger, TimeSpan.FromHours(1));

        summary.Add(outcome, "here");
        summary.Add(outcome, "here");
        summary.Flush();

        Assert.Equal("2 Playlists Synced", Assert.Single(written).Name);
    }

    /// <summary>
    /// A missing logger, outcome, or source is rejected.
    /// True: a misuse fails at once.
    /// False: it would fail later inside the timer.
    /// </summary>
    [Fact]
    public void Constructor_AndAdd_RejectNullArguments()
    {
        var (logger, _) = Create();
        using var summary = new ActivitySummary(logger, TimeSpan.FromHours(1));
        var outcome = new ActivityOutcome("Test.Done", "Done", t => "done");

        Assert.Throws<ArgumentNullException>(() => new ActivitySummary(null!));
        Assert.Throws<ArgumentNullException>(() => summary.Add(null!, "here"));
        Assert.Throws<ArgumentNullException>(() => summary.Add(outcome, null!));
    }
}
