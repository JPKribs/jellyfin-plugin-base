using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>Verifies that <see cref="HttpResult"/> carries a status and body and reports whether the status is a success.</summary>
public class HttpResultTests
{
    /// <summary>
    /// Only a status from 200 to 299 is a success.
    /// True: Ok tells a 2xx reply from a failure and from a request that never completed.
    /// False: a redirect, an error, or status zero would count as success.
    /// </summary>
    [Theory]
    [InlineData(200, true)]
    [InlineData(204, true)]
    [InlineData(299, true)]
    [InlineData(0, false)]
    [InlineData(199, false)]
    [InlineData(300, false)]
    [InlineData(404, false)]
    [InlineData(500, false)]
    public void Ok_IsTrueOnlyForTwoHundredRange(int status, bool expected)
        => Assert.Equal(expected, new HttpResult(status, "body").Ok);

    /// <summary>
    /// The status and body are kept, and a null body becomes an empty string.
    /// True: a caller never has to check the body for null.
    /// False: a null body would reach the caller.
    /// </summary>
    [Fact]
    public void Constructor_KeepsStatusAndBodyAndNormalizesNull()
    {
        var result = new HttpResult(201, "created");
        var empty = new HttpResult(0, null!);

        Assert.Equal(201, result.Status);
        Assert.Equal("created", result.Body);
        Assert.Equal(string.Empty, empty.Body);
    }

    /// <summary>
    /// A request that never completed, a timeout, throttling, and any server error are transient, and other statuses are not.
    /// True: a caller can decide to ask again from the result alone.
    /// False: a 404 would be retried, or a failed request would not.
    /// </summary>
    [Theory]
    [InlineData(0, true)]
    [InlineData(200, false)]
    [InlineData(204, false)]
    [InlineData(301, false)]
    [InlineData(400, false)]
    [InlineData(404, false)]
    [InlineData(407, false)]
    [InlineData(408, true)]
    [InlineData(409, false)]
    [InlineData(429, true)]
    [InlineData(499, false)]
    [InlineData(500, true)]
    [InlineData(503, true)]
    [InlineData(599, true)]
    public void IsTransient_IsTrueForStatusZeroTimeoutThrottlingAndServerErrors(int status, bool expected)
        => Assert.Equal(expected, new HttpResult(status, string.Empty).IsTransient);

    /// <summary>
    /// A refusal and an oversize body have status zero but are not transient, while a real network failure and a timeout still are.
    /// True: a caller that retries on IsTransient never retries a permanent refusal.
    /// False: an SSRF refusal or an oversize body would be asked for again.
    /// </summary>
    [Fact]
    public void IsTransient_IsFalseForRefusalAndOversizeButTrueForNetworkFailure()
    {
        var refused = new HttpResult(0, SsrfGuard.RefusalPrefix + "loopback addresses are not allowed");
        var oversize = new HttpResult(0, HttpResult.OversizePrefix + "10 bytes");

        Assert.True(refused.IsRefused);
        Assert.False(refused.IsOversize);
        Assert.False(refused.IsTransient);
        Assert.True(oversize.IsOversize);
        Assert.False(oversize.IsRefused);
        Assert.False(oversize.IsTransient);
        Assert.True(new HttpResult(0, "boom").IsTransient);
        Assert.True(new HttpResult(0, "request timed out").IsTransient);
        Assert.False(new HttpResult(0, "boom").IsRefused);
        Assert.False(new HttpResult(403, SsrfGuard.RefusalPrefix + "x").IsRefused);
    }
}
