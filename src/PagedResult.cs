using System;
using System.Collections.Generic;
using System.Linq;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// A single page of results plus the total count, matching the shape the shared paginated table reads.
/// </summary>
/// <typeparam name="T">The item type.</typeparam>
public sealed class PagedResult<T>
{
    /// <summary>
    /// Initializes a new instance of the <see cref="PagedResult{T}"/> class.
    /// </summary>
    /// <param name="items">The items on this page.</param>
    /// <param name="totalCount">The total number of items across all pages.</param>
    public PagedResult(IReadOnlyList<T> items, int totalCount)
    {
        Items = items;
        TotalCount = totalCount;
    }

    /// <summary>Gets the items on this page.</summary>
    public IReadOnlyList<T> Items { get; }

    /// <summary>Gets the total number of items across all pages.</summary>
    public int TotalCount { get; }
}

/// <summary>
/// The paging and search parameters a list endpoint receives from the shared paginated table.
/// </summary>
public sealed class PagedQuery
{
    /// <summary>Gets or sets the number of items to skip.</summary>
    public int Skip { get; set; }

    /// <summary>Gets or sets the number of items to take. Values of zero or less default to fifty.</summary>
    public int Take { get; set; } = 50;

    /// <summary>Gets or sets the optional search term.</summary>
    public string? Search { get; set; }

    /// <summary>Gets or sets the optional filter value.</summary>
    public string? Filter { get; set; }
}

/// <summary>
/// Helpers for turning a filtered collection into a <see cref="PagedResult{T}"/>.
/// </summary>
public static class PagedResultExtensions
{
    /// <summary>
    /// Applies the query's skip and take to an already filtered collection and reports its full count as the total.
    /// </summary>
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
        return new PagedResult<T>(page, source.Count);
    }
}
