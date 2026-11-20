using System;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Sockets;
using System.Threading;
using System.Threading.Tasks;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// Guards outbound HTTP against server side request forgery by classifying addresses, validating a URL, and checking every address again at connect time.
/// <see cref="BaseHttp.SendAsync"/> validates every request with <see cref="PrivateNetworkAllowed"/> by default, and passing a guard of its own is the strict mode.
/// </summary>
/// <remarks>
/// The connect time check stops a DNS rebind from slipping past the validation, and the guard also decides whether a redirect may be followed.
/// A plugin that calls an address it did not choose passes <see cref="PublicOnly"/> to <see cref="BaseHttp.SendAsync"/>, or builds its own client from <see cref="CreateHandler"/>.
/// <see cref="Disabled"/> is the opt out.
/// </remarks>
public sealed class SsrfGuard
{
    /// <summary>The reason prefix the guard puts at the start of every refusal it reports through <see cref="HttpResult.Body"/>.</summary>
    public const string RefusalPrefix = "blocked by SSRF guard: ";

    /// <summary>The reason a guard with <see cref="RequireHttpsForPublic"/> gives when a plain http URL would reach a public address.</summary>
    public const string PlainHttpRefusal = "plain http only reaches loopback and private network addresses, since it sends credentials unencrypted, so use an https URL";

    private static readonly Lazy<HttpClient> PublicOnlyClient = new(() => BuildClient(false));

    private static readonly Lazy<HttpClient> PrivateAllowedClient = new(() => BuildClient(true));

    private readonly Func<string, CancellationToken, Task<IPAddress[]>> _resolver;

    /// <summary>
    /// Initializes a new instance of the <see cref="SsrfGuard"/> class.
    /// </summary>
    /// <param name="allowPrivateNetwork">Whether loopback, private, carrier grade NAT, and unique local addresses are allowed. Link local, multicast, unspecified, and broadcast addresses are refused either way.</param>
    /// <param name="requireHttpsForPublic">Whether a plain http URL is refused unless every address it reaches is loopback or private, for a caller that sends a key or password. With <paramref name="allowPrivateNetwork"/> off, every plain http URL is refused.</param>
    public SsrfGuard(bool allowPrivateNetwork = false, bool requireHttpsForPublic = false)
        : this(allowPrivateNetwork, ResolveAsync, requireHttpsForPublic)
    {
    }

    internal SsrfGuard(bool allowPrivateNetwork, Func<string, CancellationToken, Task<IPAddress[]>> resolver, bool requireHttpsForPublic = false)
    {
        AllowPrivateNetwork = allowPrivateNetwork;
        RequireHttpsForPublic = requireHttpsForPublic;
        _resolver = resolver;
    }

    /// <summary>Gets a guard that allows public addresses only.</summary>
    public static SsrfGuard PublicOnly { get; } = new(false);

    /// <summary>Gets a guard that also allows loopback and private network addresses.</summary>
    public static SsrfGuard PrivateNetworkAllowed { get; } = new(true);

    /// <summary>
    /// Gets a marker that turns every check off when it is passed to <see cref="BaseHttp.SendAsync"/>. Use it only for a call
    /// that must reach an address the default check would refuse. Called directly, it classifies like <see cref="PrivateNetworkAllowed"/>.
    /// </summary>
    public static SsrfGuard Disabled { get; } = new(true);

    /// <summary>Gets a value indicating whether loopback and private network addresses are allowed.</summary>
    public bool AllowPrivateNetwork { get; }

    /// <summary>Gets a value indicating whether a plain http URL may only reach loopback and private network addresses.</summary>
    public bool RequireHttpsForPublic { get; }

    /// <summary>Gets the shared client that sends through a guard with the same private network setting. It never follows a redirect.</summary>
    /// <remarks>The client does not use a system proxy, since a proxy would resolve and connect to the target itself.</remarks>
    internal HttpClient Client => AllowPrivateNetwork ? PrivateAllowedClient.Value : PublicOnlyClient.Value;

