using System;
using System.Collections.Generic;
using System.Globalization;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using MediaBrowser.Common.Net;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// Outbound HTTP helper over Jellyfin's default client, with optional basic auth, headers, and a body.
/// It does not throw on a network failure and returns a status of zero instead.
/// </summary>
/// <remarks>
/// It refuses unsafe URLs by default, as <see cref="SsrfGuard"/> describes.
/// Cancelling the caller's token still throws, so a shutdown is never mistaken for a timeout.
/// </remarks>
public static class JpkHttp
{
    /// <summary>The default cap on a response body read by <see cref="SendAsync"/>: 4 MiB.</summary>
    public const long DefaultMaxResponseBytes = 4L * 1024 * 1024;

    /// <summary>The most redirects <see cref="SendAsync"/> follows when it is given an <see cref="SsrfGuard"/>.</summary>
    public const int MaxGuardedRedirects = 5;

    private static readonly char[] TokenSeparators = { ' ', '\t', '\r', '\n' };

    /// <summary>
    /// Sends an HTTP request and returns the status and body.
    /// </summary>
    /// <param name="httpClientFactory">The HTTP client factory.</param>
    /// <param name="method">The HTTP method.</param>
    /// <param name="url">The absolute request URL.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <param name="headers">Optional request headers.</param>
    /// <param name="body">Optional request body.</param>
    /// <param name="contentType">The body content type.</param>
    /// <param name="login">Optional basic auth user.</param>
    /// <param name="password">Optional basic auth password.</param>
    /// <param name="maxResponseBytes">The largest response body read, <see cref="DefaultMaxResponseBytes"/> by default. A larger body is not read and the result has status zero.</param>
    /// <param name="guard">
    /// Which <see cref="SsrfGuard"/> applies. When it is <c>null</c>, the URL is checked once before sending with <see cref="SsrfGuard.PrivateNetworkAllowed"/>,
    /// then the request goes through Jellyfin's default client as usual, so its proxy, redirect, and timeout settings apply.
    /// Pass <see cref="SsrfGuard.PublicOnly"/> or another guard for the strict mode: the request is sent
    /// through the guard's own client (no Jellyfin proxy), the address is checked again at connect time, and a redirect is followed only on the same host,
    /// up to <see cref="MaxGuardedRedirects"/> times. Pass <see cref="SsrfGuard.Disabled"/> to skip every check. A refused request has
    /// status zero and a body that starts with <see cref="SsrfGuard.RefusalPrefix"/>.
    /// </param>
    /// <returns>The HTTP result, with status zero when the request did not complete.</returns>
    /// <remarks>
    /// The default mode is a pre-flight check only. It validates the URL and every address its name resolves to before the request is sent,
    /// and it refuses a URL with user info, an unsupported scheme, and a target in an unspecified, link local (including the cloud metadata address), multicast, broadcast, or reserved range.
    /// It does not check redirects, because the client follows them itself, and it does not check the address the socket finally connects to, so a DNS answer that changes after the check is not caught.
    /// Only an explicit guard such as <see cref="SsrfGuard.PublicOnly"/> or <see cref="SsrfGuard.PrivateNetworkAllowed"/> protects against a redirect to an unsafe address and against DNS rebinding.
    /// Every refusal has status zero, so <see cref="HttpResult.IsRefused"/> and <see cref="HttpResult.IsOversize"/> tell it from a failure that may pass by itself.
    /// </remarks>
    /// <exception cref="OperationCanceledException">The caller's <paramref name="cancellationToken"/> was cancelled.</exception>
    public static async Task<HttpResult> SendAsync(
        IHttpClientFactory httpClientFactory,
        HttpMethod method,
        string url,
        CancellationToken cancellationToken,
        IEnumerable<KeyValuePair<string, string>>? headers = null,
        string? body = null,
        string contentType = "application/json",
        string? login = null,
        string? password = null,
        long maxResponseBytes = DefaultMaxResponseBytes,
        SsrfGuard? guard = null)
    {
        ArgumentNullException.ThrowIfNull(httpClientFactory);
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(maxResponseBytes);

        // The body is read after the headers, outside the client's own timeout, so the timeout is applied to
        // the whole exchange here. A cancellation that is not the caller's is therefore the timeout.
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);

