using System;
using MediaBrowser.Model.Tasks;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>Verifies that <see cref="TaskTriggers"/> builds the three kinds of default trigger a Jellyfin scheduled task uses.</summary>
public class TaskTriggersTests
{
    /// <summary>
    /// An interval trigger carries the period in ticks and no time of day.
    /// True: a task seeds a schedule such as every six hours.
    /// False: the trigger would have the wrong type or period.
    /// </summary>
    [Fact]
    public void EveryInterval_BuildsAnIntervalTrigger()
    {
        var trigger = TaskTriggers.EveryInterval(TimeSpan.FromHours(6));

        Assert.Equal(TaskTriggerInfoType.IntervalTrigger, trigger.Type);
        Assert.Equal(TimeSpan.FromHours(6).Ticks, trigger.IntervalTicks);
        Assert.Null(trigger.TimeOfDayTicks);
    }

    /// <summary>
    /// A daily trigger carries the time after midnight in ticks.
    /// True: a task seeds a schedule such as every day at 03:30.
    /// False: the trigger would have the wrong type or time.
    /// </summary>
    [Fact]
    public void Daily_BuildsADailyTrigger()
    {
        var trigger = TaskTriggers.Daily(new TimeSpan(3, 30, 0));

        Assert.Equal(TaskTriggerInfoType.DailyTrigger, trigger.Type);
        Assert.Equal(new TimeSpan(3, 30, 0).Ticks, trigger.TimeOfDayTicks);
        Assert.Null(trigger.IntervalTicks);
    }

    /// <summary>
    /// A startup trigger has only its type.
    /// True: a task seeds a run at each server start.
    /// False: the trigger would carry a stray time.
    /// </summary>
    [Fact]
    public void OnStartup_BuildsAStartupTrigger()
    {
        var trigger = TaskTriggers.OnStartup();

        Assert.Equal(TaskTriggerInfoType.StartupTrigger, trigger.Type);
        Assert.Null(trigger.IntervalTicks);
        Assert.Null(trigger.TimeOfDayTicks);
    }

    /// <summary>
    /// The interval is passed through as it is, so a zero period gives zero ticks.
    /// True: the helper does not hide a bad value.
    /// False: the helper would change the value silently.
    /// </summary>
    [Fact]
    public void EveryInterval_DoesNotValidateThePeriod()
    {
        Assert.Equal(0, TaskTriggers.EveryInterval(TimeSpan.Zero).IntervalTicks);
    }
}
