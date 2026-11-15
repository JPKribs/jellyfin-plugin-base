using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>Verifies that <see cref="UrlUtilities.TryGetHttpUri"/> accepts only an absolute http or https URL with a host and no user info.</summary>
public class UrlUtilitiesTests
{
    /// <summary>
    /// An absolute http or https URL with a host is accepted and parsed.
    /// True: the parsed URL keeps its host, port, and path.
    /// False: a valid configured address would be refused.
    /// </summary>
    [Theory]
    [InlineData("http://example.com", "example.com", 80)]
    [InlineData("https://example.com:8443/api/v1?x=1", "example.com", 8443)]
    [InlineData("HTTPS://Example.COM/", "example.com", 443)]
    [InlineData("http://192.168.1.10:8096", "192.168.1.10", 8096)]
    [InlineData("http://[::1]:8096/", "[::1]", 8096)]
    [InlineData("  https://example.com/  ", "example.com", 443)]
    public void TryGetHttpUri_AcceptsHttpAndHttps(string value, string host, int port)
    {
        var ok = UrlUtilities.TryGetHttpUri(value, out var uri);

        Assert.True(ok);
        Assert.NotNull(uri);
        Assert.Equal(host, uri!.Host);
        Assert.Equal(port, uri.Port);
    }

    /// <summary>
    /// Null, blank, relative, another scheme, user info, and a missing host are all refused, and the output is null.
    /// True: only a usable web address gets through.
    /// False: a file URL, a relative path, or a URL with a password in it would be accepted.
    /// </summary>
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("example.com")]
    [InlineData("/relative/path")]
    [InlineData("ftp://example.com/")]
    [InlineData("file:///etc/passwd")]
    [InlineData("javascript:alert(1)")]
    [InlineData("mailto:a@example.com")]
    [InlineData("ws://example.com/")]
    [InlineData("http://user@example.com/")]
    [InlineData("http://user:pass@example.com/")]
    [InlineData("https://:pass@example.com/")]
    [InlineData("http://")]
    [InlineData("http:///path")]
    [InlineData("http:example.com")]
    public void TryGetHttpUri_RefusesAnythingElse(string? value)
    {
        var ok = UrlUtilities.TryGetHttpUri(value, out var uri);

        Assert.False(ok);
        Assert.Null(uri);
    }
}
