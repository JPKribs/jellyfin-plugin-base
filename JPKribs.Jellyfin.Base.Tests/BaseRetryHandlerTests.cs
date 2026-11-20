using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading;
using System.Threading.Tasks;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>
/// Verifies that <see cref="BaseRetryHandler"/> retries only reads that failed for a reason worth trying again, and that a wrong retry cannot hide an outage or repeat a write.
/// </summary>
public class BaseRetryHandlerTests
{
    private static readonly Uri Url = new("https://source.example/Items");

    private sealed class ScriptedHandler : HttpMessageHandler
    {
        private readonly List<Func<CancellationToken, Task<HttpResponseMessage>>> _script;

        public ScriptedHandler(params Func<CancellationToken, Task<HttpResponseMessage>>[] script) => _script = script.ToList();

        public int Calls { get; private set; }

        public SemaphoreSlim Started { get; } = new(0);

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var step = _script[Math.Min(Calls, _script.Count - 1)];
            Calls++;
            Started.Release();
            return step(cancellationToken);
        }
    }

    private static Func<CancellationToken, Task<HttpResponseMessage>> Answer(HttpStatusCode status)
        => _ => Task.FromResult(new HttpResponseMessage(status));

    private static Func<CancellationToken, Task<HttpResponseMessage>> Drop()
        => _ => throw new HttpRequestException("test: connection reset");

    private static Func<CancellationToken, Task<HttpResponseMessage>> Hang()
        => async token =>
        {
            await Task.Delay(Timeout.Infinite, token);
            throw new InvalidOperationException("unreachable");
        };

    private static (HttpClient Client, List<TimeSpan> Waits, FakeTimeProvider Time) Build(
        ScriptedHandler inner,
        int maxAttempts = 3,
        TimeSpan? attemptTimeout = null,
        Func<double>? random = null)
    {
        var waits = new List<TimeSpan>();
        var time = new FakeTimeProvider();
        var options = new BaseRetryOptions
        {
            MaxAttempts = maxAttempts,
            AttemptTimeout = attemptTimeout ?? TimeSpan.FromSeconds(30),
            TimeProvider = time,
            Random = random ?? (() => 0),
            Delay = (wait, _) =>
            {
                waits.Add(wait);
                return Task.CompletedTask;
            }
        };
        return (new HttpClient(new BaseRetryHandler(options) { InnerHandler = inner }), waits, time);
    }

    /// <summary>
    /// A busy answer is asked again after a wait.
    /// True: a 503 followed by a 200 returns the 200 after one wait.
    /// False: a server that is briefly busy would fail the whole call.
    /// </summary>
    [Fact]
    public async Task BusyServer_IsAskedAgain()
    {
        var inner = new ScriptedHandler(Answer(HttpStatusCode.ServiceUnavailable), Answer(HttpStatusCode.OK));
        var (client, waits, _) = Build(inner);

        using var response = await client.GetAsync(Url);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(2, inner.Calls);
        Assert.Single(waits);
    }

    /// <summary>
    /// A HEAD request is retried like a GET.
    /// True: a 502 followed by a 200 returns the 200.
    /// False: a HEAD probe would fail on one bad gateway.
    /// </summary>
    [Fact]
    public async Task Head_IsRetried()
    {
        var inner = new ScriptedHandler(Answer(HttpStatusCode.BadGateway), Answer(HttpStatusCode.OK));
        var (client, _, _) = Build(inner);

        using var response = await client.SendAsync(new HttpRequestMessage(HttpMethod.Head, Url));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(2, inner.Calls);
    }

    /// <summary>
    /// A dropped connection is retried.
    /// True: a connection reset followed by a 200 returns the 200.
    /// False: one network blip would fail the call.
    /// </summary>
    [Fact]
    public async Task DroppedConnection_IsRetried()
    {
        var inner = new ScriptedHandler(Drop(), Answer(HttpStatusCode.OK));
        var (client, _, _) = Build(inner);

        using var response = await client.GetAsync(Url);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(2, inner.Calls);
    }

    /// <summary>
    /// A connection that keeps dropping fails with the exception after the last attempt.
    /// True: the caller sees the network error and the attempts stop at the maximum.
    /// False: the last failure would be swallowed or retried without end.
    /// </summary>
    [Fact]
    public async Task DroppedConnectionOnEveryAttempt_ThrowsTheLastError()
    {
        var inner = new ScriptedHandler(Drop());
        var (client, waits, _) = Build(inner);

        await Assert.ThrowsAsync<HttpRequestException>(() => client.GetAsync(Url));

        Assert.Equal(3, inner.Calls);
        Assert.Equal(2, waits.Count);
    }

    /// <summary>
    /// A failure that carries a status is not retried.
    /// True: a refused redirect is returned to the caller after one call.
    /// False: an answer the server really gave would be asked for again.
    /// </summary>
    [Fact]
    public async Task FailureWithAStatus_IsNotRetried()
    {
        var inner = new ScriptedHandler(_ => throw new HttpRequestException("refused", null, HttpStatusCode.Redirect));
        var (client, _, _) = Build(inner);

        await Assert.ThrowsAsync<HttpRequestException>(() => client.GetAsync(Url));

        Assert.Equal(1, inner.Calls);
    }

    /// <summary>
    /// An attempt that exceeds the attempt timeout is cut off and retried.
    /// True: a hung first attempt is followed by a second that succeeds.
    /// False: a server that accepts a request and never answers would hang the caller.
    /// </summary>
    [Fact]
    public async Task SlowAttempt_IsCutOffAndRetried()
    {
        var inner = new ScriptedHandler(Hang(), Answer(HttpStatusCode.OK));
        var (client, _, time) = Build(inner, attemptTimeout: TimeSpan.FromSeconds(30));

        var call = client.GetAsync(Url);
        await inner.Started.WaitAsync();
        time.Advance(TimeSpan.FromSeconds(30));
        using var response = await call;

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(2, inner.Calls);
    }

    /// <summary>
    /// When every attempt times out the call fails as a timeout after the maximum attempts.
    /// True: a dead server fails the call after the allowed attempts and no more.
    /// False: a dead server would be retried forever, or fail without being retried.
    /// </summary>
    [Fact]
    public async Task EveryAttemptSlow_FailsAsATimeout()
    {
        var inner = new ScriptedHandler(Hang());
        var (client, _, time) = Build(inner, attemptTimeout: TimeSpan.FromSeconds(30));

        var call = client.GetAsync(Url);
        for (var i = 0; i < 3; i++)
        {
            await inner.Started.WaitAsync();
            time.Advance(TimeSpan.FromSeconds(30));
        }

        var error = await Assert.ThrowsAsync<TaskCanceledException>(() => call);
        Assert.Equal(3, inner.Calls);
        Assert.Contains("30 seconds, 3 times", error.Message, StringComparison.Ordinal);
    }

    /// <summary>
    /// A server that stays busy for every attempt returns its last answer.
    /// True: the caller sees the final gateway status after the maximum attempts.
    /// False: the caller would see an exception instead of the status, or the attempts would pass the maximum.
    /// </summary>
    [Fact]
    public async Task StillBusyAfterEveryAttempt_ReturnsTheLastAnswer()
    {
        var inner = new ScriptedHandler(Answer(HttpStatusCode.BadGateway), Answer(HttpStatusCode.BadGateway), Answer(HttpStatusCode.GatewayTimeout));
        var (client, _, _) = Build(inner);

        using var response = await client.GetAsync(Url);

        Assert.Equal(HttpStatusCode.GatewayTimeout, response.StatusCode);
        Assert.Equal(3, inner.Calls);
    }

    /// <summary>
    /// A definite answer is returned at once, including a plain 500.
    /// True: a 404, 401, 500, or 501 is returned after one call.
    /// False: a missing item would be asked for three times, and a 500 would repeat work.
    /// </summary>
    [Theory]
    [InlineData(HttpStatusCode.NotFound)]
    [InlineData(HttpStatusCode.Unauthorized)]
    [InlineData(HttpStatusCode.InternalServerError)]
    [InlineData(HttpStatusCode.NotImplemented)]
    public async Task DefiniteAnswers_AreNotRetried(HttpStatusCode status)
    {
        var inner = new ScriptedHandler(Answer(status));
        var (client, waits, _) = Build(inner);

        using var response = await client.GetAsync(Url);

        Assert.Equal(status, response.StatusCode);
        Assert.Equal(1, inner.Calls);
        Assert.Empty(waits);
    }

    /// <summary>
    /// A write is sent once even when the server answers busy.
    /// True: a POST, PUT, or DELETE that gets a 503 is returned after one call.
    /// False: a retried write could apply twice.
    /// </summary>
    [Theory]
    [InlineData("POST")]
    [InlineData("PUT")]
    [InlineData("DELETE")]
    public async Task Writes_AreNeverRetried(string method)
    {
        var inner = new ScriptedHandler(Answer(HttpStatusCode.ServiceUnavailable));
        var (client, _, _) = Build(inner);

        using var request = new HttpRequestMessage(new HttpMethod(method), Url);
        using var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Equal(1, inner.Calls);
    }

    /// <summary>
    /// A GET that carries a body is sent once.
    /// True: a body that cannot be replayed is never sent twice.
    /// False: a retry would send an empty or a consumed body.
    /// </summary>
    [Fact]
    public async Task GetWithABody_IsNotRetried()
    {
        var inner = new ScriptedHandler(Answer(HttpStatusCode.ServiceUnavailable));
        var (client, _, _) = Build(inner);

        using var request = new HttpRequestMessage(HttpMethod.Get, Url) { Content = new StringContent("{}") };
        using var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Equal(1, inner.Calls);
    }

    /// <summary>
    /// A request that sets the opt out is sent once.
    /// True: a caller that fails over to another server at once gets the first answer.
    /// False: the caller would wait on a server it means to leave.
    /// </summary>
    [Fact]
    public async Task NoRetryOption_SendsOnce()
    {
        var inner = new ScriptedHandler(Answer(HttpStatusCode.ServiceUnavailable), Answer(HttpStatusCode.OK));
        var (client, _, _) = Build(inner);

        using var request = new HttpRequestMessage(HttpMethod.Get, Url);
        request.Options.Set(BaseRetryHandler.NoRetry, true);
        using var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Equal(1, inner.Calls);
    }

    /// <summary>
    /// The waits are one second then three, plus the jitter, and the last wait repeats.
    /// True: with a fixed random value of one half the waits are 1.125, 3.375, and 3.375 seconds.
    /// False: the backoff would not grow, or the jitter would be ignored.
    /// </summary>
    [Fact]
    public async Task Backoff_IsOneThenThreeSecondsWithJitter()
    {
        var inner = new ScriptedHandler(Answer(HttpStatusCode.ServiceUnavailable));
        var (client, waits, _) = Build(inner, maxAttempts: 4, random: () => 0.5);

        using var response = await client.GetAsync(Url);

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Equal(new[] { TimeSpan.FromSeconds(1.125), TimeSpan.FromSeconds(3.375), TimeSpan.FromSeconds(3.375) }, waits);
    }

    /// <summary>
    /// With no jitter the waits are exactly one second and then three.
    /// True: the documented schedule holds.
    /// False: the first wait would not be a second.
    /// </summary>
    [Fact]
    public async Task Backoff_WithNoJitter_IsExact()
    {
        var inner = new ScriptedHandler(Answer(HttpStatusCode.BadGateway));
        var (client, waits, _) = Build(inner);

        using var response = await client.GetAsync(Url);

        Assert.Equal(new[] { TimeSpan.FromSeconds(1), TimeSpan.FromSeconds(3) }, waits);
    }

    /// <summary>
    /// A Retry-After in seconds sets the wait, and one above the cap waits only the cap.
    /// True: a ten minute request waits 30 seconds.
    /// False: a server could stall a caller for as long as it asked.
    /// </summary>
    [Theory]
    [InlineData(5, 5)]
    [InlineData(600, 30)]
    public async Task RetryAfterSeconds_IsHonoredUpToTheCap(int asked, int waited)
    {
        var inner = new ScriptedHandler(
            _ => Task.FromResult(new HttpResponseMessage(HttpStatusCode.TooManyRequests)
            {
                Headers = { RetryAfter = new RetryConditionHeaderValue(TimeSpan.FromSeconds(asked)) }
            }),
            Answer(HttpStatusCode.OK));
        var (client, waits, _) = Build(inner);

        using var response = await client.GetAsync(Url);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(TimeSpan.FromSeconds(waited), Assert.Single(waits));
    }

    /// <summary>
    /// A Retry-After date is measured from the clock in the options.
    /// True: a date 12 seconds ahead waits 12 seconds.
    /// False: the date form would be ignored or measured from the real clock.
    /// </summary>
    [Fact]
    public async Task RetryAfterDate_IsMeasuredFromTheClock()
    {
        var date = new FakeTimeProvider().GetUtcNow().AddSeconds(12);
        var inner = new ScriptedHandler(
            _ => Task.FromResult(new HttpResponseMessage(HttpStatusCode.ServiceUnavailable)
            {
                Headers = { RetryAfter = new RetryConditionHeaderValue(date) }
            }),
            Answer(HttpStatusCode.OK));
        var (client, waits, _) = Build(inner);

        using var response = await client.GetAsync(Url);

        Assert.Equal(TimeSpan.FromSeconds(12), Assert.Single(waits));
    }

    /// <summary>
    /// A cancellation from the caller stops the call and is not retried.
    /// True: cancelling ends the call after one attempt.
    /// False: cancelling a task would be followed by more attempts.
    /// </summary>
    [Fact]
    public async Task CallerCancellation_IsNotRetried()
    {
        using var cts = new CancellationTokenSource();
        var inner = new ScriptedHandler(async token =>
        {
            await cts.CancelAsync();
            token.ThrowIfCancellationRequested();
            return new HttpResponseMessage(HttpStatusCode.OK);
        });
        var (client, _, _) = Build(inner);

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => client.GetAsync(Url, cts.Token));

        Assert.Equal(1, inner.Calls);
    }

    /// <summary>
    /// A single attempt never retries.
    /// True: a maximum of one sends once and returns the answer.
    /// False: the handler would retry past its own limit.
    /// </summary>
    [Fact]
    public async Task MaxAttemptsOfOne_SendsOnce()
    {
        var inner = new ScriptedHandler(Answer(HttpStatusCode.ServiceUnavailable), Answer(HttpStatusCode.OK));
        var (client, _, _) = Build(inner, maxAttempts: 1);

        using var response = await client.GetAsync(Url);

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Equal(1, inner.Calls);
    }

    /// <summary>
    /// With no delay in the options the wait runs on the clock in the options.
    /// True: the retry happens once the clock has moved past the wait.
    /// False: the wait would use the real clock and the test would have to sleep.
    /// </summary>
    [Fact]
    public async Task DefaultDelay_WaitsOnTheOptionsClock()
    {
        var time = new FakeTimeProvider();
        var inner = new ScriptedHandler(Answer(HttpStatusCode.ServiceUnavailable), Answer(HttpStatusCode.OK));
        var options = new BaseRetryOptions { TimeProvider = time, Random = () => 0 };
        using var client = new HttpClient(new BaseRetryHandler(options) { InnerHandler = inner });

        var call = client.GetAsync(Url);
        for (var spins = 0; time.ActiveTimers == 0 && spins < 1_000_000; spins++)
        {
            await Task.Yield();
        }

        Assert.Equal(1, time.ActiveTimers);
        time.Advance(TimeSpan.FromSeconds(1));
        using var response = await call;

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(2, inner.Calls);
    }

    /// <summary>
    /// Options that cannot work are refused when the handler is made.
    /// True: a zero attempt count, a negative jitter, or an empty backoff fails at once.
    /// False: the handler would fail on its first request.
    /// </summary>
    [Fact]
    public void Constructor_WithBadOptions_Throws()
    {
        Assert.Throws<ArgumentNullException>(() => new BaseRetryHandler(null!));
        Assert.Throws<ArgumentOutOfRangeException>(() => new BaseRetryHandler(new BaseRetryOptions { MaxAttempts = 0 }));
        Assert.Throws<ArgumentOutOfRangeException>(() => new BaseRetryHandler(new BaseRetryOptions { JitterFraction = -0.1 }));
        Assert.Throws<ArgumentException>(() => new BaseRetryHandler(new BaseRetryOptions { Backoff = Array.Empty<TimeSpan>() }));
    }

    /// <summary>
    /// The default options are three attempts, a one then three second backoff, 90 seconds per attempt, and a 30 second Retry-After cap.
    /// True: the documented defaults hold for every plugin.
    /// False: a default would change and reach every plugin.
    /// </summary>
    [Fact]
    public void Options_HaveTheDocumentedDefaults()
    {
        var options = new BaseRetryOptions();

        Assert.Equal(3, options.MaxAttempts);
        Assert.Equal(new[] { TimeSpan.FromSeconds(1), TimeSpan.FromSeconds(3) }, options.Backoff);
        Assert.Equal(0.25, options.JitterFraction);
        Assert.Equal(TimeSpan.FromSeconds(90), options.AttemptTimeout);
        Assert.Equal(TimeSpan.FromSeconds(30), options.MaxRetryAfter);
        Assert.Null(options.TimeProvider);
        Assert.Null(options.Delay);
        Assert.Null(options.Random);
    }

    /// <summary>
    /// A guard refusal, a TLS failure, and a bad request URI are thrown at once, and a dropped connection is still retried.
    /// True: a permanent failure is not repeated, and a real network fault is.
    /// False: a refused target or a bad certificate would be tried three times.
    /// </summary>
    [Fact]
    public async Task PermanentFailures_AreNotRetried()
    {
        var failures = new Func<CancellationToken, Task<HttpResponseMessage>>[]
        {
            _ => throw new HttpRequestException(SsrfGuard.RefusalPrefix + "loopback addresses are not allowed"),
            _ => throw new HttpRequestException("connect failed", new HttpRequestException(SsrfGuard.RefusalPrefix + "x")),
            _ => throw new HttpRequestException("tls", new System.Security.Authentication.AuthenticationException("bad certificate")),
            _ => throw new InvalidOperationException("An invalid request URI was provided."),
        };

        foreach (var failure in failures)
        {
            var inner = new ScriptedHandler(failure, Answer(HttpStatusCode.OK));
            var (client, waits, _) = Build(inner);

            await Assert.ThrowsAnyAsync<Exception>(() => client.GetAsync(Url));

            Assert.Equal(1, inner.Calls);
            Assert.Empty(waits);
        }

        var transient = new ScriptedHandler(Drop(), Answer(HttpStatusCode.OK));
        var (retrying, _, _) = Build(transient);
        using var response = await retrying.GetAsync(Url);
        Assert.Equal(2, transient.Calls);
    }

    /// <summary>
    /// Options that cannot work are rejected when the handler is made.
    /// True: a zero timeout or a negative wait fails at once.
    /// False: it would fail later in a request, or never retry as intended.
    /// </summary>
    [Fact]
    public void Constructor_RejectsBadOptions()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => new BaseRetryHandler(new BaseRetryOptions { AttemptTimeout = TimeSpan.Zero }));
        Assert.Throws<ArgumentOutOfRangeException>(() => new BaseRetryHandler(new BaseRetryOptions { AttemptTimeout = TimeSpan.FromSeconds(-1) }));
        Assert.Throws<ArgumentOutOfRangeException>(() => new BaseRetryHandler(new BaseRetryOptions { MaxRetryAfter = TimeSpan.Zero }));
        Assert.Throws<ArgumentOutOfRangeException>(() => new BaseRetryHandler(new BaseRetryOptions { Backoff = new[] { TimeSpan.FromSeconds(1), TimeSpan.FromSeconds(-1) } }));
        Assert.Throws<ArgumentOutOfRangeException>(() => new BaseRetryHandler(new BaseRetryOptions { JitterFraction = double.NaN }));
        Assert.Throws<ArgumentOutOfRangeException>(() => new BaseRetryHandler(new BaseRetryOptions { JitterFraction = double.PositiveInfinity }));
        Assert.Throws<ArgumentOutOfRangeException>(() => new BaseRetryHandler(new BaseRetryOptions { JitterFraction = -0.1 }));
        Assert.Throws<ArgumentOutOfRangeException>(() => new BaseRetryHandler(new BaseRetryOptions { JitterFraction = 1.5 }));
        _ = new BaseRetryHandler(new BaseRetryOptions { JitterFraction = 0, Backoff = new[] { TimeSpan.Zero } });
    }
}
