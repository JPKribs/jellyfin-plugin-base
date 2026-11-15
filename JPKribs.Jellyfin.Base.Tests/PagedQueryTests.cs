using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>Verifies that <see cref="PagedQuery"/> starts at the first page of fifty with no search or filter.</summary>
public class PagedQueryTests
{
    /// <summary>
    /// A new query skips nothing, takes fifty, and has no search or filter.
    /// True: an endpoint that receives no parameters returns the first fifty items.
    /// False: a default query would be empty or unbounded.
    /// </summary>
    [Fact]
    public void NewQuery_HasTheDefaults()
    {
        var query = new PagedQuery();

        Assert.Equal(0, query.Skip);
        Assert.Equal(50, query.Take);
        Assert.Null(query.Search);
        Assert.Null(query.Filter);
    }
}
