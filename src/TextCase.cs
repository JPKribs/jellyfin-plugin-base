using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// Title case and sentence case for English text, with words such as TV or Apple Music kept as written. The shared
/// <c>titleCase</c> and <c>sentenceCase</c> on a page follow the same rules and give the same results.
/// </summary>
/// <remarks>
/// Only English changes. Any other language returns the text as it is, since casing differs by language. The
/// exceptions are <see cref="DefaultExceptions"/>, the plugin's <c>Localization/casing.json</c>, and any passed in the
/// call, matched as whole words regardless of case and written back exactly as given, the longest first.
/// </remarks>
public static class TextCase
{
    /// <summary>The name the translations build embeds the plugin's casing list under.</summary>
    public const string ResourceName = "JPKribs.Casing.json";

    private static readonly string[] _defaults = { "Jellyfin", "TV", "ID", "API", "URL", "HTTP", "HTTPS", "IP", "DNS", "HDR", "SDR", "4K" };

    private static readonly HashSet<string> _minor = new(StringComparer.Ordinal)
    {
        "a", "an", "and", "as", "at", "but", "by", "for", "from", "in", "into", "nor", "of", "on", "or", "per", "the", "to", "via", "vs", "with"
    };

    private static readonly Lazy<string[]> _embedded = new(ReadEmbedded);

    /// <summary>Gets the words Base keeps as written in every plugin, such as TV and URL.</summary>
    public static IReadOnlyList<string> DefaultExceptions => _defaults;

    /// <summary>Gets the words every conversion keeps as written: <see cref="DefaultExceptions"/> and the plugin's casing list.</summary>
    public static IReadOnlyList<string> Exceptions => _embedded.Value;

    /// <summary>
    /// Writes English text in title case, such as "Allow Media Playback". Short words such as "of" and "the" stay lower
    /// case unless first, last, or after a colon, and each part of a hyphenated word is capitalized.
    /// </summary>
    /// <param name="text">The text.</param>
    /// <param name="exceptions">Words or phrases to keep as written, added to <see cref="Exceptions"/>.</param>
    /// <param name="language">The text's language. <c>null</c>, empty, en, or en-* converts, and any other returns the text as it is.</param>
    /// <returns>The converted text.</returns>
    public static string ToTitleCase(this string text, IEnumerable<string>? exceptions = null, string? language = null)
        => Convert(text, exceptions, language, true);

    /// <summary>
    /// Writes English text in sentence case, such as "Allow media playback". The first letter of each sentence is
    /// upper case and the rest lower case, except words with a capital inside them, such as TV or iPhone.
    /// </summary>
    /// <param name="text">The text.</param>
    /// <param name="exceptions">Words or phrases to keep as written, added to <see cref="Exceptions"/>.</param>
    /// <param name="language">The text's language. <c>null</c>, empty, en, or en-* converts, and any other returns the text as it is.</param>
    /// <returns>The converted text.</returns>
    public static string ToSentenceCase(this string text, IEnumerable<string>? exceptions = null, string? language = null)
        => Convert(text, exceptions, language, false);

    /// <summary>
    /// Tells whether text in a language is converted, which only English is.
    /// </summary>
    /// <param name="language">The language, such as en-GB or de.</param>
    /// <returns><c>true</c> for <c>null</c>, empty, en, and en-*.</returns>
    public static bool IsEnglish(string? language)
    {
        var code = (language ?? string.Empty).Trim().Replace('_', '-').ToLowerInvariant();
        return code.Length == 0 || code == "en" || code.StartsWith("en-", StringComparison.Ordinal);
    }

    private static string Convert(string text, IEnumerable<string>? exceptions, string? language, bool title)
    {
        ArgumentNullException.ThrowIfNull(text);
        if (text.Length == 0 || !IsEnglish(language))
        {
            return text;
        }

        var output = text.ToCharArray();
        var kept = new bool[output.Length];
        KeepPlaceholders(text, kept);
        foreach (var exception in Merge(Exceptions, exceptions))
        {
            KeepException(text, exception, output, kept);
        }

        var words = Words(output);
        for (var k = 0; k < words.Count; k++)
        {
            var (start, end) = words[k];
            if (Array.IndexOf(kept, true, start, end - start) >= 0)
            {
                continue;
            }

            var word = new string(output, start, end - start);
            if (HasInnerCapital(word) || HasDigitAndLetter(word))
            {
                continue;
            }

            string written;
            if (title)
            {
                var lower = word.ToLowerInvariant();
                var hyphen = (start > 0 && output[start - 1] == '-') || (end < output.Length && output[end] == '-');
                var free = k == 0 || k == words.Count - 1 || hyphen || Before(output, start, false) == ':';
                written = !free && _minor.Contains(lower) ? lower : Upper(word);
            }
            else
            {
                var lower = word.ToLowerInvariant();
                var opens = k == 0 || Before(output, start, true) is '.' or '!' or '?';
                written = opens ? Upper(lower) : lower;
            }

            written.CopyTo(0, output, start, written.Length);
        }

        return new string(output);
    }

