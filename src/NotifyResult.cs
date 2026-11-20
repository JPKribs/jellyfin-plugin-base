namespace JPKribs.Jellyfin.Base;

/// <summary>
/// What sending one <see cref="NotifyMessage"/> to one <see cref="NotifyDestination"/> did, in a sentence a person reads.
/// </summary>
/// <param name="DestinationId">The destination's <see cref="NotifyDestination.Id"/>.</param>
/// <param name="Channel">The destination's channel.</param>
/// <param name="Ok"><c>true</c> when the message reached the destination, or was held for a device to come online.</param>
/// <param name="Message">What happened, in the language of the call path, such as "Sent.".</param>
/// <param name="Status">The HTTP status a Discord, webhook, or web push address answered, or zero.</param>
/// <param name="Delivered">How many devices showed it, for the Jellyfin and web push channels.</param>
/// <param name="Held">How many recipients it was held for until a device comes online, for the Jellyfin channel.</param>
public sealed record NotifyResult(string DestinationId, NotifyChannel Channel, bool Ok, string Message, int Status = 0, int Delivered = 0, int Held = 0);
