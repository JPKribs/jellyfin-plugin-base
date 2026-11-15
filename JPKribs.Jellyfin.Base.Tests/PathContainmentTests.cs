using System;
using System.IO;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>Verifies that <see cref="PathContainment"/> decides whether a folder is inside others by whole folder names, for local paths and for paths written on another machine.</summary>
public class PathContainmentTests
{
    /// <summary>
    /// A folder is inside another only by whole folder names.
    /// True: "/media/movies-cache" is not mistaken for a folder inside "/media/movies".
    /// False: a folder that shares a prefix would pass as contained.
    /// </summary>
    [Theory]
    [InlineData("/media/movies/cache", true)]
    [InlineData("/media/movies", true)]
    [InlineData("/media/movies-cache", false)]
    [InlineData("/cache", false)]
    public void IsUnderAny_MatchesWholeFolders(string folder, bool inside)
    {
        Assert.Equal(inside, PathContainment.IsUnderAny(folder, new[] { "/media/movies/", "/media/shows" }));
    }

    /// <summary>
    /// Case is ignored, and a trailing separator on the folder does not matter.
    /// True: the same folder written two ways matches.
    /// False: a different case or a trailing slash would hide a match.
    /// </summary>
    [Theory]
    [InlineData("/MEDIA/Movies", true)]
    [InlineData("/media/movies/", true)]
    [InlineData("/Media/Movies/Cache", true)]
    public void IsUnderAny_IgnoresCaseAndTrailingSeparators(string folder, bool inside)
    {
        Assert.Equal(inside, PathContainment.IsUnderAny(folder, new[] { "/media/movies" }));
    }

    /// <summary>
    /// A null, empty, or blank root is skipped, and no roots match nothing.
    /// True: an unset library folder never matches by accident.
    /// False: a blank root would resolve to the current directory and match.
    /// </summary>
    [Fact]
    public void IsUnderAny_SkipsBlankRoots()
    {
        Assert.True(PathContainment.IsUnderAny("/media/x", new[] { string.Empty, "  ", "/media/x" }));
        Assert.False(PathContainment.IsUnderAny("/media/x", new[] { string.Empty, "  " }));
        Assert.False(PathContainment.IsUnderAny("/media/x", System.Array.Empty<string>()));
    }

    /// <summary>
    /// An empty folder or a missing root list is rejected.
    /// True: a misuse fails at once.
    /// False: an empty folder would resolve to the current directory.
    /// </summary>
    [Fact]
    public void IsUnderAny_RejectsBadArguments()
    {
        Assert.Throws<System.ArgumentException>(() => PathContainment.IsUnderAny(string.Empty, new[] { "/media" }));
        Assert.Throws<System.ArgumentNullException>(() => PathContainment.IsUnderAny("/media", null!));
    }

    /// <summary>
    /// A folder is strictly under a root only when it is inside it and is not the root itself.
    /// True: a delete guard can refuse the root and accept what is inside it.
    /// False: the root would count as inside itself, or a folder that only shares a prefix would count as inside.
    /// </summary>
    [Theory]
    [InlineData("/media/movies", "/media/movies", false)]
    [InlineData("/media/movies/", "/media/movies", false)]
    [InlineData("/media/movies", "/media/movies/", false)]
    [InlineData("/media/movies/action", "/media/movies", true)]
    [InlineData("/media/movies/action/", "/media/movies/", true)]
    [InlineData("/media/movies/a/b/c", "/media/movies", true)]
    [InlineData("/media/movies2", "/media/movies", false)]
    [InlineData("/media/movies-cache", "/media/movies", false)]
    [InlineData("/media", "/media/movies", false)]
    [InlineData("/other/movies", "/media/movies", false)]
    public void IsStrictlyUnder_ExcludesTheRootAndSiblingPrefixes(string folder, string root, bool expected)
    {
        Assert.Equal(expected, PathContainment.IsStrictlyUnder(folder, root));
    }

