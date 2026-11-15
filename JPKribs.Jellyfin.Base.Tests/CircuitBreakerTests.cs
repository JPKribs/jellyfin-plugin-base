using System;
using System.Collections.Generic;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>Verifies that <see cref="CircuitBreaker"/> opens after repeated failures and closes again on success or reset.</summary>
public class CircuitBreakerTests
{
    private sealed class ListLogger : ILogger
    {
        public List<string> Messages { get; } = new();

        public IDisposable? BeginScope<TState>(TState state)
            where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
            => Messages.Add(formatter(state, exception));
    }

    /// <summary>
    /// The breaker stays closed below the threshold, opens at it, and closes again on a reset.
    /// True: a service that keeps failing is left alone until someone resets it or the cooldown ends.
    /// False: the breaker would open early, never open, or stay open after a reset.
    /// </summary>
    [Fact]
    public void RecordFailure_OpensAtThreshold_AndResetCloses()
    {
        var cb = new CircuitBreaker(NullLogger.Instance, "test", failureThreshold: 2);

        Assert.True(cb.AllowOperation(out _));

        cb.RecordFailure("boom");
        Assert.True(cb.AllowOperation(out _));

        cb.RecordFailure("boom");
        Assert.False(cb.AllowOperation(out var reason));
        Assert.NotNull(reason);

        cb.Reset();
        Assert.True(cb.AllowOperation(out _));
    }

    /// <summary>
    /// A success clears the failure count.
    /// True: only failures in a row count toward opening.
    /// False: failures spread over a long time would eventually open the breaker.
    /// </summary>
    [Fact]
    public void RecordSuccess_ClearsFailures()
    {
        var cb = new CircuitBreaker(NullLogger.Instance, "test", failureThreshold: 2);
        cb.RecordFailure();
        cb.RecordSuccess();
        cb.RecordFailure();

        Assert.Equal(1, cb.ConsecutiveFailures);
        Assert.True(cb.AllowOperation(out _));
    }

