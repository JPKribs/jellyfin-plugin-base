using System;
using System.IO;
using MediaBrowser.Controller;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using NSubstitute;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>Verifies that <see cref="PublicPage"/> sets hardening headers and serves the web client's favicon.</summary>
public sealed class PublicPageTests : IDisposable
{
    private readonly string _dir = Path.Combine(Path.GetTempPath(), "jpk-public-" + Guid.NewGuid().ToString("N"));

    public PublicPageTests() => Directory.CreateDirectory(_dir);

    public void Dispose()
    {
        if (Directory.Exists(_dir))
        {
            Directory.Delete(_dir, true);
        }
    }

    /// <summary>
    /// The hardening headers keep a page out of referrers, caches, and search indexes.
    /// True: a token in the page URL does not leak.
    /// False: a header would be missing or set to a weaker value.
    /// </summary>
    [Fact]
    public void ApplyHardeningHeaders_SetsHeaders()
    {
        var context = new DefaultHttpContext();

        PublicPage.ApplyHardeningHeaders(context.Response);

        Assert.Equal("no-referrer", context.Response.Headers["Referrer-Policy"]);
        Assert.Equal("no-store", context.Response.Headers["Cache-Control"]);
        Assert.Equal("noindex, nofollow", context.Response.Headers["X-Robots-Tag"]);
    }

    /// <summary>
    /// The favicon is served as a file with a cache header of one day.
    /// True: the browser caches the icon and the status page shows it.
    /// False: the icon would be refetched on every page or not served.
    /// </summary>
    [Fact]
    public void Favicon_ServesFileWithCacheHeader()
    {
        File.WriteAllBytes(Path.Combine(_dir, "favicon.ico"), new byte[] { 7, 8 });
        var paths = Substitute.For<IServerApplicationPaths>();
        paths.WebPath.Returns(_dir);
        var context = new DefaultHttpContext();

        var result = Assert.IsType<FileContentResult>(PublicPage.Favicon(paths, context.Response));

        Assert.Equal(new byte[] { 7, 8 }, result.FileContents);
        Assert.Equal("public, max-age=86400", context.Response.Headers["Cache-Control"]);
    }

    /// <summary>
    /// A web client with no favicon gives a not found result.
    /// True: the browser gets a clean 404.
    /// False: a missing folder would throw.
    /// </summary>
    [Fact]
    public void Favicon_MissingIsNotFound()
    {
        var paths = Substitute.For<IServerApplicationPaths>();
        paths.WebPath.Returns(Path.Combine(_dir, "missing"));

        Assert.IsType<NotFoundResult>(PublicPage.Favicon(paths, new DefaultHttpContext().Response));
    }

    /// <summary>
    /// A missing response is rejected.
    /// True: a misuse fails at once.
    /// False: a null response would fail later.
    /// </summary>
    [Fact]
    public void Members_RejectANullResponse()
    {
        Assert.Throws<ArgumentNullException>(() => PublicPage.ApplyHardeningHeaders(null!));
        Assert.Throws<ArgumentNullException>(() => PublicPage.Favicon(Substitute.For<IServerApplicationPaths>(), null!));
    }
}
