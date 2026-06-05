namespace JPKribs.Jellyfin.Base;

/// <summary>
/// A minimal HTTP response with the status code and body. A status of zero means the request never completed.
/// </summary>
public sealed class HttpResult
{
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
}
