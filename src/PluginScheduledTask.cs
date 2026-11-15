using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using MediaBrowser.Model.Tasks;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// Base for plugin scheduled tasks, with the usual configurable task defaults and trigger helpers.
/// A task then only declares its name, key, description, and work.
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
    /// Builds an interval trigger that fires on the given period.
    /// Yield it from <see cref="GetDefaultTriggers"/> to seed the default schedule.
    /// </summary>
    /// <param name="interval">How often the task should run.</param>
    /// <returns>The interval trigger.</returns>
    protected static TaskTriggerInfo EveryInterval(TimeSpan interval) => TaskTriggers.EveryInterval(interval);

    /// <summary>
    /// Builds a trigger that fires once each time the server starts.
    /// </summary>
    /// <returns>The startup trigger.</returns>
    protected static TaskTriggerInfo OnStartup() => TaskTriggers.OnStartup();

    /// <summary>
    /// Builds a trigger that fires once a day at the given server local time of day.
    /// </summary>
    /// <param name="timeOfDay">The time after midnight to run, such as <c>TimeSpan.FromHours(3)</c>.</param>
    /// <returns>The daily trigger.</returns>
    protected static TaskTriggerInfo Daily(TimeSpan timeOfDay) => TaskTriggers.Daily(timeOfDay);
}
