using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// Wording shared by every activity entry, so entries from every plugin read the same way.
/// <see cref="SummaryName"/>, <see cref="Count"/>, and <see cref="WasOrWere"/> write English only. An entry in the
/// server's language is built from keys through <see cref="ActivityOutcome"/> and <see cref="BaseTranslations"/>.
/// </summary>
/// <remarks>
/// Entries carry no closing full stop, following Jellyfin's own. Counts are formatted with the invariant culture.
/// Plural nouns are made by adding <c>s</c>, by turning a consonant and <c>y</c> into <c>ies</c>, and by adding <c>S</c> to an all capitals noun.
/// A noun such as <c>class</c> or <c>match</c> comes out wrong.
/// </remarks>
public static class ActivityText
{
    /// <summary>Builds the English name of a summary entry, such as "1 Item Synced" or "12 Items Synced".</summary>
    /// <param name="count">How many.</param>
    /// <param name="outcome">What happened, in title case, such as "Synced" or "Not Synced".</param>
    /// <param name="noun">The singular noun, in title case. "Item" by default.</param>
    /// <returns>The name.</returns>
    public static string SummaryName(int count, string outcome, string noun = "Item")
    {
        ArgumentException.ThrowIfNullOrEmpty(outcome);
        ArgumentException.ThrowIfNullOrEmpty(noun);
        return string.Create(CultureInfo.InvariantCulture, $"{count} {Plural(count, noun)} {outcome}");
    }

    /// <summary>Builds a count with its English noun, such as "1 item" or "3 items".</summary>
    /// <remarks>Despite the name it returns text, not a number.</remarks>
    /// <param name="count">How many.</param>
    /// <param name="noun">The singular noun.</param>
    /// <returns>The phrase.</returns>
    public static string Count(int count, string noun)
    {
        ArgumentException.ThrowIfNullOrEmpty(noun);
        return string.Create(CultureInfo.InvariantCulture, $"{count} {Plural(count, noun)}");
    }

    /// <summary>Gives the English "was" for one and "were" for any other count.</summary>
    /// <param name="count">How many.</param>
    /// <returns>The verb.</returns>
    public static string WasOrWere(int count) => count == 1 ? "was" : "were";

    /// <summary>Lists names with their counts, the largest first, such as "source-a (9), source-b (3)".</summary>
    /// <param name="counts">The counts by name. A count of zero or less is left out, and equal counts sort by name.</param>
    /// <returns>The list, or an empty string when there is nothing to list.</returns>
    public static string CountedList(IReadOnlyDictionary<string, int> counts)
    {
        ArgumentNullException.ThrowIfNull(counts);
        return string.Join(", ", counts
            .Where(p => p.Value > 0)
            .OrderByDescending(p => p.Value)
            .ThenBy(p => p.Key, StringComparer.Ordinal)
            .Select(p => string.Create(CultureInfo.InvariantCulture, $"{p.Key} ({p.Value})")));
    }

    /// <summary>Trims the text, capitalizes its first letter, and removes its trailing full stops.</summary>
    /// <param name="text">The text.</param>
    /// <returns>The sentence, or the text itself when it is <c>null</c> or blank.</returns>
    public static string? Sentence(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return text;
        }

        var trimmed = text.Trim().TrimEnd('.');
        return trimmed.Length == 0 ? trimmed : char.ToUpperInvariant(trimmed[0]) + trimmed[1..];
    }

    private static string Plural(int count, string noun)
    {
        if (count == 1)
        {
            return noun;
        }

        // These rules cover the nouns the entries use, such as item, file, user, entry, and episode.
        if (noun.Length > 1 && char.ToLowerInvariant(noun[^1]) == 'y' && !"aeiou".Contains(char.ToLowerInvariant(noun[^2]), StringComparison.Ordinal))
        {
            return noun[..^1] + (char.IsUpper(noun[^1]) ? "IES" : "ies");
        }

        return noun + (char.IsUpper(noun[^1]) && noun.All(char.IsUpper) ? "S" : "s");
    }
}
