using System.Collections.Generic;
using System.Linq;
using JPKribs.Jellyfin.Base;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>Tests for <see cref="PagedResultExtensions.ToPagedResult{T}"/>.</summary>
public class PagedResultTests
{
    [Fact]
    public void ToPagedResult_AppliesSkipAndTake_AndReportsFullTotal()
    {
        var source = Enumerable.Range(0, 10).ToList();
        var page = source.ToPagedResult(new PagedQuery { Skip = 2, Take = 3 });

        Assert.Equal(10, page.TotalCount);
        Assert.Equal(new[] { 2, 3, 4 }, page.Items);
    }

    [Fact]
    public void ToPagedResult_NonPositiveTakeDefaultsToFifty()
    {
        var source = Enumerable.Range(0, 100).ToList();
        var page = source.ToPagedResult(new PagedQuery { Skip = 0, Take = 0 });

        Assert.Equal(50, page.Items.Count);
        Assert.Equal(100, page.TotalCount);
    }
}