        try
        {
            var client = httpClientFactory.CreateClient(NamedClient.Default);
            if (client.Timeout != Timeout.InfiniteTimeSpan)
            {
                timeout.CancelAfter(client.Timeout);
            }

            // No guard means the default check: the URL is validated up front and the request still goes through
            // Jellyfin's client, so its proxy, redirect, and timeout settings apply. Only an explicit guard is strict.
            var disabled = ReferenceEquals(guard, SsrfGuard.Disabled);
            var strict = guard is not null && !disabled;
            var checker = guard ?? SsrfGuard.PrivateNetworkAllowed;
            var sender = strict ? guard!.Client : client;
            var currentUrl = url;
            var currentMethod = method;
            var currentBody = body;

            for (var hop = 0; ; hop++)
            {
                if (!disabled)
                {
                    var refusal = await checker.ValidateUrlAsync(currentUrl, allowUnresolved: !strict, cancellationToken: timeout.Token).ConfigureAwait(false);
                    if (refusal is not null)
                    {
                        return new HttpResult(0, SsrfGuard.RefusalPrefix + refusal);
                    }
                }

                using var request = BuildRequest(currentMethod, currentUrl, headers, currentBody, contentType, login, password);
                using var response = await sender.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, timeout.Token).ConfigureAwait(false);

                if (strict && IsRedirect(response.StatusCode) && response.Headers.Location is { } location)
                {
                    var from = new Uri(currentUrl, UriKind.Absolute);
                    var target = location.IsAbsoluteUri ? location : new Uri(from, location);
                    if (!guard!.IsRedirectAllowed(from, target))
                    {
                        return new HttpResult(0, SsrfGuard.RefusalPrefix + "a redirect to " + target.GetLeftPart(UriPartial.Path) + " was refused");
                    }

                    if (hop >= MaxGuardedRedirects)
                    {
                        return new HttpResult(0, SsrfGuard.RefusalPrefix + "too many redirects");
                    }

                    if (response.StatusCode != HttpStatusCode.TemporaryRedirect && response.StatusCode != HttpStatusCode.PermanentRedirect
                        && currentMethod != HttpMethod.Head)
                    {
                        currentMethod = HttpMethod.Get;
                        currentBody = null;
                    }

                    currentUrl = target.AbsoluteUri;
                    continue;
                }

                if (response.Content.Headers.ContentLength > maxResponseBytes)
                {
                    return new HttpResult(0, TooLarge(maxResponseBytes));
                }

                // Buffering stops with an HttpRequestException once the body passes the cap, even without a length.
                // A buffer can never exceed int.MaxValue bytes, so a larger cap is the same as that.
                await response.Content.LoadIntoBufferAsync(Math.Min(maxResponseBytes, int.MaxValue), timeout.Token).ConfigureAwait(false);
                var text = await response.Content.ReadAsStringAsync(timeout.Token).ConfigureAwait(false);
                return new HttpResult((int)response.StatusCode, text);
            }
        }
        catch (HttpRequestException ex)
        {
            var refused = ex.InnerException is HttpRequestException inner
                && inner.Message.StartsWith(SsrfGuard.RefusalPrefix, StringComparison.Ordinal);
            return new HttpResult(0, refused ? ex.InnerException!.Message : ex.Message);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return new HttpResult(0, "request timed out");
        }
    }

    private static bool IsRedirect(HttpStatusCode status)
        => status is HttpStatusCode.MovedPermanently or HttpStatusCode.Found or HttpStatusCode.SeeOther
            or HttpStatusCode.TemporaryRedirect or HttpStatusCode.PermanentRedirect;

    private static HttpRequestMessage BuildRequest(
        HttpMethod method,
        string url,
        IEnumerable<KeyValuePair<string, string>>? headers,
        string? body,
        string contentType,
        string? login,
        string? password)
    {
        var request = new HttpRequestMessage(method, url);

        if (body is not null)
        {
            request.Content = new StringContent(body, Encoding.UTF8, contentType);
        }

        if (login is not null && password is not null)
        {
            var token = Convert.ToBase64String(Encoding.UTF8.GetBytes(login + ":" + password));
            request.Headers.Authorization = new AuthenticationHeaderValue("Basic", token);
        }

        if (request.Headers.UserAgent.Count == 0)
        {
            request.Headers.UserAgent.ParseAdd("jellyfin-plugin/1.0");
        }

        if (headers is not null)
        {
            foreach (var header in headers)
            {
                if (!request.Headers.TryAddWithoutValidation(header.Key, header.Value)
                    && request.Content is not null)
                {
                    request.Content.Headers.TryAddWithoutValidation(header.Key, header.Value);
                }
            }
        }

        return request;
    }

    private static string TooLarge(long maxResponseBytes)
        => HttpResult.OversizePrefix + maxResponseBytes.ToString(CultureInfo.InvariantCulture) + " bytes";

    /// <summary>
    /// Returns the first whitespace delimited token of a response body, useful for dyndns style replies.
    /// </summary>
    /// <param name="body">The response body.</param>
    /// <returns>The first token, or an empty string.</returns>
    public static string FirstToken(string body)
    {
        var parts = (body ?? string.Empty).Trim().Split(TokenSeparators, StringSplitOptions.RemoveEmptyEntries);
        return parts.Length > 0 ? parts[0] : string.Empty;
    }

    /// <summary>
    /// Returns the first line of a response body.
    /// </summary>
    /// <param name="body">The response body.</param>
    /// <returns>The first line, trimmed.</returns>
    public static string FirstLine(string body)
    {
        var trimmed = (body ?? string.Empty).Trim();
        var newline = trimmed.IndexOf('\n', StringComparison.Ordinal);
        return newline < 0 ? trimmed : trimmed.Substring(0, newline);
    }
}
