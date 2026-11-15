# HTTP and Resilience

Outbound HTTP that reports failure as data, a guard against unsafe targets, and the types that handle failure over time.

Four types handle failure over time, and they differ by where the state lives.

| Type | Where its state lives | Use it for |
| :--- | :--- | :--- |
| `RetryPolicy` | None, one call | Retrying a thrown transient exception right away |
| `JpkRetryHandler` | None, one request | Retrying a read at the `HttpClient` handler level |
| `CircuitBreaker` | In memory, per named service | Pausing every call to a service that keeps failing |
| `BackoffPolicy` | Persisted by the caller, per entity | Pausing one record across restarts |

A plugin often wants a pair of them, for example a `CircuitBreaker` per server and a `BackoffPolicy` per record.

## JpkHttp

Outbound HTTP over Jellyfin's default named client. It returns a status and a body and does not throw for a network failure or a timeout. Failure is status 0.

Use it for calls to other services where a failed call is data, not an exception. Do not use it to stream large bodies, since the body is read into memory and capped at 4 MiB by default.

```csharp
HttpResult r = await JpkHttp.SendAsync(
    _httpClientFactory,
    HttpMethod.Post,
    target.Url + "/api/v3/command",
    cancellationToken,
    headers: new[] { new KeyValuePair<string, string>("X-Api-Key", target.ApiKey) },
    body: json).ConfigureAwait(false);

if (!r.Ok)
{
    _logger.LogWarning("Request failed: {Status} {Body}", r.Status, FormatUtilities.SanitizeForLog(r.Body));
}
```

Every request is checked for server side request forgery by default. Pass `guard: SsrfGuard.PublicOnly` for an address the plugin did not choose, such as one a user typed.

```csharp
HttpResult r = await JpkHttp.SendAsync(
    _httpClientFactory,
    HttpMethod.Get,
    userSuppliedUrl,
    cancellationToken,
    guard: SsrfGuard.PublicOnly).ConfigureAwait(false);

if (r.Status == 0 && r.Body.StartsWith(SsrfGuard.RefusalPrefix, StringComparison.Ordinal))
{
    // The address was refused, and r.Body says why.
}
```

**Gotchas**

* Status 0 covers four cases, a failed request, a timeout, an oversize body, and a refused target. `IsRefused` and `IsOversize` recognize the last two, and the body text tells the rest apart.
* A non-2xx status is not an error here. Check `HttpResult.Ok`.
* Pass absolute http or https URLs. An empty, relative, or malformed URL is refused with status 0 by every guard. With `SsrfGuard.Disabled` nothing checks it, so a malformed URL throws `UriFormatException` and a relative one throws `InvalidOperationException`.
* Cancelling the caller's token throws `OperationCanceledException`. Any other cancellation is read as a timeout.
* A User-Agent passed in `headers` is added next to the default `jellyfin-plugin/1.0`, not instead of it.
* Basic auth is added only when both `login` and `password` are given.
* The default is a pre-flight check only. It validates the URL and every address its name resolves to before sending, with `SsrfGuard.PrivateNetworkAllowed`, so it never blocks a loopback or LAN target. It does not re-check redirects, since the client follows them itself, and it does not check the address the socket connects to, so a DNS answer that changes after the check is not caught. Only an explicit guard such as `SsrfGuard.PublicOnly` or `SsrfGuard.PrivateNetworkAllowed` protects against a redirect to an unsafe address and against DNS rebinding.
* A scheme other than http and https, a URL with a user name or password, and a target in an unspecified, link local, multicast, broadcast, or reserved range are refused with status 0 and a body that starts with `SsrfGuard.RefusalPrefix`.
* An explicit guard sends through a client the guard owns, which ignores the system proxy. It follows a redirect only to the same host and port, never from https to http, and at most `JpkHttp.MaxGuardedRedirects` times, which is 5. An http to https upgrade on the same host to the default https port is allowed. Any other redirect returns status 0.
* `SsrfGuard.Disabled` skips every check. Use it only for a call that must reach an address the default refuses.
* `FirstToken` and `FirstLine` are small body parsers for replies such as a dynamic DNS answer.

