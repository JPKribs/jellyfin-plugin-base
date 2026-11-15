using System;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using MediaBrowser.Controller;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// Resolves the web client's favicon from disk, so a plugin can serve the server's real icon at a stable path.
/// </summary>
/// <remarks>
/// The favicon file name is content hashed and changes per build, so it is found by parsing the web client's <c>index.html</c>.
/// The link tag must put <c>rel</c> before <c>href</c>. Each call reads the disk again and nothing is cached.
/// Every file that does not end in <c>.png</c> is labeled <c>image/x-icon</c>, including an SVG icon.
/// </remarks>
public static partial class FaviconResolver
{
    /// <summary>
    /// Reads the web client's favicon from disk.
    /// </summary>
    /// <param name="paths">The server application paths, used to locate the web client.</param>
    /// <returns>The favicon bytes and content type, or <c>null</c> when none could be found or read.</returns>
    public static (byte[] Bytes, string ContentType)? Resolve(IServerApplicationPaths paths)
    {
        ArgumentNullException.ThrowIfNull(paths);

        try
        {
            var web = paths.WebPath;
            if (string.IsNullOrEmpty(web) || !Directory.Exists(web))
            {
                return null;
            }

            var root = Path.GetFullPath(web);
            var rootPrefix = root.EndsWith(Path.DirectorySeparatorChar) ? root : root + Path.DirectorySeparatorChar;
            string? file = null;

            var indexPath = Path.Combine(root, "index.html");
            if (File.Exists(indexPath))
            {
                var match = IconLinkPattern().Match(File.ReadAllText(indexPath));
                if (match.Success)
                {
                    var href = match.Groups[1].Value.Replace('/', Path.DirectorySeparatorChar).TrimStart(Path.DirectorySeparatorChar);
                    var candidate = Path.GetFullPath(Path.Combine(root, href));
                    if (candidate.StartsWith(rootPrefix, StringComparison.Ordinal) && File.Exists(candidate))
                    {
                        file = candidate;
                    }
                }
            }

            file ??= Directory.EnumerateFiles(root, "favicon*.ico").FirstOrDefault();
            if (file is null)
            {
                return null;
            }

            var bytes = File.ReadAllBytes(file);
            var contentType = file.EndsWith(".png", StringComparison.OrdinalIgnoreCase) ? "image/png" : "image/x-icon";
            return (bytes, contentType);
        }
        catch (IOException)
        {
            return null;
        }
        catch (UnauthorizedAccessException)
        {
            return null;
        }
    }

    [GeneratedRegex("rel=\"(?:shortcut )?icon\"[^>]*href=\"([^\"]+)\"", RegexOptions.IgnoreCase)]
    private static partial Regex IconLinkPattern();
}
