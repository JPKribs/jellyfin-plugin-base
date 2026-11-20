using System;
using Microsoft.AspNetCore.Http;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>Verifies that <see cref="BasePageScript"/> serves the standalone page script as JavaScript. The JS tests run the script itself.</summary>
public class BasePageScriptTests
{
    /// <summary>
    /// The script is served as JavaScript that is checked again on every load, and sets the BasePage global.
    /// True: a standalone page loads the current script with a script tag.
    /// False: a browser would refuse the script or keep a stale copy.
    /// </summary>
    [Fact]
    public void Serve_AnswersWithTheScriptAsJavaScript()
    {
        var context = new DefaultHttpContext();

        var result = BasePageScript.Serve(context.Response);

        Assert.Equal("text/javascript; charset=utf-8", result.ContentType);
        Assert.Equal("no-cache", context.Response.Headers.CacheControl.ToString());
        Assert.Equal(BasePageScript.Script, result.Content);
        Assert.Contains("BasePage=", BasePageScript.Script, StringComparison.Ordinal);
        Assert.Throws<ArgumentNullException>(() => BasePageScript.Serve(null!));
    }
}
