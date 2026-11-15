using System;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>Verifies that <see cref="HttpRetry"/> names the transient statuses exactly and reads Retry-After in both forms, capped.</summary>
public class HttpRetryTests
{
    private static readonly DateTimeOffset Now = new(2026, 3, 1, 12, 0, 0, TimeSpan.Zero);

    private static HttpResponseHeaders Headers(RetryConditionHeaderValue? retryAfter)
    {
        using var response = new HttpResponseMessage();
        response.Headers.RetryAfter = retryAfter;
        return response.Headers;
    }

    /// <summary>
    /// The broad set is 408, 429, and every 5xx status.
    /// True: a timeout, throttling, and any server error count, and nothing else does.
    /// False: a client error such as 404 would be retried, or a server error would be missed.
    /// </summary>
    [Theory]
    [InlineData(200, false)]
    [InlineData(301, false)]
    [InlineData(400, false)]
    [InlineData(401, false)]
    [InlineData(404, false)]
    [InlineData(407, false)]
    [InlineData(408, true)]
    [InlineData(409, false)]
    [InlineData(425, false)]
    [InlineData(429, true)]
    [InlineData(499, false)]
    [InlineData(500, true)]
    [InlineData(501, true)]
    [InlineData(502, true)]
    [InlineData(503, true)]
    [InlineData(504, true)]
    [InlineData(599, true)]
    [InlineData(600, false)]
    public void IsTransient_CoversTimeoutThrottlingAndServerErrors(int status, bool expected)
    {
        Assert.Equal(expected, HttpRetry.IsTransient((HttpStatusCode)status));
    }

    /// <summary>
    /// The gateway set is 408, 429, 502, 503, and 504, and leaves a plain 500 and 501 out.
    /// True: a server that did the work and failed is not asked to do it again.
    /// False: a 500 would be retried and could repeat a side effect.
    /// </summary>
    [Theory]
    [InlineData(200, false)]
    [InlineData(404, false)]
    [InlineData(408, true)]
    [InlineData(429, true)]
    [InlineData(500, false)]
    [InlineData(501, false)]
    [InlineData(502, true)]
    [InlineData(503, true)]
    [InlineData(504, true)]
    [InlineData(505, false)]
    public void IsGatewayTransient_CoversTheGatewayStatuses(int status, bool expected)
    {
        Assert.Equal(expected, HttpRetry.IsGatewayTransient((HttpStatusCode)status));
    }

    /// <summary>
    /// A Retry-After in seconds is returned as that wait.
    /// True: the caller waits as long as the server asked.
    /// False: the delta form would be ignored.
    /// </summary>
    [Fact]
    public void RetryAfter_ReadsTheSecondsForm()
    {
        var wait = HttpRetry.RetryAfter(Headers(new RetryConditionHeaderValue(TimeSpan.FromSeconds(7))), TimeSpan.FromSeconds(30));

        Assert.Equal(TimeSpan.FromSeconds(7), wait);
    }

    /// <summary>
    /// A Retry-After date is measured from the clock that was passed in.
    /// True: a date ten seconds ahead gives a ten second wait.
    /// False: the date form would be ignored, or measured from the real clock.
    /// </summary>
    [Fact]
    public void RetryAfter_ReadsTheDateForm()
    {
        var time = new FakeTimeProvider(Now);

        var wait = HttpRetry.RetryAfter(Headers(new RetryConditionHeaderValue(Now.AddSeconds(10))), TimeSpan.FromSeconds(30), time);

        Assert.Equal(TimeSpan.FromSeconds(10), wait);
    }

    /// <summary>
    /// A wait above the cap is cut to the cap, in both forms.
    /// True: a server cannot stall a caller for as long as it asks.
    /// False: a ten minute request would be honored.
    /// </summary>
    [Fact]
    public void RetryAfter_IsCapped()
    {
        var time = new FakeTimeProvider(Now);
        var cap = TimeSpan.FromSeconds(30);

        Assert.Equal(cap, HttpRetry.RetryAfter(Headers(new RetryConditionHeaderValue(TimeSpan.FromMinutes(10))), cap));
        Assert.Equal(cap, HttpRetry.RetryAfter(Headers(new RetryConditionHeaderValue(Now.AddHours(1))), cap, time));
        Assert.Equal(cap, HttpRetry.RetryAfter(Headers(new RetryConditionHeaderValue(cap)), cap));
    }

    /// <summary>
    /// A missing header, a zero wait, and a date in the past give no wait.
    /// True: the caller falls back to its own backoff.
    /// False: a past date would give a negative wait.
    /// </summary>
    [Fact]
    public void RetryAfter_WithoutAUsableValue_IsNull()
    {
        var time = new FakeTimeProvider(Now);
        var cap = TimeSpan.FromSeconds(30);

        Assert.Null(HttpRetry.RetryAfter(Headers(null), cap));
        Assert.Null(HttpRetry.RetryAfter(Headers(new RetryConditionHeaderValue(TimeSpan.Zero)), cap));
        Assert.Null(HttpRetry.RetryAfter(Headers(new RetryConditionHeaderValue(Now.AddSeconds(-5))), cap, time));
        Assert.Null(HttpRetry.RetryAfter(Headers(new RetryConditionHeaderValue(Now)), cap, time));
    }

    /// <summary>
    /// Missing headers are refused.
    /// True: a bad call fails where it is made.
    /// False: the first read would fail with a null reference.
    /// </summary>
    [Fact]
    public void RetryAfter_WithNoHeaders_Throws()
    {
        Assert.Throws<ArgumentNullException>(() => HttpRetry.RetryAfter(null!, TimeSpan.FromSeconds(1)));
    }
}
