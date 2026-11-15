using System;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>
/// Tests that <see cref="RedirectRefusingHandler"/> stops at every redirect and names where it pointed, so credentials never follow one to another host.
/// </summary>
public sealed class RedirectRefusingHandlerTests
{
    /// <summary>
    /// Every redirect status with a location is refused, and the error carries that status.
    /// True: a permanent, temporary, or method keeping redirect is stopped.
    /// False: a 307 or 308, which resends the body and headers, would carry a key to the new host.
    /// </summary>
    [Theory]
    [InlineData(300)]
    [InlineData(301)]
    [InlineData(303)]
    [InlineData(307)]
    [InlineData(308)]
    [InlineData(399)]
    public async Task SendAsync_AnyRedirectStatus_Throws(int status)
    {
        using var invoker = Invoker(_ => Redirect(status, "https://elsewhere.example/landing"));
        using var request = new HttpRequestMessage(HttpMethod.Post, "https://peer.example/api");

        var failure = await Assert.ThrowsAsync<HttpRequestException>(() => invoker.SendAsync(request, CancellationToken.None));

        Assert.Equal((HttpStatusCode)status, failure.StatusCode);
    }

    /// <summary>
    /// A relative location is resolved against the request, the query is left out, and the message ends with the advice.
    /// True: the reader learns the address to use, and a token in the query never reaches a log.
    /// False: a relative redirect would be reported as a bare path that names no server.
    /// </summary>
    [Fact]
    public async Task SendAsync_RelativeLocation_NamesBothEndsAndTheAdvice()
    {
        using var invoker = Invoker(_ => Redirect(302, "/jellyfin/System/Info?token=abc"));
        using var request = new HttpRequestMessage(HttpMethod.Get, "https://peer.example:8920/System/Info");

        var failure = await Assert.ThrowsAsync<HttpRequestException>(() => invoker.SendAsync(request, CancellationToken.None));

        Assert.Equal(
            "The server at https://peer.example:8920 redirected to https://peer.example:8920/jellyfin/System/Info, and redirects are not followed. " + RedirectRefusingHandler.DefaultAdvice,
            failure.Message);
        Assert.DoesNotContain("token=abc", failure.Message, StringComparison.Ordinal);
    }

    /// <summary>
    /// A caller's own advice replaces the default.
    /// True: a plugin tells its reader which setting to change.
    /// False: every plugin shows the same generic advice.
    /// </summary>
    [Fact]
    public async Task SendAsync_CustomAdvice_EndsTheMessage()
    {
        using var invoker = new HttpMessageInvoker(new RedirectRefusingHandler(new StubHandler(_ => Redirect(301, "https://new.example/")), "Set the Server URL to the new address."));
        using var request = new HttpRequestMessage(HttpMethod.Get, "https://old.example/");

        var failure = await Assert.ThrowsAsync<HttpRequestException>(() => invoker.SendAsync(request, CancellationToken.None));

        Assert.EndsWith("Set the Server URL to the new address.", failure.Message, StringComparison.Ordinal);
    }

    /// <summary>
    /// An answer that is not a redirect, or a 3xx without a location, passes through as it is.
    /// True: a 304, a 400, and a success all reach the caller.
    /// False: ordinary answers would be turned into redirect errors.
    /// </summary>
    [Theory]
    [InlineData(200, false)]
    [InlineData(299, true)]
    [InlineData(304, false)]
    [InlineData(400, true)]
    [InlineData(500, true)]
    public async Task SendAsync_NotARedirectToFollow_PassesTheAnswerThrough(int status, bool withLocation)
    {
        using var invoker = Invoker(_ => withLocation ? Redirect(status, "https://elsewhere.example/") : new HttpResponseMessage((HttpStatusCode)status));
        using var request = new HttpRequestMessage(HttpMethod.Get, "https://peer.example/");

        using var response = await invoker.SendAsync(request, CancellationToken.None);

        Assert.Equal((HttpStatusCode)status, response.StatusCode);
    }

    /// <summary>
    /// A refused redirect is sent once, and nothing goes to the address it pointed to.
    /// True: the other host never sees the request.
    /// False: the handler would follow the redirect before refusing it.
    /// </summary>
    [Fact]
    public async Task SendAsync_Redirect_SendsNothingFurther()
    {
        var inner = new StubHandler(_ => Redirect(302, "https://elsewhere.example/"));
        using var invoker = new HttpMessageInvoker(new RedirectRefusingHandler(inner));
        using var request = new HttpRequestMessage(HttpMethod.Get, "https://peer.example/");

        await Assert.ThrowsAsync<HttpRequestException>(() => invoker.SendAsync(request, CancellationToken.None));

        Assert.Equal(1, inner.Requests);
    }

    private static HttpMessageInvoker Invoker(Func<HttpRequestMessage, HttpResponseMessage> answer)
        => new(new RedirectRefusingHandler(new StubHandler(answer)));

    private static HttpResponseMessage Redirect(int status, string location)
    {
        var response = new HttpResponseMessage((HttpStatusCode)status);
        response.Headers.Location = new Uri(location, UriKind.RelativeOrAbsolute);
        return response;
    }

    private sealed class StubHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, HttpResponseMessage> _answer;

        public StubHandler(Func<HttpRequestMessage, HttpResponseMessage> answer) => _answer = answer;

        public int Requests { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Requests++;
            return Task.FromResult(_answer(request));
        }
    }
}
