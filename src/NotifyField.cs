namespace JPKribs.Jellyfin.Base;

/// <summary>
/// One name and value a <see cref="NotifyMessage"/> carries, shown as a Discord embed field and listed in a webhook's JSON.
/// </summary>
/// <param name="Name">The label, such as Requester.</param>
/// <param name="Value">The value. A field whose value is blank is left out.</param>
/// <param name="Inline"><c>true</c> lets Discord set it beside up to two others in a row.</param>
public readonly record struct NotifyField(string Name, string Value, bool Inline = true);
