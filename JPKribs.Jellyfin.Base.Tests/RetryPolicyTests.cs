using System;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>Verifies that <see cref="RetryPolicy"/> retries transient faults and lets every other failure through at once.</summary>
public class RetryPolicyTests
{
    /// <summary>
    /// A transient fault is retried and the retry's result is returned.
    /// True: a brief network fault does not fail the caller.
    /// False: the first fault would reach the caller.
    /// </summary>
    [Fact]
    public async Task ExecuteWithRetryAsync_RetriesTransient_ThenSucceeds()
    {
        var attempts = 0;

        var result = await RetryPolicy.ExecuteWithRetryAsync(
            ct =>
            {
                attempts++;
                if (attempts == 1)
                {
                    throw new HttpRequestException("transient");
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

    /// <summary>
    /// A fault that is not transient is thrown at once and not retried.
    /// True: a permanent error fails fast.
    /// False: the operation would be repeated and the caller delayed.
    /// </summary>
    [Fact]
    public async Task ExecuteWithRetryAsync_NonTransient_ThrowsImmediately()
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

        Assert.Equal(1, attempts);
    }

    /// <summary>
    /// With no retries allowed a transient fault is thrown after the first attempt.
    /// True: a caller can turn retrying off.
    /// False: the operation would wait and run again.
    /// </summary>
    [Fact]
    public async Task ExecuteWithRetryAsync_ZeroRetries_ThrowsTheTransientFaultAtOnce()
    {
        var attempts = 0;

        await Assert.ThrowsAsync<HttpRequestException>(() =>
            RetryPolicy.ExecuteWithRetryAsync<string>(
                ct =>
                {
                    attempts++;
                    throw new HttpRequestException("down");
                },
                maxRetries: 0,
                NullLogger.Instance,
                "op"));

        Assert.Equal(1, attempts);
    }

    /// <summary>
    /// An HTTP error whose status is not on the transient list is not retried.
    /// True: a 404 fails fast and a missing resource is not hammered.
    /// False: any HTTP error would be retried.
    /// </summary>
    [Fact]
    public async Task ExecuteWithRetryAsync_NotFoundStatus_IsNotRetried()
    {
        var attempts = 0;

        await Assert.ThrowsAsync<HttpRequestException>(() =>
            RetryPolicy.ExecuteWithRetryAsync<string>(
                ct =>
                {
                    attempts++;
                    throw new HttpRequestException("missing", null, HttpStatusCode.NotFound);
                },
                maxRetries: 3,
                NullLogger.Instance,
                "op"));

        Assert.Equal(1, attempts);
    }

    /// <summary>
    /// A cancelled token stops the operation without a retry, and the cancellation propagates.
    /// True: a shutdown is never retried.
    /// False: a cancelled operation would be run again.
    /// </summary>
    [Fact]
    public async Task ExecuteWithRetryAsync_CancelledToken_PropagatesWithoutRetrying()
    {
        var attempts = 0;
        using var cts = new CancellationTokenSource();
        await cts.CancelAsync();

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            RetryPolicy.ExecuteWithRetryAsync<string>(
                ct =>
                {
                    attempts++;
                    ct.ThrowIfCancellationRequested();
                    return Task.FromResult("never");
                },
                maxRetries: 3,
                NullLogger.Instance,
                "op",
                cts.Token));

        Assert.Equal(1, attempts);
    }

    /// <summary>
    /// A negative retry count never runs the operation and throws.
    /// True: the documented edge behaves as documented.
    /// False: the operation would run once or the call would hang.
    /// </summary>
    [Fact]
    public async Task ExecuteWithRetryAsync_NegativeRetries_NeverRunsTheOperation()
    {
        var attempts = 0;

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            RetryPolicy.ExecuteWithRetryAsync<string>(
                ct =>
                {
                    attempts++;
                    return Task.FromResult("never");
                },
                maxRetries: -1,
                NullLogger.Instance,
                "op"));

        Assert.Equal(0, attempts);
    }

    /// <summary>
    /// The overload that returns no value runs the operation once when it succeeds.
    /// True: a void operation is wrapped the same way.
    /// False: the operation would run more than once or its fault would be lost.
    /// </summary>
    [Fact]
    public async Task ExecuteWithRetryAsync_Void_RunsOnceOnSuccessAndThrowsAPermanentFault()
    {
        var runs = 0;
        await RetryPolicy.ExecuteWithRetryAsync(
            ct =>
            {
                runs++;
                return Task.CompletedTask;
            },
            maxRetries: 2,
            NullLogger.Instance,
            "op");
        Assert.Equal(1, runs);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            RetryPolicy.ExecuteWithRetryAsync(
                ct => throw new InvalidOperationException("permanent"),
                maxRetries: 2,
                NullLogger.Instance,
                "op"));
    }
}
