using System;
using System.Net;
using System.Net.Http.Headers;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// Names the HTTP statuses worth asking again and reads how long a server asked to wait.
/// </summary>
/// <remarks>
/// There are two sets because they answer different questions.
/// <see cref="IsTransient"/> covers every status that may pass by itself, and <see cref="IsGatewayTransient"/> covers the ones a proxy or an overloaded server sends and is the set <see cref="BaseRetryHandler"/> retries.
/// </remarks>
public static class HttpRetry
{
    /// <summary>
    /// Checks whether a status is a timeout, throttling, or any server error.
    /// That is 408, 429, and every status from 500 to 599.
    /// </summary>
    /// <param name="status">The status.</param>
    /// <returns><c>true</c> when asking again later may succeed.</returns>
    public static bool IsTransient(HttpStatusCode status)
    {
        var code = (int)status;
        return code is 408 or 429 || (code >= 500 && code < 600);
    }

    /// <summary>
    /// Checks whether a status is one a gateway or an overloaded server sends and that passes by itself.
    /// That is 408, 429, 502, 503, and 504, and a plain 500 is left out because the server did the work and failed.
    /// </summary>
    /// <param name="status">The status.</param>
    /// <returns><c>true</c> for a timeout, throttling, a bad gateway, an unavailable server, or a gateway timeout.</returns>
    public static bool IsGatewayTransient(HttpStatusCode status)
        => status is HttpStatusCode.RequestTimeout
            or HttpStatusCode.TooManyRequests
            or HttpStatusCode.BadGateway
            or HttpStatusCode.ServiceUnavailable
            or HttpStatusCode.GatewayTimeout;

    /// <summary>
    /// Reads how long a server asked the caller to wait, from the Retry-After header in either its seconds form or its date form.
    /// </summary>
    /// <remarks>
    /// A date is measured from <paramref name="timeProvider"/>, or the system clock when it is <c>null</c>.
    /// A missing header, a zero wait, and a date in the past all give <c>null</c>.
    /// </remarks>
    /// <param name="headers">The response headers.</param>
    /// <param name="cap">The longest wait to return, so a server cannot stall a caller for as long as it asks.</param>
    /// <param name="timeProvider">The clock used for the date form.</param>
    /// <returns>The wait, never above <paramref name="cap"/>, or <c>null</c> when there is no usable header.</returns>
    public static TimeSpan? RetryAfter(HttpResponseHeaders headers, TimeSpan cap, TimeProvider? timeProvider = null)
    {
        ArgumentNullException.ThrowIfNull(headers);

        var header = headers.RetryAfter;
        TimeSpan? wait = header?.Delta ?? (header?.Date is { } date ? date - (timeProvider ?? TimeProvider.System).GetUtcNow() : null);
        if (wait is not { } value || value <= TimeSpan.Zero)
        {
            return null;
        }

        return value > cap ? cap : value;
    }
}
