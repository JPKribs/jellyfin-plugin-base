using System;
using System.Globalization;
using MediaBrowser.Controller.Entities;
using MediaBrowser.Controller.Entities.TV;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// Names a library item the way Jellyfin does in its own lists: an episode by its series and number, a
/// season by its series and season, anything else by its name. "Season 1" or "Pilot" alone names nothing.
/// </summary>
public static class ItemTitles
{
    /// <summary>The item's title, as "The Show S01E02", "The Show Season 1", or "Only A (2021)".</summary>
    /// <param name="item">The item.</param>
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

    /// <summary>The title with an episode's own name after it, as "The Show S01E02 - Pilot".</summary>
    /// <param name="item">The item.</param>
    /// <returns>The line.</returns>
    public static string LineOf(BaseItem item)
    {
        ArgumentNullException.ThrowIfNull(item);
        return item is Episode episode && EpisodeCode(episode) is not null && !string.IsNullOrEmpty(episode.SeriesName)
            ? $"{TitleOf(item)} - {item.Name}"
            : TitleOf(item);
    }

    /// <summary>An episode's season and number, as S01E02, or null when either is unknown.</summary>
    /// <param name="episode">The episode.</param>
    /// <returns>The code.</returns>
    public static string? EpisodeCode(Episode episode)
    {
        ArgumentNullException.ThrowIfNull(episode);
        return episode.ParentIndexNumber.HasValue && episode.IndexNumber.HasValue
            ? string.Format(CultureInfo.InvariantCulture, "S{0:D2}E{1:D2}", episode.ParentIndexNumber.Value, episode.IndexNumber.Value)
            : null;
    }
}
