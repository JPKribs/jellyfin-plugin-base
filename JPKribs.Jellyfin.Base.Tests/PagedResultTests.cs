using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>Verifies that <see cref="PagedResult{T}"/> works out its page numbers from the skip and take the page was drawn with.</summary>
public class PagedResultTests
{
    /// <summary>
    /// The page, size, page count, and more flag come from the skip and take.
    /// True: the paginated table knows which page it holds and whether to ask for more.
    /// False: the table would show the wrong page or stop early.
    /// </summary>
    [Fact]
    public void Constructor_ComputesPageMetadataFromSkipTake()
    {
        var r = new PagedResult<int>(new[] { 1, 2, 3 }, totalCount: 25, skip: 10, take: 5);

        Assert.Equal(3, r.Page);
        Assert.Equal(5, r.PageSize);
        Assert.Equal(5, r.TotalPages);
        Assert.True(r.HasMore);
    }

    /// <summary>
    /// The two argument form is one page holding everything.
    /// True: a result that is not paged reports one page and nothing more.
    /// False: it would claim more pages than exist.
    /// </summary>
    [Fact]
    public void Constructor_TwoArguments_IsASinglePage()
    {
        var r = new PagedResult<int>(new[] { 1, 2 }, 2);

        Assert.Equal(1, r.Page);
        Assert.Equal(1, r.TotalPages);
        Assert.False(r.HasMore);
    }

    /// <summary>
    /// A take of zero or less means every item.
    /// True: the page size equals the total and there is one page.
    /// False: a zero page size would divide by zero or report no pages.
    /// </summary>
    [Fact]
    public void Constructor_NonPositiveTake_MeansAll()
    {
        var r = new PagedResult<int>(new[] { 1, 2, 3, 4, 5, 6, 7 }, totalCount: 7, skip: 0, take: 0);

        Assert.Equal(7, r.PageSize);
        Assert.Equal(1, r.Page);
        Assert.Equal(1, r.TotalPages);
        Assert.False(r.HasMore);
    }

    /// <summary>
    /// An empty result has no pages and nothing more.
    /// True: an empty list renders as empty.
    /// False: an empty list would report a page that does not exist.
    /// </summary>
    [Fact]
    public void Constructor_Empty_HasNoPages()
    {
        var r = new PagedResult<int>(System.Array.Empty<int>(), 0);

        Assert.Equal(0, r.TotalPages);
        Assert.Equal(0, r.PageSize);
        Assert.Equal(1, r.Page);
        Assert.False(r.HasMore);
    }
}
