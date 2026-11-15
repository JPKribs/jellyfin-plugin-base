using System;
using System.Globalization;
using System.Text;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// Formatting helpers for log lines and user facing text.
/// </summary>
public static class FormatUtilities
{
    /// <summary>
    /// Formats a byte count with a binary unit, such as "1.50 GB".
    /// The number always uses a period for the decimal point.
    /// </summary>
    /// <remarks>
    /// The number uses the invariant culture, so a German culture prints "1.50 GB" and not "1,50 GB", which keeps log lines and stored text the same on every server.
    /// Units run from <c>B</c> to <c>TB</c> in steps of 1024, and a negative count stays in bytes.
    /// </remarks>
    /// <param name="bytes">The byte count.</param>
    /// <returns>The count with two decimals and its unit.</returns>
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

        return size.ToString("F2", CultureInfo.InvariantCulture) + " " + units[unitIndex];
    }

    /// <summary>
    /// Makes caller supplied text safe to log or to store as XML by removing control characters and characters XML cannot hold, and cutting it so a long value cannot flood the log.
    /// A newline cannot forge a log entry, and the result never splits a surrogate pair.
    /// </summary>
    /// <remarks>
    /// Control characters, U+FFFE and U+FFFF, the line and paragraph separators U+2028 and U+2029, and the bidirectional formatting controls
    /// (U+200E, U+200F, U+061C, U+202A to U+202E, and U+2066 to U+2069) are removed, so text cannot start a new line or reorder the text around it. A lone surrogate is replaced with U+FFFD, so the result is valid in an XML document.
    /// A surrogate pair is kept or cut as a whole, so text that would split one is cut before it.
    /// Text cut to the length gets "..." added, so the result can be three characters longer than <paramref name="maxLength"/>.
    /// Input made only of control characters gives an empty string rather than "[empty]", and a negative length throws.
    /// </remarks>
    /// <param name="input">The text from a request or a file.</param>
    /// <param name="maxLength">The most UTF-16 characters kept before "..." is added. 200 by default.</param>
    /// <returns>The safe text, or "[empty]" when the input is <c>null</c> or empty.</returns>
    public static string SanitizeForLog(string? input, int maxLength = 200)
    {
        if (string.IsNullOrEmpty(input)) return "[empty]";

        ArgumentOutOfRangeException.ThrowIfNegative(maxLength);
        var output = new StringBuilder(Math.Min(input.Length, maxLength));
        for (var i = 0; i < input.Length; i++)
        {
            var c = input[i];
            if (char.IsHighSurrogate(c) && i + 1 < input.Length && char.IsLowSurrogate(input[i + 1]))
            {
                if (output.Length + 2 > maxLength)
                {
                    return output.Append("...").ToString();
                }

                output.Append(c).Append(input[i + 1]);
                i++;
                continue;
            }

            if (char.IsControl(c) || c is '\uFFFE' or '\uFFFF' or '\u2028' or '\u2029' or '\u200E' or '\u200F' or '\u061C'
                || (c >= '\u202A' && c <= '\u202E') || (c >= '\u2066' && c <= '\u2069'))
            {
                continue;
            }

            if (output.Length + 1 > maxLength)
            {
                return output.Append("...").ToString();
            }

            output.Append(char.IsSurrogate(c) ? '\uFFFD' : c);
        }

        return output.ToString();
    }
}
