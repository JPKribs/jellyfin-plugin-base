using System;
using System.Buffers.Text;
using System.Diagnostics.CodeAnalysis;
using System.Linq;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// One browser that signed up for a Jellyfin user's web push, as the page's <c>subscribeWebPush</c> sends it.
/// </summary>
/// <param name="UserId">The Jellyfin user it is for.</param>
/// <param name="Endpoint">The push service address the browser gave, which also identifies the subscription.</param>
/// <param name="P256dh">The browser's P-256 public key, base64url.</param>
/// <param name="Auth">The browser's authentication secret, base64url.</param>
/// <param name="Label">A short name for the device, such as Safari · iPhone, for a list of devices.</param>
/// <param name="CreatedUtc">When it signed up, in UTC.</param>
public sealed record WebPushSubscription(Guid UserId, string Endpoint, string P256dh, string Auth, string Label, DateTime CreatedUtc)
{
    /// <summary>The longest endpoint taken, in characters.</summary>
    public const int MaxEndpointLength = 2048;

    /// <summary>The longest label kept, in characters.</summary>
    public const int MaxLabelLength = 100;

    /// <summary>
    /// Checks what a page sent and makes a subscription of it. The endpoint must be an absolute https address with no user info,
    /// the key a P-256 point, and the secret 16 octets.
    /// </summary>
    /// <param name="userId">The signed in user the page belongs to.</param>
    /// <param name="endpoint">The endpoint the browser gave.</param>
    /// <param name="p256dh">The browser's public key.</param>
    /// <param name="auth">The browser's authentication secret.</param>
    /// <param name="label">A short name for the device, cut to <see cref="MaxLabelLength"/>.</param>
    /// <param name="subscription">The subscription, when everything checks out.</param>
    /// <returns><c>true</c> when the values make a subscription.</returns>
    public static bool TryCreate(Guid userId, string? endpoint, string? p256dh, string? auth, string? label, [NotNullWhen(true)] out WebPushSubscription? subscription)
    {
        subscription = null;
        endpoint = endpoint?.Trim();
        if (userId == Guid.Empty || string.IsNullOrEmpty(endpoint) || endpoint.Length > MaxEndpointLength
            || !Uri.TryCreate(endpoint, UriKind.Absolute, out var uri) || uri.Scheme != Uri.UriSchemeHttps || !string.IsNullOrEmpty(uri.UserInfo)
            || !IsKey(p256dh, 65) || !IsKey(auth, 16))
        {
            return false;
        }

        var name = new string((label ?? string.Empty).Where(c => !char.IsControl(c)).ToArray()).Trim();
        subscription = new WebPushSubscription(userId, endpoint, p256dh!.Trim().TrimEnd('='), auth!.Trim().TrimEnd('='), NotifyTemplate.Clip(name, MaxLabelLength), DateTime.UtcNow);
        return true;
    }

    private static bool IsKey(string? value, int length)
    {
        try
        {
            var bytes = Base64Url.DecodeFromChars((value ?? string.Empty).Trim().TrimEnd('='));
            return bytes.Length == length && (length != 65 || bytes[0] == 0x04);
        }
        catch (FormatException)
        {
            return false;
        }
    }
}
