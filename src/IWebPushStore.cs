using System;
using System.Collections.Generic;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// Where the plugin keeps its VAPID keys and its users' web push subscriptions, for <see cref="BaseNotifier"/>. The plugin implements it,
/// such as with its configuration for the keys and its database for the subscriptions.
/// </summary>
public interface IWebPushStore
{
    /// <summary>
    /// Gets the server's VAPID keys.
    /// </summary>
    /// <returns>The keys, or <c>null</c> when none are set up, which stops every web push.</returns>
    WebPushKeys? GetKeys();

    /// <summary>
    /// Gets every browser that signed up for a user's web push.
    /// </summary>
    /// <param name="userId">The Jellyfin user.</param>
    /// <returns>The subscriptions.</returns>
    IReadOnlyList<WebPushSubscription> GetSubscriptions(Guid userId);

    /// <summary>
    /// Keeps a subscription, replacing any with the same endpoint.
    /// </summary>
    /// <param name="subscription">The subscription.</param>
    void Save(WebPushSubscription subscription);

    /// <summary>
    /// Removes a subscription, such as one its push service no longer knows.
    /// </summary>
    /// <param name="endpoint">The subscription's endpoint.</param>
    void Remove(string endpoint);
}
