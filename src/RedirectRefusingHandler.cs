using System;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// A message handler that refuses to follow a redirect and fails with the address it pointed to, so a request never carries its
/// credentials to a host other than the one the caller chose, and the reader learns which address to use instead.
/// </summary>
/// <remarks>
/// Put it in front of a handler that does not follow redirects itself, such as one from <see cref="SsrfGuard.CreateHandler"/>.
/// A response from 300 to 399 with a Location header is disposed and turned into an <see cref="HttpRequestException"/> that carries its status code.
/// Any other response, including a 304 with no Location, passes through.
/// </remarks>
public sealed class RedirectRefusingHandler : DelegatingHandler
{
    /// <summary>The advice the refusal ends with when the caller gives none.</summary>
    public const string DefaultAdvice = "Set the address to the one it redirects to.";

    private readonly string? _advice;

    /// <summary>
    /// Initializes a new instance of the <see cref="RedirectRefusingHandler"/> class.
    /// </summary>
    /// <param name="advice">The sentence the refusal ends with, telling the reader what to do. <see cref="DefaultAdvice"/> when <c>null</c>.</param>
    public RedirectRefusingHandler(string? advice = null)
    {
        _advice = string.IsNullOrWhiteSpace(advice) ? null : advice.Trim();
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="RedirectRefusingHandler"/> class in front of an inner handler.
    /// </summary>
    /// <param name="innerHandler">The handler that sends the request.</param>
    /// <param name="advice">The sentence the refusal ends with. <see cref="DefaultAdvice"/> when <c>null</c>.</param>
    public RedirectRefusingHandler(HttpMessageHandler innerHandler, string? advice = null)
        : base(innerHandler)
    {
        _advice = string.IsNullOrWhiteSpace(advice) ? null : advice.Trim();
    }

    /// <inheritdoc />
    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var response = await base.SendAsync(request, cancellationToken).ConfigureAwait(false);
        var status = (int)response.StatusCode;
        if (status is < 300 or >= 400 || response.Headers.Location is null)
        {
            return response;
        }

        var location = response.Headers.Location;
        var target = location.IsAbsoluteUri || request.RequestUri is null ? location : new Uri(request.RequestUri, location);
        var targetText = target.IsAbsoluteUri ? target.GetLeftPart(UriPartial.Path) : target.OriginalString;
        var from = request.RequestUri?.GetLeftPart(UriPartial.Authority) ?? BaseTranslations.Text("Base.TheServer", "the server");
        response.Dispose();
        throw new HttpRequestException(
            BaseTranslations.Text(
                "Base.RedirectRefused",
                "The server at {0} redirected to {1}, and redirects are not followed. {2}",
                from,
                targetText,
                _advice ?? BaseTranslations.Text("Base.RedirectAdvice", DefaultAdvice)),
            null,
            (HttpStatusCode)status);
    }
}
