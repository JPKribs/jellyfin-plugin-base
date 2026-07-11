using System;
using System.Text;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// Small string helpers shared across plugins that generate markup or embed untrusted text.
/// </summary>
public static class StringUtilities
{
    /// <summary>
    /// Escapes a string for safe embedding inside a single- or double-quoted JavaScript string literal.
    /// Backslashes and quotes are escaped, line breaks are turned into escape sequences, and the angle
    /// brackets and JS line separators that can break out of an inline <c>&lt;script&gt;</c> block are
    /// neutralised. The result is <em>not</em> wrapped in quotes; the caller supplies those.
    /// </summary>
    /// <param name="value">The raw value, possibly from untrusted input.</param>
    /// <returns>The escaped value, safe to place between quotes in generated JavaScript.</returns>
    public static string EscapeJsString(string? value)
    {
        if (string.IsNullOrEmpty(value))
        {
            return string.Empty;
        }

        var sb = new StringBuilder(value.Length + 8);
        foreach (var c in value)
        {
            switch (c)
            {
                case '\\': sb.Append("\\\\"); break;
                case '\'': sb.Append("\\'"); break;
                case '"': sb.Append("\\\""); break;
                case '\r': sb.Append("\\r"); break;
                case '\n': sb.Append("\\n"); break;
                case '\t': sb.Append("\\t"); break;
                case '\b': sb.Append("\\b"); break;
                case '\f': sb.Append("\\f"); break;

                // Prevent an inline </script> breakout and stray HTML-comment sequences.
                case '<': sb.Append("\\x3C"); break;
                case '>': sb.Append("\\x3E"); break;
                case '&': sb.Append("\\x26"); break;

                // U+2028/U+2029 are valid JS whitespace but illegal inside a string literal.
                case '\u2028': sb.Append("\\u2028"); break;
                case '\u2029': sb.Append("\\u2029"); break;

                default: sb.Append(c); break;
            }
        }

        return sb.ToString();
    }
}