    /// <summary>
    /// A root of "/" matches every other absolute folder and still not itself.
    /// True: a library mounted at the file system root is guarded like any other.
    /// False: the root of the file system would match nothing, as it does in IsUnderAny.
    /// </summary>
    [Theory]
    [InlineData("/media", "/", true)]
    [InlineData("/media/movies/", "/", true)]
    [InlineData("/", "/", false)]
    [InlineData("//", "/", false)]
    public void IsStrictlyUnder_MatchesTheFileSystemRoot(string folder, string root, bool expected)
    {
        Assert.Equal(expected, PathContainment.IsStrictlyUnder(folder, root));
    }

    /// <summary>
    /// A folder name that starts with two dots is an ordinary name, while a real parent segment is resolved first.
    /// True: "/media/..x" is inside "/media", and "/media/../x" is not.
    /// False: a name such as "..x" would be refused, or a parent segment would walk out of the root.
    /// </summary>
    [Theory]
    [InlineData("/media/..x", "/media", true)]
    [InlineData("/media/...", "/media", true)]
    [InlineData("/media/../x", "/media", false)]
    [InlineData("/media/a/../b", "/media", true)]
    [InlineData("/media/a/..", "/media", false)]
    [InlineData("/media/../media/x", "/media", true)]
    public void IsStrictlyUnder_ResolvesParentSegmentsOnly(string folder, string root, bool expected)
    {
        Assert.Equal(expected, PathContainment.IsStrictlyUnder(folder, root));
    }

    /// <summary>
    /// The comparison is case insensitive by default and can be made case sensitive.
    /// True: a caller on a case sensitive file system can ask for an exact match.
    /// False: the comparison argument would be ignored.
    /// </summary>
    [Fact]
    public void IsStrictlyUnder_HonorsTheComparison()
    {
        Assert.True(PathContainment.IsStrictlyUnder("/MEDIA/Movies/x", "/media/movies"));
        Assert.False(PathContainment.IsStrictlyUnder("/MEDIA/Movies/x", "/media/movies", StringComparison.Ordinal));
        Assert.True(PathContainment.IsStrictlyUnder("/media/movies/x", "/media/movies", StringComparison.Ordinal));
    }

    /// <summary>
    /// A blank root never matches, a relative folder is resolved against the current directory, and an empty folder is refused.
    /// True: an unset root cannot make a delete pass.
    /// False: a blank root would resolve to the current directory and match.
    /// </summary>
    [Fact]
    public void IsStrictlyUnder_HandlesBlankAndRelativeInput()
    {
        Assert.False(PathContainment.IsStrictlyUnder("/media/x", string.Empty));
        Assert.False(PathContainment.IsStrictlyUnder("/media/x", "   "));
        Assert.False(PathContainment.IsStrictlyUnder("/media/x", null!));
        Assert.True(PathContainment.IsStrictlyUnder("child", Directory.GetCurrentDirectory()));
        Assert.Throws<ArgumentException>(() => PathContainment.IsStrictlyUnder(string.Empty, "/media"));
    }

