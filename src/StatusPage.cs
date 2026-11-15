using System.Collections.Generic;
using System.Net;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// Renders the standalone, Jellyfin themed status page from the <c>status</c> template.
/// It is a centered card with a logo, a heading, a message, an optional spinner, and an optional action button.
/// </summary>
/// <remarks>
/// A plugin controller uses it for pages such as "page not found", "sign in required", or a loading state.
/// The markup is self contained, so it needs none of the dashboard assets.
/// </remarks>
public static class StatusPage
{
    /// <summary>
    /// Renders the status page HTML.
    /// </summary>
    /// <remarks>The heading, message, title, and button values are HTML encoded. The <paramref name="content"/> value is not.</remarks>
    /// <param name="heading">The card heading.</param>
    /// <param name="message">The card body message.</param>
    /// <param name="title">The document title, or <c>null</c> to use the heading.</param>
    /// <param name="buttonText">The action button text. It defaults to "Back to Jellyfin", and <c>null</c> or empty means no button.</param>
    /// <param name="buttonHref">The action button link. It defaults to "../web/", and <c>null</c> or empty means no button.</param>
    /// <param name="showSpinner">Whether to show a loading spinner. <c>false</c> by default.</param>
    /// <param name="content">
    /// Raw HTML placed in the card below the message, such as a form or a page the plugin's script fills in.
    /// It is not encoded, so pass only markup the plugin owns.
    /// </param>
    /// <returns>A complete HTML document.</returns>
    public static string Render(
        string heading,
        string message,
        string? title = null,
        string? buttonText = "Back to Jellyfin",
        string? buttonHref = "../web/",
        bool showSpinner = false,
        string? content = null)
    {
        var spinner = showSpinner
            ? "<div class=\"base-spinner\" role=\"status\" aria-label=\"Loading\"></div>"
            : string.Empty;

        var button = string.IsNullOrEmpty(buttonText) || string.IsNullOrEmpty(buttonHref)
            ? string.Empty
            : "<a class=\"base-btn\" href=\"" + WebUtility.HtmlEncode(buttonHref) + "\">" + WebUtility.HtmlEncode(buttonText) + "</a>";

        return TemplateLoader.Fill("status", new Dictionary<string, string>(System.StringComparer.Ordinal)
        {
            ["TITLE"] = WebUtility.HtmlEncode(title ?? heading),
            ["HEADING"] = WebUtility.HtmlEncode(heading),
            ["MESSAGE"] = WebUtility.HtmlEncode(message),
            ["SPINNER"] = spinner,
            ["BUTTON"] = button,
            ["CONTENT"] = content ?? string.Empty
        });
    }
}
