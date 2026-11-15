using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediaBrowser.Model.Tasks;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>Verifies that <see cref="PluginScheduledTask"/> supplies the usual task defaults and builds triggers.</summary>
public class PluginScheduledTaskTests
{
    private sealed class BareTask : PluginScheduledTask
    {
        public override string Name => "Bare";

        public override string Key => "Bare";

        public override string Description => "Bare";

        public override Task ExecuteAsync(IProgress<double> progress, CancellationToken cancellationToken) => Task.CompletedTask;
    }

    private sealed class TriggerTask : PluginScheduledTask
    {
        public override string Name => "Trigger";

        public override string Key => "Trigger";

        public override string Description => "Trigger";

        public override Task ExecuteAsync(IProgress<double> progress, CancellationToken cancellationToken) => Task.CompletedTask;

        public override IEnumerable<TaskTriggerInfo> GetDefaultTriggers()
        {
            yield return OnStartup();
            yield return Daily(TimeSpan.FromHours(3));
            yield return EveryInterval(TimeSpan.FromMinutes(15));
        }
    }

    /// <summary>
    /// The startup, daily, and interval helpers build the matching trigger with its time.
    /// True: a task seeds its default schedule with one line per trigger.
    /// False: a trigger would have the wrong type or time.
    /// </summary>
    [Fact]
    public void Triggers_BuildStartupDailyAndInterval()
    {
        var triggers = new TriggerTask().GetDefaultTriggers().ToArray();

        Assert.Equal(TaskTriggerInfoType.StartupTrigger, triggers[0].Type);
        Assert.Equal(TaskTriggerInfoType.DailyTrigger, triggers[1].Type);
        Assert.Equal(TimeSpan.FromHours(3).Ticks, triggers[1].TimeOfDayTicks);
        Assert.Equal(TaskTriggerInfoType.IntervalTrigger, triggers[2].Type);
        Assert.Equal(TimeSpan.FromMinutes(15).Ticks, triggers[2].IntervalTicks);
    }

    /// <summary>
    /// The protected helpers give the same triggers as <see cref="TaskTriggers"/>.
    /// True: a task that derives from the base and one that does not build identical triggers.
    /// False: the two builders would drift apart.
    /// </summary>
    [Fact]
    public void Triggers_MatchTheTaskTriggersHelper()
    {
        var triggers = new TriggerTask().GetDefaultTriggers().ToArray();

        Assert.Equal(TaskTriggers.OnStartup().Type, triggers[0].Type);
        Assert.Equal(TaskTriggers.Daily(TimeSpan.FromHours(3)).Type, triggers[1].Type);
        Assert.Equal(TaskTriggers.Daily(TimeSpan.FromHours(3)).TimeOfDayTicks, triggers[1].TimeOfDayTicks);
        Assert.Equal(TaskTriggers.EveryInterval(TimeSpan.FromMinutes(15)).Type, triggers[2].Type);
        Assert.Equal(TaskTriggers.EveryInterval(TimeSpan.FromMinutes(15)).IntervalTicks, triggers[2].IntervalTicks);
    }

    /// <summary>
    /// A task that overrides nothing is a visible, enabled, logged maintenance task with no default triggers.
    /// True: a plugin only declares what is different.
    /// False: a default would change and reach every plugin.
    /// </summary>
    [Fact]
    public void Defaults_AreAVisibleEnabledLoggedMaintenanceTask()
    {
        var task = new BareTask();

        Assert.Equal("Maintenance", task.Category);
        Assert.False(task.IsHidden);
        Assert.True(task.IsEnabled);
        Assert.True(task.IsLogged);
        Assert.Empty(task.GetDefaultTriggers());
    }
}
