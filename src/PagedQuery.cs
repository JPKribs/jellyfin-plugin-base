namespace JPKribs.Jellyfin.Base;

/// <summary>
/// The paging and search parameters a list endpoint receives from the shared paginated table.
/// </summary>
/// <remarks>The package carries <see cref="Search"/> and <see cref="Filter"/> but never applies them. The endpoint does.</remarks>
public sealed class PagedQuery
{
    /// <summary>Gets or sets the number of items to skip.</summary>
    public int Skip { get; set; }

    /// <summary>Gets or sets the number of items to take. A value of zero or less means fifty when the query is paged by <see cref="PagedResultExtensions.ToPagedResult{T}"/>.</summary>
    public int Take { get; set; } = 50;

    /// <summary>Gets or sets the search term, or <c>null</c> for none.</summary>
    public string? Search { get; set; }

    /// <summary>Gets or sets the filter value, or <c>null</c> for none.</summary>
    public string? Filter { get; set; }
}
