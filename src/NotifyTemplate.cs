using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// The text rules every notification channel shares: filling <c>{placeholder}</c> names, a custom post body, webhook headers, and the
/// escaping Discord and Jellyfin's apps need.
/// </summary>
public static partial class NotifyTemplate
{
    /// <summary>The longest custom body a destination keeps, in characters.</summary>
    public const int MaxBodyLength = 8000;

    /// <summary>
    /// Fills a template's placeholders from a set of values. A placeholder with no value is left as written.
    /// </summary>
    /// <param name="template">The text, with placeholders such as <c>{title}</c>.</param>
    /// <param name="values">The values, by placeholder name.</param>
    /// <param name="escape">Escapes each value, such as <see cref="EscapeDiscord"/>. The template's own text is kept as written.</param>
    /// <param name="tidy"><c>true</c> closes up doubled spaces and trims, for a line of text rather than a post body.</param>
    /// <returns>The filled text.</returns>
    public static string Fill(string? template, IReadOnlyDictionary<string, string> values, Func<string, string>? escape = null, bool tidy = true)
    {
        ArgumentNullException.ThrowIfNull(values);
        var filled = Placeholder().Replace(template ?? string.Empty, m =>
        {
            if (!values.TryGetValue(m.Groups[1].Value, out var value))
            {
                return m.Value;
            }

            return escape is null ? value ?? string.Empty : escape(value ?? string.Empty);
        });
        return tidy ? Spaces().Replace(filled, " ").Trim() : filled;
    }

    /// <summary>
    /// Fills a custom post body. When it is JSON, each value is escaped for a JSON string and any key whose value comes out empty is
    /// left out. Anything else is filled as text. A placeholder in <paramref name="json"/> is inserted as JSON, without quotes.
    /// </summary>
    /// <param name="template">The body, with placeholders.</param>
    /// <param name="values">The text values, by placeholder name.</param>
    /// <param name="json">The JSON values, by placeholder name, used for a name <paramref name="values"/> does not have.</param>
    /// <returns>The body, and whether it is JSON.</returns>
    public static (string Text, bool IsJson) RenderBody(string? template, IReadOnlyDictionary<string, string> values, IReadOnlyDictionary<string, JsonNode?>? json = null)
    {
        ArgumentNullException.ThrowIfNull(values);
        var slotted = new Dictionary<string, string>(values, StringComparer.OrdinalIgnoreCase);
        var raw = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var (key, node) in json ?? new Dictionary<string, JsonNode?>())
        {
            if (!slotted.ContainsKey(key))
            {
                // Each JSON value waits under a marker no typed text can hold while the rest is filled.
                var marker = "\u0001" + raw.Count.ToString(System.Globalization.CultureInfo.InvariantCulture) + "\u0001";
                slotted[key] = marker;
                raw[marker] = node?.ToJsonString() ?? "null";
            }
        }

        string Filled(Func<string, string>? escape)
        {
            var text = Fill(template, slotted, escape, tidy: false);
            foreach (var (marker, value) in raw)
            {
                text = text.Replace(marker, value, StringComparison.Ordinal);
            }

            return text;
        }

        try
        {
            if (JsonNode.Parse(Filled(v => raw.ContainsKey(v) ? v : JsonText(v))) is { } node)
            {
                LeaveOutEmpty(node);
                return (node.ToJsonString(), true);
            }
        }
        catch (JsonException)
        {
        }

        return (Filled(null), false);
    }

    /// <summary>
    /// Reads a webhook's extra headers, one <c>Name: value</c> a line, skipping blank lines.
    /// </summary>
    /// <param name="text">The headers.</param>
    /// <returns>The headers, or <c>null</c> when a line is not a header, so a post never goes without the ones it needs.</returns>
    public static IReadOnlyList<KeyValuePair<string, string>>? ParseHeaders(string? text)
    {
        var headers = new List<KeyValuePair<string, string>>();
        foreach (var line in (text ?? string.Empty).Split('\n').Select(l => l.Trim()).Where(l => l.Length > 0))
        {
            var colon = line.IndexOf(':', StringComparison.Ordinal);
            var name = colon > 0 ? line[..colon].Trim() : string.Empty;
            var value = line[(colon + 1)..].Trim();
            if (!HeaderName().IsMatch(name) || value.Any(char.IsControl))
            {
                return null;
            }

            headers.Add(new(name, value));
        }

        return headers;
    }

    /// <summary>
    /// Escapes Discord's markdown, so text people wrote shows as typed, with no masked links, headings, spoilers, or mentions posted under
    /// the webhook's name.
    /// </summary>
    /// <param name="text">The text.</param>
    /// <returns>The escaped text.</returns>
    public static string EscapeDiscord(string? text)
    {
        var source = text ?? string.Empty;
        var escaped = new StringBuilder(source.Length);
        foreach (var c in source)
        {
            if (c is '\\' or '*' or '_' or '~' or '`' or '|' or '[' or ']' or '(' or ')' or '>' or '#' or '<' or '@')
            {
                escaped.Append('\\');
            }

            escaped.Append(c);
        }

        return escaped.ToString();
    }

    /// <summary>
    /// Drops angle brackets, since Jellyfin's apps may show a message's header and text as HTML, so nothing people wrote becomes markup.
    /// </summary>
    /// <param name="text">The text.</param>
    /// <returns>The text without angle brackets.</returns>
    public static string StripMarkup(string? text)
        => (text ?? string.Empty).Replace("<", string.Empty, StringComparison.Ordinal).Replace(">", string.Empty, StringComparison.Ordinal);

    /// <summary>
    /// Shortens text to a length, ending it with an ellipsis when it was cut.
    /// </summary>
    /// <param name="text">The text.</param>
    /// <param name="max">The longest it may be, in characters, at least 1.</param>
    /// <returns>The text, at most <paramref name="max"/> characters long.</returns>
    public static string Clip(string? text, int max)
    {
        ArgumentOutOfRangeException.ThrowIfLessThan(max, 1);
        var value = text ?? string.Empty;
        return value.Length > max ? value[..(max - 1)] + "…" : value;
    }

    // A value as it goes inside a JSON string.
    private static string JsonText(string value) => JsonSerializer.Serialize(value)[1..^1];

    // Removes the keys and items that came out as empty strings, and the objects and lists left empty by that.
    // Returns whether the node itself is now empty.
    private static bool LeaveOutEmpty(JsonNode? node)
    {
        switch (node)
        {
            case JsonObject obj:
                foreach (var key in obj.Select(p => p.Key).ToList())
                {
                    if (LeaveOutEmpty(obj[key]))
                    {
                        obj.Remove(key);
                    }
                }

                return obj.Count == 0;
            case JsonArray list:
                for (var i = list.Count - 1; i >= 0; i--)
                {
                    if (LeaveOutEmpty(list[i]))
                    {
                        list.RemoveAt(i);
                    }
                }

                return list.Count == 0;
            case JsonValue value:
                return value.TryGetValue<string>(out var text) && text.Length == 0;
            default:
                return false;
        }
    }

    [GeneratedRegex(@"\{([A-Za-z]+)\}")]
    private static partial Regex Placeholder();

    [GeneratedRegex(@"[ \t]{2,}")]
    private static partial Regex Spaces();

    [GeneratedRegex("^[!#$%&'*+.^_`|~0-9A-Za-z-]+$")]
    private static partial Regex HeaderName();
}
