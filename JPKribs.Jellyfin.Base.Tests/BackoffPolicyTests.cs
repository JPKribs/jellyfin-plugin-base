using System;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>Verifies that <see cref="BackoffPolicy"/> pauses a failing operation for a delay that grows and is capped.</summary>
public class BackoffPolicyTests
{
    private static readonly DateTime Now = new(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);

    /// <summary>
    /// Failures below the threshold are counted but set no pause.
    /// True: an occasional failure never delays the next attempt.
    /// False: the first failure would already back the entity off.
    /// </summary>
    [Fact]
    public void RecordFailure_BelowThreshold_CountsButDoesNotPause()
    {
        var policy = new BackoffPolicy(failureThreshold: 3);

        var s1 = policy.RecordFailure(BackoffState.Initial, Now);
        var s2 = policy.RecordFailure(s1, Now);

        Assert.Equal(2, s2.ConsecutiveFailures);
        Assert.Null(s2.BackoffUntilUtc);
        Assert.False(policy.IsBackingOff(s2, Now));
    }

    /// <summary>
    /// The failure that reaches the threshold pauses for the base delay.
    /// True: backoff starts exactly at the threshold and ends on time.
    /// False: the pause would start early, late, or last the wrong time.
    /// </summary>
    [Fact]
    public void RecordFailure_AtThreshold_PausesForBaseDelay()
    {
        var policy = new BackoffPolicy(failureThreshold: 2, baseDelay: TimeSpan.FromMinutes(5), maxDelay: TimeSpan.FromHours(1));

        var s1 = policy.RecordFailure(BackoffState.Initial, Now);
        var s2 = policy.RecordFailure(s1, Now);

        Assert.Equal(Now.AddMinutes(5), s2.BackoffUntilUtc);
        Assert.True(policy.IsBackingOff(s2, Now.AddMinutes(4)));
        Assert.False(policy.IsBackingOff(s2, Now.AddMinutes(6)));
    }

    /// <summary>
    /// Each failure past the threshold doubles the pause until it reaches the maximum.
    /// True: a long outage backs off quickly and never past the cap.
    /// False: the pause would stay flat or grow without limit.
    /// </summary>
    [Fact]
    public void RecordFailure_EscalatesExponentiallyAndCaps()
    {
        var policy = new BackoffPolicy(failureThreshold: 1, baseDelay: TimeSpan.FromMinutes(5), maxDelay: TimeSpan.FromMinutes(30));

        var s1 = policy.RecordFailure(BackoffState.Initial, Now);
        Assert.Equal(Now.AddMinutes(5), s1.BackoffUntilUtc);

        var s2 = policy.RecordFailure(s1, Now);
        Assert.Equal(Now.AddMinutes(10), s2.BackoffUntilUtc);

        var s3 = policy.RecordFailure(s2, Now);
        Assert.Equal(Now.AddMinutes(20), s3.BackoffUntilUtc);

        var s4 = policy.RecordFailure(s3, Now);
        Assert.Equal(Now.AddMinutes(30), s4.BackoffUntilUtc);
    }

    /// <summary>
    /// A very long run of failures is capped at the maximum without overflowing.
    /// True: an entity that fails for months still gets a valid pause.
    /// False: the doubling would overflow into a negative or past pause.
    /// </summary>
    [Fact]
    public void RecordFailure_AfterManyFailures_StaysAtTheMaximum()
    {
        var policy = new BackoffPolicy(failureThreshold: 1, baseDelay: TimeSpan.FromMinutes(5), maxDelay: TimeSpan.FromHours(6));

        var state = policy.RecordFailure(new BackoffState(100, null), Now);

        Assert.Equal(101, state.ConsecutiveFailures);
        Assert.Equal(Now.AddHours(6), state.BackoffUntilUtc);
    }

    /// <summary>
    /// A success returns the initial state, with no failures and no pause.
    /// True: a recovered entity starts clean.
    /// False: old failures would keep counting toward the next pause.
    /// </summary>
    [Fact]
    public void RecordSuccess_Resets()
    {
        var policy = new BackoffPolicy();

        var reset = policy.RecordSuccess();

        Assert.Equal(0, reset.ConsecutiveFailures);
        Assert.Null(reset.BackoffUntilUtc);
        Assert.Equal(BackoffState.Initial, reset);
    }

    /// <summary>
    /// A state is backing off only strictly before its end time.
    /// True: the attempt at the exact end time goes ahead.
    /// False: the entity would wait one tick too long.
    /// </summary>
    [Fact]
    public void IsBackingOff_EndsAtTheBackoffTime()
    {
        var policy = new BackoffPolicy();
        var state = new BackoffState(3, Now.AddMinutes(5));

        Assert.True(policy.IsBackingOff(state, Now.AddMinutes(5).AddTicks(-1)));
        Assert.False(policy.IsBackingOff(state, Now.AddMinutes(5)));
        Assert.False(policy.IsBackingOff(BackoffState.Initial, Now));
    }

    /// <summary>
    /// A threshold below one is rejected.
    /// True: a policy that could never engage cannot be built.
    /// False: a zero or negative threshold would be accepted silently.
    /// </summary>
    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Constructor_RejectsAThresholdBelowOne(int threshold)
        => Assert.Throws<ArgumentOutOfRangeException>(() => new BackoffPolicy(failureThreshold: threshold));
}
