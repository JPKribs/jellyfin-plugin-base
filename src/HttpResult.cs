using System;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// A minimal HTTP response with the status code and body. A status of zero means the request never completed.
/// </summary>
public sealed class HttpResult
{
    /// <summary>The reason prefix <see cref="JpkHttp"/> puts at the start of the body when a response is larger than its cap.</summary>
    public const string OversizePrefix = "response body exceeds ";

    /// <summary>
    /// Initializes a new instance of the <see cref="HttpResult"/> class.
    /// </summary>
    /// <param name="status">The HTTP status code, or zero when the request failed to complete.</param>
    /// <param name="body">The response body.</param>
    public HttpResult(int status, string body)
    {
        Status = status;
        Body = body ?? string.Empty;
    }

    /// <summary>Gets the HTTP status code, or zero when the request failed to complete.</summary>
    public int Status { get; }

    /// <summary>Gets the response body.</summary>
    public string Body { get; }

    /// <summary>Gets a value indicating whether the status is a 2xx success.</summary>
    public bool Ok => Status >= 200 && Status < 300;

    /// <summary>Gets a value indicating whether <see cref="JpkHttp"/> refused the request before sending it, such as a target <see cref="SsrfGuard"/> does not allow. The status is zero and the body starts with <see cref="SsrfGuard.RefusalPrefix"/>.</summary>
    public bool IsRefused => Status == 0 && Body.StartsWith(SsrfGuard.RefusalPrefix, StringComparison.Ordinal);

    /// <summary>Gets a value indicating whether <see cref="JpkHttp"/> stopped because the response body was larger than its cap. The status is zero and the body starts with <see cref="OversizePrefix"/>.</summary>
    public bool IsOversize => Status == 0 && Body.StartsWith(OversizePrefix, StringComparison.Ordinal);

    /// <summary>
    /// Gets a value indicating whether asking again later may succeed, which is a status of 408, 429, or 500 and above, or a status of zero from a real network failure or a timeout.
    /// A refusal (<see cref="IsRefused"/>) and an oversize body (<see cref="IsOversize"/>) also have status zero but never pass by themselves, so they are not transient.
    /// </summary>
    public bool IsTransient => Status == 408 || Status == 429 || Status >= 500 || (Status == 0 && !IsRefused && !IsOversize);
}
