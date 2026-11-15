using System;
using System.Collections.Generic;
using System.Linq;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>Verifies that <see cref="PagedResultExtensions"/> turns a filtered collection into the requested page.</summary>
public class PagedResultExtensionsTests
{
    /// <summary>
    /// The skip and take pick the page, and the total is the full count.
    /// True: the table shows the right rows and the right total.
    /// False: the total would be the page size or the rows would be offset.
    /// </summary>
    [Fact]
    public void ToPagedResult_AppliesSkipAndTake_AndReportsFullTotal()
    {
        var source = Enumerable.Range(0, 10).ToList();

        var page = source.ToPagedResult(new PagedQuery { Skip = 2, Take = 3 });

        Assert.Equal(10, page.TotalCount);
        Assert.Equal(new[] { 2, 3, 4 }, page.Items);
    }

    /// <summary>
    /// A take of zero or less becomes fifty.
    /// True: a bad query still returns a bounded page.
    /// False: the query would return everything or nothing.
    /// </summary>
    [Fact]
    public void ToPagedResult_NonPositiveTakeDefaultsToFifty()
    {
        var source = Enumerable.Range(0, 100).ToList();

        var page = source.ToPagedResult(new PagedQuery { Skip = 0, Take = 0 });

        Assert.Equal(50, page.Items.Count);
        Assert.Equal(100, page.TotalCount);
    }

    /// <summary>
    /// The result carries the page number, page count, and more flag.
    /// True: the table can show its position.
    /// False: the page metadata would be left at its defaults.
    /// </summary>
    [Fact]
    public void ToPagedResult_CarriesPageMetadata()
    {
        var source = new List<int>();
        for (var i = 0; i < 100; i++)
        {
            source.Add(i);
        }

        var page = source.ToPagedResult(new PagedQuery { Skip = 20, Take = 10 });

        Assert.Equal(3, page.Page);
        Assert.Equal(10, page.TotalPages);
        Assert.True(page.HasMore);
    }

    /// <summary>
    /// A missing collection or query is rejected.
    /// True: a misuse fails at once.
    /// False: a null would fail inside the paging.
    /// </summary>
    [Fact]
    public void ToPagedResult_RejectsNullArguments()
    {
        IReadOnlyCollection<int> source = new List<int> { 1 };

        Assert.Throws<ArgumentNullException>(() => source.ToPagedResult(null!));
        Assert.Throws<ArgumentNullException>(() => PagedResultExtensions.ToPagedResult<int>(null!, new PagedQuery()));
    }
}