## HttpResult

The value `JpkHttp.SendAsync` returns. `Status` is 0 when the request never completed, and `Body` then holds a short reason. `Ok` is true for any 2xx status.

```csharp
if (result.IsTransient)
{
    // Asking again later may succeed.
}
```

**Gotchas**

* `IsTransient` counts 408, 429, 500 and above, and status 0 from a failed request or a timeout. A refusal, which `IsRefused` reports, and an oversize body, which `IsOversize` reports, also have status 0. They never pass by themselves, so they are not transient and a caller that retries on `IsTransient` does not repeat them.

## SsrfGuard

Refuses private, loopback, link local, and other unsafe targets for outbound HTTP, at validation and again at connect time. `JpkHttp.SendAsync` applies it, and a plugin can also call it for its own client.

Use `PublicOnly` when the target must never be on a private network. Use `PrivateNetworkAllowed` when a LAN target is fine but the cloud metadata address is not.

```csharp
using var client = new HttpClient(SsrfGuard.PublicOnly.CreateHandler());
```

**Gotchas**

* Validation alone is not enough, since a name can answer differently when the request connects. The handler from `CreateHandler` classifies the addresses again at connect time and connects to the ones it checked.
* If you build your own client from the handler, follow redirects yourself and ask `IsRedirectAllowed` first.
* Link local addresses, which include `169.254.169.254`, and multicast, unspecified, broadcast, `240.0.0.0/4`, and IPv6 site local addresses are refused whatever the setting. Loopback, private, carrier grade NAT, and unique local addresses are refused unless the private network is allowed.
* An IPv6 address that carries an IPv4 address is judged as the IPv4 address it carries. The decimal, hex, and octal forms of an IPv4 host are classified too.
* `ValidateUrl` refuses an empty or relative URL, any scheme other than http and https, and a URL with a user name or password.
* A host name that does not resolve is let through by the default guard, since a proxy may resolve it, and refused by `PublicOnly`. Any other resolver failure is refused, and `ValidateUrlAsync` never throws for one.
* IPv4 translated addresses such as `::ffff:0:a.b.c.d`, and ISATAP addresses, are judged as the IPv4 address they carry. Teredo addresses in `2001::/32` and local use NAT64 addresses in `64:ff9b:1::/48` are refused. A scoped IPv6 literal such as `[fe80::1%25eth0]` is refused.
* `new SsrfGuard(allowPrivateNetwork, requireHttpsForPublic: true)` holds plain http to loopback and private addresses, for a client that sends a key or password. A plain http URL to a public address, or a name that resolves to one, is refused with `PlainHttpRefusal`, at validation, at connect time, and on a redirect. With private networks refused as well, every plain http URL is refused. The rule is off by default, and `IsPrivateOrLoopback` says which addresses it allows.
* `SsrfGuard.Disabled` is compared by reference. A copy made with `new SsrfGuard(true)` is not the opt out.
* The guard checks addresses only. It does not limit ports or paths.

## RetryPolicy

Retries an async operation for transient exceptions, with exponential backoff and jitter.

Use it around a call that can fail briefly. Permanent errors are rethrown at once and not logged by the policy.

`JpkHttp` never throws, so throw inside the operation when a status should be retried. An `HttpRequestException` subclass that carries the status code does that.

```csharp
private sealed class TransientHttpException : HttpRequestException
{
    public TransientHttpException(HttpResult result)
        : base("Answered " + result.Status, null, result.Status == 0 ? null : (HttpStatusCode)result.Status)
    {
        Result = result;
    }

    public HttpResult Result { get; }
}

var result = await RetryPolicy.ExecuteWithRetryAsync(
    async ct =>
    {
        var r = await JpkHttp.SendAsync(_httpClientFactory, HttpMethod.Post, url, ct, body: json).ConfigureAwait(false);
        return r.Status == 0 || r.Status >= 500 || r.Status == 429 ? throw new TransientHttpException(r) : r;
    },
    maxRetries: 2,
    _logger,
    "Notification",
    cancellationToken).ConfigureAwait(false);
```

