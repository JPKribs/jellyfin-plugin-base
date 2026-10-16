using System;
using MediaBrowser.Controller;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// Response helpers for the standalone pages a plugin serves outside the dashboard (invite links, public
/// download pages, custom pages), which render through <see cref="StatusPage"/>.
/// </summary>
public static class PublicPage
{
    /// <summary>
    /// Sets headers that keep a page, and any token in its URL, out of referrers, caches, and search
    /// indexes. Applied by the plugin itself so it does not depend on a reverse proxy.
    /// </summary>
    /// <param name="response">The response to set the headers on.</param>
    public static void ApplyHardeningHeaders(HttpResponse response)
    {
        ArgumentNullException.ThrowIfNull(response);
        response.Headers["Referrer-Policy"] = "no-referrer";
        response.Headers["Cache-Control"] = "no-store";
        response.Headers["X-Robots-Tag"] = "noindex, nofollow";
    }

    /// <summary>
    /// Serves the web client's favicon for a sibling <c>favicon.ico</c> route, which the status page
    /// template links relatively. Browser cached for a day; 404 when the web client has none.
    /// </summary>
    /// <param name="paths">The server application paths, used to locate the web client.</param>
    /// <param name="response">The response, for the cache header.</param>
    /// <returns>The favicon file, or a 404.</returns>
    public static IActionResult Favicon(IServerApplicationPaths paths, HttpResponse response)
    {
        ArgumentNullException.ThrowIfNull(response);

        var favicon = FaviconResolver.Resolve(paths);
        if (favicon is null)
        {
            return new NotFoundResult();
        }

        response.Headers["Cache-Control"] = "public, max-age=86400";
        return new FileContentResult(favicon.Value.Bytes, favicon.Value.ContentType);
    }
}
