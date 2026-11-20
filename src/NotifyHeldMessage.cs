using System;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// A Jellyfin message kept by an <see cref="INotifyHeldStore"/> until one of its recipient's devices that can show messages comes online.
/// </summary>
/// <param name="Id">The held message's id.</param>
/// <param name="UserId">The Jellyfin user it is for.</param>
/// <param name="Header">The message's header.</param>
/// <param name="Text">The message's text.</param>
/// <param name="CreatedUtc">When it was held, in UTC.</param>
/// <param name="OneDevice"><c>true</c> shows it only on the device that comes online, rather than on every device online then.</param>
/// <param name="Subject">The plugin's own key for what it is about, such as a request id, so the plugin can drop it when that is removed. Empty when not set.</param>
public sealed record NotifyHeldMessage(Guid Id, Guid UserId, string Header, string Text, DateTime CreatedUtc, bool OneDevice = false, string Subject = "");