**Gotchas**

* The wait before retry n is 1000 ms times 2 to the power n minus 1, capped at 30000 ms, then jittered by up to a quarter either way.
* Transient means an `HttpRequestException` with no status or with 408, 429, 500, 502, 503, or 504, a timeout, an `IOException` that is not a missing file, folder, or drive or a path that is too long, a `SocketException`, or any exception wrapping one of these. Everything else is rethrown on the first occurrence.
* Each retry logs a warning, and running out of retries logs an error and rethrows the original exception.
* A `maxRetries` below zero never runs the operation and throws `InvalidOperationException`.
* `logger` is not null-checked and is used only when a failure happens.

## HttpRetry

Names the HTTP statuses worth asking again and reads how long a server asked to wait. It keeps no state.

Use `IsTransient` to decide whether a failed call may pass by itself. Use `IsGatewayTransient` for a read you may repeat, since it leaves out a plain 500, where the server did the work and failed.

```csharp
if (HttpRetry.IsGatewayTransient(response.StatusCode))
{
    var wait = HttpRetry.RetryAfter(response.Headers, TimeSpan.FromSeconds(30)) ?? TimeSpan.FromSeconds(1);
}
```

**Gotchas**

* `IsTransient` is 408, 429, and 500 to 599. `IsGatewayTransient` is 408, 429, 502, 503, and 504.
* `RetryAfter` reads the seconds form and the date form. It returns null for a missing header, a zero wait, or a date in the past, and never more than the cap.

## JpkRetryHandler

A `DelegatingHandler` that retries a read that failed for a reason worth trying again, which is a gateway status, a dropped connection, or no answer within the attempt timeout. `JpkRetryOptions` holds every setting.

Use it under an `HttpClient` that reads from another server. Do not use it for writes, since only a GET or HEAD without a body is retried.

```csharp
var client = new HttpClient(new JpkRetryHandler(new JpkRetryOptions { MaxAttempts = 3 }) { InnerHandler = new SocketsHttpHandler() });

using var request = new HttpRequestMessage(HttpMethod.Get, url);
request.Options.Set(JpkRetryHandler.NoRetry, true);
```

**Gotchas**

* The defaults are 3 attempts, a 1 second then 3 second backoff with up to a quarter more at random, 90 seconds per attempt for the response headers, and a 30 second cap on Retry-After. The last backoff repeats when there are more attempts.
* A status in `HttpRetry.IsGatewayTransient` is asked for again, and the last attempt returns the server's answer. A plain 500, a 404, and a refused redirect are returned at once.
* When every attempt times out the call throws a `TaskCanceledException`. A cancellation from the caller is never retried.
* A guard refusal, a TLS failure, and a bad request URI are thrown at once. A TLS failure is an `AuthenticationException` among the inner exceptions. A dropped connection is retried.
* The `HttpClient`'s own `Timeout` covers every attempt together, so it must be longer than the attempts times `AttemptTimeout`. Otherwise the client cancels first and the timeout is never retried.
* `JpkRetryHandler.NoRetry` turns the retry off for one request, for a caller that does its own failover.
* `JpkRetryOptions` takes a `TimeProvider`, a delay function, and a random source, so a test never sleeps.

## RedirectRefusingHandler

A `DelegatingHandler` that refuses to follow a redirect and fails with the address it pointed to, so a request never carries its credentials to another host and the reader learns which address to use instead.

Use it in front of a handler that does not follow redirects itself, such as one from `SsrfGuard.CreateHandler`, for a client that talks to an address the user typed.

```csharp
var handler = new RedirectRefusingHandler(new SsrfGuard(true, requireHttpsForPublic: true).CreateHandler(), "Set the Server URL to the address it redirects to.");
var client = new HttpClient(handler);
```

**Gotchas**

