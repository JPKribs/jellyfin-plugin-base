using System;
using System.IO;
using MediaBrowser.Controller;
using NSubstitute;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>Verifies that <see cref="FaviconResolver"/> finds the web client's favicon, stays inside the web folder, and resolves on every call.</summary>
public class FaviconResolverTests
{
    private static IServerApplicationPaths PathsFor(string webPath)
    {
        var paths = Substitute.For<IServerApplicationPaths>();
        paths.WebPath.Returns(webPath);
        return paths;
    }

    /// <summary>
    /// The favicon named by the link in index.html is read, with the icon content type.
    /// True: a content hashed favicon name is found.
    /// False: the icon would be missed after each web client build.
    /// </summary>
    [Fact]
    public void Resolve_ReadsHashedFaviconFromIndexHtml()
    {
        var web = NewTempDir();
        try
        {
            File.WriteAllText(Path.Combine(web, "index.html"), "<link rel=\"shortcut icon\" href=\"favicon.abc123.ico\">");
            File.WriteAllBytes(Path.Combine(web, "favicon.abc123.ico"), new byte[] { 1, 2, 3, 4 });

            var favicon = FaviconResolver.Resolve(PathsFor(web));

            Assert.NotNull(favicon);
            Assert.Equal(new byte[] { 1, 2, 3, 4 }, favicon!.Value.Bytes);
            Assert.Equal("image/x-icon", favicon.Value.ContentType);
        }
        finally
        {
            Directory.Delete(web, true);
        }
    }

    /// <summary>
    /// A favicon that ends in .png is served as a PNG.
    /// True: the browser gets the right content type for a PNG icon.
    /// False: a PNG would be labeled as an icon file.
    /// </summary>
    [Fact]
    public void Resolve_LabelsAPngFaviconAsPng()
    {
        var web = NewTempDir();
        try
        {
            File.WriteAllText(Path.Combine(web, "index.html"), "<link rel=\"icon\" href=\"favicon.abc.png\">");
            File.WriteAllBytes(Path.Combine(web, "favicon.abc.png"), new byte[] { 1 });

            var favicon = FaviconResolver.Resolve(PathsFor(web));

            Assert.Equal("image/png", favicon!.Value.ContentType);
        }
        finally
        {
            Directory.Delete(web, true);
        }
    }

    /// <summary>
    /// With no link in index.html the first favicon file in the folder is used.
    /// True: a web client with no link tag still gives an icon.
    /// False: the icon would be missing.
    /// </summary>
    [Fact]
    public void Resolve_FallsBackToGlobWhenNoIndexLink()
    {
        var web = NewTempDir();
        try
        {
            File.WriteAllBytes(Path.Combine(web, "favicon.fallback.ico"), new byte[] { 9 });

            var favicon = FaviconResolver.Resolve(PathsFor(web));

            Assert.NotNull(favicon);
            Assert.Equal(new byte[] { 9 }, favicon!.Value.Bytes);
        }
        finally
        {
            Directory.Delete(web, true);
        }
    }

    /// <summary>
    /// A link that points outside the web folder is not followed.
    /// True: an edited index.html cannot make the plugin serve another file.
    /// False: a path such as "../evil.ico" would be read.
    /// </summary>
    [Fact]
    public void Resolve_RejectsHrefThatEscapesWebRoot()
    {
        var root = NewTempDir();
        try
        {
            var web = Path.Combine(root, "web");
            Directory.CreateDirectory(web);
            File.WriteAllText(Path.Combine(web, "index.html"), "<link rel=\"icon\" href=\"../evil.ico\">");
            File.WriteAllBytes(Path.Combine(root, "evil.ico"), new byte[] { 6, 6, 6 });

            // The web folder holds no favicon file, so a rejected link must give nothing.
            Assert.Null(FaviconResolver.Resolve(PathsFor(web)));
        }
        finally
        {
            Directory.Delete(root, true);
        }
    }

    /// <summary>
    /// A web folder that does not exist gives null.
    /// True: a server with no web client serves no icon.
    /// False: a missing folder would throw.
    /// </summary>
    [Fact]
    public void Resolve_ReturnsNullWhenWebPathMissing()
    {
        Assert.Null(FaviconResolver.Resolve(PathsFor(Path.Combine(Path.GetTempPath(), "base-fav-missing-" + Guid.NewGuid()))));
    }

    /// <summary>
    /// Two web folders resolve independently, and repeated calls read the disk again.
    /// True: no process wide cache leaks one folder's icon into another.
    /// False: the second folder would return the first folder's icon.
    /// </summary>
    [Fact]
    public void Resolve_DistinctPathsAreIndependent()
    {
        var a = NewTempDir();
        var b = NewTempDir();
        try
        {
            File.WriteAllBytes(Path.Combine(a, "favicon.a.ico"), new byte[] { 1 });
            File.WriteAllBytes(Path.Combine(b, "favicon.b.ico"), new byte[] { 2 });

            Assert.Equal(new byte[] { 1 }, FaviconResolver.Resolve(PathsFor(a))!.Value.Bytes);
            Assert.Equal(new byte[] { 2 }, FaviconResolver.Resolve(PathsFor(b))!.Value.Bytes);
            Assert.Equal(new byte[] { 1 }, FaviconResolver.Resolve(PathsFor(a))!.Value.Bytes);
        }
        finally
        {
            Directory.Delete(a, true);
            Directory.Delete(b, true);
        }
    }

    private static string NewTempDir()
    {
        var dir = Path.Combine(Path.GetTempPath(), "base-fav-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(dir);
        return dir;
    }
}
