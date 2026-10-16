using System;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// Formatting helpers for log lines and user-facing strings.
/// </summary>
public static class FormatUtilities
{
    /// <summary>
    /// Formats a byte count as a human-readable string (e.g. "1.50 GB").
    /// </summary>
    public static string FormatBytes(long bytes)
    {
        string[] units = { "B", "KB", "MB", "GB", "TB" };
        double size = bytes;
        var unitIndex = 0;

        while (size >= 1024 && unitIndex < units.Length - 1)
        {
            size /= 1024;
            unitIndex++;
        }

        return $"{size:F2} {units[unitIndex]}";
    }

    /// <summary>
    /// Makes caller-supplied text safe to log: strips control characters (so a newline cannot forge a log
    /// entry) and truncates it (so a long value cannot flood the log). Empty or null renders as "[empty]".
    /// </summary>
    public static string SanitizeForLog(string? input, int maxLength = 200)
    {
        if (string.IsNullOrEmpty(input)) return "[empty]";

        var sanitized = new string(Array.FindAll(input.ToCharArray(), c => !char.IsControl(c)));
        return sanitized.Length <= maxLength ? sanitized : string.Concat(sanitized.AsSpan(0, maxLength), "...");
    }
}
