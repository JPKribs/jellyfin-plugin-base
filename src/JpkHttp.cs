using System;
using System.Collections.Generic;
using System.Globalization;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using MediaBrowser.Common.Net;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// Outbound HTTP helper over Jellyfin's default client. Sends a request with optional basic auth,
/// headers, and a body, and never throws on network failure (it returns a status of zero instead).
/// Cancelling the caller's token still throws, so a shutdown is never mistaken for a timeout.
/// </summary>
public static class JpkHttp
{
    /// <summary>The default cap on a response body read by <see cref="SendAsync"/>: 4 MiB.</summary>
    public const long DefaultMaxResponseBytes = 4L * 1024 * 1024;

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
    /// <returns>The HTTP result, with status zero when the request did not complete.</returns>
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
        long maxResponseBytes = DefaultMaxResponseBytes)
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

            using var request = new HttpRequestMessage(method, url);

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

            using var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, timeout.Token).ConfigureAwait(false);
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
        catch (HttpRequestException ex)
        {
            return new HttpResult(0, ex.Message);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return new HttpResult(0, "request timed out");
        }
    }

    private static string TooLarge(long maxResponseBytes)
        => "response body exceeds " + maxResponseBytes.ToString(CultureInfo.InvariantCulture) + " bytes";

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