    /// <summary>
    /// Classifies an address.
    /// </summary>
    /// <param name="address">The address to check. An IPv4 address written as IPv6 is judged as the IPv4 address it holds.</param>
    /// <param name="allowPrivateNetwork">Whether loopback and private network addresses are allowed.</param>
    /// <returns><c>null</c> when the address is allowed, otherwise the reason it is not.</returns>
    public static string? Classify(IPAddress address, bool allowPrivateNetwork)
    {
        ArgumentNullException.ThrowIfNull(address);
        address = Unwrap(address);

        if (address.AddressFamily == AddressFamily.InterNetworkV6)
        {
            return ClassifyV6(address, allowPrivateNetwork);
        }

        var bytes = address.GetAddressBytes();

        if (bytes[0] == 0)
        {
            return "the unspecified address range 0.0.0.0/8 is not allowed";
        }

        if (bytes[0] == 169 && bytes[1] == 254)
        {
            return "link local addresses (169.254.0.0/16, which includes the cloud metadata address) are not allowed";
        }

        if ((bytes[0] & 0xF0) == 0xE0)
        {
            return "multicast addresses are not allowed";
        }

        if (bytes[0] == 255 && bytes[1] == 255 && bytes[2] == 255 && bytes[3] == 255)
        {
            return "the broadcast address is not allowed";
        }

        if ((bytes[0] & 0xF0) == 0xF0)
        {
            return "reserved addresses (240.0.0.0/4) are not allowed";
        }

        if (allowPrivateNetwork)
        {
            return null;
        }

        if (bytes[0] == 127)
        {
            return "loopback addresses are not allowed";
        }

        if (bytes[0] == 10
            || (bytes[0] == 172 && (bytes[1] & 0xF0) == 16)
            || (bytes[0] == 192 && bytes[1] == 168)
            || (bytes[0] == 100 && (bytes[1] & 0xC0) == 64))
        {
            return "private network addresses are not allowed";
        }

        return null;
    }

    /// <summary>
    /// Classifies an address with this guard's private network setting.
    /// </summary>
    /// <param name="address">The address to check.</param>
    /// <returns><c>null</c> when the address is allowed, otherwise the reason it is not.</returns>
    public string? ClassifyAddress(IPAddress address) => Classify(address, AllowPrivateNetwork);

    /// <summary>
    /// Says whether an address is loopback or on a private network, the only places a plain http URL may reach under <see cref="RequireHttpsForPublic"/>.
    /// </summary>
    /// <param name="address">The address to check.</param>
    /// <returns><c>true</c> when the address is loopback or private, and allowed at all.</returns>
    public static bool IsPrivateOrLoopback(IPAddress address)
    {
        ArgumentNullException.ThrowIfNull(address);
        return Classify(address, allowPrivateNetwork: true) is null && Classify(address, allowPrivateNetwork: false) is not null;
    }

