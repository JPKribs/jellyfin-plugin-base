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
    /// Initializes a new instance of the <see cref="PagedResult{T}"/> class for a non-paged full result.
    /// </summary>
    /// <param name="items">The items on this page.</param>
    /// <param name="totalCount">The total number of items across all pages.</param>
    public PagedResult(IReadOnlyList<T> items, int totalCount)
        : this(items, totalCount, 0, items?.Count ?? 0)
    {
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="PagedResult{T}"/> class, computing the page metadata
    /// from the skip/take window the page was drawn with.
    /// </summary>
    /// <param name="items">The items on this page.</param>
    /// <param name="totalCount">The total number of items across all pages.</param>
    /// <param name="skip">The number of items skipped before this page.</param>
    /// <param name="take">The page size requested; values of zero or less mean "all".</param>
    public PagedResult(IReadOnlyList<T> items, int totalCount, int skip, int take)
    {
        Items = items;
        TotalCount = totalCount;

        var pageSize = take <= 0 ? totalCount : take;
        PageSize = pageSize;
        Page = pageSize > 0 ? (skip / pageSize) + 1 : 1;
        TotalPages = pageSize > 0 ? (totalCount + pageSize - 1) / pageSize : 0;
        HasMore = skip + (items?.Count ?? 0) < totalCount;
    }

    /// <summary>Gets the items on this page.</summary>
    public IReadOnlyList<T> Items { get; }

    /// <summary>Gets the total number of items across all pages.</summary>
    public int TotalCount { get; }

    /// <summary>Gets the 1-based page number this result represents.</summary>
    public int Page { get; }

    /// <summary>Gets the page size used for this result.</summary>
    public int PageSize { get; }

    /// <summary>Gets the total number of pages across <see cref="TotalCount"/> at <see cref="PageSize"/>.</summary>
    public int TotalPages { get; }

    /// <summary>Gets a value indicating whether more items exist beyond this page.</summary>
    public bool HasMore { get; }
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
        return new PagedResult<T>(page, source.Count, query.Skip, take);
    }
}
