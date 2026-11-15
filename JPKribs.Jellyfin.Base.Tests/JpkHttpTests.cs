using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using MediaBrowser.Common.Net;
using NSubstitute;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>Verifies that <see cref="JpkHttp"/> reports a status and body without throwing on a network fault, and caps what it reads.</summary>
public class JpkHttpTests
{
    // An address literal, so the default check never asks DNS. It is public, so the guard accepts it.
    private const string Url = "http://203.0.113.10/";

    private sealed class StubHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> _send;

        public StubHandler(Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> send) => _send = send;

        public HttpRequestMessage? LastRequest { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            LastRequest = request;
            return _send(request, cancellationToken);
        }
    }

    private sealed class StallingStream : Stream
    {
        private bool _sent;

        public override bool CanRead => true;

        public override bool CanSeek => false;

        public override bool CanWrite => false;

        public override long Length => throw new NotSupportedException();

        public override long Position { get => throw new NotSupportedException(); set => throw new NotSupportedException(); }

        public override void Flush()
        {
        }

        public override int Read(byte[] buffer, int offset, int count) => throw new NotSupportedException();

        public override async ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken cancellationToken = default)
        {
            if (!_sent)
            {
                _sent = true;
                buffer.Span[0] = (byte)'x';
                return 1;
            }

            await Task.Delay(Timeout.Infinite, cancellationToken).ConfigureAwait(false);
            return 0;
        }

        public override Task<int> ReadAsync(byte[] buffer, int offset, int count, CancellationToken cancellationToken)
            => ReadAsync(buffer.AsMemory(offset, count), cancellationToken).AsTask();

        public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();

        public override void SetLength(long value) => throw new NotSupportedException();

        public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();
    }

    private static IHttpClientFactory Factory(StubHandler handler, TimeSpan? timeout = null)
    {
        var client = new HttpClient(handler);
        if (timeout is { } t)
        {
            client.Timeout = t;
        }

        var factory = Substitute.For<IHttpClientFactory>();
        factory.CreateClient(NamedClient.Default).Returns(client);
        return factory;
    }

    private static Task<HttpResponseMessage> Respond(HttpContent content)
        => Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = content });

    /// <summary>
    /// Cancelling the caller's token throws instead of reporting a timeout.
    /// True: a shutdown stops the caller's work.
    /// False: a cancelled caller carried on as if the server timed out.
    /// </summary>
    [Fact]
    public async Task SendAsync_CallerCancellationThrows()
    {
        var handler = new StubHandler(async (_, ct) =>
        {
            await Task.Delay(Timeout.Infinite, ct).ConfigureAwait(false);
            return new HttpResponseMessage(HttpStatusCode.OK);
        });
        using var cts = new CancellationTokenSource(TimeSpan.FromMilliseconds(100));

        await Assert.ThrowsAnyAsync<OperationCanceledException>(
            () => JpkHttp.SendAsync(Factory(handler), HttpMethod.Get, Url, cts.Token));
    }

    /// <summary>
    /// The client's own timeout, before or after the headers, is still reported as status zero.
    /// True: a slow server never throws out of the helper.
    /// False: a stalled body would hang or throw.
    /// </summary>
    [Fact]
    public async Task SendAsync_TimeoutIsReportedNotThrown()
    {
        var slowHeaders = new StubHandler(async (_, ct) =>
        {
            await Task.Delay(Timeout.Infinite, ct).ConfigureAwait(false);
            return new HttpResponseMessage(HttpStatusCode.OK);
        });
        var result = await JpkHttp.SendAsync(Factory(slowHeaders, TimeSpan.FromMilliseconds(100)), HttpMethod.Get, Url, CancellationToken.None);
        Assert.Equal(0, result.Status);
        Assert.Equal("request timed out", result.Body);

        var stalledBody = new StubHandler((_, _) => Respond(new StreamContent(new StallingStream())));
        result = await JpkHttp.SendAsync(Factory(stalledBody, TimeSpan.FromMilliseconds(200)), HttpMethod.Get, Url, CancellationToken.None);
        Assert.Equal(0, result.Status);
        Assert.Equal("request timed out", result.Body);
    }

    /// <summary>
    /// A body past the cap is not read, whether or not the server sent a length, and a body within it is.
    /// True: a misbehaving server cannot make the plugin buffer an unbounded body.
    /// False: any size was read into memory.
    /// </summary>
    [Fact]
    public async Task SendAsync_CapsTheResponseBody()
    {
        var withLength = new StubHandler((_, _) => Respond(new StringContent(new string('a', 100))));
        var result = await JpkHttp.SendAsync(Factory(withLength), HttpMethod.Get, Url, CancellationToken.None, maxResponseBytes: 10);
        Assert.Equal(0, result.Status);
        Assert.Contains("exceeds 10 bytes", result.Body, StringComparison.Ordinal);

        // Without a Content-Length the stream is cut off while buffering.
        var chunked = new StubHandler((_, _) => Respond(new StreamContent(new NonSeekableStream(new byte[100]))));
        result = await JpkHttp.SendAsync(Factory(chunked), HttpMethod.Get, Url, CancellationToken.None, maxResponseBytes: 10);
        Assert.Equal(0, result.Status);

        var small = new StubHandler((_, _) => Respond(new StringContent("good 1.2.3.4")));
        result = await JpkHttp.SendAsync(Factory(small), HttpMethod.Get, Url, CancellationToken.None);
        Assert.Equal(200, result.Status);
        Assert.Equal("good 1.2.3.4", result.Body);
        Assert.Equal(4L * 1024 * 1024, JpkHttp.DefaultMaxResponseBytes);

        // A cap past what a buffer can hold is the same as no cap.
        result = await JpkHttp.SendAsync(Factory(small), HttpMethod.Get, Url, CancellationToken.None, maxResponseBytes: long.MaxValue);
        Assert.Equal(200, result.Status);
    }

    private sealed class NonSeekableStream : MemoryStream
    {
        public NonSeekableStream(byte[] data)
            : base(data)
        {
        }

        public override bool CanSeek => false;
    }

    /// <summary>
    /// Basic auth credentials are encoded as UTF-8.
    /// True: a password with non-ASCII characters reaches the server intact.
    /// False: each such character would become '?'.
    /// </summary>
    [Fact]
    public async Task SendAsync_BasicAuthIsUtf8()
    {
        var handler = new StubHandler((_, _) => Respond(new StringContent("ok")));
        await JpkHttp.SendAsync(Factory(handler), HttpMethod.Get, Url, CancellationToken.None, login: "jörg", password: "pässwörd€");

        var auth = handler.LastRequest!.Headers.Authorization!;
        Assert.Equal("Basic", auth.Scheme);
        Assert.Equal("jörg:pässwörd€", Encoding.UTF8.GetString(Convert.FromBase64String(auth.Parameter!)));
    }

    /// <summary>
    /// The method, body, content type, custom header, and default user agent all reach the request.
    /// True: a plugin can post JSON with its own headers.
    /// False: a part of the request would be dropped or altered.
    /// </summary>
    [Fact]
    public async Task SendAsync_SendsMethodBodyContentTypeHeadersAndUserAgent()
    {
        HttpMethod? method = null;
        string? sentBody = null;
        string? sentType = null;
        string? sentHeader = null;
        string? sentAgent = null;
        var handler = new StubHandler(async (request, ct) =>
        {
            method = request.Method;
            sentBody = await request.Content!.ReadAsStringAsync(ct);
            sentType = request.Content.Headers.ContentType!.MediaType;
            sentHeader = string.Join(",", request.Headers.GetValues("X-Test"));
            sentAgent = request.Headers.UserAgent.ToString();
            return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("ok") };
        });

        var result = await JpkHttp.SendAsync(
            Factory(handler),
            HttpMethod.Post,
            Url,
            CancellationToken.None,
            headers: new[] { new KeyValuePair<string, string>("X-Test", "yes") },
            body: "{}",
            contentType: "application/json");

        Assert.Equal(200, result.Status);
        Assert.Equal(HttpMethod.Post, method);
        Assert.Equal("{}", sentBody);
        Assert.Equal("application/json", sentType);
        Assert.Equal("yes", sentHeader);
        Assert.Equal("jellyfin-plugin/1.0", sentAgent);
    }

    /// <summary>
    /// An error status and its body are returned as they are, and a network fault becomes status zero with its message.
    /// True: a caller reads failures from the result and never has to catch.
    /// False: a 404 would be hidden or a fault would throw.
    /// </summary>
    [Fact]
    public async Task SendAsync_ReturnsErrorStatusesAndReportsNetworkFaults()
    {
        var notFound = new StubHandler((_, _) => Task.FromResult(new HttpResponseMessage(HttpStatusCode.NotFound) { Content = new StringContent("nope") }));
        var result = await JpkHttp.SendAsync(Factory(notFound), HttpMethod.Get, Url, CancellationToken.None);
        Assert.Equal(404, result.Status);
        Assert.Equal("nope", result.Body);
        Assert.False(result.Ok);

        var faulted = new StubHandler((_, _) => throw new HttpRequestException("boom"));
        result = await JpkHttp.SendAsync(Factory(faulted), HttpMethod.Get, Url, CancellationToken.None);
        Assert.Equal(0, result.Status);
        Assert.Equal("boom", result.Body);
    }

    /// <summary>
    /// A missing client factory or a response cap of zero or less is rejected.
    /// True: a misuse fails at once.
    /// False: a zero cap would refuse every body.
    /// </summary>
    [Fact]
    public async Task SendAsync_RejectsBadArguments()
    {
        await Assert.ThrowsAsync<ArgumentNullException>(() => JpkHttp.SendAsync(null!, HttpMethod.Get, Url, CancellationToken.None));
        await Assert.ThrowsAsync<ArgumentOutOfRangeException>(() => JpkHttp.SendAsync(Factory(new StubHandler((_, _) => Respond(new StringContent("x")))), HttpMethod.Get, Url, CancellationToken.None, maxResponseBytes: 0));
    }

    /// <summary>
    /// The first whitespace delimited token of a body is returned.
    /// True: a dyndns style reply such as "good 1.2.3.4" yields its status word.
    /// False: leading whitespace or an empty body would give a wrong token.
    /// </summary>
    [Theory]
    [InlineData("1.2.3.4 good", "1.2.3.4")]
    [InlineData("  spaced\tlater", "spaced")]
    [InlineData("\nleading", "leading")]
    [InlineData("", "")]
    [InlineData("   ", "")]
    public void FirstToken_ReturnsLeadingToken(string body, string expected)
    {
        Assert.Equal(expected, JpkHttp.FirstToken(body));
    }

    /// <summary>
    /// The first line of a body is returned, trimmed.
    /// True: a multi line reply yields its first line.
    /// False: the later lines or the surrounding space would come with it.
    /// </summary>
    [Theory]
    [InlineData("first\nsecond", "first")]
    [InlineData("  only  ", "only")]
    [InlineData("no newline", "no newline")]
    public void FirstLine_ReturnsFirstLineTrimmed(string body, string expected)
    {
        Assert.Equal(expected, JpkHttp.FirstLine(body));
    }

    /// <summary>
    /// A name the resolver rejects, a URL with user info, and a reserved target are refused with status zero and never throw, and none is transient.
    /// True: a refusal is data a caller can read and never retries.
    /// False: a resolver exception would escape the helper, or a refusal would look transient.
    /// </summary>
    [Fact]
    public async Task SendAsync_RefusalsReturnStatusZeroWithoutThrowing()
    {
        var handler = new StubHandler((_, _) => throw new InvalidOperationException("must not send"));
        var broken = new SsrfGuard(false, (_, _) => throw new ArgumentException("bad host"));

        var resolver = await JpkHttp.SendAsync(Factory(handler), HttpMethod.Get, "http://odd.test/", CancellationToken.None, guard: broken);
        var userInfo = await JpkHttp.SendAsync(Factory(handler), HttpMethod.Get, "http://user@203.0.113.10/", CancellationToken.None);
        var reserved = await JpkHttp.SendAsync(Factory(handler), HttpMethod.Get, "http://240.0.0.1/", CancellationToken.None);

        foreach (var result in new[] { resolver, userInfo, reserved })
        {
            Assert.Equal(0, result.Status);
            Assert.True(result.IsRefused);
            Assert.False(result.IsTransient);
        }
    }
}
