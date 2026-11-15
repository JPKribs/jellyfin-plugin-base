using System;
using System.Threading.Tasks;
using Jellyfin.Database.Implementations.Entities;
using MediaBrowser.Model.Activity;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>Verifies that <see cref="ActivityLogger"/> writes trimmed entries to the activity log and never throws.</summary>
[Collection("ActivityLogger.Current")]
public sealed class ActivityLoggerTests
{
    private static (ActivityLogger Logger, IActivityManager Manager, Func<ActivityLog?> Written) Create()
    {
        var manager = Substitute.For<IActivityManager>();
        ActivityLog? written = null;
        manager.CreateAsync(Arg.Do<ActivityLog>(e => written = e)).Returns(Task.CompletedTask);
        return (new ActivityLogger(manager, NullLogger<ActivityLogger>.Instance), manager, () => written);
    }

    /// <summary>
    /// Activity log text is cut to the length Jellyfin stores, and the awaitable write never throws.
    /// True: a long reason never fails the write that records it.
    /// False: an overlong overview could be rejected by the database and the entry lost.
    /// </summary>
    [Fact]
    public async Task LogAndWaitAsync_TrimsTextAndSwallowsFailures()
    {
        var (logger, manager, written) = Create();

        await logger.LogAndWaitAsync(new string('n', 600), "Test.Entry", new string('o', 600));

        Assert.NotNull(written());
        Assert.Equal(ActivityLogger.MaxTextLength, written()!.Name.Length);
        Assert.Equal(ActivityLogger.MaxTextLength, written()!.ShortOverview!.Length);

        manager.CreateAsync(Arg.Any<ActivityLog>()).Returns(Task.FromException(new InvalidOperationException("down")));
        await logger.LogAndWaitAsync("name", "Test.Entry");
    }

    /// <summary>
    /// The fire and forget form writes the same entry, with the severity and user it was given.
    /// True: a caller that cannot await still records the entry in full.
    /// False: the entry would lose its type, overview, severity, or user.
    /// </summary>
    [Fact]
    public void Log_WritesTheEntryWithoutAwaiting()
    {
        var (logger, _, written) = Create();
        var user = Guid.NewGuid();

        logger.Log("Name", "Test.Entry", "Overview", LogLevel.Warning, user);

        var entry = written();
        Assert.NotNull(entry);
        Assert.Equal("Name", entry!.Name);
        Assert.Equal("Test.Entry", entry.Type);
        Assert.Equal("Overview", entry.ShortOverview);
        Assert.Equal(LogLevel.Warning, entry.LogSeverity);
        Assert.Equal(user, entry.UserId);
    }

    /// <summary>
    /// The fire and forget form leaves an omitted overview empty and the severity informational.
    /// True: the defaults give a plain informational entry.
    /// False: an omitted overview would be null or the severity would differ.
    /// </summary>
    [Fact]
    public void Log_UsesTheDefaultOverviewAndSeverity()
    {
        var (logger, _, written) = Create();

        logger.Log("Name", "Test.Entry");

        Assert.Equal(string.Empty, written()!.ShortOverview);
        Assert.Equal(LogLevel.Information, written()!.LogSeverity);
    }

    /// <summary>
    /// A failing activity manager never throws out of the fire and forget form.
    /// True: an activity entry cannot break the flow it documents.
    /// False: a failed write would surface in the caller.
    /// </summary>
    [Fact]
    public void Log_SwallowsAFailingManager()
    {
        var manager = Substitute.For<IActivityManager>();
        manager.CreateAsync(Arg.Any<ActivityLog>()).Returns(_ => throw new InvalidOperationException("down"));
        var logger = new ActivityLogger(manager, NullLogger<ActivityLogger>.Instance);

        var exception = Record.Exception(() => logger.Log("Name", "Test.Entry"));

        Assert.Null(exception);
    }

    /// <summary>
    /// Text at or under the limit is returned as it is, and longer text is cut to the limit.
    /// True: only overlong text changes.
    /// False: short text would be altered or long text kept whole.
    /// </summary>
    [Fact]
    public void Trim_CutsOnlyOverlongText()
    {
        Assert.Equal("short", ActivityLogger.Trim("short"));
        Assert.Equal(new string('a', 512), ActivityLogger.Trim(new string('a', 512)));
        Assert.Equal(new string('a', 512), ActivityLogger.Trim(new string('a', 513)));
        Assert.Throws<ArgumentNullException>(() => ActivityLogger.Trim(null!));
    }

    /// <summary>
    /// The last logger constructed is the one <see cref="ActivityLogger.Current"/> returns.
    /// True: callers outside DI reach the logger DI built.
    /// False: Current would be stale or null once a logger exists.
    /// </summary>
    [Fact]
    public void Current_IsTheLastLoggerConstructed()
    {
        var (first, _, _) = Create();
        var (second, _, _) = Create();

        Assert.NotSame(first, ActivityLogger.Current);
        Assert.Same(second, ActivityLogger.Current);
    }

    /// <summary>
    /// The constructor rejects a missing manager or logger.
    /// True: a misconfigured registration fails at once.
    /// False: it would fail later on the first entry.
    /// </summary>
    [Fact]
    public void Constructor_RejectsNullArguments()
    {
        Assert.Throws<ArgumentNullException>(() => new ActivityLogger(null!, NullLogger<ActivityLogger>.Instance));
        Assert.Throws<ArgumentNullException>(() => new ActivityLogger(Substitute.For<IActivityManager>(), null!));
    }
}
