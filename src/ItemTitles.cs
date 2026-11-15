using System;
using System.Globalization;
using MediaBrowser.Controller.Entities;
using MediaBrowser.Controller.Entities.TV;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// Names a library item the way Jellyfin does in its own lists.
/// An episode is named by its series and number, a season by its series and season, and anything else by its name.
/// </summary>
public static class ItemTitles
{
    /// <summary>Builds the item's title, such as "The Show S01E02", "The Show Season 1", or "Only A (2021)".</summary>
    /// <remarks>An episode or season with no series name falls back to its own name, and an episode with no season or number leaves out the code.</remarks>
    /// <param name="item">The library item to name.</param>
    /// <returns>The title.</returns>
    public static string TitleOf(BaseItem item)
    {
        ArgumentNullException.ThrowIfNull(item);
        if (item is Episode episode)
        {
            var series = string.IsNullOrEmpty(episode.SeriesName) ? null : episode.SeriesName;
            var code = EpisodeCode(episode);
            return series is null ? (code is null ? item.Name : $"{code} {item.Name}") : (code is null ? $"{series} {item.Name}" : $"{series} {code}");
        }

        if (item is Season season && !string.IsNullOrEmpty(season.SeriesName))
        {
            return $"{season.SeriesName} {item.Name}";
        }

        return item.Name;
    }

    /// <summary>Builds the title with an episode's own name after it, such as "The Show S01E02 - Pilot".</summary>
    /// <param name="item">The library item to name.</param>
    /// <returns>The line, which is the plain title for any item that is not an episode with a series name and a code.</returns>
    public static string LineOf(BaseItem item)
    {
        ArgumentNullException.ThrowIfNull(item);
        return item is Episode episode && EpisodeCode(episode) is not null && !string.IsNullOrEmpty(episode.SeriesName)
            ? $"{TitleOf(item)} - {item.Name}"
            : TitleOf(item);
    }

    /// <summary>Builds an episode's season and number code, such as S01E02.</summary>
    /// <param name="episode">The episode to code.</param>
    /// <returns>The code, or <c>null</c> when either the season or the number is unknown.</returns>
    public static string? EpisodeCode(Episode episode)
    {
        ArgumentNullException.ThrowIfNull(episode);
        return episode.ParentIndexNumber.HasValue && episode.IndexNumber.HasValue
            ? string.Format(CultureInfo.InvariantCulture, "S{0:D2}E{1:D2}", episode.ParentIndexNumber.Value, episode.IndexNumber.Value)
            : null;
    }
}
