using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace JPKribs.Jellyfin.Base;

/// <summary>Whether a folder sits inside others, by whole folder names.</summary>
public static class PathContainment
{
    /// <summary>
    /// Whether a folder is one of the given folders or inside one. "/media/movies-cache" is not inside
    /// "/media/movies". Case is ignored.
    /// </summary>
    /// <param name="folder">The folder.</param>
    /// <param name="roots">The folders it may be in.</param>
    /// <returns><c>true</c> when it is.</returns>
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
}
