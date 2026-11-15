using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// The settings of a <see cref="JpkRetryHandler"/>.
/// Every value has a default, and the clock and the delay can be replaced so a test never waits.
/// </summary>
public sealed class JpkRetryOptions
{
    /// <summary>Gets the most times one request is sent. 3 by default, which is two retries.</summary>
    public int MaxAttempts { get; init; } = 3;

    /// <summary>
    /// Gets the wait after each failed attempt, in order, before the jitter is added. Each wait must not be negative.
    /// The last value is used for every later attempt. 1 second then 3 seconds by default.
    /// </summary>
    public IReadOnlyList<TimeSpan> Backoff { get; init; } = new[] { TimeSpan.FromSeconds(1), TimeSpan.FromSeconds(3) };

    /// <summary>Gets the share of a backoff that may be added at random, so many callers do not retry together. It must be finite and from 0 to 1. 0.25 by default.</summary>
    public double JitterFraction { get; init; } = 0.25;

    /// <summary>
    /// Gets how long one attempt may wait for the response headers.
    /// A client's own timeout covers every attempt together, so one slow answer is cut off here and tried again. It must be above zero, and the client's timeout must be longer than the attempts times this value. 90 seconds by default.
    /// </summary>
    public TimeSpan AttemptTimeout { get; init; } = TimeSpan.FromSeconds(90);

    /// <summary>Gets the longest a server's Retry-After is honored for. It must be above zero. 30 seconds by default.</summary>
    public TimeSpan MaxRetryAfter { get; init; } = TimeSpan.FromSeconds(30);

    /// <summary>Gets the clock for the attempt timeout, the Retry-After date, and the default delay. The system clock by default.</summary>
    public TimeProvider? TimeProvider { get; init; }

    /// <summary>Gets the function that waits between attempts. It waits on <see cref="TimeProvider"/> by default.</summary>
    public Func<TimeSpan, CancellationToken, Task>? Delay { get; init; }

    /// <summary>Gets the source of the jitter, which returns a value from 0 up to but not including 1. A shared random number generator by default.</summary>
    public Func<double>? Random { get; init; }
}
