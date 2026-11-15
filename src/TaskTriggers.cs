using System;
using MediaBrowser.Model.Tasks;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// Builds the default trigger entries of a Jellyfin scheduled task.
/// Use it from a task that does not derive from <see cref="PluginScheduledTask"/>.
/// </summary>
public static class TaskTriggers
{
    /// <summary>
    /// Builds an interval trigger that fires on the given period.
    /// </summary>
    /// <remarks>The interval is not validated, so a zero or negative period is passed to Jellyfin as it is.</remarks>
    /// <param name="interval">How often the task should run.</param>
    /// <returns>The interval trigger.</returns>
    public static TaskTriggerInfo EveryInterval(TimeSpan interval) => new()
    {
        Type = TaskTriggerInfoType.IntervalTrigger,
        IntervalTicks = interval.Ticks
    };

    /// <summary>
    /// Builds a trigger that fires once a day at the given server local time of day.
    /// </summary>
    /// <param name="timeOfDay">The time after midnight to run, such as <c>TimeSpan.FromHours(3)</c>.</param>
    /// <returns>The daily trigger.</returns>
    public static TaskTriggerInfo Daily(TimeSpan timeOfDay) => new()
    {
        Type = TaskTriggerInfoType.DailyTrigger,
        TimeOfDayTicks = timeOfDay.Ticks
    };

    /// <summary>
    /// Builds a trigger that fires once each time the server starts.
    /// </summary>
    /// <returns>The startup trigger.</returns>
    public static TaskTriggerInfo OnStartup() => new()
    {
        Type = TaskTriggerInfoType.StartupTrigger
    };
}