    // Every list in order, a later spelling of a word replacing an earlier one, the longest first.
    private static List<string> Merge(IEnumerable<string> first, IEnumerable<string>? second)
    {
        var merged = new List<string>();
        foreach (var word in first.Concat(second ?? Array.Empty<string>()))
        {
            if (string.IsNullOrWhiteSpace(word))
            {
                continue;
            }

            var trimmed = word.Trim();
            var at = merged.FindIndex(w => string.Equals(w, trimmed, StringComparison.OrdinalIgnoreCase));
            if (at >= 0)
            {
                merged[at] = trimmed;
            }
            else
            {
                merged.Add(trimmed);
            }
        }

        return merged.Select((w, i) => (w, i)).OrderByDescending(p => p.w.Length).ThenBy(p => p.i).Select(p => p.w).ToList();
    }

    private static void KeepPlaceholders(string text, bool[] kept)
    {
        for (var i = 0; i < text.Length; i++)
        {
            if (text[i] != '{')
            {
                continue;
            }

            var close = i + 1;
            while (close < text.Length && text[close] != '}' && text[close] != '{' && !char.IsWhiteSpace(text[close]))
            {
                close++;
            }

            if (close < text.Length && text[close] == '}')
            {
                Array.Fill(kept, true, i, close - i + 1);
                i = close;
            }
        }
    }

    private static void KeepException(string text, string exception, char[] output, bool[] kept)
    {
        var from = 0;
        while (from <= text.Length - exception.Length)
        {
            var at = text.IndexOf(exception, from, StringComparison.OrdinalIgnoreCase);
            if (at < 0)
            {
                return;
            }

            var end = at + exception.Length;
            var whole = (at == 0 || !char.IsLetterOrDigit(text[at - 1])) && (end == text.Length || !char.IsLetterOrDigit(text[end]));
            if (whole && Array.IndexOf(kept, true, at, exception.Length) < 0)
            {
                exception.CopyTo(0, output, at, exception.Length);
                Array.Fill(kept, true, at, exception.Length);
                from = end;
            }
            else
            {
                from = at + 1;
            }
        }
    }

    // Runs of letters and digits, joined across an apostrophe between two of them, such as don't.
    private static List<(int Start, int End)> Words(char[] text)
    {
        var words = new List<(int, int)>();
        var i = 0;
        while (i < text.Length)
        {
            if (!char.IsLetterOrDigit(text[i]))
            {
                i++;
                continue;
            }

            var j = i;
            while (j < text.Length && (char.IsLetterOrDigit(text[j]) || (IsApostrophe(text[j]) && j + 1 < text.Length && char.IsLetterOrDigit(text[j + 1]))))
            {
                j++;
            }

            words.Add((i, j));
            i = j;
        }

        return words;
    }

    // The character before a word, past any spaces. A sentence opens only after a space, so 1.5 never does.
    private static char Before(char[] text, int start, bool needSpace)
    {
        var i = start - 1;
        while (i >= 0 && char.IsWhiteSpace(text[i]))
        {
            i--;
        }

        return i < 0 || (needSpace && i == start - 1) ? '\0' : text[i];
    }

    private static bool IsApostrophe(char c) => c is '\'' or '’';

    private static bool HasInnerCapital(string word) => word.Skip(1).Any(char.IsUpper);

    private static bool HasDigitAndLetter(string word) => word.Any(char.IsDigit) && word.Any(char.IsLetter);

    private static string Upper(string word) => word.Length == 0 ? word : char.ToUpperInvariant(word[0]) + word[1..];

    private static string[] ReadEmbedded()
    {
        using var stream = typeof(TextCase).Assembly.GetManifestResourceStream(ResourceName);
        if (stream is null)
        {
            return _defaults;
        }

        try
        {
            var words = JsonSerializer.Deserialize<string[]>(stream) ?? Array.Empty<string>();
            return Merge(_defaults, words).ToArray();
        }
        catch (JsonException)
        {
            return _defaults;
        }
    }
}
