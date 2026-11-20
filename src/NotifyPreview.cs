using System.Text.Json.Nodes;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// What one destination would get for a message, built by the same code that sends it, for a settings page's preview. Nothing is sent.
/// </summary>
public sealed class NotifyPreview
{
    /// <summary>Gets or sets the destination's id.</summary>
    public string DestinationId { get; set; } = string.Empty;

    /// <summary>Gets or sets the destination's channel.</summary>
    public NotifyChannel Channel { get; set; }

    /// <summary>Gets or sets the HTTP method of a Discord, webhook, or web push post, or empty for a Jellyfin message.</summary>
    public string Method { get; set; } = string.Empty;

    /// <summary>Gets or sets the post's content type. A web push is <c>application/json</c>, the payload the service worker reads.</summary>
    public string ContentType { get; set; } = string.Empty;

    /// <summary>Gets or sets the post's body exactly as sent. A web push is its payload before it is encrypted.</summary>
    public string Body { get; set; } = string.Empty;

    /// <summary>Gets or sets a Discord post as data, the body parsed, for a page to draw.</summary>
    public JsonNode? Discord { get; set; }

    /// <summary>Gets or sets a Jellyfin message's header.</summary>
    public string Header { get; set; } = string.Empty;

    /// <summary>Gets or sets a Jellyfin message's text.</summary>
    public string Text { get; set; } = string.Empty;

    /// <summary>Gets or sets why nothing would be sent, when nothing would, in the language of the call path.</summary>
    public string Error { get; set; } = string.Empty;
}