* A response from 300 to 399 with a Location header is disposed and thrown as an `HttpRequestException` with that status code. A 304 or any other 3xx with no Location passes through.
* The message names the server and the target, with a relative Location resolved against the request. The query is left out, so a token in it never reaches a log.
* The message ends with the caller's advice sentence, or `DefaultAdvice` when none is given.
* The request is sent once. Nothing goes to the redirect's target.

## JpkRetryOptions

The settings of a `JpkRetryHandler`, namely the attempts, the waits, the per attempt timeout, and the clock. A new instance holds the defaults, so set only what differs.

```csharp
var options = new JpkRetryOptions { MaxAttempts = 5 };
```

**Gotchas**

* The handler copies the options when it is constructed. Changing the object later changes nothing.
* The handler throws `ArgumentOutOfRangeException` for fewer than 1 attempt, an `AttemptTimeout` or `MaxRetryAfter` that is not above zero, a negative backoff wait, and a jitter that is not finite or is outside 0 to 1. An empty backoff list throws `ArgumentException`.

## CircuitBreaker

Counts consecutive failures for a named service, opens after a threshold, and stays open for a cooldown, so the plugin stops calling an unreachable endpoint.

Use one long-lived instance per service, for example one per source server URL. Do not create one per call, since a new instance starts closed. Use `BackoffPolicy` for pauses that must survive a restart.

```csharp
// Keep one breaker per service for the life of the plugin.
var breaker = new CircuitBreaker(logger, "SourceServer", failureThreshold: 5, cooldownPeriod: TimeSpan.FromMinutes(5));

if (!breaker.AllowOperation(out var reason))
{
    logger.LogInformation("Skipping the server: {Reason}", reason);
    return;
}

try
{
    await DownloadAsync(ct).ConfigureAwait(false);
    breaker.RecordSuccess();
}
catch (HttpRequestException ex)
{
    breaker.RecordFailure(ex.Message);
}
```

**Gotchas**

* After the cooldown the breaker is closed but the failure count is unchanged, so one more failure reopens it at once. Call `RecordSuccess` after a proven good call to clear the count.
* Every failure at or past the threshold restarts the cooldown clock.
* The defaults are 5 failures and a 5 minute cooldown. No argument is validated, and a threshold of 1 or less opens on the first failure.
* The clock is the `TimeProvider` passed to the constructor, so a test with a fake one never waits.
* `logger` is not null-checked, and a null logger fails on the first log call.

## BackoffState

The immutable value a caller persists per entity, such as a record or a queue item. It holds the failure count and the UTC deadline before which attempts pause.

```csharp
record.Backoff = BackoffState.Initial;
```

**Gotchas**

* `BackoffUntilUtc` is null when the entity is not backing off.

## BackoffPolicy

A stateless exponential pause for a repeatedly failing entity. Pass in the current `BackoffState` and store the one it returns, so a pause survives restarts when the state is persisted.

```csharp
private static readonly BackoffPolicy Policy = new(failureThreshold: 3, baseDelay: TimeSpan.FromMinutes(5), maxDelay: TimeSpan.FromHours(6));

if (Policy.IsBackingOff(record.Backoff))
{
    return;
}

try
{
    await UpdateAsync(record, ct).ConfigureAwait(false);
    record.Backoff = Policy.RecordSuccess();
}
catch (HttpRequestException)
{
    record.Backoff = Policy.RecordFailure(record.Backoff);
}
```

**Gotchas**

* The defaults are a threshold of 3, a base of 5 minutes, and a maximum of 6 hours.
* The pause begins only once the failure threshold is reached, then doubles for each further failure up to the maximum. With a threshold of 1, a base of 5 minutes, and a maximum of 30 minutes, the pauses are 5, 10, 20, and then 30 minutes.
* A base delay of zero or less, or a base larger than the maximum, gives the maximum.
* A threshold below 1 throws `ArgumentOutOfRangeException`.
* `IsBackingOff` and `RecordFailure` read `DateTime.UtcNow` unless a time is passed, so a test passes its own.
* `RecordSuccess` is an instance method that ignores the instance and returns `BackoffState.Initial`.
* The policy holds no mutable state and is safe to share across threads.
