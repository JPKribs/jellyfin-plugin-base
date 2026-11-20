using System;
using System.Collections.Generic;
using System.Text.Json.Nodes;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// One update, written once and sent to any <see cref="NotifyDestination"/>, each in its own format. The title and text may hold
/// <c>{placeholder}</c> names from <see cref="Values"/>, filled for each channel with that channel's escaping.
/// </summary>
public sealed class NotifyMessage
{
    /// <summary>Gets or sets the title, which may hold placeholders.</summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>Gets or sets the text, which may hold placeholders.</summary>
    public string Text { get; set; } = string.Empty;

    /// <summary>Gets or sets an absolute http or https address of a large image, such as a Discord embed's image. Any other address is left out.</summary>
    public string? ImageUrl { get; set; }

    /// <summary>Gets or sets an absolute http or https address of a small image, such as a poster as a Discord thumbnail or a web push icon.</summary>
    public string? ThumbnailUrl { get; set; }

    /// <summary>Gets or sets the absolute http or https address the message opens, such as the item in the library.</summary>
    public string? LinkUrl { get; set; }

    /// <summary>Gets or sets the color, as 0xRRGGBB, such as the bar beside a Discord embed.</summary>
    public int? Color { get; set; }

    /// <summary>Gets or sets when it happened, shown as a Discord embed's time.</summary>
    public DateTimeOffset? Timestamp { get; set; }

    /// <summary>Gets or sets the language the title and text are written in, such as de. It is the web push notification's language.</summary>
    public string? Language { get; set; }

    /// <summary>Gets the names and values it carries, in order, as Discord embed fields and a webhook's <c>fields</c>.</summary>
    public IList<NotifyField> Fields { get; } = new List<NotifyField>();

    /// <summary>Gets the placeholder values, by name without braces, matched ignoring case. A placeholder with no value is left as written.</summary>
    public IDictionary<string, string> Values { get; } = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

    /// <summary>
    /// Gets the names of the values a Discord custom body inserts as given, such as links and ids. Every other value is escaped there,
    /// since people wrote it. The title and text escape every value for Discord.
    /// </summary>
    public ISet<string> PlainKeys { get; } = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

    /// <summary>
    /// Gets the extra keys a webhook's JSON carries after its own, such as an event name or ids. A custom body inserts each as JSON for a
    /// placeholder <see cref="Values"/> does not have, such as <c>{request}</c> for a whole object.
    /// </summary>
    public JsonObject Data { get; } = new();

    /// <summary>Gets the Jellyfin users the Jellyfin and web push channels send it to.</summary>
    public IList<Guid> Recipients { get; } = new List<Guid>();

    /// <summary>
    /// Gets or sets a value indicating whether a Jellyfin message goes only to each recipient's most recent device, and when held, only to the
    /// first one that comes online. One nudge is enough for a reminder.
    /// </summary>
    public bool OneDevice { get; set; }

    /// <summary>Gets or sets a value indicating whether a Jellyfin message for a recipient with no device online is held until one comes online.</summary>
    public bool Hold { get; set; } = true;

    /// <summary>Gets or sets the plugin's own key for what the message is about, such as a request id, kept with a held message.</summary>
    public string? Subject { get; set; }

    /// <summary>Gets or sets the web push tag. A newer notification with the same tag replaces the older one on a device.</summary>
    public string? Tag { get; set; }

    /// <summary>Gets or sets how long a push service keeps a web push for a device that is offline. One day by default.</summary>
    public TimeSpan TimeToLive { get; set; } = TimeSpan.FromDays(1);
}
