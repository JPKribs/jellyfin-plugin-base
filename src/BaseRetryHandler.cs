using System;
using System.Globalization;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// Retries a read that failed for a reason worth trying again, which is no answer within the attempt timeout, a dropped connection, or a busy or restarting server.
/// Only GET and HEAD requests without a body are retried, since they change nothing on the other side.
/// </summary>
/// <remarks>
/// A response with a status in <see cref="HttpRetry.IsGatewayTransient"/> is asked for again, and the last attempt returns whatever the server answered.
/// A Retry-After from the server sets the wait, up to <see cref="BaseRetryOptions.MaxRetryAfter"/>, and otherwise the options' backoff applies.
/// A request that sets <see cref="NoRetry"/> is sent once, for a caller that does its own failover.
/// When every attempt times out the call throws a <see cref="TaskCanceledException"/>, and a cancellation from the caller is never retried.
/// A failure with no status is retried only when it looks like a network fault. A refusal by <see cref="SsrfGuard"/> (its message starts with <see cref="SsrfGuard.RefusalPrefix"/>)
/// and a TLS failure (an <see cref="System.Security.Authentication.AuthenticationException"/> anywhere in the inner exceptions) are permanent and are thrown at once, and so is a bad request URI.
/// The <see cref="HttpClient"/>'s own <see cref="HttpClient.Timeout"/> covers every attempt together, so it must be longer than <see cref="BaseRetryOptions.MaxAttempts"/> times <see cref="BaseRetryOptions.AttemptTimeout"/>,
/// or the client cancels first and a timeout is never retried.
/// </remarks>
public sealed class BaseRetryHandler : DelegatingHandler
{
    /// <summary>
    /// The request option that turns the retry off for one request.
    /// Set it to <c>true</c> on a request whose caller tries another server at once rather than waiting on this one.
    /// </summary>
    public static readonly HttpRequestOptionsKey<bool> NoRetry = new("JPKribs.Jellyfin.Base.NoRetry");

    private readonly int _maxAttempts;
    private readonly TimeSpan[] _backoff;
    private readonly double _jitter;
    private readonly TimeSpan _attemptTimeout;
    private readonly TimeSpan _maxRetryAfter;
    private readonly TimeProvider _time;
    private readonly Func<TimeSpan, CancellationToken, Task> _delay;
    private readonly Func<double> _random;

    /// <summary>
    /// Initializes a new instance of the <see cref="BaseRetryHandler"/> class with the default options.
    /// </summary>
    public BaseRetryHandler()
        : this(new BaseRetryOptions())
    {
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="BaseRetryHandler"/> class.
    /// </summary>
    /// <param name="options">The attempts, the waits, and the clock.</param>
    public BaseRetryHandler(BaseRetryOptions options)
    {
        ArgumentNullException.ThrowIfNull(options);
        ArgumentOutOfRangeException.ThrowIfLessThan(options.MaxAttempts, 1);
        if (!double.IsFinite(options.JitterFraction) || options.JitterFraction < 0 || options.JitterFraction > 1)
        {
            throw new ArgumentOutOfRangeException(nameof(options), options.JitterFraction, "The jitter fraction must be from 0 to 1.");
        }

        ArgumentOutOfRangeException.ThrowIfLessThanOrEqual(options.AttemptTimeout, TimeSpan.Zero);
        ArgumentOutOfRangeException.ThrowIfLessThanOrEqual(options.MaxRetryAfter, TimeSpan.Zero);
        ArgumentNullException.ThrowIfNull(options.Backoff);
        if (options.Backoff.Count == 0)
        {
            throw new ArgumentException("The backoff needs at least one wait.", nameof(options));
        }

        foreach (var wait in options.Backoff)
        {
            ArgumentOutOfRangeException.ThrowIfLessThan(wait, TimeSpan.Zero);
        }

        _maxAttempts = options.MaxAttempts;
        _backoff = new TimeSpan[options.Backoff.Count];
        for (var i = 0; i < _backoff.Length; i++)
        {
            _backoff[i] = options.Backoff[i];
        }

        _jitter = options.JitterFraction;
        _attemptTimeout = options.AttemptTimeout;
        _maxRetryAfter = options.MaxRetryAfter;
        _time = options.TimeProvider ?? TimeProvider.System;
        _delay = options.Delay ?? ((wait, token) => Task.Delay(wait, _time, token));
        _random = options.Random ?? (() => System.Random.Shared.NextDouble());
    }

    /// <inheritdoc />
    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        var retryable = request.Content is null
            && (request.Method == HttpMethod.Get || request.Method == HttpMethod.Head)
            && !(request.Options.TryGetValue(NoRetry, out var once) && once);
        if (!retryable)
        {
            return await base.SendAsync(request, cancellationToken).ConfigureAwait(false);
        }

        for (var attempt = 1; ; attempt++)
        {
            var last = attempt >= _maxAttempts;
            HttpResponseMessage response;
            try
            {
                response = await SendAttemptAsync(request, cancellationToken).ConfigureAwait(false);
            }
            catch (OperationCanceledException ex) when (!cancellationToken.IsCancellationRequested)
            {
                if (last)
                {
                    var seconds = _attemptTimeout.TotalSeconds.ToString("0", CultureInfo.InvariantCulture);
                    throw new TaskCanceledException($"{request.RequestUri?.GetLeftPart(UriPartial.Path)} did not answer within {seconds} seconds, {_maxAttempts} times", ex);
                }

                await _delay(BackoffFor(attempt), cancellationToken).ConfigureAwait(false);
                continue;
            }
            catch (HttpRequestException ex) when (!last && ex.StatusCode is null && !IsPermanent(ex))
            {
                // No status means the connection failed or dropped. A refused redirect carries its status and is not retried.
                await _delay(BackoffFor(attempt), cancellationToken).ConfigureAwait(false);
                continue;
            }

            if (last || !HttpRetry.IsGatewayTransient(response.StatusCode))
            {
                return response;
            }

            var wait = HttpRetry.RetryAfter(response.Headers, _maxRetryAfter, _time) ?? BackoffFor(attempt);
            response.Dispose();
            await _delay(wait, cancellationToken).ConfigureAwait(false);
        }
    }

    private async Task<HttpResponseMessage> SendAttemptAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        using var deadline = new CancellationTokenSource(_attemptTimeout, _time);
        using var linked = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken, deadline.Token);
        return await base.SendAsync(request, linked.Token).ConfigureAwait(false);
    }

    private static bool IsPermanent(Exception ex)
    {
        for (var inner = ex; inner is not null; inner = inner.InnerException)
        {
            if (inner is System.Security.Authentication.AuthenticationException
                || inner.Message.StartsWith(SsrfGuard.RefusalPrefix, StringComparison.Ordinal))
            {
                return true;
            }
        }

        return false;
    }

    private TimeSpan BackoffFor(int attempt)
    {
        var baseWait = _backoff[Math.Min(attempt, _backoff.Length) - 1];
        return baseWait + TimeSpan.FromTicks((long)(baseWait.Ticks * _jitter * _random()));
    }
}
