using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace JPKribs.Jellyfin.Base;

/// <summary>Checks whether a folder sits inside other folders, by whole folder names.</summary>
/// <remarks>
/// The local methods resolve both paths with <see cref="Path.GetFullPath(string)"/>, so they follow the host OS.
/// <see cref="IsUnderForeign"/> and <see cref="FirstSegmentUnder"/> read paths written on another machine as plain text and never touch the file system.
/// The local methods ignore case on every OS by default, and they never resolve a symbolic link, so a link inside a root that points outside it still counts as inside.
/// A foreign path is refused when a segment is ".." or "." or holds a NUL. A Windows style foreign path is also refused for a segment that is empty once its trailing dots and spaces are removed or that holds a colon other than a leading drive such as "D:", since Windows strips or reinterprets those.
/// </remarks>
public static class PathContainment
{
    private const char Separator = '/';

    /// <summary>
    /// Checks whether a folder is one of the given folders or inside one.
    /// "/media/movies-cache" is not inside "/media/movies".
    /// </summary>
    /// <remarks>
    /// Case is ignored on every OS, so "/media/Movies" matches "/media/movies" even where the file system is case sensitive.
    /// A root of "/" matches nothing, and <see cref="FirstRootUnder"/> and <see cref="IsStrictlyUnder"/> are the methods that match it.
    /// A relative path is resolved against the current directory, and a <c>null</c> or blank root is skipped.
    /// </remarks>
    /// <param name="folder">The folder to check.</param>
    /// <param name="roots">The folders it may be in.</param>
    /// <returns><c>true</c> when the folder is a root or inside one, otherwise <c>false</c>.</returns>
    public static bool IsUnderAny(string folder, IEnumerable<string> roots)
    {
        ArgumentException.ThrowIfNullOrEmpty(folder);
        ArgumentNullException.ThrowIfNull(roots);
        var mine = Path.TrimEndingDirectorySeparator(Path.GetFullPath(folder)) + Path.DirectorySeparatorChar;
        return roots.Where(root => !string.IsNullOrWhiteSpace(root)).Any(root =>
        {
            var theirs = Path.TrimEndingDirectorySeparator(Path.GetFullPath(root)) + Path.DirectorySeparatorChar;
            return mine.StartsWith(theirs, StringComparison.OrdinalIgnoreCase);
        });
    }

    /// <summary>
    /// Checks whether a folder is inside a root and is not the root itself.
    /// Use it to guard a delete that must never remove the root.
    /// </summary>
    /// <remarks>
    /// Both paths are resolved with <see cref="Path.GetFullPath(string)"/>, so a trailing separator on either side does not matter and a root of "/" or "C:\" matches.
    /// A blank root is never a match. A folder named "..x" is an ordinary name, while "/media/../x" resolves to "/x" before the check.
    /// </remarks>
    /// <param name="folder">The folder to check.</param>
    /// <param name="root">The folder it must be inside.</param>
    /// <param name="comparison">How names are compared. <see cref="StringComparison.OrdinalIgnoreCase"/> by default, as in <see cref="IsUnderAny"/>.</param>
    /// <returns><c>true</c> when the folder is inside the root and is not the root, otherwise <c>false</c>.</returns>
    public static bool IsStrictlyUnder(string folder, string root, StringComparison comparison = StringComparison.OrdinalIgnoreCase)
    {
        ArgumentException.ThrowIfNullOrEmpty(folder);
        return !string.IsNullOrWhiteSpace(root) && IsInside(folder, root, comparison, allowEqual: false);
    }

    /// <summary>
    /// Finds the root a folder is in, or is, from a list of roots.
    /// With overlapping roots it returns the deepest one by default, so a nested library wins over its parent.
    /// </summary>
    /// <remarks>
    /// A folder equal to a root counts as inside it. A root of "/" matches every absolute folder, and a blank root is skipped.
    /// The root is returned as it was given. With <paramref name="deepest"/> off the first match in list order wins.
    /// </remarks>
    /// <param name="folder">The folder to check.</param>
    /// <param name="roots">The folders it may be in.</param>
    /// <param name="deepest">Whether the match with the most path segments wins. <c>true</c> by default.</param>
    /// <returns>The matching root, or <c>null</c> when no root matches.</returns>
    public static string? FirstRootUnder(string folder, IEnumerable<string> roots, bool deepest = true)
    {
        ArgumentException.ThrowIfNullOrEmpty(folder);
        ArgumentNullException.ThrowIfNull(roots);

        string? best = null;
        var bestLength = -1;
        foreach (var root in roots)
        {
            if (string.IsNullOrWhiteSpace(root) || !IsInside(folder, root, StringComparison.OrdinalIgnoreCase, allowEqual: true))
            {
                continue;
            }

            if (!deepest)
            {
                return root;
            }

            var length = Path.TrimEndingDirectorySeparator(Path.GetFullPath(root)).Length;
            if (length > bestLength)
            {
                best = root;
                bestLength = length;
            }
        }

        return best;
    }

