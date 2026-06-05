using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using MediaBrowser.Model.Tasks;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// Base for plugin scheduled tasks. Supplies the usual configurable task defaults and an interval
/// trigger helper so a task only declares its name, key, description, and work.
/// </summary>
public abstract class PluginScheduledTask : IScheduledTask, IConfigurableScheduledTask
{
    /// <inheritdoc />
    public abstract string Name { get; }

    /// <inheritdoc />
    public abstract string Key { get; }

    /// <inheritdoc />
    public abstract string Description { get; }

    /// <inheritdoc />
    public virtual string Category => "Maintenance";

    /// <inheritdoc />
    public virtual bool IsHidden => false;

    /// <inheritdoc />
    public virtual bool IsEnabled => true;

    /// <inheritdoc />
    public virtual bool IsLogged => true;

    /// <inheritdoc />
    public abstract Task ExecuteAsync(IProgress<double> progress, CancellationToken cancellationToken);

    /// <inheritdoc />
    public virtual IEnumerable<TaskTriggerInfo> GetDefaultTriggers() => Array.Empty<TaskTriggerInfo>();

    /// <summary>
    /// Builds an interval trigger that fires on the given period. Yield it from
    /// <see cref="GetDefaultTriggers"/> to seed the default schedule.
    /// </summary>
    /// <param name="interval">How often the task should run.</param>
    /// <returns>The interval trigger.</returns>
    protected static TaskTriggerInfo EveryInterval(TimeSpan interval) => new()
    {
        Type = TaskTriggerInfoType.IntervalTrigger,
        IntervalTicks = interval.Ticks
    };
}
