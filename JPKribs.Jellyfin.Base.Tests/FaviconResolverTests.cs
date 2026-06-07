using System;
using System.IO;
using JPKribs.Jellyfin.Base;
using MediaBrowser.Controller;
using NSubstitute;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>
/// Tests for <see cref="FaviconResolver"/>, including the path-containment guard and per-call resolution
/// (no process-wide cache, so distinct web paths resolve independently).
/// </summary>
public class FaviconResolverTests
{
    private static IServerApplicationPaths PathsFor(string webPath)
    {
        var paths = Substitute.For<IServerApplicationPaths>();
        paths.WebPath.Returns(webPath);
        return paths;
    }

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

            // No favicon*.ico inside web, so a rejected href must yield nothing.
            Assert.Null(FaviconResolver.Resolve(PathsFor(web)));
        }
        finally
        {
            Directory.Delete(root, true);
        }
    }

    [Fact]
    public void Resolve_ReturnsNullWhenWebPathMissing()
    {
        Assert.Null(FaviconResolver.Resolve(PathsFor(Path.Combine(Path.GetTempPath(), "base-fav-missing-" + Guid.NewGuid()))));
    }

    [Fact]
    public void Resolve_DistinctPathsAreIndependent()
    {
        // Guards against a process-wide cache leaking one path's result into another.
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
