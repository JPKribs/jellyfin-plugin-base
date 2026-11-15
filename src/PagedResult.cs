using System.Collections.Generic;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// One page of results plus the total count, in the shape the shared paginated table reads.
/// </summary>
/// <remarks>The skip and take values are not clamped. Each endpoint sets its own upper bound.</remarks>
/// <typeparam name="T">The item type.</typeparam>
public sealed class PagedResult<T>
{
    /// <summary>
    /// Initializes a new instance of the <see cref="PagedResult{T}"/> class for a full result that is not paged.
    /// </summary>
    /// <param name="items">The items on this page.</param>
    /// <param name="totalCount">The total number of items across all pages.</param>
    public PagedResult(IReadOnlyList<T> items, int totalCount)
        : this(items, totalCount, 0, items?.Count ?? 0)
    {
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="PagedResult{T}"/> class, working out the page numbers from the skip and take the page was drawn with.
    /// </summary>
    /// <param name="items">The items on this page.</param>
    /// <param name="totalCount">The total number of items across all pages.</param>
    /// <param name="skip">The number of items skipped before this page.</param>
    /// <param name="take">The page size requested. A value of zero or less means all items.</param>
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

    /// <summary>Gets the page number this result represents, counted from 1.</summary>
    public int Page { get; }

    /// <summary>Gets the page size used for this result.</summary>
    public int PageSize { get; }

    /// <summary>Gets the total number of pages across <see cref="TotalCount"/> at <see cref="PageSize"/>.</summary>
    public int TotalPages { get; }

    /// <summary>Gets a value indicating whether more items exist beyond this page.</summary>
    public bool HasMore { get; }
}