    /// <summary>
    /// A Windows drive root matches the folders on that drive, and only on Windows, where the path is a drive path.
    /// True: a library on a drive root is guarded like any other.
    /// False: the drive root would match nothing.
    /// </summary>
    [Fact]
    public void IsStrictlyUnder_MatchesADriveRootOnWindows()
    {
        if (OperatingSystem.IsWindows())
        {
            Assert.True(PathContainment.IsStrictlyUnder(@"C:\Media", @"C:\"));
            Assert.False(PathContainment.IsStrictlyUnder(@"C:\", @"C:\"));
            Assert.False(PathContainment.IsStrictlyUnder(@"D:\Media", @"C:\"));
        }
        else
        {
            Assert.False(PathContainment.IsStrictlyUnder("/media", "/other"));
        }
    }

    /// <summary>
    /// With overlapping roots the deepest match wins by default, and the first in list order wins when asked.
    /// True: a library nested inside another is reported as itself.
    /// False: the parent would win and a caller would act on the wrong library.
    /// </summary>
    [Fact]
    public void FirstRootUnder_PrefersTheDeepestRootUnlessAskedNot()
    {
        var roots = new[] { "/media", "/media/movies/", "/media/movies/action" };

        Assert.Equal("/media/movies/action", PathContainment.FirstRootUnder("/media/movies/action/film", roots));
        Assert.Equal("/media", PathContainment.FirstRootUnder("/media/movies/action/film", roots, deepest: false));
        Assert.Equal("/media/movies/", PathContainment.FirstRootUnder("/media/movies/drama", roots));
    }

    /// <summary>
    /// The root is returned as it was given, a folder equal to a root counts, and no match gives null.
    /// True: a caller can map a folder back to the entry it came from.
    /// False: a trailing slash would be lost or a root would not match itself.
    /// </summary>
    [Fact]
    public void FirstRootUnder_ReturnsTheRootAsGivenOrNull()
    {
        var roots = new[] { "/media/shows/", "/media/movies" };

        Assert.Equal("/media/shows/", PathContainment.FirstRootUnder("/media/shows", roots));
        Assert.Equal("/media/movies", PathContainment.FirstRootUnder("/MEDIA/MOVIES/x", roots));
        Assert.Null(PathContainment.FirstRootUnder("/media/movies2", roots));
        Assert.Null(PathContainment.FirstRootUnder("/media/movies", Array.Empty<string>()));
    }

    /// <summary>
    /// A root of "/" matches every absolute folder, and a nested root still beats it.
    /// True: the file system root works as a library root.
    /// False: the root would never match, as in IsUnderAny.
    /// </summary>
    [Fact]
    public void FirstRootUnder_MatchesTheFileSystemRoot()
    {
        Assert.Equal("/", PathContainment.FirstRootUnder("/media/x", new[] { "/" }));
        Assert.Equal("/media", PathContainment.FirstRootUnder("/media/x", new[] { "/", "/media" }));
        Assert.Equal("/", PathContainment.FirstRootUnder("/", new[] { "/" }));
    }

    /// <summary>
    /// Blank roots are skipped and a bad argument is rejected.
    /// True: an unset library folder never matches by accident.
    /// False: a blank root would resolve to the current directory.
    /// </summary>
    [Fact]
    public void FirstRootUnder_SkipsBlankRootsAndRejectsBadArguments()
    {
        Assert.Null(PathContainment.FirstRootUnder("/media/x", new[] { string.Empty, " ", null! }));
        Assert.Equal("/media", PathContainment.FirstRootUnder("/media/x", new[] { string.Empty, "/media" }));
        Assert.Throws<ArgumentException>(() => PathContainment.FirstRootUnder(string.Empty, new[] { "/media" }));
        Assert.Throws<ArgumentNullException>(() => PathContainment.FirstRootUnder("/media", null!));
    }

    /// <summary>
    /// A path from another machine is checked by whole segments, whatever separators and drive it uses.
    /// True: a Windows path from a peer is judged on Linux without resolving it on this machine.
    /// False: the path would be read with this machine's rules and match nothing or the wrong thing.
    /// </summary>
    [Theory]
    [InlineData(@"D:\Media\Movies\Action", @"D:\Media\Movies", true)]
    [InlineData(@"D:\Media\Movies\Action\", @"D:\Media\Movies\", true)]
    [InlineData(@"D:\Media\Movies", @"D:\Media\Movies", false)]
    [InlineData(@"D:\Media\Movies2", @"D:\Media\Movies", false)]
    [InlineData(@"D:\Media", @"D:\Media\Movies", false)]
    [InlineData(@"d:\media\MOVIES\x", @"D:\Media\Movies", true)]
    [InlineData(@"D:/Media\Movies/x", @"D:\Media/Movies", true)]
    [InlineData(@"D:\\Media\\\Movies\x", @"D:\Media\Movies", true)]
    [InlineData("/media/movies/x", "/media/movies", true)]
    [InlineData("/media/movies/x/", "/media/movies/", true)]
    [InlineData("/media/movies2", "/media/movies", false)]
    [InlineData("/media/movies-cache", "/media/movies", false)]
    [InlineData("/media/..x", "/media", true)]
    [InlineData("/media/...", "/media", true)]
    public void IsUnderForeign_ComparesWholeSegments(string path, string root, bool expected)
    {
        Assert.Equal(expected, PathContainment.IsUnderForeign(path, root));
    }

    /// <summary>
    /// The root itself counts only when equal paths are allowed.
    /// True: a caller can choose whether the root is a valid match.
    /// False: the root would always, or never, match itself.
    /// </summary>
    [Theory]
    [InlineData(@"D:\Media\Movies", @"D:\Media\Movies", true, true)]
    [InlineData(@"D:\Media\Movies\", @"D:\Media\Movies", true, true)]
    [InlineData(@"D:\Media\Movies", @"D:\Media\Movies", false, false)]
    [InlineData("/media", "/media/", true, true)]
    [InlineData("/", "/", true, true)]
    [InlineData("/", "/", false, false)]
    [InlineData(@"C:\", @"C:\", true, true)]
    [InlineData(@"C:\", @"C:\", false, false)]
    public void IsUnderForeign_HonorsAllowEqual(string path, string root, bool allowEqual, bool expected)
    {
        Assert.Equal(expected, PathContainment.IsUnderForeign(path, root, allowEqual));
    }

    /// <summary>
    /// A root of "/" or a drive root matches every path in it, and a different drive does not.
    /// True: a library on a drive root is guarded like any other.
    /// False: the file system root would match nothing, as it does in IsUnderAny.
    /// </summary>
    [Theory]
    [InlineData("/media/x", "/", true)]
    [InlineData("/", "/", false)]
    [InlineData(@"C:\Media", @"C:\", true)]
    [InlineData(@"c:\Media", @"C:\", true)]
    [InlineData(@"D:\Media", @"C:\", false)]
    [InlineData(@"C:\", @"C:\", false)]
    public void IsUnderForeign_MatchesFileSystemAndDriveRoots(string path, string root, bool expected)
    {
        Assert.Equal(expected, PathContainment.IsUnderForeign(path, root));
    }

    /// <summary>
    /// A path with a parent or current directory segment is never a match, in the path or in the root.
    /// True: a peer cannot walk out of the root with "..", and a root cannot hide one.
    /// False: "/media/movies/../etc" would pass as inside "/media/movies".
    /// </summary>
    [Theory]
    [InlineData("/media/movies/../etc", "/media/movies")]
    [InlineData("/media/movies/..", "/media")]
    [InlineData(@"D:\Media\Movies\..\Secrets", @"D:\Media")]
    [InlineData("/media/../etc/x", "/media")]
    [InlineData("/media/movies/x", "/media/..")]
    [InlineData("/media/movies/x", "/media/movies/..")]
    [InlineData("/media/movies/./x", "/media/movies")]
    [InlineData("/media/movies/.", "/media/movies")]
    [InlineData("/media/movies/x", "/media/./movies")]
    public void IsUnderForeign_RejectsDotSegments(string path, string root)
    {
        Assert.False(PathContainment.IsUnderForeign(path, root));
        Assert.False(PathContainment.IsUnderForeign(path, root, allowEqual: true));
    }

    /// <summary>
    /// A blank root, a blank path, and a relative path are never a match.
    /// True: an unset library folder cannot make a delete pass.
    /// False: an empty root would match everything.
    /// </summary>
    [Theory]
    [InlineData("/media/x", "")]
    [InlineData("/media/x", "   ")]
    [InlineData("/media/x", null)]
    [InlineData("", "/media")]
    [InlineData(null, "/media")]
    [InlineData("media/x", "media")]
    [InlineData("media/x", "/media")]
    [InlineData("/media/x", "media")]
    [InlineData(@"D:", @"D:")]
    [InlineData(@"D:x", @"D:")]
    [InlineData("x", "/")]
    public void IsUnderForeign_RejectsBlankAndRelativeInput(string? path, string? root)
    {
        Assert.False(PathContainment.IsUnderForeign(path, root));
        Assert.False(PathContainment.IsUnderForeign(path, root, allowEqual: true));
    }

    /// <summary>
    /// Paths of different forms never match, even when their segments are the same.
    /// True: a share, a Unix path, and a drive path stay apart.
    /// False: "\\server\share\x" would pass as inside "/server/share".
    /// </summary>
    [Theory]
    [InlineData(@"\\nas\share\movies\x", "/nas/share/movies", false)]
    [InlineData("/nas/share/movies/x", @"\\nas\share\movies", false)]
    [InlineData(@"D:\Media\x", "/Media", false)]
    [InlineData("/D:/Media/x", @"D:\Media", false)]
    [InlineData(@"\\nas\share\movies\x", @"\\nas\share\movies", true)]
    [InlineData(@"\\nas\share\movies\x", @"\\nas\share", true)]
    [InlineData(@"\\nas\share", @"\\nas\share", false)]
    [InlineData(@"\\nas", @"\\nas", false)]
    [InlineData(@"\\nas\share\x", @"\\other\share", false)]
    public void IsUnderForeign_KeepsPathFormsApart(string path, string root, bool expected)
    {
        Assert.Equal(expected, PathContainment.IsUnderForeign(path, root));
    }

    /// <summary>
    /// Case is ignored by default and can be made exact.
    /// True: a peer on a case sensitive file system can be matched exactly.
    /// False: the comparison argument would be ignored.
    /// </summary>
    [Fact]
    public void IsUnderForeign_HonorsTheComparison()
    {
        Assert.True(PathContainment.IsUnderForeign("/Media/Movies/x", "/media/movies"));
        Assert.False(PathContainment.IsUnderForeign("/Media/Movies/x", "/media/movies", comparison: StringComparison.Ordinal));
        Assert.True(PathContainment.IsUnderForeign("/media/movies/x", "/media/movies", comparison: StringComparison.Ordinal));
    }

    /// <summary>
    /// The first segment under the root is returned as the other machine wrote it.
    /// True: a caller can group remote files by their first folder.
    /// False: the wrong segment, or a lowercased one, would be returned.
    /// </summary>
    [Theory]
    [InlineData("/media/movies/Action/Film (2020)/film.mkv", "/media/movies", "Action")]
    [InlineData(@"D:\Media\Movies\Drama\Film\film.mkv", @"D:\Media\Movies\", "Drama")]
    [InlineData("/media/movies/film.mkv", "/media/movies", "film.mkv")]
    [InlineData("/MEDIA/Movies/Action", "/media/movies", "Action")]
    [InlineData("/media/x", "/", "media")]
    [InlineData(@"C:\Media\x", @"C:\", "Media")]
    public void FirstSegmentUnder_ReturnsTheNextSegment(string path, string root, string expected)
    {
        Assert.Equal(expected, PathContainment.FirstSegmentUnder(path, root));
    }

    /// <summary>
    /// A path that is the root, outside it, or invalid has no first segment.
    /// True: a caller never gets a segment for a path that is not under the root.
    /// False: a sibling or a ".." path would yield a folder name.
    /// </summary>
    [Theory]
    [InlineData("/media/movies", "/media/movies")]
    [InlineData("/media/movies2/x", "/media/movies")]
    [InlineData("/other/x", "/media/movies")]
    [InlineData("/media/movies/../etc", "/media/movies")]
    [InlineData("/media/movies/x", "")]
    [InlineData("", "/media/movies")]
    [InlineData(null, "/media/movies")]
    [InlineData(@"D:\Media\x", "/Media")]
    public void FirstSegmentUnder_ReturnsNullWhenNotUnderTheRoot(string? path, string? root)
    {
        Assert.Null(PathContainment.FirstSegmentUnder(path, root));
    }

    /// <summary>
    /// The existing check keeps its documented gap, and the new methods are the ones that match a root of "/".
    /// True: IsUnderAny behaves as it always has, so no plugin sees a change.
    /// False: a fix meant for the new methods would have leaked into IsUnderAny.
    /// </summary>
    [Fact]
    public void IsUnderAny_StillDoesNotMatchTheFileSystemRoot()
    {
        Assert.False(PathContainment.IsUnderAny("/media/x", new[] { "/" }));
        Assert.True(PathContainment.IsStrictlyUnder("/media/x", "/"));
    }

    /// <summary>
    /// A foreign path with a segment that Windows strips or reads as a stream, or that holds a NUL, is never inside a root.
    /// True: "D:\\Media\\.. \\x" cannot escape through a segment Win32 trims to "..".
    /// False: such a segment would count as an ordinary folder name.
    /// </summary>
    [Theory]
    [InlineData("D:\\Media\\.. \\x")]
    [InlineData("D:\\Media\\...\\x")]
    [InlineData("D:\\Media\\. \\x")]
    [InlineData("D:\\Media\\ \\x")]
    [InlineData("D:\\Media\\a:stream\\x")]
    [InlineData("D:\\Media\\a\0b\\x")]
    [InlineData("D:\\Media\\C:\\x")]
    [InlineData("/Media/a\\... \\x")]
    [InlineData("\\\\server\\share\\a:b\\x")]
    public void Foreign_HostileSegments_Refused(string path)
    {
        Assert.False(PathContainment.IsUnderForeign(path, path.StartsWith('/') ? "/Media" : "D:\\Media"));
        Assert.Null(PathContainment.FirstSegmentUnder(path, path.StartsWith('/') ? "/Media" : "D:\\Media"));
        Assert.False(PathContainment.IsUnderForeign("D:\\Media\\ok", path, allowEqual: true));
    }

    /// <summary>
    /// A drive letter in the first position and ordinary names are still accepted.
    /// True: the new checks do not refuse normal Windows paths.
    /// False: "D:" would be read as an alternate data stream.
    /// </summary>
    [Fact]
    public void Foreign_DriveLetterAndOrdinaryNames_Accepted()
    {
        Assert.True(PathContainment.IsUnderForeign("D:\\Media\\Movies\\a.b", "D:\\Media"));
        Assert.Equal("Movies", PathContainment.FirstSegmentUnder("D:\\Media\\Movies\\a.b", "D:\\Media"));
        Assert.True(PathContainment.IsUnderForeign("\\\\server\\share\\a", "\\\\server\\share"));
    }

    /// <summary>
    /// A Linux style foreign path keeps names with a colon, trailing dots, or trailing spaces, and still refuses a parent segment or a NUL.
    /// True: "/media/Movies/Star Wars: A New Hope" is inside "/media/Movies".
    /// False: a normal Linux media folder would be refused as if it were a Windows name.
    /// </summary>
    [Theory]
    [InlineData("/media/Movies/Star Wars: A New Hope/film.mkv", true)]
    [InlineData("/media/Movies/Dots.../film.mkv", true)]
    [InlineData("/media/Movies/Space /film.mkv", true)]
    [InlineData("/media/Movies/.. /film.mkv", true)]
    [InlineData("/media/Movies/../film.mkv", false)]
    [InlineData("/media/Movies/a\0b/film.mkv", false)]
    public void Foreign_LinuxStylePaths_KeepColonsAndTrailingDotsAndSpaces(string path, bool expected)
    {
        Assert.Equal(expected, PathContainment.IsUnderForeign(path, "/media/Movies"));
    }
}