    /// <summary>
    /// Checks a URL without any network access. An address written in the host is classified, and a name is
    /// left for <see cref="ValidateUrlAsync"/> and the connect time check.
    /// </summary>
    /// <param name="url">The absolute URL to check.</param>
    /// <returns><c>null</c> when the URL is acceptable, otherwise the reason it is not.</returns>
    public string? ValidateUrl(string url)
    {
        if (string.IsNullOrWhiteSpace(url))
        {
            return "the URL is empty";
        }

        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri))
        {
            return "the URL is not a valid absolute URL";
        }

        return ValidateUri(uri);
    }

    /// <summary>
    /// Checks a URL, and when the host is a name, resolves it and classifies every address it points at.
    /// One refused address among allowed ones refuses the whole name, since a mix is how a rebind looks.
    /// </summary>
    /// <remarks>
    /// A resolver failure never throws. A name that is not found is refused, or accepted when <paramref name="allowUnresolved"/> is set,
    /// and any other failure, such as a name the resolver rejects as invalid, is refused. Only a cancellation propagates.
    /// </remarks>
    /// <param name="url">The absolute URL to check.</param>
    /// <param name="allowUnresolved">Whether a name that does not resolve here is acceptable, for a caller whose proxy resolves it instead. A name that resolves is always fully checked.</param>
    /// <param name="cancellationToken">Cancels the lookup.</param>
    /// <returns><c>null</c> when the URL is acceptable, otherwise the reason it is not.</returns>
    public async Task<string?> ValidateUrlAsync(string url, bool allowUnresolved = false, CancellationToken cancellationToken = default)
    {
        var error = ValidateUrl(url);
        if (error is not null)
        {
            return error;
        }

        var uri = new Uri(url, UriKind.Absolute);
        if (IPAddress.TryParse(uri.Host.Trim('[', ']'), out _))
        {
            return null;
        }

        IPAddress[] addresses;
        try
        {
            addresses = await _resolver(uri.Host, cancellationToken).ConfigureAwait(false);
        }
        catch (SocketException)
        {
            return allowUnresolved ? null : "the name '" + uri.Host + "' does not resolve";
        }
#pragma warning disable CA1031 // Any resolver failure other than a cancellation must refuse the name, never throw out of the check.
        catch (Exception ex) when (ex is not OperationCanceledException)
#pragma warning restore CA1031
        {
            return "the name '" + uri.Host + "' could not be resolved (" + ex.GetType().Name + ")";
        }

        if (addresses.Length == 0 && allowUnresolved)
        {
            return null;
        }

        return ClassifyAll(uri.Host, addresses, uri.Scheme == Uri.UriSchemeHttp);
    }

    /// <summary>
    /// Decides whether a redirect may be followed. Only a redirect that stays on the same host, does
    /// not leave https for http, and passes <see cref="ValidateUrl"/> is allowed.
    /// </summary>
    /// <remarks>
    /// The port must be the same, with one exception: a redirect from http to https on the same host is allowed
    /// when it goes to the default port of https, so "http://a.test/" may upgrade to "https://a.test/".
    /// </remarks>
    /// <param name="from">The URL that answered with a redirect.</param>
    /// <param name="to">The absolute URL the redirect points at.</param>
    /// <returns><c>true</c> when the redirect may be followed.</returns>
    public bool IsRedirectAllowed(Uri from, Uri to)
    {
        ArgumentNullException.ThrowIfNull(from);
        ArgumentNullException.ThrowIfNull(to);

        if (!to.IsAbsoluteUri || !from.IsAbsoluteUri)
        {
            return false;
        }

        if (!string.Equals(from.Host, to.Host, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        var upgrade = from.Scheme == Uri.UriSchemeHttp && to.Scheme == Uri.UriSchemeHttps && to.IsDefaultPort;
        if (from.Port != to.Port && !upgrade)
        {
            return false;
        }

        if (from.Scheme == Uri.UriSchemeHttps && to.Scheme != Uri.UriSchemeHttps)
        {
            return false;
        }

        return ValidateUri(to) is null;
    }

    /// <summary>
    /// Connects for a <see cref="SocketsHttpHandler"/>. Every address the host resolves to is classified first,
    /// and the socket then connects to those same addresses, so the answer that was checked is the one used.
    /// </summary>
    /// <param name="context">The connection the handler wants.</param>
    /// <param name="cancellationToken">Cancels the connection.</param>
    /// <returns>The connected stream.</returns>
    /// <exception cref="HttpRequestException">The host does not resolve or points at a refused address.</exception>
    public async ValueTask<Stream> ConnectAsync(SocketsHttpConnectionContext context, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(context);

        var endPoint = context.DnsEndPoint;
        var addresses = IPAddress.TryParse(endPoint.Host.Trim('[', ']'), out var literal)
            ? new[] { literal }
            : await _resolver(endPoint.Host, cancellationToken).ConfigureAwait(false);

        var plainHttp = context.InitialRequestMessage?.RequestUri?.Scheme == Uri.UriSchemeHttp;
        var refusal = ClassifyAll(endPoint.Host, addresses, plainHttp);
        if (refusal is not null)
        {
            throw new HttpRequestException(RefusalPrefix + refusal);
        }

        var socket = new Socket(SocketType.Stream, ProtocolType.Tcp) { NoDelay = true };
        try
        {
            await socket.ConnectAsync(addresses, endPoint.Port, cancellationToken).ConfigureAwait(false);
            return new NetworkStream(socket, ownsSocket: true);
        }
        catch
        {
            socket.Dispose();
            throw;
        }
    }

    /// <summary>
    /// Creates a handler that checks every connection with <see cref="ConnectAsync"/>, never follows a redirect,
    /// and uses no system proxy. A caller that builds its own client with it must follow redirects itself and
    /// check them with <see cref="IsRedirectAllowed"/>.
    /// </summary>
    /// <returns>A new handler. The caller owns it.</returns>
    public SocketsHttpHandler CreateHandler() => new()
    {
        ConnectCallback = ConnectAsync,
        AllowAutoRedirect = false,
        UseProxy = false,
        AutomaticDecompression = DecompressionMethods.All,
        PooledConnectionLifetime = TimeSpan.FromMinutes(2),
    };

    private static HttpClient BuildClient(bool allowPrivateNetwork)
        => new(new SsrfGuard(allowPrivateNetwork).CreateHandler(), disposeHandler: true) { Timeout = Timeout.InfiniteTimeSpan };

    private static async Task<IPAddress[]> ResolveAsync(string host, CancellationToken cancellationToken)
        => await Dns.GetHostAddressesAsync(host, cancellationToken).ConfigureAwait(false);

    private string? ValidateUri(Uri uri)
    {
        if (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps)
        {
            return "only http and https URLs are allowed";
        }

        if (!string.IsNullOrEmpty(uri.UserInfo))
        {
            return "a URL with a user name or password is not allowed";
        }

        if (string.IsNullOrEmpty(uri.Host))
        {
            return "the URL has no host";
        }

        if (uri.IdnHost.Contains('%', StringComparison.Ordinal))
        {
            return "a scoped IPv6 address is not allowed";
        }

        var plainHttp = uri.Scheme == Uri.UriSchemeHttp;
        if (plainHttp && RequireHttpsForPublic && !AllowPrivateNetwork)
        {
            return PlainHttpRefusal;
        }

        if (IPAddress.TryParse(uri.Host.Trim('[', ']'), out var address))
        {
            var rejection = ClassifyAddress(address);
            if (rejection is not null)
            {
                return uri.Host + " is refused, " + rejection;
            }

            if (plainHttp && RequireHttpsForPublic && !IsPrivateOrLoopback(address))
            {
                return uri.Host + " is a public address, and " + PlainHttpRefusal;
            }
        }

        return null;
    }

    private string? ClassifyAll(string host, IPAddress[] addresses, bool plainHttp)
    {
        if (addresses.Length == 0)
        {
            return "the name '" + host + "' does not resolve";
        }

        foreach (var address in addresses)
        {
            var rejection = ClassifyAddress(address);
            if (rejection is not null)
            {
                return "the name '" + host + "' resolves to " + address + ", " + rejection;
            }

            if (plainHttp && RequireHttpsForPublic && !IsPrivateOrLoopback(address))
            {
                return "the name '" + host + "' resolves to " + address + ", a public address, and " + PlainHttpRefusal;
            }
        }

        return null;
    }

    private static string? ClassifyV6(IPAddress address, bool allowPrivateNetwork)
    {
        if (address.Equals(IPAddress.IPv6Any))
        {
            return "the unspecified address (::) is not allowed";
        }

        if (address.IsIPv6Multicast)
        {
            return "multicast addresses are not allowed";
        }

        if (address.IsIPv6LinkLocal)
        {
            return "link local addresses (fe80::/10) are not allowed";
        }

        if (address.IsIPv6SiteLocal)
        {
            return "site local addresses (fec0::/10) are not allowed";
        }

        var bytes = address.GetAddressBytes();
        if (bytes[0] == 0x20 && bytes[1] == 0x01 && bytes[2] == 0 && bytes[3] == 0)
        {
            return "Teredo addresses (2001::/32) are not allowed";
        }

        if (bytes[0] == 0x00 && bytes[1] == 0x64 && bytes[2] == 0xFF && bytes[3] == 0x9B && bytes[4] == 0 && bytes[5] == 0x01)
        {
            return "local use NAT64 addresses (64:ff9b:1::/48) are not allowed";
        }

        if (IsIsatap(bytes))
        {
            var embedded = Classify(new IPAddress(new[] { bytes[12], bytes[13], bytes[14], bytes[15] }), allowPrivateNetwork);
            if (embedded is not null)
            {
                return "an ISATAP address that carries a refused IPv4 address, " + embedded;
            }
        }

        if (allowPrivateNetwork)
        {
            return null;
        }

        if (IPAddress.IsLoopback(address))
        {
            return "loopback addresses are not allowed";
        }

        if ((bytes[0] & 0xFE) == 0xFC)
        {
            return "unique local addresses (fc00::/7) are not allowed";
        }

        return null;
    }

    // An ISATAP interface identifier is 0000:5efe or 0200:5efe followed by an IPv4 address, whatever the prefix is.
    private static bool IsIsatap(byte[] bytes)
        => (bytes[8] & 0xFD) == 0 && bytes[9] == 0 && bytes[10] == 0x5E && bytes[11] == 0xFE;

    // Returns the IPv4 address an IPv6 address carries as a mapped, translated, NAT64, IPv4 compatible, or 6to4 address,
    // so the IPv4 rules judge it. Any other address is returned unchanged.
    private static IPAddress Unwrap(IPAddress address)
    {
        if (address.AddressFamily != AddressFamily.InterNetworkV6)
        {
            return address;
        }

        if (address.IsIPv4MappedToIPv6)
        {
            return address.MapToIPv4();
        }

        if (address.Equals(IPAddress.IPv6Any) || address.Equals(IPAddress.IPv6Loopback))
        {
            return address;
        }

        var bytes = address.GetAddressBytes();
        if (ZeroRun(bytes, 0, 12))
        {
            return new IPAddress(new[] { bytes[12], bytes[13], bytes[14], bytes[15] });
        }

        if (ZeroRun(bytes, 0, 8) && bytes[8] == 0xFF && bytes[9] == 0xFF && bytes[10] == 0 && bytes[11] == 0)
        {
            return new IPAddress(new[] { bytes[12], bytes[13], bytes[14], bytes[15] });
        }

        if (bytes[0] == 0x00 && bytes[1] == 0x64 && bytes[2] == 0xFF && bytes[3] == 0x9B && ZeroRun(bytes, 4, 12))
        {
            return new IPAddress(new[] { bytes[12], bytes[13], bytes[14], bytes[15] });
        }

        if (bytes[0] == 0x20 && bytes[1] == 0x02)
        {
            return new IPAddress(new[] { bytes[2], bytes[3], bytes[4], bytes[5] });
        }

        return address;
    }

    private static bool ZeroRun(byte[] bytes, int start, int end)
    {
        for (var i = start; i < end; i++)
        {
            if (bytes[i] != 0)
            {
                return false;
            }
        }

        return true;
    }
}
