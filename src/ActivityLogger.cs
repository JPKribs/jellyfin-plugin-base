using System;
using System.Threading.Tasks;
using Jellyfin.Database.Implementations.Entities;
using MediaBrowser.Model.Activity;
using Microsoft.Extensions.Logging;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// Writes a plugin's events to Jellyfin's activity log without ever throwing.
/// Register one per plugin with <c>services.AddActivityLogger()</c>.
/// </summary>
/// <remarks>
/// A failed write is logged at debug level and swallowed, since an entry must never break the flow it documents.
/// Give each entry a type namespaced under the plugin, such as <c>MyPlugin.SyncCompleted</c>, so entries are attributable.
/// </remarks>
public sealed class ActivityLogger
{
    /// <summary>The longest name or overview the activity log stores.</summary>
    public const int MaxTextLength = 512;

    private readonly IActivityManager _activityManager;
    private readonly ILogger<ActivityLogger> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="ActivityLogger"/> class.
    /// </summary>
    /// <param name="activityManager">Jellyfin's activity manager.</param>
    /// <param name="logger">The logger.</param>
    public ActivityLogger(IActivityManager activityManager, ILogger<ActivityLogger> logger)
    {
        ArgumentNullException.ThrowIfNull(activityManager);
        ArgumentNullException.ThrowIfNull(logger);

        _activityManager = activityManager;
        _logger = logger;
        Current = this;
    }

    /// <summary>
    /// Gets the most recently constructed logger, for callers outside DI such as the plugin class's configuration save hook.
    /// It is <c>null</c> until a logger is constructed.
    /// </summary>
    /// <remarks>The value is static and the last logger constructed wins. It is never cleared.</remarks>
    public static ActivityLogger? Current { get; private set; }

    /// <summary>
    /// Writes an entry to the activity log without awaiting or throwing.
    /// </summary>
    /// <param name="name">The entry headline shown in the activity feed.</param>
    /// <param name="type">The entry type, namespaced under the plugin, such as <c>MyPlugin.Something</c>.</param>
    /// <param name="overview">Optional detail text.</param>
    /// <param name="severity">The severity, informational by default.</param>
    /// <param name="userId">Optional associated user, none by default.</param>
    public void Log(string name, string type, string? overview = null, LogLevel severity = LogLevel.Information, Guid userId = default)
        => _ = WriteCoreAsync(name, type, overview, severity, userId);

    /// <summary>
    /// Writes an entry to the activity log and completes once it is stored.
    /// It never throws, so a caller can await it inside the flow it documents.
    /// </summary>
    /// <remarks>
    /// The name is not <c>LogAsync</c> on purpose, since the analyzers would then flag every <see cref="Log"/>
    /// call inside an async method as blocking, though <see cref="Log"/> never blocks.
    /// </remarks>
    /// <param name="name">The entry headline shown in the activity feed.</param>
    /// <param name="type">The entry type, namespaced under the plugin, such as <c>MyPlugin.Something</c>.</param>
    /// <param name="overview">Optional detail text.</param>
    /// <param name="severity">The severity, informational by default.</param>
    /// <param name="userId">Optional associated user, none by default.</param>
    /// <returns>A task that completes when the entry is written or the write failed.</returns>
    public Task LogAndWaitAsync(string name, string type, string? overview = null, LogLevel severity = LogLevel.Information, Guid userId = default)
        => WriteCoreAsync(name, type, overview, severity, userId);

    /// <summary>
    /// Cuts text to the length the activity log stores.
    /// Jellyfin keeps at most 512 characters of an entry's name and overview.
    /// </summary>
    /// <remarks>The cut counts UTF-16 characters, so it can split a surrogate pair.</remarks>
    /// <param name="text">The text to cut.</param>
    /// <returns>The text, at most <see cref="MaxTextLength"/> characters long.</returns>
    public static string Trim(string text)
    {
        ArgumentNullException.ThrowIfNull(text);
        return text.Length > MaxTextLength ? text[..MaxTextLength] : text;
    }

    private async Task WriteCoreAsync(string name, string type, string? overview, LogLevel severity, Guid userId)
    {
        try
        {
            await _activityManager.CreateAsync(new ActivityLog(Trim(name ?? string.Empty), type, userId)
            {
                ShortOverview = Trim(overview ?? string.Empty),
                LogSeverity = severity
            }).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Could not write activity log entry of type {Type}", type);
        }
    }
}
