using System;
using System.Globalization;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// One place a <see cref="BaseNotifier"/> sends messages to, kept in the plugin's configuration. A plugin may derive from it to add
/// its own settings, such as which updates go there.
/// </summary>
public class NotifyDestination
{
    /// <summary>Gets or sets the destination's id, which keeps its stored address when a page saves it back.</summary>
    public string Id { get; set; } = Guid.NewGuid().ToString("N", CultureInfo.InvariantCulture);

    /// <summary>Gets or sets the destination's name, for the settings page and the log.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Gets or sets the kind of place it is.</summary>
    public NotifyChannel Channel { get; set; }

    /// <summary>Gets or sets a value indicating whether messages sent to a list of destinations go here.</summary>
    public bool Enabled { get; set; } = true;

    /// <summary>Gets or sets the address of a Discord or other webhook, encrypted at rest with <see cref="ResolveSecrets"/>.</summary>
    public string Url { get; set; } = string.Empty;

    /// <summary>Gets or sets the name a Discord post comes from. Blank is Jellyfin.</summary>
    public string Username { get; set; } = string.Empty;

    /// <summary>Gets or sets the absolute http or https address of the picture a Discord post comes from. Blank is Discord's own.</summary>
    public string AvatarUrl { get; set; } = string.Empty;

    /// <summary>Gets or sets a value indicating whether posts use <see cref="Body"/> instead of the JSON built from the message.</summary>
    public bool UseCustomBody { get; set; }

    /// <summary>Gets or sets the custom body of a post, with placeholders. JSON is sent as JSON, and anything else as text to a webhook.</summary>
    public string Body { get; set; } = string.Empty;

    /// <summary>Gets or sets a webhook's extra request headers, one <c>Name: value</c> a line, encrypted at rest with <see cref="ResolveSecrets"/>.</summary>
    public string Headers { get; set; } = string.Empty;

    /// <summary>
    /// Keeps a destination's secrets as a page saves it back. The address stays stored while the page posts
    /// <see cref="SecretProtector.KeptSentinel"/>, and the headers stay only while the address is the same, so a stored token never follows a
    /// webhook somewhere new. A value that is already encrypted is taken only as the one stored here, so an encrypted address copied
    /// from elsewhere cannot move onto this server. The Jellyfin and web push channels keep no address.
    /// </summary>
    /// <param name="incoming">The destination as the page posted it. Its <see cref="Url"/> and <see cref="Headers"/> become the values to store.</param>
    /// <param name="stored">The destination with the same id as stored, or <c>null</c> when it is new.</param>
    /// <param name="secrets">The plugin's protector.</param>
    public static void ResolveSecrets(NotifyDestination incoming, NotifyDestination? stored, SecretProtector secrets)
    {
        ArgumentNullException.ThrowIfNull(incoming);
        ArgumentNullException.ThrowIfNull(secrets);
        if (incoming.Channel is NotifyChannel.Jellyfin or NotifyChannel.WebPush)
        {
            incoming.Url = string.Empty;
            incoming.Headers = string.Empty;
            return;
        }

        incoming.Url = Resolve(incoming.Url, stored?.Url, secrets);
        var sameAddress = stored is not null && string.Equals(secrets.Unprotect(incoming.Url), secrets.Unprotect(stored.Url), StringComparison.Ordinal);
        incoming.Headers = incoming.Channel == NotifyChannel.Webhook
            ? Resolve(incoming.Headers, sameAddress ? stored!.Headers : null, secrets)
            : string.Empty;
    }

    /// <summary>
    /// Replaces the stored address and headers with <see cref="SecretProtector.KeptSentinel"/>, or empty when none is stored, so a copy
    /// sent to a page never carries them.
    /// </summary>
    public void HideSecrets()
    {
        Url = SecretProtector.HasSecret(Url) ? SecretProtector.KeptSentinel : string.Empty;
        Headers = SecretProtector.HasSecret(Headers) ? SecretProtector.KeptSentinel : string.Empty;
    }

    private static string Resolve(string? value, string? stored, SecretProtector secrets)
    {
        value = value?.Trim();
        return SecretProtector.IsProtected(value) && !string.Equals(value, stored, StringComparison.Ordinal)
            ? string.Empty
            : secrets.ResolveIncoming(value, stored);
    }
}
