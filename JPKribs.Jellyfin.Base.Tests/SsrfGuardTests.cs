using System;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>
/// Tests that <see cref="SsrfGuard"/> refuses every address range a request must never reach, allows public
/// addresses, checks the address again at connect time, and never follows a redirect to another host.
/// </summary>
public class SsrfGuardTests
{
    private static readonly IPAddress[] Public = { IPAddress.Parse("93.184.216.34") };

    /// <summary>
    /// Loopback, private, carrier grade NAT, and unique local addresses are refused unless private networks are allowed.
    /// True: a plugin that never opts in cannot reach an internal service.
    /// False: an internal address would pass as public.
    /// </summary>
    [Theory]
    [InlineData("127.0.0.1")]
    [InlineData("127.255.255.254")]
    [InlineData("::1")]
    [InlineData("10.0.0.1")]
    [InlineData("10.255.255.255")]
    [InlineData("172.16.0.1")]
    [InlineData("172.31.255.255")]
    [InlineData("192.168.1.1")]
    [InlineData("100.64.0.1")]
    [InlineData("100.127.255.255")]
    [InlineData("fc00::1")]
    [InlineData("fd12:3456::1")]
    [InlineData("::ffff:127.0.0.1")]
    [InlineData("::ffff:10.1.2.3")]
    public void Classify_PrivateRanges_RefusedUnlessPrivateAllowed(string address)
    {
        var ip = IPAddress.Parse(address);

        Assert.NotNull(SsrfGuard.Classify(ip, allowPrivateNetwork: false));
        Assert.Null(SsrfGuard.Classify(ip, allowPrivateNetwork: true));
    }

    /// <summary>
    /// Link local, unspecified, multicast, and broadcast addresses are refused even when private networks are allowed.
    /// True: the cloud metadata address is never reachable.
    /// False: allowing private networks would also open the metadata address.
    /// </summary>
    [Theory]
    [InlineData("169.254.169.254")]
    [InlineData("169.254.0.1")]
    [InlineData("fe80::1")]
    [InlineData("fec0::1")]
    [InlineData("0.0.0.0")]
    [InlineData("0.1.2.3")]
    [InlineData("::")]
    [InlineData("224.0.0.1")]
    [InlineData("239.255.255.255")]
    [InlineData("ff02::1")]
    [InlineData("255.255.255.255")]
    [InlineData("240.0.0.1")]
    [InlineData("::ffff:169.254.169.254")]
    [InlineData("::ffff:0.0.0.0")]
    [InlineData("::ffff:255.255.255.255")]
    [InlineData("64:ff9b::a9fe:a9fe")]
    [InlineData("::169.254.169.254")]
    [InlineData("2002:a9fe:a9fe::1")]
    public void Classify_NeverAllowedRanges_RefusedEvenWhenPrivateAllowed(string address)
    {
        var ip = IPAddress.Parse(address);

        Assert.NotNull(SsrfGuard.Classify(ip, allowPrivateNetwork: false));
        Assert.NotNull(SsrfGuard.Classify(ip, allowPrivateNetwork: true));
    }

    /// <summary>
    /// Public addresses are allowed with or without private networks.
    /// True: ordinary internet targets always work.
    /// False: a public address would be refused.
    /// </summary>
    [Theory]
    [InlineData("93.184.216.34")]
    [InlineData("8.8.8.8")]
    [InlineData("1.1.1.1")]
    [InlineData("172.15.255.255")]
    [InlineData("172.32.0.1")]
    [InlineData("100.63.255.255")]
    [InlineData("100.128.0.1")]
    [InlineData("192.169.0.1")]
    [InlineData("2606:4700:4700::1111")]
    [InlineData("::ffff:8.8.8.8")]
    [InlineData("64:ff9b::808:808")]
    public void Classify_PublicAddress_AllowedEitherWay(string address)
    {
        var ip = IPAddress.Parse(address);

        Assert.Null(SsrfGuard.Classify(ip, allowPrivateNetwork: false));
        Assert.Null(SsrfGuard.Classify(ip, allowPrivateNetwork: true));
    }

    /// <summary>
    /// A missing address is rejected.
    /// True: a misuse fails at once.
    /// False: a null would fail later with a less useful error.
    /// </summary>
    [Fact]
    public void Classify_NullAddress_Throws()
    {
        Assert.Throws<ArgumentNullException>(() => SsrfGuard.Classify(null!, false));
    }

    /// <summary>
    /// The public only and private network allowed presets classify loopback as their name says.
    /// True: each preset does what its name promises.
    /// False: a preset would allow or refuse the wrong addresses.
    /// </summary>
    [Fact]
    public void Presets_HaveTheirPrivateNetworkSetting()
    {
        Assert.False(SsrfGuard.PublicOnly.AllowPrivateNetwork);
        Assert.True(SsrfGuard.PrivateNetworkAllowed.AllowPrivateNetwork);
        Assert.NotNull(SsrfGuard.PublicOnly.ClassifyAddress(IPAddress.Loopback));
        Assert.Null(SsrfGuard.PrivateNetworkAllowed.ClassifyAddress(IPAddress.Loopback));
    }

    /// <summary>
    /// A public http or https URL is accepted.
    /// True: normal requests are not blocked.
    /// False: a valid public URL would be refused.
    /// </summary>
    [Theory]
    [InlineData("https://93.184.216.34/path?x=1")]
    [InlineData("http://example.com/")]
    [InlineData("https://[2606:4700:4700::1111]/")]
    public void ValidateUrl_PublicTarget_Accepted(string url)
    {
        Assert.Null(SsrfGuard.PublicOnly.ValidateUrl(url));
    }