    /// <summary>
    /// Checks whether a path written on another machine is inside a root written there too.
    /// Use it on a path a peer or a remote server sent, where the local file system rules do not apply.
    /// </summary>
    /// <remarks>
    /// Both are read as text. Backslashes become slashes, repeated and trailing separators are ignored, and whole segments are compared, never characters.
    /// Both must be absolute in the same form, which is a leading slash, a drive such as "D:\", or a share such as "\\server\share", so "D:\Media" never matches "/Media".
    /// A path or root with a ".." or "." segment, a segment with a NUL, a blank value, or a relative path is never a match.
    /// A Windows style path, which has a drive, a share, or a backslash, is also refused when a segment is empty after its trailing dots and spaces are removed (such as "..." or ".. ") or holds a colon other than the drive, since Windows strips or reinterprets those. A path with only slashes keeps such names.
    /// A root of "/" or "D:\" matches every path in it.
    /// </remarks>
    /// <param name="path">The path to check, as the other machine wrote it.</param>
    /// <param name="root">The folder it must be inside.</param>
    /// <param name="allowEqual">Whether the root itself counts. <c>false</c> by default.</param>
    /// <param name="comparison">How segment names are compared. <see cref="StringComparison.OrdinalIgnoreCase"/> by default.</param>
    /// <returns><c>true</c> when the path is inside the root, otherwise <c>false</c>.</returns>
    public static bool IsUnderForeign(string? path, string? root, bool allowEqual = false, StringComparison comparison = StringComparison.OrdinalIgnoreCase)
    {
        return Relative(path, root, comparison, allowEqual) is not null;
    }

    /// <summary>
    /// Gives the first folder name under a root for a path written on another machine.
    /// For "/media/movies/Action/Film/film.mkv" under "/media/movies" that is "Action".
    /// </summary>
    /// <remarks>
    /// The rules are those of <see cref="IsUnderForeign"/>, and the root itself never matches.
    /// The name is returned as written, and for a path directly in the root it is the file name.
    /// </remarks>
    /// <param name="path">The path, as the other machine wrote it.</param>
    /// <param name="root">The folder it must be inside.</param>
    /// <param name="comparison">How segment names are compared. <see cref="StringComparison.OrdinalIgnoreCase"/> by default.</param>
    /// <returns>The first segment under the root, or <c>null</c> when the path is not inside it.</returns>
    public static string? FirstSegmentUnder(string? path, string? root, StringComparison comparison = StringComparison.OrdinalIgnoreCase)
    {
        return Relative(path, root, comparison, allowEqual: false)?.FirstOrDefault();
    }

    private static bool IsInside(string folder, string root, StringComparison comparison, bool allowEqual)
    {
        var mine = Path.TrimEndingDirectorySeparator(Path.GetFullPath(folder));
        var theirs = Path.TrimEndingDirectorySeparator(Path.GetFullPath(root));
        if (string.Equals(mine, theirs, comparison))
        {
            return allowEqual;
        }

        var prefix = theirs.EndsWith(Path.DirectorySeparatorChar) ? theirs : theirs + Path.DirectorySeparatorChar;
        return mine.StartsWith(prefix, comparison);
    }

    private static List<string>? Relative(string? path, string? root, StringComparison comparison, bool allowEqual)
    {
        if (!TryParse(path, out var mine, out var mineKind) || !TryParse(root, out var theirs, out var theirsKind) || mineKind != theirsKind)
        {
            return null;
        }

        if (mine.Count < theirs.Count || (mine.Count == theirs.Count && !allowEqual))
        {
            return null;
        }

        for (var i = 0; i < theirs.Count; i++)
        {
            if (!string.Equals(mine[i], theirs[i], comparison))
            {
                return null;
            }
        }

        return mine.GetRange(theirs.Count, mine.Count - theirs.Count);
    }

    // The kind keeps "/a/b" apart from "\\a\b" and from "a:\b", which share segments but name different places.
    private static bool TryParse(string? value, out List<string> segments, out char kind)
    {
        segments = new List<string>();
        kind = ' ';
        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        var windowsStyle = value.Contains('\\', StringComparison.Ordinal);
        var text = value.Replace('\\', Separator);
        if (text.StartsWith("//", StringComparison.Ordinal))
        {
            kind = 'u';
        }
        else if (text[0] == Separator)
        {
            kind = 'r';
        }
        else if (text.Length >= 3 && char.IsAsciiLetter(text[0]) && text[1] == ':' && text[2] == Separator)
        {
            kind = 'd';
        }
        else
        {
            return false;
        }

        windowsStyle |= kind != 'r';
        foreach (var segment in text.Split(Separator, StringSplitOptions.RemoveEmptyEntries))
        {
            if (segments.Count == 0 && kind == 'd')
            {
                segments.Add(segment);
                continue;
            }

            if (segment is ".." or "." || segment.Contains('\0', StringComparison.Ordinal))
            {
                return false;
            }

            // Windows strips trailing dots and spaces and reads a colon as a stream, so only a Windows style path is held to that.
            if (windowsStyle && (segment.TrimEnd('.', ' ').Length == 0 || segment.Contains(':', StringComparison.Ordinal)))
            {
                return false;
            }

            segments.Add(segment);
        }

        return kind != 'u' || segments.Count >= 2;
    }
}