    /// <summary>
    /// The open circuit message names no particular plugin feature.
    /// True: every plugin's log reads correctly.
    /// False: a plugin that does not sync logged that "sync operations" paused.
    /// </summary>
    [Fact]
    public void RecordFailure_OpenMessageIsGeneric()
    {
        var logger = new ListLogger();
        var breaker = new CircuitBreaker(logger, "provider", failureThreshold: 1);
        breaker.RecordFailure("boom");

        var message = Assert.Single(logger.Messages, m => m.Contains("OPEN", StringComparison.Ordinal));
        Assert.DoesNotContain("Sync", message, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("provider", message, StringComparison.Ordinal);
    }

    /// <summary>
    /// While open the breaker reports itself open, with a cooldown that remains, and a refusal that names the service and the count.
    /// True: a caller can show why work is paused and for how long.
    /// False: IsOpen or CooldownRemaining would disagree with AllowOperation.
    /// </summary>
    [Fact]
    public void IsOpen_AndCooldownRemaining_DescribeAnOpenBreaker()
    {
        var cb = new CircuitBreaker(NullLogger.Instance, "provider", failureThreshold: 2, cooldownPeriod: TimeSpan.FromHours(1));

        Assert.False(cb.IsOpen);
        Assert.Null(cb.CooldownRemaining);

        cb.RecordFailure();
        cb.RecordFailure();

        Assert.True(cb.IsOpen);
        Assert.Equal(2, cb.ConsecutiveFailures);
        var remaining = cb.CooldownRemaining;
        Assert.NotNull(remaining);
        Assert.InRange(remaining!.Value, TimeSpan.Zero, TimeSpan.FromHours(1));

        Assert.False(cb.AllowOperation(out var reason));
        Assert.Contains("open for provider", reason, StringComparison.Ordinal);
        Assert.Contains("2 consecutive failures", reason, StringComparison.Ordinal);
    }

    /// <summary>
    /// A reset closes the breaker and clears the count and the cooldown.
    /// True: after a manual reset the breaker reports closed.
    /// False: IsOpen or CooldownRemaining would still show the old cooldown.
    /// </summary>
    [Fact]
    public void Reset_ClosesTheBreaker()
    {
        var cb = new CircuitBreaker(NullLogger.Instance, "provider", failureThreshold: 1, cooldownPeriod: TimeSpan.FromHours(1));
        cb.RecordFailure();

        cb.Reset();

        Assert.False(cb.IsOpen);
        Assert.Null(cb.CooldownRemaining);
        Assert.Equal(0, cb.ConsecutiveFailures);
    }

    /// <summary>
    /// Once the cooldown has elapsed the breaker allows operations again and keeps its failure count.
    /// True: the service gets another try after the cooldown.
    /// False: the breaker would stay open past its cooldown.
    /// </summary>
    [Fact]
    public void AfterTheCooldown_OperationsAreAllowedAndTheCountIsKept()
    {
        var cb = new CircuitBreaker(NullLogger.Instance, "provider", failureThreshold: 1, cooldownPeriod: TimeSpan.Zero);

        cb.RecordFailure();

        Assert.False(cb.IsOpen);
        Assert.Null(cb.CooldownRemaining);
        Assert.True(cb.AllowOperation(out var reason));
        Assert.Null(reason);
        Assert.Equal(1, cb.ConsecutiveFailures);
    }

    /// <summary>
    /// With a fake clock the breaker is open until the cooldown has passed, and not a moment longer.
    /// True: IsOpen and CooldownRemaining follow the clock the test moves.
    /// False: the breaker would read the system clock and a test would have to wait.
    /// </summary>
    [Fact]
    public void IsOpen_AndCooldownRemaining_FollowTheInjectedClock()
    {
        var time = new FakeTimeProvider();
        var cb = new CircuitBreaker(NullLogger.Instance, "provider", failureThreshold: 1, cooldownPeriod: TimeSpan.FromMinutes(10), timeProvider: time);
        cb.RecordFailure();

        Assert.True(cb.IsOpen);
        Assert.Equal(TimeSpan.FromMinutes(10), cb.CooldownRemaining);

        time.Advance(TimeSpan.FromMinutes(4));
        Assert.True(cb.IsOpen);
        Assert.Equal(TimeSpan.FromMinutes(6), cb.CooldownRemaining);

        time.Advance(TimeSpan.FromMinutes(6));
        Assert.False(cb.IsOpen);
        Assert.Null(cb.CooldownRemaining);
    }

    /// <summary>
    /// AllowOperation refuses with the seconds left until the cooldown passes, then allows.
    /// True: the reason counts down with the clock and the count is kept after the cooldown.
    /// False: the reason would show a stale time or the breaker would stay shut.
    /// </summary>
    [Fact]
    public void AllowOperation_FollowsTheInjectedClock()
    {
        var time = new FakeTimeProvider();
        var cb = new CircuitBreaker(NullLogger.Instance, "provider", failureThreshold: 2, cooldownPeriod: TimeSpan.FromMinutes(5), timeProvider: time);
        cb.RecordFailure();
        cb.RecordFailure();

        Assert.False(cb.AllowOperation(out var first));
        Assert.Equal("Circuit breaker open for provider: 2 consecutive failures. Retry in 300 seconds.", first);

        time.Advance(TimeSpan.FromSeconds(60));
        Assert.False(cb.AllowOperation(out var second));
        Assert.Equal("Circuit breaker open for provider: 2 consecutive failures. Retry in 240 seconds.", second);

        time.Advance(TimeSpan.FromSeconds(240));
        Assert.True(cb.AllowOperation(out var third));
        Assert.Null(third);
        Assert.Equal(2, cb.ConsecutiveFailures);
    }

    /// <summary>
    /// The refusal reason writes the seconds with an invariant format, whatever the current culture is.
    /// True: a culture with other digits or signs still gives plain digits.
    /// False: the message would change with the server's language.
    /// </summary>
    [Fact]
    public void AllowOperation_ReasonUsesTheInvariantCulture()
    {
        var culture = (System.Globalization.CultureInfo)System.Globalization.CultureInfo.InvariantCulture.Clone();
        culture.NumberFormat.NumberDecimalSeparator = ",";
        var previous = System.Globalization.CultureInfo.CurrentCulture;
        try
        {
            System.Globalization.CultureInfo.CurrentCulture = culture;
            var time = new FakeTimeProvider();
            var cb = new CircuitBreaker(NullLogger.Instance, "p", failureThreshold: 1, cooldownPeriod: TimeSpan.FromSeconds(90.4), timeProvider: time);
            cb.RecordFailure();

            Assert.False(cb.AllowOperation(out var reason));
            Assert.EndsWith("Retry in 90 seconds.", reason, StringComparison.Ordinal);
        }
        finally
        {
            System.Globalization.CultureInfo.CurrentCulture = previous;
        }
    }

    /// <summary>
    /// A failure after the cooldown restarts it from the clock's current time, and a success closes the breaker.
    /// True: the cooldown is measured from the latest failure.
    /// False: an old open time would reopen the breaker early.
    /// </summary>
    [Fact]
    public void RecordFailure_AfterTheCooldown_RestartsIt()
    {
        var time = new FakeTimeProvider();
        var cb = new CircuitBreaker(NullLogger.Instance, "p", failureThreshold: 1, cooldownPeriod: TimeSpan.FromMinutes(1), timeProvider: time);
        cb.RecordFailure();
        time.Advance(TimeSpan.FromMinutes(2));
        Assert.False(cb.IsOpen);

        cb.RecordFailure();
        Assert.True(cb.IsOpen);
        Assert.Equal(TimeSpan.FromMinutes(1), cb.CooldownRemaining);

        cb.RecordSuccess();
        Assert.False(cb.IsOpen);
    }
}
