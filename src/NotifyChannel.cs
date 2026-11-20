namespace JPKribs.Jellyfin.Base;

/// <summary>
/// The kind of place a <see cref="NotifyDestination"/> sends a <see cref="NotifyMessage"/> to.
/// </summary>
public enum NotifyChannel
{
    /// <summary>A Discord channel webhook, which gets an embed.</summary>
    Discord = 0,

    /// <summary>Any address that takes a POST, which gets JSON or a custom body.</summary>
    Webhook = 1,

    /// <summary>A message on the Jellyfin devices of the message's recipients that can show messages.</summary>
    Jellyfin = 2,

    /// <summary>A browser notification on the devices the message's recipients signed up for web push.</summary>
    WebPush = 3
}
