using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// The service worker script that shows a web push. A plugin's own service worker loads it with <c>importScripts</c> from a route that
/// answers with <see cref="Serve"/>, or copies <see cref="Script"/> into itself.
/// </summary>
public static class WebPushWorker
{
    /// <summary>
    /// The script. On <c>push</c> it shows the notification the payload describes, and on <c>notificationclick</c> it focuses a window
    /// already at the payload's address or opens one.
    /// </summary>
    public const string Script = """
        // Base's web push worker. It shows each push as a notification, and opens or focuses its address on a click.
        self.addEventListener('push', function (event) {
            var data = {};
            try {
                data = event.data ? event.data.json() : {};
            } catch (e) {
                data = { body: event.data ? event.data.text() : '' };
            }
            var options = { body: String(data.body || ''), data: { url: String(data.url || '') } };
            if (data.icon) options.icon = String(data.icon);
            if (data.image) options.image = String(data.image);
            if (data.tag) options.tag = String(data.tag);
            if (data.lang) options.lang = String(data.lang);
            if (data.timestamp) options.timestamp = Number(data.timestamp);
            event.waitUntil(self.registration.showNotification(String(data.title || ''), options));
        });

        self.addEventListener('notificationclick', function (event) {
            event.notification.close();
            var scope = self.registration.scope;
            var target = scope;
            try {
                var url = new URL((event.notification.data && event.notification.data.url) || scope, scope);
                if (url.protocol === 'https:' || url.protocol === 'http:') target = url.href;
            } catch (e) {
                target = scope;
            }
            event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
                for (var i = 0; i < list.length; i++) {
                    if (list[i].url === target && typeof list[i].focus === 'function') return list[i].focus();
                }
                return self.clients.openWindow ? self.clients.openWindow(target) : undefined;
            }));
        });
        """;

    /// <summary>
    /// Answers a request for the script, as JavaScript that a browser checks again on every load.
    /// </summary>
    /// <param name="response">The response, which receives the cache header.</param>
    /// <returns>The script.</returns>
    public static ContentResult Serve(HttpResponse response)
    {
        System.ArgumentNullException.ThrowIfNull(response);
        response.Headers.CacheControl = "no-cache";
        return new ContentResult { Content = Script, ContentType = "text/javascript; charset=utf-8", StatusCode = StatusCodes.Status200OK };
    }
}
