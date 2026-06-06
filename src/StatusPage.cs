using System.Collections.Generic;
using System.Net;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// Renders the standalone, Jellyfin themed status page (a centered card with a logo, heading, message,
/// an optional spinner, and an optional action button) from the <c>status</c> template. Use it from a
/// plugin controller for served pages such as "page not found", "sign in required", or a loading state.
/// The markup is self contained, so it needs none of the dashboard assets.
/// </summary>
public static class StatusPage
{
    /// <summary>
    /// Renders the status page HTML.
    /// </summary>
    /// <param name="heading">The card heading.</param>
    /// <param name="message">The card body message.</param>
    /// <param name="title">The document title; defaults to the heading.</param>
    /// <param name="buttonText">The action button text, or <c>null</c> for no button.</param>
    /// <param name="buttonHref">The action button link, or <c>null</c> for no button.</param>
    /// <param name="showSpinner">Whether to show a loading spinner.</param>
    /// <returns>A complete HTML document.</returns>
    public static string Render(
        string heading,
        string message,
        string? title = null,
        string? buttonText = "Back to Jellyfin",
        string? buttonHref = "../web/",
        bool showSpinner = false)
    {
        var spinner = showSpinner
            ? "<div class=\"jpk-spinner\" role=\"status\" aria-label=\"Loading\"></div>"
            : string.Empty;

        var button = string.IsNullOrEmpty(buttonText) || string.IsNullOrEmpty(buttonHref)
            ? string.Empty
            : "<a class=\"jpk-btn\" href=\"" + WebUtility.HtmlEncode(buttonHref) + "\">" + WebUtility.HtmlEncode(buttonText) + "</a>";

        return TemplateLoader.Fill("status", new Dictionary<string, string>(System.StringComparer.Ordinal)
        {
            ["TITLE"] = WebUtility.HtmlEncode(title ?? heading),
            ["HEADING"] = WebUtility.HtmlEncode(heading),
            ["MESSAGE"] = WebUtility.HtmlEncode(message),
            ["SPINNER"] = spinner,
            ["BUTTON"] = button,
            ["CONTENT"] = string.Empty
        });
    }
}
