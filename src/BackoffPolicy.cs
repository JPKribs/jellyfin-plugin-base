using System;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// Immutable backoff state a caller persists per entity (e.g. on a DNS record or a queue item). Holds the
/// consecutive-failure count and, once past the threshold, the UTC instant before which the next attempt is
/// suppressed.
/// </summary>
/// <param name="ConsecutiveFailures">Number of failures in a row; reset to zero on success.</param>
/// <param name="BackoffUntilUtc">Instant before which attempts are paused, or null when not backing off.</param>
public readonly record struct BackoffState(int ConsecutiveFailures, DateTime? BackoffUntilUtc)
{
    /// <summary>Gets the initial state: no failures, not backing off.</summary>
    public static BackoffState Initial => new(0, null);
}

/// <summary>
/// Decides how long to pause a repeatedly-failing operation. Unlike <see cref="CircuitBreaker"/>, which keeps
/// state in memory for a named service, this policy is stateless: the caller passes in the current
/// <see cref="BackoffState"/> and stores the returned one, so the pause survives restarts when persisted on the
/// entity itself. Backoff escalates exponentially from a base delay, capped at a maximum, and only engages once
/// a failure threshold is crossed.
/// </summary>
public sealed class BackoffPolicy
{
    private readonly int _failureThreshold;
    private readonly TimeSpan _baseDelay;
    private readonly TimeSpan _maxDelay;

    /// <summary>
    /// Initializes a new instance of the <see cref="BackoffPolicy"/> class.
    /// </summary>
    /// <param name="failureThreshold">Consecutive failures required before any backoff engages (default 3).</param>
    /// <param name="baseDelay">Delay applied at the threshold; doubles per additional failure (default 5 minutes).</param>
    /// <param name="maxDelay">Ceiling for the escalating delay (default 6 hours).</param>
    public BackoffPolicy(int failureThreshold = 3, TimeSpan? baseDelay = null, TimeSpan? maxDelay = null)
    {
        if (failureThreshold < 1)
        {
            throw new ArgumentOutOfRangeException(nameof(failureThreshold), "Threshold must be at least 1.");
        }

        _failureThreshold = failureThreshold;
        _baseDelay = baseDelay ?? TimeSpan.FromMinutes(5);
        _maxDelay = maxDelay ?? TimeSpan.FromHours(6);
    }

    /// <summary>Returns true when <paramref name="state"/> is currently paused as of <paramref name="nowUtc"/>.</summary>
    /// <param name="state">The persisted state.</param>
    /// <param name="nowUtc">The current UTC time (injectable for testing).</param>
    /// <returns>Whether the next attempt should be suppressed.</returns>
    public bool IsBackingOff(BackoffState state, DateTime nowUtc)
        => state.BackoffUntilUtc is { } until && nowUtc < until;

    /// <summary>Convenience overload using <see cref="DateTime.UtcNow"/>.</summary>
    /// <param name="state">The persisted state.</param>
    /// <returns>Whether the next attempt should be suppressed.</returns>
    public bool IsBackingOff(BackoffState state) => IsBackingOff(state, DateTime.UtcNow);

    /// <summary>
    /// Records a failure and returns the updated state. Below the threshold the failure is counted but no
    /// pause is set; at or beyond it the pause window grows exponentially, capped at the configured maximum.
    /// </summary>
    /// <param name="state">The current state.</param>
    /// <param name="nowUtc">The current UTC time.</param>
    /// <returns>The state to persist.</returns>
    public BackoffState RecordFailure(BackoffState state, DateTime nowUtc)
    {
        var failures = state.ConsecutiveFailures + 1;
        if (failures < _failureThreshold)
        {
            return new BackoffState(failures, null);
        }

        var steps = failures - _failureThreshold; // 0 at the threshold, +1 per extra failure
        var delay = ScaleDelay(steps);
        return new BackoffState(failures, nowUtc + delay);
    }

    /// <summary>Convenience overload using <see cref="DateTime.UtcNow"/>.</summary>
    /// <param name="state">The current state.</param>
    /// <returns>The state to persist.</returns>
    public BackoffState RecordFailure(BackoffState state) => RecordFailure(state, DateTime.UtcNow);

    /// <summary>Clears the failure count and any pause after a successful attempt.</summary>
    /// <returns>The reset state.</returns>
    public BackoffState RecordSuccess() => BackoffState.Initial;

    private TimeSpan ScaleDelay(int steps)
    {
        // Double the base delay per step, guarding against overflow before the cap clamps it.
        var maxTicks = _maxDelay.Ticks;
        if (steps >= 62)
        {
            return _maxDelay;
        }

        var scaled = _baseDelay.Ticks * (1L << steps);
        if (scaled <= 0 || scaled > maxTicks)
        {
            return _maxDelay;
        }

        return TimeSpan.FromTicks(scaled);
    }
}
