using System;
using System.Collections.Generic;
using System.Threading;
using Microsoft.Extensions.Logging;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// One kind of summary entry, with its activity type, its outcome word, and how its overview reads from the counts.
/// A plugin defines one per outcome, such as synced, skipped, and retrying.
/// </summary>
/// <param name="Type">The activity type, namespaced under the plugin, such as <c>MyPlugin.ItemsSynced</c>.</param>
/// <param name="Outcome">What happened, in title case, as it ends the name. "Synced" gives "12 Items Synced".</param>
/// <param name="Overview">The overview sentence, built from the counts.</param>
/// <param name="Severity">The entry's severity.</param>
/// <param name="Noun">The singular noun in title case, "Item" by default.</param>
public sealed record ActivityOutcome(string Type, string Outcome, Func<ActivityTally, string> Overview, LogLevel Severity = LogLevel.Information, string Noun = "Item");

/// <summary>What one summary counted: how many in all, how many from each source, and why, when told.</summary>
/// <param name="Total">How many in all.</param>
/// <param name="Sources">How many from each source, such as each server.</param>
/// <param name="Reasons">How many for each reason given.</param>
public sealed record ActivityTally(int Total, IReadOnlyDictionary<string, int> Sources, IReadOnlyDictionary<string, int> Reasons);

/// <summary>
/// Sums events into one activity entry per outcome, so a busy run leaves a single "12 Items Synced" line rather than twelve.
/// Register one per plugin as a singleton and dispose it.
/// </summary>
/// <remarks>
/// Summaries are written once no event has arrived for the quiet spell, and at least once per longest spell while events keep coming.
/// Whatever is waiting is written on dispose. The timer callback runs each outcome's <c>Overview</c> delegate with no exception guard.
/// </remarks>
public sealed class ActivitySummary : IDisposable
{
    private readonly ActivityLogger _logger;
    private readonly TimeSpan _quiet;
    private readonly TimeSpan _longest;
    private readonly Func<DateTime> _now;
    private readonly object _lock = new();
    private readonly Dictionary<ActivityOutcome, Tally> _waiting = new();
    private Timer? _timer;
    private DateTime _firstAt;
    private bool _disposed;

    /// <summary>
    /// Initializes a new instance of the <see cref="ActivitySummary"/> class.
    /// </summary>
    /// <param name="logger">The activity log writer.</param>
    /// <param name="quiet">How long after the last event the summaries are written. 30 seconds by default.</param>
    /// <param name="longest">The longest events wait while more keep coming. 5 minutes by default.</param>
    /// <param name="now">The clock that times the quiet and longest spells, <see cref="DateTime.UtcNow"/> by default.</param>
    public ActivitySummary(ActivityLogger logger, TimeSpan? quiet = null, TimeSpan? longest = null, Func<DateTime>? now = null)
    {
        ArgumentNullException.ThrowIfNull(logger);
        _logger = logger;
        _quiet = quiet ?? TimeSpan.FromSeconds(30);
        _longest = longest ?? TimeSpan.FromMinutes(5);
        _now = now ?? (() => DateTime.UtcNow);
    }

    /// <summary>Counts one event toward its outcome's next summary.</summary>
    /// <remarks>An event added after <see cref="Dispose"/> is ignored.</remarks>
    /// <param name="outcome">The outcome.</param>
    /// <param name="source">Where it came from, such as a server's name.</param>
    /// <param name="reason">Why, when the overview lists reasons.</param>
    public void Add(ActivityOutcome outcome, string source, string? reason = null)
    {
        ArgumentNullException.ThrowIfNull(outcome);
        ArgumentNullException.ThrowIfNull(source);
        lock (_lock)
        {
            if (_disposed)
            {
                return;
            }

            var now = _now();
            if (_waiting.Count == 0)
            {
                _firstAt = now;
            }

            if (!_waiting.TryGetValue(outcome, out var tally))
            {
                tally = new Tally();
                _waiting[outcome] = tally;
            }

            tally.Total++;
            tally.Sources[source] = tally.Sources.GetValueOrDefault(source) + 1;
            if (reason is not null)
            {
                tally.Reasons[reason] = tally.Reasons.GetValueOrDefault(reason) + 1;
            }

            var left = _firstAt + _longest - now;
            var due = left < _quiet ? (left < TimeSpan.Zero ? TimeSpan.Zero : left) : _quiet;
            _timer ??= new Timer(_ => Flush(), null, Timeout.Infinite, Timeout.Infinite);
            _timer.Change(due, Timeout.InfiniteTimeSpan);
        }
    }

    /// <summary>Writes every waiting summary immediately.</summary>
    /// <remarks>
    /// The waiting counts are taken before they are written. An exception from an <c>Overview</c> delegate
    /// propagates and the summaries not yet written are lost.
    /// </remarks>
    public void Flush()
    {
        List<(ActivityOutcome Outcome, Tally Tally)> taken;
        lock (_lock)
        {
            taken = new List<(ActivityOutcome, Tally)>(_waiting.Count);
            foreach (var pair in _waiting)
            {
                taken.Add((pair.Key, pair.Value));
            }

            _waiting.Clear();
        }

        foreach (var (outcome, tally) in taken)
        {
            var counted = new ActivityTally(tally.Total, tally.Sources, tally.Reasons);
            _logger.Log(
                ActivityText.SummaryName(tally.Total, outcome.Outcome, outcome.Noun),
                outcome.Type,
                ActivityText.Sentence(outcome.Overview(counted)),
                outcome.Severity);
        }
    }

    /// <inheritdoc />
    public void Dispose()
    {
        Timer? timer;
        lock (_lock)
        {
            if (_disposed)
            {
                return;
            }

            _disposed = true;
            timer = _timer;
            _timer = null;
        }

        timer?.Dispose();
        Flush();
    }

    private sealed class Tally
    {
        public int Total { get; set; }

        public Dictionary<string, int> Sources { get; } = new(StringComparer.Ordinal);

        public Dictionary<string, int> Reasons { get; } = new(StringComparer.Ordinal);
    }
}
