using System;
using System.Collections.Generic;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// Where <see cref="BaseNotifier"/> keeps Jellyfin messages for someone with no device online that can show them. The plugin implements it,
/// such as with a table in its database, and <see cref="BaseNotifier"/> decides what to hold and when to show it.
/// </summary>
public interface INotifyHeldStore
{
    /// <summary>
    /// Keeps a message until one of its recipient's devices comes online.
    /// </summary>
    /// <param name="message">The message to keep.</param>
    void Hold(NotifyHeldMessage message);

    /// <summary>
    /// Removes and returns every message held for someone, oldest first, so a second device that connects at the same time finds none.
    /// </summary>
    /// <param name="userId">The Jellyfin user.</param>
    /// <returns>The messages that were held.</returns>
    IReadOnlyList<NotifyHeldMessage> Take(Guid userId);

    /// <summary>
    /// Gets whether a held message is still worth showing, such as a reminder whose subject still waits. A message that is not is dropped.
    /// </summary>
    /// <param name="message">The held message.</param>
    /// <returns><c>true</c> to show it, which every message is by default.</returns>
    bool IsStillDue(NotifyHeldMessage message) => true;
}
