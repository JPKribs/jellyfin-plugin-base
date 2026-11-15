using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// Replaces characters and patterns that are illegal in cross-platform file names.
/// The same fixed set is replaced on every OS, so a name made on Linux is still valid on Windows.
/// </summary>
public static partial class FileNameSanitizer
{
    // Both separators and everything Windows rejects, whatever the host OS. Control characters are caught by char.IsControl.
    private static readonly HashSet<char> AllInvalidChars = new() { '/', '\\', ':', '*', '?', '"', '<', '>', '|', '\0' };

    private static readonly Regex UnderscoreCollapseRegex = new(@"_+", RegexOptions.Compiled);

    private const int MaxFileNameLength = 200;

    /// <summary>
    /// Makes a file name safe on every OS.
    /// </summary>
    /// <remarks>
    /// Invalid characters become the replacement, runs of it collapse to one, and leading and trailing spaces and dots are removed.
    /// A Windows reserved name such as <c>CON</c> gets an underscore added, and a name over 200 characters is cut while keeping its extension.
    /// An empty, <c>null</c>, or blank result becomes <c>unnamed_</c> and a new random GUID, so that output differs on every call.
    /// The replacement itself is not checked, so an invalid replacement character is not removed.
    /// </remarks>
    /// <param name="fileName">The file name, not a path. A separator in it is replaced.</param>
    /// <param name="replacement">The character that stands in for each invalid one. An underscore by default.</param>
    /// <returns>The safe file name.</returns>
    public static string Sanitize(string? fileName, char replacement = '_')
    {
        if (string.IsNullOrWhiteSpace(fileName))
        {
            return $"unnamed_{Guid.NewGuid():N}";
        }

        var sb = new StringBuilder(fileName.Length);

        foreach (var c in fileName)
        {
            if (AllInvalidChars.Contains(c) || char.IsControl(c))
            {
                sb.Append(replacement);
            }
            else
            {
                sb.Append(c);
            }
        }

        var sanitized = sb.ToString();
        sanitized = CollapseReplacements(sanitized, replacement);
        sanitized = sanitized.Trim(' ', '.');
        sanitized = HandleReservedNames(sanitized);

        if (sanitized.Length > MaxFileNameLength)
        {
            sanitized = TruncateWithExtension(sanitized, MaxFileNameLength);
        }

        if (string.IsNullOrWhiteSpace(sanitized))
        {
            return $"unnamed_{Guid.NewGuid():N}";
        }

        return sanitized;
    }

    /// <summary>
    /// Builds a temp file name from an item id and an original path, as "{sanitized-id}_{sanitized-file-name}".
    /// </summary>
    /// <remarks>Only the file name part of the path is used. A missing path gives a random <c>unnamed_</c> name, as <see cref="Sanitize"/> does.</remarks>
    /// <param name="sourceItemId">The id of the item the file belongs to.</param>
    /// <param name="originalPath">The original path or file name, or <c>null</c> when it is unknown.</param>
    /// <returns>The temp file name.</returns>
    public static string SanitizeTempFileName(string sourceItemId, string? originalPath)
    {
        var originalName = !string.IsNullOrEmpty(originalPath)
            ? Path.GetFileName(originalPath)
            : null;

        var sanitizedName = Sanitize(originalName);
        var sanitizedId = Sanitize(sourceItemId);

        return $"{sanitizedId}_{sanitizedName}";
    }

    private static string CollapseReplacements(string input, char replacement)
    {
        if (replacement == '_')
        {
            return UnderscoreCollapseRegex.Replace(input, "_");
        }

        var pattern = $"{Regex.Escape(replacement.ToString())}+";
        return Regex.Replace(input, pattern, replacement.ToString());
    }

    private static string HandleReservedNames(string fileName)
    {
        var nameWithoutExtension = Path.GetFileNameWithoutExtension(fileName).ToUpperInvariant();
        var extension = Path.GetExtension(fileName);

        string[] reservedNames =
        {
            "CON", "PRN", "AUX", "NUL",
            "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
            "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9"
        };

        if (reservedNames.Contains(nameWithoutExtension))
        {
            return $"{Path.GetFileNameWithoutExtension(fileName)}_{extension}";
        }

        return fileName;
    }

    private static string TruncateWithExtension(string fileName, int maxLength)
    {
        var extension = Path.GetExtension(fileName);
        var nameWithoutExtension = Path.GetFileNameWithoutExtension(fileName);

        var maxNameLength = maxLength - extension.Length;
        if (maxNameLength < 1)
        {
            return fileName[..maxLength];
        }

        if (nameWithoutExtension.Length > maxNameLength)
        {
            nameWithoutExtension = nameWithoutExtension[..maxNameLength];
        }

        return nameWithoutExtension + extension;
    }
}
