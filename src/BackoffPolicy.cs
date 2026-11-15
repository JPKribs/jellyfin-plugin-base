using System;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// The backoff state a caller persists per entity, such as a DNS record or a queue item.
/// It holds the failures in a row and, once past the threshold, the UTC instant before which the next attempt is suppressed.
/// </summary>
/// <param name="ConsecutiveFailures">The number of failures in a row. It returns to zero on success.</param>
/// <param name="BackoffUntilUtc">The UTC instant before which attempts are paused, or <c>null</c> when not backing off.</param>
public readonly record struct BackoffState(int ConsecutiveFailures, DateTime? BackoffUntilUtc)
{
    /// <summary>Gets the initial state, with no failures and no pause.</summary>
    public static BackoffState Initial => new(0, null);
}

/// <summary>
/// Decides how long to pause an operation that keeps failing.
/// The delay doubles from a base delay up to a maximum, and only starts once a failure threshold is reached.
/// </summary>
/// <remarks>
/// Unlike <see cref="CircuitBreaker"/>, which keeps state in memory for a named service, this policy is stateless.
/// The caller passes in the current <see cref="BackoffState"/> and stores the returned one, so the pause survives a restart when it is persisted.
/// </remarks>
public sealed class BackoffPolicy
{
    private readonly int _failureThreshold;
    private readonly TimeSpan _baseDelay;
    private readonly TimeSpan _maxDelay;

    /// <summary>
    /// Initializes a new instance of the <see cref="BackoffPolicy"/> class.
    /// </summary>
    /// <param name="failureThreshold">The failures in a row required before any backoff starts. 3 by default.</param>
    /// <param name="baseDelay">The delay at the threshold, which doubles for each further failure. 5 minutes by default.</param>
    /// <param name="maxDelay">The ceiling for the delay. 6 hours by default.</param>
    /// <exception cref="ArgumentOutOfRangeException"><paramref name="failureThreshold"/> is less than 1.</exception>
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

    /// <summary>Checks whether the state is paused as of the given time.</summary>
    /// <param name="state">The persisted state.</param>
    /// <param name="nowUtc">The current UTC time.</param>
    /// <returns><c>true</c> when the next attempt should be suppressed, otherwise <c>false</c>.</returns>
    public bool IsBackingOff(BackoffState state, DateTime nowUtc)
        => state.BackoffUntilUtc is { } until && nowUtc < until;

    /// <summary>Checks whether the state is paused as of <see cref="DateTime.UtcNow"/>.</summary>
    /// <param name="state">The persisted state.</param>
    /// <returns><c>true</c> when the next attempt should be suppressed, otherwise <c>false</c>.</returns>
    public bool IsBackingOff(BackoffState state) => IsBackingOff(state, DateTime.UtcNow);

    /// <summary>
    /// Records a failure and returns the updated state.
    /// Below the threshold the failure is counted and no pause is set, and from the threshold on the pause doubles up to the maximum.
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

        var steps = failures - _failureThreshold;
        var delay = ScaleDelay(steps);
        return new BackoffState(failures, nowUtc + delay);
    }

    /// <summary>Records a failure at <see cref="DateTime.UtcNow"/> and returns the updated state.</summary>
    /// <param name="state">The current state.</param>
    /// <returns>The state to persist.</returns>
    public BackoffState RecordFailure(BackoffState state) => RecordFailure(state, DateTime.UtcNow);

    /// <summary>Gives the state to persist after a successful attempt.</summary>
    /// <remarks>This is an instance method that ignores the instance and returns <see cref="BackoffState.Initial"/>.</remarks>
    /// <returns>The reset state, with no failures and no pause.</returns>
    public BackoffState RecordSuccess() => BackoffState.Initial;

    private TimeSpan ScaleDelay(int steps)
    {
        // Doubling can overflow, so a large step or an overflowed product falls back to the cap.
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
