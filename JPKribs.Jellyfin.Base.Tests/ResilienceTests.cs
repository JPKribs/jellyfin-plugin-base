using System;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using JPKribs.Jellyfin.Base;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>Tests for the promoted resilience helpers (CircuitBreaker, RetryPolicy).</summary>
public class ResilienceTests
{
    // MARK: CircuitBreaker

    [Fact]
    public void CircuitBreaker_OpensAtThreshold_AndResets()
    {
        var cb = new CircuitBreaker(NullLogger.Instance, "test", failureThreshold: 2);

        Assert.True(cb.AllowOperation(out _));        // closed initially

        cb.RecordFailure("boom");
        Assert.True(cb.AllowOperation(out _));        // 1 failure, still closed

        cb.RecordFailure("boom");                     // hits threshold -> open
        Assert.False(cb.AllowOperation(out var reason));
        Assert.NotNull(reason);

        cb.Reset();
        Assert.True(cb.AllowOperation(out _));         // closed again
    }

    [Fact]
    public void CircuitBreaker_SuccessClearsFailures()
    {
        var cb = new CircuitBreaker(NullLogger.Instance, "test", failureThreshold: 2);
        cb.RecordFailure();
        cb.RecordSuccess();
        cb.RecordFailure();                            // only 1 since the reset -> still closed
        Assert.True(cb.AllowOperation(out _));
    }

    // MARK: RetryPolicy

    [Fact]
    public async Task RetryPolicy_RetriesTransient_ThenSucceeds()
    {
        var attempts = 0;
        var result = await RetryPolicy.ExecuteWithRetryAsync(
            ct =>
            {
                attempts++;
                if (attempts == 1)
                {
                    throw new HttpRequestException("transient");   // no status code => transient
                }

                return Task.FromResult("ok");
            },
            maxRetries: 2,
            NullLogger.Instance,
            "op",
            CancellationToken.None);

        Assert.Equal("ok", result);
        Assert.Equal(2, attempts);
    }

    [Fact]
    public async Task RetryPolicy_NonTransient_ThrowsImmediately()
    {
        var attempts = 0;
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            RetryPolicy.ExecuteWithRetryAsync<string>(
                ct =>
                {
                    attempts++;
                    throw new InvalidOperationException("permanent");
                },
                maxRetries: 3,
                NullLogger.Instance,
                "op",
                CancellationToken.None));

        Assert.Equal(1, attempts); // not retried
    }
}
