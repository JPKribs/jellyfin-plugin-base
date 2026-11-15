using System;
using System.Diagnostics.CodeAnalysis;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// Checks URLs a user typed or a peer sent before a plugin uses them.
/// </summary>
public static class UrlUtilities
{
    /// <summary>
    /// Reads text as an absolute http or https URL with a host and no user name or password.
    /// Use it on a configured address before a request is made to it.
    /// </summary>
    /// <remarks>
    /// The scheme is matched in any case. Whitespace around the text is ignored by the URI parser, and a relative URL, another scheme, and an empty host are refused.
    /// This checks the shape only, so pair it with <see cref="SsrfGuard"/> when the address must not be on a private network.
    /// </remarks>
    /// <param name="value">The text to read.</param>
    /// <param name="uri">The parsed URL when the result is <c>true</c>, otherwise <c>null</c>.</param>
    /// <returns><c>true</c> when the text is an acceptable URL, otherwise <c>false</c>.</returns>
    public static bool TryGetHttpUri(string? value, [NotNullWhen(true)] out Uri? uri)
    {
        uri = null;
        if (string.IsNullOrWhiteSpace(value) || !Uri.TryCreate(value, UriKind.Absolute, out var parsed))
        {
            return false;
        }

        if ((parsed.Scheme != Uri.UriSchemeHttp && parsed.Scheme != Uri.UriSchemeHttps)
            || parsed.UserInfo.Length > 0
            || string.IsNullOrEmpty(parsed.Host))
        {
            return false;
        }

        uri = parsed;
        return true;
    }
}
