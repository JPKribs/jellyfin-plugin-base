using System;
using System.Collections.Generic;
using System.Threading;
using Microsoft.Extensions.Logging;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// One kind of summary entry, with its activity type, how its name reads from the count, and how its overview reads
/// from the counts. A plugin defines one per outcome, such as synced, skipped, and retrying.
/// </summary>
/// <remarks>
/// An outcome built with keys, through the constructor that takes <c>nameOne</c> and <c>nameMany</c>, is written in the
/// language <see cref="ActivitySummary"/> is given. One built with an outcome word and a noun is written in English only.
/// </remarks>
/// <param name="Type">The activity type, namespaced under the plugin, such as <c>MyPlugin.ItemsSynced</c>.</param>
/// <param name="Outcome">What happened, in English and title case, as it ends the name. "Synced" gives "12 Items Synced".</param>
/// <param name="Overview">The overview sentence in English, built from the counts.</param>
/// <param name="Severity">The entry's severity.</param>
/// <param name="Noun">The singular noun in English and title case, "Item" by default.</param>
public sealed record ActivityOutcome(string Type, string Outcome, Func<ActivityTally, string> Overview, LogLevel Severity = LogLevel.Information, string Noun = "Item")
{
    /// <summary>
    /// Initializes a new instance of the <see cref="ActivityOutcome"/> class for an entry written in the server's
    /// language. Each name is a key whose text holds a <c>{0}</c> for the count, such as "{0} items synced".
    /// </summary>
    /// <param name="type">The activity type, namespaced under the plugin, such as <c>MyPlugin.ItemsSynced</c>.</param>
    /// <param name="nameOne">The key of the name for a count of 1, or the text itself.</param>
    /// <param name="nameMany">The key of the name for any other count, or the text itself.</param>
    /// <param name="overview">The overview sentence, built from the counts in the language it is given.</param>
    /// <param name="severity">The entry's severity.</param>
    public ActivityOutcome(string type, string nameOne, string nameMany, Func<ActivityTally, string, string> overview, LogLevel severity = LogLevel.Information)
        : this(type, nameMany, ToEnglish(overview), severity)
    {
        ArgumentException.ThrowIfNullOrEmpty(nameOne);
        ArgumentException.ThrowIfNullOrEmpty(nameMany);
        NameOne = nameOne;
        NameMany = nameMany;
        LanguageOverview = overview;
    }

    /// <summary>Gets the key of the name for a count of 1, or <c>null</c> for an English only outcome.</summary>
    public string? NameOne { get; }

    /// <summary>Gets the key of the name for any other count, or <c>null</c> for an English only outcome.</summary>
    public string? NameMany { get; }

    /// <summary>Gets the overview built in a language, or <c>null</c> for an English only outcome.</summary>
    public Func<ActivityTally, string, string>? LanguageOverview { get; }

    private static Func<ActivityTally, string> ToEnglish(Func<ActivityTally, string, string> overview)
    {
        ArgumentNullException.ThrowIfNull(overview);
        return t => overview(t, BaseTranslations.FallbackLanguage);
    }
}

/// <summary>What one summary counted: how many in all, how many from each source, and why, when told.</summary>
/// <param name="Total">How many in all.</param>
/// <param name="Sources">How many from each source, such as each server.</param>
/// <param name="Reasons">How many for each reason given.</param>
public sealed record ActivityTally(int Total, IReadOnlyDictionary<string, int> Sources, IReadOnlyDictionary<string, int> Reasons);

/// <summary>
/// Sums events into one activity entry per outcome, so a busy run leaves a single "12 items synced" line rather than twelve.
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
    private readonly Func<string?>? _language;
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
    /// <param name="language">
    /// Gives the language an outcome built with keys is written in when a summary is written, such as
    /// <c>() =&gt; BaseTranslations.ServerLanguage(config)</c>. US English by default.
    /// </param>
    public ActivitySummary(ActivityLogger logger, TimeSpan? quiet = null, TimeSpan? longest = null, Func<DateTime>? now = null, Func<string?>? language = null)
    {
        ArgumentNullException.ThrowIfNull(logger);
        _logger = logger;
        _quiet = quiet ?? TimeSpan.FromSeconds(30);
        _longest = longest ?? TimeSpan.FromMinutes(5);
        _now = now ?? (() => DateTime.UtcNow);
        _language = language;
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
            if (outcome.NameOne is null || outcome.NameMany is null || outcome.LanguageOverview is null)
            {
                _logger.Log(
                    ActivityText.SummaryName(tally.Total, outcome.Outcome, outcome.Noun),
                    outcome.Type,
                    ActivityText.Sentence(outcome.Overview(counted)),
                    outcome.Severity);
                continue;
            }

            var language = _language?.Invoke() ?? BaseTranslations.FallbackLanguage;
            _logger.Log(
                BaseTranslations.Format(tally.Total == 1 ? outcome.NameOne : outcome.NameMany, language, tally.Total),
                outcome.Type,
                ActivityText.Sentence(outcome.LanguageOverview(counted, language)),
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
