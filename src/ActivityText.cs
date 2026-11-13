using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// Wording shared by every activity entry, so entries from every plugin read the same way: a short
/// title case name, such as "12 Items Synced", over one sentence naming where things came from, such as
/// "12 items were synced from source-a (9), source-b (3)". Jellyfin's own entries have no full stops, and
/// these follow them.
/// </summary>
public static class ActivityText
{
    /// <summary>The name of a summary entry, as "1 Item Synced" or "12 Items Synced".</summary>
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

    /// <summary>A count with its noun, as "1 item" or "3 items".</summary>
    /// <param name="count">How many.</param>
    /// <param name="noun">The singular noun.</param>
    /// <returns>The phrase.</returns>
    public static string Count(int count, string noun)
    {
        ArgumentException.ThrowIfNullOrEmpty(noun);
        return string.Create(CultureInfo.InvariantCulture, $"{count} {Plural(count, noun)}");
    }

    /// <summary>"was" for one, "were" for any other count.</summary>
    /// <param name="count">How many.</param>
    /// <returns>The verb.</returns>
    public static string WasOrWere(int count) => count == 1 ? "was" : "were";

    /// <summary>Names with their counts, the largest first, as "source-a (9), source-b (3)".</summary>
    /// <param name="counts">The counts by name.</param>
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

    /// <summary>The text trimmed, with its first letter capitalized and any closing full stop removed.</summary>
    /// <param name="text">The text.</param>
    /// <returns>The sentence, or the text itself when it is blank.</returns>
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

        // The nouns these entries use: item, file, change, user, playlist, entry, request, episode.
        if (noun.Length > 1 && char.ToLowerInvariant(noun[^1]) == 'y' && !"aeiou".Contains(char.ToLowerInvariant(noun[^2]), StringComparison.Ordinal))
        {
            return noun[..^1] + (char.IsUpper(noun[^1]) ? "IES" : "ies");
        }

        return noun + (char.IsUpper(noun[^1]) && noun.All(char.IsUpper) ? "S" : "s");
    }
}
