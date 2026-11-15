using System;
using System.Collections.Generic;
using System.Linq;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// Normalizes string arrays so two lists with the same entries compare equal.
/// </summary>
public static class StringNormalizationUtility
{
    /// <summary>
    /// Collapses <c>null</c>, an empty list, and a list of only blank entries into <c>null</c>.
    /// The other entries are kept in a case insensitive order.
    /// </summary>
    /// <remarks>Blank entries are removed, but the others are not trimmed and duplicates are kept.</remarks>
    /// <param name="source">The entries, or <c>null</c>.</param>
    /// <returns>The sorted non blank entries, or <c>null</c> when there are none.</returns>
    public static string[]? NormalizeStringArray(IReadOnlyList<string>? source)
    {
        if (source == null)
        {
            return null;
        }

        var filtered = source
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .OrderBy(s => s, StringComparer.OrdinalIgnoreCase)
            .ToArray();

        return filtered.Length == 0 ? null : filtered;
    }
}
