using System;
using System.Collections.Generic;
using System.Linq;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// Turns a filtered collection into a <see cref="PagedResult{T}"/>.
/// </summary>
public static class PagedResultExtensions
{
    /// <summary>
    /// Applies the query's skip and take to a collection that is already filtered, and reports the collection's full count as the total.
    /// </summary>
    /// <remarks>A take of zero or less becomes 50. The skip is not clamped.</remarks>
    /// <typeparam name="T">The item type.</typeparam>
    /// <param name="source">The filtered collection to page.</param>
    /// <param name="query">The paging parameters.</param>
    /// <returns>The requested page with the total count.</returns>
    public static PagedResult<T> ToPagedResult<T>(this IReadOnlyCollection<T> source, PagedQuery query)
    {
        ArgumentNullException.ThrowIfNull(source);
        ArgumentNullException.ThrowIfNull(query);

        var take = query.Take <= 0 ? 50 : query.Take;
        var page = source.Skip(query.Skip).Take(take).ToList();
        return new PagedResult<T>(page, source.Count, query.Skip, take);
    }
}
