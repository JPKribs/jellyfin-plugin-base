using System;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using MediaBrowser.Controller;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// Resolves the web client's favicon from disk so plugins can serve the server's real icon at a stable
/// path. The favicon file name is content hashed and changes per build, so it is located by parsing the
/// web client's <c>index.html</c>; the result is cached after the first resolution.
/// </summary>
public static partial class FaviconResolver
{
    private static readonly object Lock = new();
    private static bool _resolved;
    private static byte[]? _bytes;
    private static string _contentType = "image/x-icon";

    /// <summary>
    /// Resolves and caches the web client favicon bytes.
    /// </summary>
    /// <param name="paths">The server application paths, used to locate the web client.</param>
    /// <returns>The favicon bytes and content type, or <c>null</c> when none could be located.</returns>
    public static (byte[] Bytes, string ContentType)? Resolve(IServerApplicationPaths paths)
    {
        ArgumentNullException.ThrowIfNull(paths);

        lock (Lock)
        {
            if (!_resolved)
            {
                ResolveCore(paths);
                _resolved = true;
            }
        }

        return _bytes is null ? null : (_bytes, _contentType);
    }

    private static void ResolveCore(IServerApplicationPaths paths)
    {
        try
        {
            var web = paths.WebPath;
            if (string.IsNullOrEmpty(web) || !Directory.Exists(web))
            {
                return;
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
                return;
            }

            _bytes = File.ReadAllBytes(file);
            _contentType = file.EndsWith(".png", StringComparison.OrdinalIgnoreCase) ? "image/png" : "image/x-icon";
        }
        catch (IOException)
        {
            // Leave the favicon unresolved; callers return 404 and the browser falls back.
        }
        catch (UnauthorizedAccessException)
        {
            // Leave the favicon unresolved; callers return 404 and the browser falls back.
        }
    }

    [GeneratedRegex("rel=\"(?:shortcut )?icon\"[^>]*href=\"([^\"]+)\"", RegexOptions.IgnoreCase)]
    private static partial Regex IconLinkPattern();
}