    /// <summary>
    /// A URL that is not absolute, or that is not http or https, is refused.
    /// True: a file or ftp URL cannot be fetched.
    /// False: an unsafe scheme would pass.
    /// </summary>
    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("/relative/path")]
    [InlineData("not a url")]
    [InlineData("ftp://example.com/file")]
    [InlineData("file:///etc/passwd")]
    [InlineData("gopher://example.com/")]
    [InlineData("javascript:alert(1)")]
    public void ValidateUrl_BadShapeOrScheme_Refused(string url)
    {
        Assert.NotNull(SsrfGuard.PrivateNetworkAllowed.ValidateUrl(url));
    }

    /// <summary>
    /// A URL with a user name or password is refused.
    /// True: credentials cannot hide a real host from a check.
    /// False: a URL such as http://good@evil/ would pass.
    /// </summary>
    [Theory]
    [InlineData("http://user@example.com/")]
    [InlineData("http://user:pass@example.com/")]
    [InlineData("https://example.com@127.0.0.1/")]
    [InlineData("http://8.8.8.8@127.0.0.1/")]
    [InlineData("http://:pass@example.com/")]
    public void ValidateUrl_UserInfo_Refused(string url)
    {
        var error = SsrfGuard.PrivateNetworkAllowed.ValidateUrl(url);

        Assert.NotNull(error);
        Assert.Contains("user name or password", error, StringComparison.Ordinal);
    }

    /// <summary>
    /// A URL whose host is a private address is refused unless private networks are allowed.
    /// True: an internal literal address is blocked by default.
    /// False: a private literal address would be fetched.
    /// </summary>
    [Theory]
    [InlineData("http://127.0.0.1/")]
    [InlineData("http://127.0.0.1:8096/")]
    [InlineData("http://10.0.0.5/")]
    [InlineData("http://192.168.0.10/")]
    [InlineData("http://[::1]/")]
    [InlineData("http://[::ffff:127.0.0.1]/")]
    [InlineData("http://[fd00::1]/")]
    [InlineData("http://2130706433/")]
    [InlineData("http://0x7f.0.0.1/")]
    [InlineData("http://017700000001/")]
    [InlineData("http://127.1/")]
    public void ValidateUrl_PrivateLiteral_RefusedUnlessAllowed(string url)
    {
        Assert.NotNull(SsrfGuard.PublicOnly.ValidateUrl(url));
        Assert.Null(SsrfGuard.PrivateNetworkAllowed.ValidateUrl(url));
    }

    /// <summary>
    /// A URL whose host is a never allowed address is refused even when private networks are allowed.
    /// True: the metadata address stays blocked.
    /// False: allowing private networks would open it.
    /// </summary>
    [Theory]
    [InlineData("http://169.254.169.254/latest/meta-data/")]
    [InlineData("http://[fe80::1]/")]
    [InlineData("http://0.0.0.0/")]
    [InlineData("http://[::]/")]
    [InlineData("http://224.0.0.1/")]
    [InlineData("http://255.255.255.255/")]
    [InlineData("http://[::ffff:169.254.169.254]/")]
    [InlineData("http://2852039166/")]
    public void ValidateUrl_AlwaysBlockedLiteral_RefusedEvenWhenPrivateAllowed(string url)
    {
        Assert.NotNull(SsrfGuard.PublicOnly.ValidateUrl(url));
        Assert.NotNull(SsrfGuard.PrivateNetworkAllowed.ValidateUrl(url));
    }

    /// <summary>
    /// A name that resolves to a public address is accepted.
    /// True: normal hosts work.
    /// False: a public name would be refused.
    /// </summary>
    [Fact]
    public async Task ValidateUrlAsync_NameResolvesToPublic_Accepted()
    {
        var guard = new SsrfGuard(false, (_, _) => Task.FromResult(Public));

        Assert.Null(await guard.ValidateUrlAsync("https://good.test/", cancellationToken: CancellationToken.None));
    }

    /// <summary>
    /// One refused address among allowed ones refuses the whole name.
    /// True: a DNS rebind answer that mixes addresses is blocked.
    /// False: the check would pick the allowed address and miss the other.
    /// </summary>
    [Fact]
    public async Task ValidateUrlAsync_OneBadAddressAmongGood_RefusesTheName()
    {
        var answer = new[] { IPAddress.Parse("93.184.216.34"), IPAddress.Parse("10.0.0.7"), IPAddress.Parse("8.8.8.8") };
        var guard = new SsrfGuard(false, (_, _) => Task.FromResult(answer));

        var error = await guard.ValidateUrlAsync("https://mixed.test/", cancellationToken: CancellationToken.None);

        Assert.NotNull(error);
        Assert.Contains("10.0.0.7", error, StringComparison.Ordinal);
    }

    /// <summary>
    /// A metadata address among allowed ones refuses the name even when private networks are allowed.
    /// True: the metadata address cannot hide in a mixed answer.
    /// False: private networks being allowed would let it through.
    /// </summary>
    [Fact]
    public async Task ValidateUrlAsync_MetadataAddressAmongGood_RefusedEvenWhenPrivateAllowed()
    {
        var answer = new[] { IPAddress.Parse("93.184.216.34"), IPAddress.Parse("169.254.169.254") };
        var guard = new SsrfGuard(true, (_, _) => Task.FromResult(answer));

        Assert.NotNull(await guard.ValidateUrlAsync("https://mixed.test/", cancellationToken: CancellationToken.None));
    }

    /// <summary>
    /// A name that resolves to loopback is refused unless private networks are allowed.
    /// True: a name cannot be used to reach the local machine by default.
    /// False: a name pointing at loopback would pass.
    /// </summary>
    [Fact]
    public async Task ValidateUrlAsync_NameResolvesToLoopback_RefusedUnlessAllowed()
    {
        var answer = new[] { IPAddress.Loopback };

        Assert.NotNull(await new SsrfGuard(false, (_, _) => Task.FromResult(answer)).ValidateUrlAsync("http://app.test/", cancellationToken: CancellationToken.None));
        Assert.Null(await new SsrfGuard(true, (_, _) => Task.FromResult(answer)).ValidateUrlAsync("http://app.test/", cancellationToken: CancellationToken.None));
    }

    /// <summary>
    /// A name that resolves to no address is refused.
    /// True: an unresolvable target is reported clearly.
    /// False: an empty answer would pass as allowed.
    /// </summary>
    [Fact]
    public async Task ValidateUrlAsync_NoAddresses_Refused()
    {
        var guard = new SsrfGuard(true, (_, _) => Task.FromResult(Array.Empty<IPAddress>()));

        var error = await guard.ValidateUrlAsync("http://empty.test/", cancellationToken: CancellationToken.None);

        Assert.Contains("does not resolve", error, StringComparison.Ordinal);
    }

    /// <summary>
    /// A failed lookup is refused as unresolved.
    /// True: a DNS error never lets a request through.
    /// False: a lookup error would throw out of the check.
    /// </summary>
    [Fact]
    public async Task ValidateUrlAsync_LookupFails_RefusedAsUnresolved()
    {
        var guard = new SsrfGuard(true, (_, _) => throw new SocketException((int)SocketError.HostNotFound));

        var error = await guard.ValidateUrlAsync("http://gone.test/", cancellationToken: CancellationToken.None);

        Assert.Contains("does not resolve", error, StringComparison.Ordinal);
    }

    /// <summary>
    /// A URL with a literal address is checked without any lookup.
    /// True: an address is judged as written.
    /// False: a literal address would trigger a DNS query.
    /// </summary>
    [Fact]
    public async Task ValidateUrlAsync_Literal_NeverResolves()
    {
        var guard = new SsrfGuard(false, (_, _) => throw new InvalidOperationException("must not resolve a literal"));

        Assert.Null(await guard.ValidateUrlAsync("https://8.8.8.8/", cancellationToken: CancellationToken.None));
        Assert.NotNull(await guard.ValidateUrlAsync("https://127.0.0.1/", cancellationToken: CancellationToken.None));
    }

    /// <summary>
    /// With unresolved names allowed, a missing name is accepted and an answer is still checked.
    /// True: a plugin can call a host that is not yet up without losing the check.
    /// False: allowing unresolved names would skip the address check.
    /// </summary>
    [Fact]
    public async Task ValidateUrlAsync_AllowUnresolved_AcceptsAMissingNameButStillChecksAnAnswer()
    {
        var gone = new SsrfGuard(false, (_, _) => throw new SocketException((int)SocketError.HostNotFound));
        var bad = new SsrfGuard(false, (_, _) => Task.FromResult(new[] { IPAddress.Parse("169.254.169.254") }));

        Assert.Null(await gone.ValidateUrlAsync("http://gone.test/", allowUnresolved: true));
        Assert.NotNull(await bad.ValidateUrlAsync("http://bad.test/", allowUnresolved: true));
    }

    /// <summary>
    /// A bad scheme is refused before any lookup.
    /// True: no DNS query is made for a URL that is refused anyway.
    /// False: a name with a bad scheme would be resolved first.
    /// </summary>
    [Fact]
    public async Task ValidateUrlAsync_BadScheme_RefusedBeforeResolving()
    {
        var guard = new SsrfGuard(true, (_, _) => throw new InvalidOperationException("must not resolve"));

        Assert.NotNull(await guard.ValidateUrlAsync("ftp://example.com/", cancellationToken: CancellationToken.None));
    }

    /// <summary>
    /// The name localhost is refused by the public only guard and allowed when private networks are allowed.
    /// True: localhost follows the private network setting.
    /// False: localhost would reach the local machine by default.
    /// </summary>
    [Fact]
    public async Task ValidateUrlAsync_Localhost_RefusedByDefault()
    {
        Assert.NotNull(await SsrfGuard.PublicOnly.ValidateUrlAsync("http://localhost:8096/", cancellationToken: CancellationToken.None));
        Assert.Null(await SsrfGuard.PrivateNetworkAllowed.ValidateUrlAsync("http://localhost:8096/", cancellationToken: CancellationToken.None));
    }

    /// <summary>
    /// A redirect is allowed only to the same host and port without leaving https for http.
    /// True: a redirect cannot send the request to another service.
    /// False: a redirect to another host, port, or a weaker scheme would be followed.
    /// </summary>
    [Theory]
    [InlineData("https://a.test/x", "https://a.test/y", true)]
    [InlineData("https://a.test/x", "https://A.TEST/y?q=1", true)]
    [InlineData("http://a.test/x", "https://a.test/x", true)]
    [InlineData("http://a.test:8080/x", "https://a.test:8443/x", false)]
    [InlineData("http://a.test:8080/x", "https://a.test:8080/x", true)]
    [InlineData("https://a.test/x", "http://a.test/x", false)]
    [InlineData("http://a.test/x", "https://b.test/x", false)]
    [InlineData("https://a.test/x", "http://a.test:443/x", false)]
    [InlineData("https://a.test/x", "https://b.test/x", false)]
    [InlineData("https://a.test/x", "https://sub.a.test/x", false)]
    [InlineData("https://a.test/x", "https://a.test:8443/x", false)]
    [InlineData("https://a.test/x", "https://93.184.216.34/x", false)]
    [InlineData("http://a.test/x", "http://a.test:80/y", true)]
    public void IsRedirectAllowed_OnlySameHostAndPort(string from, string to, bool expected)
    {
        Assert.Equal(expected, SsrfGuard.PublicOnly.IsRedirectAllowed(new Uri(from), new Uri(to)));
    }

    /// <summary>
    /// A redirect to the same host with a user name or password is refused.
    /// True: credentials cannot be added by a redirect.
    /// False: the redirect would pass as same host.
    /// </summary>
    [Fact]
    public void IsRedirectAllowed_SameHostWithUserInfo_Refused()
    {
        Assert.False(SsrfGuard.PublicOnly.IsRedirectAllowed(new Uri("https://a.test/x"), new Uri("https://u:p@a.test/x")));
    }

    /// <summary>
    /// A redirect with a relative target is refused.
    /// True: only absolute targets are judged.
    /// False: a relative target would throw or pass.
    /// </summary>
    [Fact]
    public void IsRedirectAllowed_RelativeTarget_Refused()
    {
        Assert.False(SsrfGuard.PublicOnly.IsRedirectAllowed(new Uri("https://a.test/x"), new Uri("/y", UriKind.Relative)));
    }

    /// <summary>
    /// The handler follows no redirect, uses no proxy, and checks each connection.
    /// True: the guard sees every hop and every connection.
    /// False: a proxy or an automatic redirect would bypass the check.
    /// </summary>
    [Fact]
    public void CreateHandler_DoesNotFollowRedirectsOrUseProxy()
    {
        using var handler = SsrfGuard.PublicOnly.CreateHandler();

        Assert.False(handler.AllowAutoRedirect);
        Assert.False(handler.UseProxy);
        Assert.NotNull(handler.ConnectCallback);
    }

    /// <summary>
    /// A connection to loopback is refused at connect time by the public only guard.
    /// True: no request reaches the local server.
    /// False: the request would be sent.
    /// </summary>
    [Fact]
    public async Task Handler_LoopbackTarget_RefusedAtConnectTime()
    {
        using var server = new LoopbackServer(_ => (200, null, "hello"));
        using var client = new HttpClient(SsrfGuard.PublicOnly.CreateHandler());

        var ex = await Assert.ThrowsAsync<HttpRequestException>(() => client.GetAsync(server.Url + "x"));

        Assert.Contains(SsrfGuard.RefusalPrefix, Describe(ex), StringComparison.Ordinal);
        Assert.Equal(0, server.Requests);
    }

    /// <summary>
    /// A connection to loopback works when private networks are allowed.
    /// True: the private network guard still reaches local services.
    /// False: it would refuse a service the plugin chose.
    /// </summary>
    [Fact]
    public async Task Handler_LoopbackTarget_ConnectsWhenPrivateAllowed()
    {
        using var server = new LoopbackServer(_ => (200, null, "hello"));
        using var client = new HttpClient(SsrfGuard.PrivateNetworkAllowed.CreateHandler());

        var body = await client.GetStringAsync(server.Url + "x");

        Assert.Equal("hello", body);
    }

    /// <summary>
    /// A name whose answer includes loopback is refused at connect time.
    /// True: a DNS rebind cannot reach the local server.
    /// False: the connection would go to the loopback address.
    /// </summary>
    [Fact]
    public async Task Handler_NameThatRebindsToLoopback_RefusedAtConnectTime()
    {
        using var server = new LoopbackServer(_ => (200, null, "secret"));
        var answer = new[] { IPAddress.Parse("93.184.216.34"), IPAddress.Loopback };
        using var client = new HttpClient(new SsrfGuard(false, (_, _) => Task.FromResult(answer)).CreateHandler());

        var ex = await Assert.ThrowsAsync<HttpRequestException>(() => client.GetAsync("http://rebind.test:" + server.Port + "/"));

        Assert.Contains(SsrfGuard.RefusalPrefix, Describe(ex), StringComparison.Ordinal);
        Assert.Equal(0, server.Requests);
    }

    /// <summary>
    /// A name that resolves to an allowed address connects to that address.
    /// True: the address that was checked is the one used.
    /// False: the socket would resolve the name again.
    /// </summary>
    [Fact]
    public async Task Handler_NameResolvingToAllowedAddress_ConnectsToThatAddress()
    {
        using var server = new LoopbackServer(_ => (200, null, "reached"));
        var answer = new[] { IPAddress.Loopback };
        using var client = new HttpClient(new SsrfGuard(true, (_, _) => Task.FromResult(answer)).CreateHandler());

        var body = await client.GetStringAsync("http://app.test:" + server.Port + "/");

        Assert.Equal("reached", body);
    }

    /// <summary>
    /// A name that resolves to no address is refused at connect time.
    /// True: an unresolvable name fails with a clear reason.
    /// False: the connection would hang or throw an unrelated error.
    /// </summary>
    [Fact]
    public async Task Handler_NameThatDoesNotResolve_Refused()
    {
        using var client = new HttpClient(new SsrfGuard(true, (_, _) => Task.FromResult(Array.Empty<IPAddress>())).CreateHandler());

        var ex = await Assert.ThrowsAsync<HttpRequestException>(() => client.GetAsync("http://empty.test/"));

        Assert.Contains("does not resolve", Describe(ex), StringComparison.Ordinal);
    }

    /// <summary>
    /// The handler returns a redirect response and does not follow it.
    /// True: the caller decides whether a redirect is safe.
    /// False: the handler would follow it unchecked.
    /// </summary>
    [Fact]
    public async Task Handler_ReturnsRedirectWithoutFollowingIt()
    {
        using var server = new LoopbackServer(r => r.Path == "/start" ? (302, "/next", string.Empty) : (200, null, "next"));
        using var client = new HttpClient(SsrfGuard.PrivateNetworkAllowed.CreateHandler());

        using var response = await client.GetAsync(server.Url + "start");

        Assert.Equal(HttpStatusCode.Found, response.StatusCode);
        Assert.Equal(1, server.Requests);
    }

    /// <summary>
    /// Without a guard argument the request goes through the supplied client and reaches no real server.
    /// True: a request with no guard argument uses the client it is given.
    /// False: the request would bypass the supplied client.
    /// </summary>
    [Fact]
    public async Task SendAsync_WithNoGuardArgument_UsesTheSuppliedClient()
    {
        using var server = new LoopbackServer(_ => (200, null, "open"));

        var result = await JpkHttp.SendAsync(new StubFactory(), HttpMethod.Get, server.Url + "x", CancellationToken.None);

        Assert.Equal(200, result.Status);
        Assert.Equal("unguarded", result.Body);
        Assert.Equal(0, server.Requests);
    }

    /// <summary>
    /// A guarded request to a blocked target returns status zero and a refusal reason.
    /// True: the caller gets a result and never an exception.
    /// False: the call would throw or reach the target.
    /// </summary>
    [Theory]
    [InlineData("http://127.0.0.1:1/")]
    [InlineData("http://169.254.169.254/latest/meta-data/")]
    [InlineData("http://[::1]:1/")]
    [InlineData("http://10.0.0.1/")]
    [InlineData("ftp://example.com/")]
    [InlineData("http://user:pw@example.com/")]
    [InlineData("http://2130706433/")]
    public async Task SendAsync_WithGuard_BlockedTarget_ReturnsStatusZeroWithReason(string url)
    {
        var result = await JpkHttp.SendAsync(new StubFactory(), HttpMethod.Get, url, CancellationToken.None, guard: SsrfGuard.PublicOnly);

        Assert.Equal(0, result.Status);
        Assert.False(result.Ok);
        Assert.StartsWith(SsrfGuard.RefusalPrefix, result.Body, StringComparison.Ordinal);
    }

    /// <summary>
    /// A guarded request with private networks allowed reaches a loopback server.
    /// True: a plugin can call its own local services.
    /// False: the request would be refused.
    /// </summary>
    [Fact]
    public async Task SendAsync_WithGuard_PrivateAllowed_ReachesLoopback()
    {
        using var server = new LoopbackServer(_ => (200, null, "inside"));

        var result = await JpkHttp.SendAsync(new StubFactory(), HttpMethod.Get, server.Url + "x", CancellationToken.None, guard: SsrfGuard.PrivateNetworkAllowed);

        Assert.Equal(200, result.Status);
        Assert.Equal("inside", result.Body);
    }

    /// <summary>
    /// A guarded request to the metadata address is refused even when private networks are allowed.
    /// True: the metadata address is never reachable.
    /// False: the private network setting would open it.
    /// </summary>
    [Fact]
    public async Task SendAsync_WithGuard_PrivateAllowed_StillBlocksMetadataAddress()
    {
        var result = await JpkHttp.SendAsync(new StubFactory(), HttpMethod.Get, "http://169.254.169.254/", CancellationToken.None, guard: SsrfGuard.PrivateNetworkAllowed);

        Assert.Equal(0, result.Status);
        Assert.StartsWith(SsrfGuard.RefusalPrefix, result.Body, StringComparison.Ordinal);
    }

    /// <summary>
    /// A redirect to another host is refused after one request.
    /// True: a redirect cannot reach a different service.
    /// False: the second host would be requested.
    /// </summary>
    [Fact]
    public async Task SendAsync_WithGuard_RedirectToAnotherHost_Refused()
    {
        using var server = new LoopbackServer(_ => (302, "x", string.Empty));
        server.Location = r => "http://localhost:" + server.Port + "/steal";

        var result = await JpkHttp.SendAsync(new StubFactory(), HttpMethod.Get, server.Url + "start", CancellationToken.None, guard: SsrfGuard.PrivateNetworkAllowed);

        Assert.Equal(0, result.Status);
        Assert.StartsWith(SsrfGuard.RefusalPrefix, result.Body, StringComparison.Ordinal);
        Assert.Contains("redirect", result.Body, StringComparison.Ordinal);
        Assert.Equal(1, server.Requests);
    }

    /// <summary>
    /// A redirect to the metadata address is refused after one request.
    /// True: a public server cannot bounce a request to the metadata service.
    /// False: the metadata address would be requested.
    /// </summary>
    [Fact]
    public async Task SendAsync_WithGuard_RedirectToMetadataAddress_Refused()
    {
        using var server = new LoopbackServer(_ => (302, "http://169.254.169.254/latest/meta-data/", string.Empty));

        var result = await JpkHttp.SendAsync(new StubFactory(), HttpMethod.Get, server.Url + "start", CancellationToken.None, guard: SsrfGuard.PrivateNetworkAllowed);

        Assert.Equal(0, result.Status);
        Assert.StartsWith(SsrfGuard.RefusalPrefix, result.Body, StringComparison.Ordinal);
        Assert.Equal(1, server.Requests);
    }

    /// <summary>
    /// A redirect on the same host is followed.
    /// True: normal same site redirects still work.
    /// False: a harmless redirect would fail.
    /// </summary>
    [Fact]
    public async Task SendAsync_WithGuard_RedirectOnSameHost_IsFollowed()
    {
        using var server = new LoopbackServer(r => r.Path == "/start" ? (302, "/final", string.Empty) : (200, null, "arrived"));

        var result = await JpkHttp.SendAsync(new StubFactory(), HttpMethod.Get, server.Url + "start", CancellationToken.None, guard: SsrfGuard.PrivateNetworkAllowed);

        Assert.Equal(200, result.Status);
        Assert.Equal("arrived", result.Body);
        Assert.Equal(2, server.Requests);
    }

    /// <summary>
    /// A 307 redirect of a POST keeps the method and the body.
    /// True: the redirect behaves as HTTP says.
    /// False: the body or method would be lost.
    /// </summary>
    [Fact]
    public async Task SendAsync_WithGuard_PostRedirect307_KeepsMethodAndBody()
    {
        using var server = new LoopbackServer(r => r.Path == "/start" ? (307, "/final", string.Empty) : (200, null, r.Method + ":" + r.Body));

        var result = await JpkHttp.SendAsync(new StubFactory(), HttpMethod.Post, server.Url + "start", CancellationToken.None, body: "payload", guard: SsrfGuard.PrivateNetworkAllowed);

        Assert.Equal(200, result.Status);
        Assert.Equal("POST:payload", result.Body);
    }

    /// <summary>
    /// A 302 redirect of a POST becomes a GET with no body.
    /// True: the redirect behaves as browsers do.
    /// False: the body would be sent again to the new address.
    /// </summary>
    [Fact]
    public async Task SendAsync_WithGuard_PostRedirect302_BecomesGetWithoutBody()
    {
        using var server = new LoopbackServer(r => r.Path == "/start" ? (302, "/final", string.Empty) : (200, null, r.Method + ":" + r.Body));

        var result = await JpkHttp.SendAsync(new StubFactory(), HttpMethod.Post, server.Url + "start", CancellationToken.None, body: "payload", guard: SsrfGuard.PrivateNetworkAllowed);

        Assert.Equal(200, result.Status);
        Assert.Equal("GET:", result.Body);
    }

    /// <summary>
    /// A redirect loop stops at the redirect limit with a clear reason.
    /// True: a server cannot keep the caller busy forever.
    /// False: the loop would run without end.
    /// </summary>
    [Fact]
    public async Task SendAsync_WithGuard_RedirectLoop_StopsAtTheLimit()
    {
        using var server = new LoopbackServer(_ => (302, "/again", string.Empty));

        var result = await JpkHttp.SendAsync(new StubFactory(), HttpMethod.Get, server.Url + "start", CancellationToken.None, guard: SsrfGuard.PrivateNetworkAllowed);

        Assert.Equal(0, result.Status);
        Assert.Contains("too many redirects", result.Body, StringComparison.Ordinal);
        Assert.Equal(JpkHttp.MaxGuardedRedirects + 1, server.Requests);
    }

    /// <summary>
    /// A guarded request still stops reading at the response size cap.
    /// True: the guard does not lift the memory limit.
    /// False: a guarded request would read an unbounded body.
    /// </summary>
    [Fact]
    public async Task SendAsync_WithGuard_StillCapsTheResponse()
    {
        using var server = new LoopbackServer(_ => (200, null, new string('x', 5000)));

        var result = await JpkHttp.SendAsync(new StubFactory(), HttpMethod.Get, server.Url + "x", CancellationToken.None, maxResponseBytes: 1000, guard: SsrfGuard.PrivateNetworkAllowed);

        Assert.Equal(0, result.Status);
        Assert.Contains("exceeds 1000 bytes", result.Body, StringComparison.Ordinal);
    }

    /// <summary>
    /// A cancelled token throws from a guarded request.
    /// True: a shutdown stops the call.
    /// False: the cancellation would be reported as a timeout.
    /// </summary>
    [Fact]
    public async Task SendAsync_WithGuard_CancelledToken_Throws()
    {
        using var server = new LoopbackServer(_ => (200, null, "x"));
        using var cts = new CancellationTokenSource();
        await cts.CancelAsync();

        await Assert.ThrowsAnyAsync<OperationCanceledException>(
            () => JpkHttp.SendAsync(new StubFactory(), HttpMethod.Get, server.Url + "x", cts.Token, guard: SsrfGuard.PrivateNetworkAllowed));
    }

    /// <summary>
    /// With no guard argument an unsafe target is refused before anything is sent.
    /// True: the default check protects a plugin that never opted in.
    /// False: the request would reach the client.
    /// </summary>
    [Theory]
    [InlineData("http://169.254.169.254/latest/meta-data/")]
    [InlineData("http://169.254.1.1/")]
    [InlineData("http://[fe80::1]/")]
    [InlineData("http://224.0.0.1/")]
    [InlineData("http://[ff02::1]/")]
    [InlineData("http://0.0.0.0/")]
    [InlineData("http://[::]/")]
    [InlineData("http://240.0.0.1/")]
    [InlineData("http://255.255.255.255/")]
    [InlineData("ftp://example.com/")]
    [InlineData("http://user:pw@example.com/")]
    public async Task SendAsync_DefaultGuard_BlocksUnsafeTargetsWithoutSendingAnything(string url)
    {
        var factory = new CountingFactory();

        var result = await JpkHttp.SendAsync(factory, HttpMethod.Get, url, CancellationToken.None);

        Assert.Equal(0, result.Status);
        Assert.StartsWith(SsrfGuard.RefusalPrefix, result.Body, StringComparison.Ordinal);
        Assert.Equal(0, factory.Sent);
    }

    /// <summary>
    /// With no guard argument loopback, private, and public targets go through the supplied client.
    /// True: a plugin that calls local services keeps working with its own client settings.
    /// False: the default check would refuse a service the plugin chose.
    /// </summary>
    [Theory]
    [InlineData("http://127.0.0.1:8096/")]
    [InlineData("http://[::1]/")]
    [InlineData("http://10.1.2.3/")]
    [InlineData("http://192.168.1.20/")]
    [InlineData("http://172.16.0.9/")]
    [InlineData("http://172.31.255.1/")]
    [InlineData("http://100.64.0.1/")]
    [InlineData("https://93.184.216.34/")]
    [InlineData("http://[fd00::1]/")]
    public async Task SendAsync_DefaultGuard_AllowsLoopbackPrivateAndPublic_ThroughTheSuppliedClient(string url)
    {
        var factory = new CountingFactory();

        var result = await JpkHttp.SendAsync(factory, HttpMethod.Get, url, CancellationToken.None);

        Assert.Equal(200, result.Status);
        Assert.Equal("supplied", result.Body);
        Assert.Equal(1, factory.Sent);
    }

    /// <summary>
    /// With no guard argument the name localhost goes through the supplied client.
    /// True: local services stay reachable by name.
    /// False: localhost would be refused.
    /// </summary>
    [Fact]
    public async Task SendAsync_DefaultGuard_Localhost_AllowedThroughTheSuppliedClient()
    {
        var factory = new CountingFactory();

        var result = await JpkHttp.SendAsync(factory, HttpMethod.Get, "http://localhost/", CancellationToken.None);

        Assert.Equal(200, result.Status);
        Assert.Equal(1, factory.Sent);
    }

    /// <summary>
    /// With no guard argument a redirect is returned and not followed by the helper.
    /// True: the supplied client keeps its own redirect behavior.
    /// False: the helper would follow redirects the client did not.
    /// </summary>
    [Fact]
    public async Task SendAsync_DefaultGuard_DoesNotFollowRedirectsItself()
    {
        var factory = new CountingFactory(HttpStatusCode.Found);

        var result = await JpkHttp.SendAsync(factory, HttpMethod.Get, "http://10.0.0.1/", CancellationToken.None);

        Assert.Equal(302, result.Status);
        Assert.Equal(1, factory.Sent);
    }

    /// <summary>
    /// An explicit public only guard refuses private targets before anything is sent.
    /// True: a plugin can choose the strict setting.
    /// False: the request would reach the client.
    /// </summary>
    [Theory]
    [InlineData("http://10.0.0.1/")]
    [InlineData("http://127.0.0.1/")]
    [InlineData("http://192.168.1.1/")]
    [InlineData("http://[fd00::1]/")]
    public async Task SendAsync_ExplicitPublicOnly_StillBlocksPrivateTargets(string url)
    {
        var factory = new CountingFactory();

        var result = await JpkHttp.SendAsync(factory, HttpMethod.Get, url, CancellationToken.None, guard: SsrfGuard.PublicOnly);

        Assert.Equal(0, result.Status);
        Assert.StartsWith(SsrfGuard.RefusalPrefix, result.Body, StringComparison.Ordinal);
        Assert.Equal(0, factory.Sent);
    }

    /// <summary>
    /// The disabled guard skips every check and uses the supplied client.
    /// True: a caller can reach an address the default check refuses when it must.
    /// False: a check would still run.
    /// </summary>
    [Theory]
    [InlineData("http://169.254.169.254/")]
    [InlineData("http://224.0.0.1/")]
    [InlineData("http://0.0.0.0/")]
    [InlineData("http://240.0.0.1/")]
    [InlineData("http://user:pw@example.com/")]
    [InlineData("http://127.0.0.1/")]
    [InlineData("https://93.184.216.34/")]
    public async Task SendAsync_Disabled_SkipsEveryCheckAndUsesTheSuppliedClient(string url)
    {
        var factory = new CountingFactory();

        var result = await JpkHttp.SendAsync(factory, HttpMethod.Get, url, CancellationToken.None, guard: SsrfGuard.Disabled);

        Assert.Equal(200, result.Status);
        Assert.Equal("supplied", result.Body);
        Assert.Equal(1, factory.Sent);
    }

    /// <summary>
    /// The disabled guard is a separate instance from the other presets.
    /// True: passing one preset never turns the checks off by accident.
    /// False: a preset would be mistaken for the disabled marker.
    /// </summary>
    [Fact]
    public void Disabled_IsNotAnyOtherPreset()
    {
        Assert.NotSame(SsrfGuard.Disabled, SsrfGuard.PrivateNetworkAllowed);
        Assert.NotSame(SsrfGuard.Disabled, SsrfGuard.PublicOnly);
    }

    private static string Describe(Exception ex)
    {
        var text = new StringBuilder();
        for (var current = ex; current is not null; current = current.InnerException!)
        {
            text.Append(current.Message).Append(' ');
            if (current.InnerException is null)
            {
                break;
            }
        }

        return text.ToString();
    }

    private sealed class StubFactory : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => new(new StubHandler());
    }

    private sealed class CountingFactory : IHttpClientFactory
    {
        private readonly HttpStatusCode _status;

        public CountingFactory(HttpStatusCode status = HttpStatusCode.OK)
        {
            _status = status;
        }

        public int Sent { get; private set; }

        public HttpClient CreateClient(string name) => new(new CountingHandler(this, _status));

        private sealed class CountingHandler : HttpMessageHandler
        {
            private readonly CountingFactory _owner;
            private readonly HttpStatusCode _status;

            public CountingHandler(CountingFactory owner, HttpStatusCode status)
            {
                _owner = owner;
                _status = status;
            }

            protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
            {
                _owner.Sent++;
                var response = new HttpResponseMessage(_status) { Content = new StringContent("supplied") };
                if (_status == HttpStatusCode.Found)
                {
                    response.Headers.Location = new Uri("http://elsewhere.test/");
                }

                return Task.FromResult(response);
            }
        }
    }

    private sealed class StubHandler : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
            => Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("unguarded") });
    }

    private sealed record Seen(string Method, string Path, string Body);

    /// <summary>A one purpose HTTP server on the loopback address that answers each request from a function.</summary>
    private sealed class LoopbackServer : IDisposable
    {
        private readonly TcpListener _listener = new(IPAddress.Loopback, 0);
        private readonly Func<Seen, (int Status, string? Location, string Body)> _answer;
        private readonly CancellationTokenSource _stop = new();
        private int _requests;

        public LoopbackServer(Func<Seen, (int Status, string? Location, string Body)> answer)
        {
            _answer = answer;
            _listener.Start();
            _ = Task.Run(AcceptLoopAsync);
        }

        public Func<Seen, string>? Location { get; set; }

        public int Port => ((IPEndPoint)_listener.LocalEndpoint).Port;

        public string Url => "http://127.0.0.1:" + Port + "/";

        public int Requests => Volatile.Read(ref _requests);

        public void Dispose()
        {
            _stop.Cancel();
            _listener.Stop();
            _listener.Dispose();
            _stop.Dispose();
        }

        private async Task AcceptLoopAsync()
        {
            try
            {
                while (!_stop.IsCancellationRequested)
                {
                    var client = await _listener.AcceptTcpClientAsync(_stop.Token).ConfigureAwait(false);
                    _ = Task.Run(() => ServeAsync(client));
                }
            }
            catch (Exception ex) when (ex is OperationCanceledException or ObjectDisposedException or SocketException)
            {
                // The listener was stopped.
            }
        }

        private async Task ServeAsync(TcpClient client)
        {
            using (client)
            {
                try
                {
                    var stream = client.GetStream();
                    var head = new StringBuilder();
                    var buffer = new byte[1];
                    while (!head.ToString().EndsWith("\r\n\r\n", StringComparison.Ordinal))
                    {
                        if (await stream.ReadAsync(buffer, _stop.Token).ConfigureAwait(false) == 0)
                        {
                            return;
                        }

                        head.Append((char)buffer[0]);
                    }

                    var lines = head.ToString().Split("\r\n");
                    var parts = lines[0].Split(' ');
                    var length = 0;
                    foreach (var line in lines)
                    {
                        if (line.StartsWith("Content-Length:", StringComparison.OrdinalIgnoreCase))
                        {
                            length = int.Parse(line.Substring(15).Trim(), System.Globalization.CultureInfo.InvariantCulture);
                        }
                    }

                    var content = new byte[length];
                    var read = 0;
                    while (read < length)
                    {
                        var n = await stream.ReadAsync(content.AsMemory(read), _stop.Token).ConfigureAwait(false);
                        if (n == 0)
                        {
                            break;
                        }

                        read += n;
                    }

                    var seen = new Seen(parts[0], parts[1], Encoding.UTF8.GetString(content, 0, read));
                    Interlocked.Increment(ref _requests);
                    var (status, location, body) = _answer(seen);
                    var payload = Encoding.UTF8.GetBytes(body);
                    var reply = new StringBuilder();
                    reply.Append("HTTP/1.1 ").Append(status).Append(" X\r\n");
                    if (location is not null)
                    {
                        reply.Append("Location: ").Append(Location?.Invoke(seen) ?? location).Append("\r\n");
                    }

                    reply.Append("Content-Length: ").Append(payload.Length).Append("\r\nConnection: close\r\n\r\n");
                    await stream.WriteAsync(Encoding.ASCII.GetBytes(reply.ToString()), _stop.Token).ConfigureAwait(false);
                    await stream.WriteAsync(payload, _stop.Token).ConfigureAwait(false);
                }
                catch (Exception ex) when (ex is IOException or SocketException or OperationCanceledException or ObjectDisposedException)
                {
                    // The client went away.
                }
            }
        }
    }

    /// <summary>
    /// IPv4 translated, Teredo, local use NAT64, and ISATAP addresses are refused when they carry or can reach a refused target, even when private networks are allowed where the range is blocked whole.
    /// True: no IPv6 transition form hides an internal IPv4 address or a tunnel.
    /// False: ::ffff:0:169.254.169.254 or a Teredo address would pass as public.
    /// </summary>
    [Theory]
    [InlineData("::ffff:0:169.254.169.254", true)]
    [InlineData("::ffff:0:a9fe:a9fe", true)]
    [InlineData("2001::1", true)]
    [InlineData("2001:0:4136:e378:8000:63bf:3fff:fdd2", true)]
    [InlineData("64:ff9b:1::1", true)]
    [InlineData("64:ff9b:1:ffff::1", true)]
    [InlineData("2001:db8::5efe:169.254.169.254", true)]
    [InlineData("2001:db8::200:5efe:169.254.169.254", true)]
    [InlineData("fe80::5efe:8.8.8.8", true)]
    public void Classify_TransitionForms_Refused(string address, bool alwaysRefused)
    {
        var ip = IPAddress.Parse(address);

        Assert.NotNull(SsrfGuard.Classify(ip, allowPrivateNetwork: false));
        Assert.Equal(alwaysRefused, SsrfGuard.Classify(ip, allowPrivateNetwork: true) is not null);
    }

    /// <summary>
    /// A translated or ISATAP address that carries a private IPv4 address is refused only when private networks are not allowed, and one that carries a public address is allowed.
    /// True: the embedded IPv4 address decides.
    /// False: the wrapper would hide a private address or block a public one.
    /// </summary>
    [Fact]
    public void Classify_EmbeddedIpv4_JudgedOnItsOwn()
    {
        Assert.NotNull(SsrfGuard.Classify(IPAddress.Parse("::ffff:0:10.0.0.1"), false));
        Assert.Null(SsrfGuard.Classify(IPAddress.Parse("::ffff:0:10.0.0.1"), true));
        Assert.NotNull(SsrfGuard.Classify(IPAddress.Parse("2001:db8::5efe:10.0.0.1"), false));
        Assert.Null(SsrfGuard.Classify(IPAddress.Parse("2001:db8::5efe:10.0.0.1"), true));
        Assert.Null(SsrfGuard.Classify(IPAddress.Parse("::ffff:0:8.8.8.8"), false));
        Assert.Null(SsrfGuard.Classify(IPAddress.Parse("2001:db8::5efe:8.8.8.8"), false));
        Assert.Null(SsrfGuard.Classify(IPAddress.Parse("2001:db8::1"), false));
    }

    /// <summary>
    /// A resolver that throws anything but a cancellation gives a refusal instead of an exception, and a cancellation still propagates.
    /// True: a bad name cannot make the check throw.
    /// False: an ArgumentException or InvalidOperationException from the resolver would escape.
    /// </summary>
    [Fact]
    public async Task ValidateUrlAsync_AnyResolverFailure_RefusedAndCancellationPropagates()
    {
        foreach (Exception failure in new Exception[] { new ArgumentException("bad"), new InvalidOperationException("bad"), new IOException("bad") })
        {
            var guard = new SsrfGuard(true, (_, _) => throw failure);

            var error = await guard.ValidateUrlAsync("http://odd.test/", allowUnresolved: true, cancellationToken: CancellationToken.None);

            Assert.NotNull(error);
            Assert.Contains("could not be resolved", error, StringComparison.Ordinal);
        }

        var cancelling = new SsrfGuard(true, (_, _) => throw new OperationCanceledException());
        await Assert.ThrowsAsync<OperationCanceledException>(() => cancelling.ValidateUrlAsync("http://odd.test/", cancellationToken: CancellationToken.None));
    }

    /// <summary>
    /// A scoped IPv6 literal is refused, whatever its address.
    /// True: a zone id cannot be used to dodge the address check.
    /// False: a scoped global address would be accepted.
    /// </summary>
    [Theory]
    [InlineData("http://[fe80::1%25eth0]/")]
    [InlineData("http://[2001:db8::1%25eth0]/")]
    [InlineData("http://[::1%251]/")]
    public void ValidateUrl_ScopedIpv6Literal_Refused(string url)
    {
        Assert.NotNull(SsrfGuard.PrivateNetworkAllowed.ValidateUrl(url));
        Assert.NotNull(SsrfGuard.PublicOnly.ValidateUrl(url));
    }
}
