using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;
using MediaBrowser.Controller.Session;
using MediaBrowser.Model.Session;
using Microsoft.Extensions.Logging;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// Sends a <see cref="NotifyMessage"/> to Discord, a webhook, a Jellyfin user's devices, or a browser through web push, each in its own
/// format, and previews what each would get. A failed send is a <see cref="NotifyResult"/>, never an exception.
/// </summary>
/// <remarks>
/// Posts go through <see cref="BaseHttp"/> with up to two retries for a failure that may pass, and at most
/// <see cref="MaxConcurrentSends"/> destinations are sent to at once across the plugin. A Jellyfin message for someone with no device
/// online is kept by the <see cref="INotifyHeldStore"/> and shown by <see cref="ReleaseHeldAsync"/> once one comes online.
/// </remarks>
public sealed class BaseNotifier
{
    /// <summary>The most destinations the plugin sends to at once, so a burst of updates never opens a connection for each.</summary>
    public const int MaxConcurrentSends = 4;

    /// <summary>How long a Jellyfin message shows, in milliseconds.</summary>
    public const int MessageTimeoutMs = 15000;

    /// <summary>The name a Discord post comes from when its destination sets none.</summary>
    public const string DefaultUsername = "Jellyfin";

    /// <summary>
    /// The name of the HTTP client posts go through, which <see cref="ServiceCollectionExtensions.AddBaseNotifier"/> registers to follow no
    /// redirect, so a webhook's headers never reach another host.
    /// </summary>
    public const string HttpClientName = "JPKribs.Jellyfin.Base.Notifier";

    // Discord's limits for a webhook post.
    private const int DiscordTitleLength = 256;
    private const int DiscordDescriptionLength = 4000;
    private const int DiscordFieldNameLength = 256;
    private const int DiscordFieldValueLength = 1024;
    private const int DiscordFieldCount = 25;
    private const int DiscordUsernameLength = 80;

    // The plugin's one notifier sends in the background without anyone waiting, so the limit is kept for the process.
    private static readonly SemaphoreSlim _sending = new(MaxConcurrentSends, MaxConcurrentSends);

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ISessionManager _sessionManager;
    private readonly ILogger<BaseNotifier> _logger;
    private readonly SecretProtector? _secrets;
    private readonly INotifyHeldStore? _heldStore;
    private readonly IWebPushStore? _pushStore;

    /// <summary>
    /// Initializes a new instance of the <see cref="BaseNotifier"/> class.
    /// </summary>
    /// <param name="httpClientFactory">The HTTP client factory, whose <see cref="HttpClientName"/> client posts go through.</param>
    /// <param name="sessionManager">The session manager, for Jellyfin messages.</param>
    /// <param name="logger">The logger.</param>
    /// <param name="secrets">The plugin's protector, which reads each destination's encrypted address and headers.</param>
    /// <param name="heldStore">Where Jellyfin messages wait for a device, or <c>null</c> to hold none.</param>
    /// <param name="pushStore">Where the VAPID keys and web push subscriptions live, or <c>null</c> for no web push.</param>
    public BaseNotifier(
        IHttpClientFactory httpClientFactory,
        ISessionManager sessionManager,
        ILogger<BaseNotifier> logger,
        SecretProtector? secrets = null,
        INotifyHeldStore? heldStore = null,
        IWebPushStore? pushStore = null)
    {
        ArgumentNullException.ThrowIfNull(httpClientFactory);
        ArgumentNullException.ThrowIfNull(sessionManager);
        ArgumentNullException.ThrowIfNull(logger);
        _httpClientFactory = new NamedClientFactory(httpClientFactory);
        _sessionManager = sessionManager;
        _logger = logger;
        _secrets = secrets;
        _heldStore = heldStore;
        _pushStore = pushStore;
    }

    /// <summary>
    /// Gets or sets the <see cref="SsrfGuard"/> Discord and webhook posts go through. <c>null</c>, the default, is <see cref="BaseHttp"/>'s
    /// own check, which reaches addresses on the local network and goes through Jellyfin's proxy.
    /// </summary>
    public SsrfGuard? WebhookGuard { get; set; }

    /// <summary>
    /// Gets or sets the <see cref="SsrfGuard"/> a web push goes through. A browser chose the address, so it is
    /// <see cref="SsrfGuard.PublicOnly"/> by default. A test may set <see cref="SsrfGuard.Disabled"/> to reach a stand in push service.
    /// </summary>
    public SsrfGuard PushGuard { get; set; } = SsrfGuard.PublicOnly;

    // How many times a failure that may pass is tried again.
    internal int Retries { get; set; } = 2;

    // The clock a web push token is signed against.
    internal TimeProvider Clock { get; set; } = TimeProvider.System;

    /// <summary>
    /// Gets whether a session is online and can show a Jellyfin message.
    /// </summary>
    /// <param name="session">The session.</param>
    /// <returns><c>true</c> when it can.</returns>
    public static bool CanShowMessages(SessionInfo session)
        => session is not null && session.IsActive && session.SupportedCommands?.Contains(GeneralCommandType.DisplayMessage) == true;

    /// <summary>
    /// Sends a message to each destination that is on, in the background, without waiting. A failure is logged.
    /// </summary>
    /// <param name="destinations">The destinations. One that is off is passed over.</param>
    /// <param name="message">The message. Do not change it after the call.</param>
    public void Send(IEnumerable<NotifyDestination> destinations, NotifyMessage message)
    {
        ArgumentNullException.ThrowIfNull(message);
        Send(destinations, _ => message);
    }

    /// <summary>
    /// Sends each destination that is on its own message, in the background, without waiting. A failure is logged.
    /// </summary>
    /// <param name="destinations">The destinations. One that is off is passed over.</param>
    /// <param name="messageFor">Builds the message for a destination, or returns <c>null</c> to send it nothing.</param>
    public void Send(IEnumerable<NotifyDestination> destinations, Func<NotifyDestination, NotifyMessage?> messageFor)
    {
        ArgumentNullException.ThrowIfNull(destinations);
        ArgumentNullException.ThrowIfNull(messageFor);
        _ = SendInBackgroundAsync(destinations.ToList(), messageFor);
    }

    /// <summary>
    /// Sends a message to each destination that is on, and waits for every one.
    /// </summary>
    /// <param name="destinations">The destinations. One that is off is passed over.</param>
    /// <param name="message">The message.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A result for each destination sent to, in order.</returns>
    public Task<IReadOnlyList<NotifyResult>> SendAsync(IEnumerable<NotifyDestination> destinations, NotifyMessage message, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(message);
        return SendAsync(destinations, _ => message, cancellationToken);
    }

    /// <summary>
    /// Sends each destination that is on its own message, and waits for every one.
    /// </summary>
    /// <param name="destinations">The destinations. One that is off is passed over.</param>
    /// <param name="messageFor">Builds the message for a destination, or returns <c>null</c> to send it nothing.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A result for each destination sent to, in order.</returns>
    public async Task<IReadOnlyList<NotifyResult>> SendAsync(IEnumerable<NotifyDestination> destinations, Func<NotifyDestination, NotifyMessage?> messageFor, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(destinations);
        ArgumentNullException.ThrowIfNull(messageFor);
        var sends = new List<Task<NotifyResult>>();
        foreach (var destination in destinations.Where(d => d is not null && d.Enabled))
        {
            if (messageFor(destination) is { } message)
            {
                sends.Add(SendAsync(destination, message, cancellationToken));
            }
        }

        return await Task.WhenAll(sends).ConfigureAwait(false);
    }

    /// <summary>
    /// Sends a message to one destination, whether it is on or not, such as for a test, and says what happened.
    /// </summary>
    /// <param name="destination">The destination.</param>
    /// <param name="message">The message.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>What happened, in the language of the call path.</returns>
    /// <exception cref="OperationCanceledException">The caller's <paramref name="cancellationToken"/> was cancelled.</exception>
    public async Task<NotifyResult> SendAsync(NotifyDestination destination, NotifyMessage message, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(destination);
        ArgumentNullException.ThrowIfNull(message);
        await _sending.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            return destination.Channel switch
            {
                NotifyChannel.Jellyfin => await ShowInJellyfinAsync(destination, message, cancellationToken).ConfigureAwait(false),
                NotifyChannel.WebPush => await PushAsync(destination, message, cancellationToken).ConfigureAwait(false),
                _ => await PostAsync(destination, message, cancellationToken).ConfigureAwait(false)
            };
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not send to {Destination}", FormatUtilities.SanitizeForLog(destination.Name));
            return Fail(destination, BaseTranslations.Text("Base.NotifyNotSent", "Could not send."));
        }
        finally
        {
            _sending.Release();
        }
    }

    /// <summary>
    /// Builds what a destination would get for a message, through the same code that sends it, without sending anything.
    /// </summary>
    /// <param name="destination">The destination.</param>
    /// <param name="message">The message.</param>
    /// <returns>The preview.</returns>
    public static NotifyPreview Preview(NotifyDestination destination, NotifyMessage message)
    {
        ArgumentNullException.ThrowIfNull(destination);
        ArgumentNullException.ThrowIfNull(message);
        var preview = new NotifyPreview { DestinationId = destination.Id, Channel = destination.Channel };
        switch (destination.Channel)
        {
            case NotifyChannel.Jellyfin:
                (preview.Header, preview.Text) = JellyfinMessage(message);
                if (preview.Header.Length == 0 && preview.Text.Length == 0)
                {
                    preview.Error = EmptyText();
                }

                break;
            case NotifyChannel.WebPush:
                preview.Method = HttpMethod.Post.Method;
                preview.ContentType = "application/json";
                preview.Body = PushPayload(message);
                break;
            default:
                var post = BuildPost(destination, message);
                if (post.Error is not null)
                {
                    preview.Error = post.Error;
                    break;
                }

                preview.Method = HttpMethod.Post.Method;
                preview.ContentType = post.ContentType;
                preview.Body = post.Body;
                if (destination.Channel == NotifyChannel.Discord)
                {
                    preview.Discord = JsonNode.Parse(post.Body);
                }

                break;
        }

        return preview;
    }

    /// <summary>
    /// Shows the messages held for someone on their devices that can show messages, once one has come online. A message meant for one
    /// device shows only on the one that came online. Any that cannot be shown are held again. <see cref="NotifyHeldWatcher"/> calls it.
    /// </summary>
    /// <param name="userId">The Jellyfin user.</param>
    /// <param name="sessionId">The session that came online, when known.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A task that completes once they were shown or held again.</returns>
    public async Task ReleaseHeldAsync(Guid userId, string? sessionId, CancellationToken cancellationToken)
    {
        if (_heldStore is null)
        {
            return;
        }

        var sessions = Showing(userId);
        if (sessions.Count == 0)
        {
            return;
        }

        // The device that came online, or the one used most recently when it is not known or cannot show messages.
        var first = sessions.FirstOrDefault(s => string.Equals(s.Id, sessionId, StringComparison.Ordinal))
            ?? Devices(sessions, true, s => s.LastActivityDate)[0];

        // Taken all at once, so a second device connecting alongside finds none left and a one device message shows once.
        var taken = _heldStore.Take(userId);
        var next = 0;
        try
        {
            for (; next < taken.Count; next++)
            {
                var held = taken[next];
                if (!_heldStore.IsStillDue(held))
                {
                    continue;
                }

                var to = held.OneDevice ? new List<SessionInfo> { first } : sessions;
                if (await ShowAsync(to, held.Header, held.Text, cancellationToken).ConfigureAwait(false) == 0)
                {
                    _heldStore.Hold(held);
                }
            }
        }
        finally
        {
            // The one being shown when it stopped is held again too, so it shows twice at worst and is never lost.
            foreach (var held in taken.Skip(next))
            {
                _heldStore.Hold(held);
            }
        }
    }

    /// <summary>
    /// Gets the VAPID public key a page subscribes with.
    /// </summary>
    /// <returns>The key, base64url, or <c>null</c> when web push is not set up.</returns>
    public string? GetPublicKey() => _pushStore?.GetKeys()?.PublicKey;

    /// <summary>
    /// Keeps the web push subscription a page sent for its signed in user, after checking it.
    /// </summary>
    /// <param name="userId">The signed in user.</param>
    /// <param name="endpoint">The subscription's endpoint.</param>
    /// <param name="p256dh">The browser's public key.</param>
    /// <param name="auth">The browser's authentication secret.</param>
    /// <param name="label">A short name for the device.</param>
    /// <returns><c>true</c> when it was kept, <c>false</c> when it was not valid or web push is not set up.</returns>
    public bool Subscribe(Guid userId, string? endpoint, string? p256dh, string? auth, string? label)
    {
        if (_pushStore is null || !WebPushSubscription.TryCreate(userId, endpoint, p256dh, auth, label, out var subscription))
        {
            return false;
        }

        _pushStore.Save(subscription);
        return true;
    }

    /// <summary>
    /// Removes one of a user's web push subscriptions. Another user's is never removed.
    /// </summary>
    /// <param name="userId">The signed in user.</param>
    /// <param name="endpoint">The subscription's endpoint.</param>
    /// <returns><c>true</c> when it was the user's and was removed.</returns>
    public bool Unsubscribe(Guid userId, string? endpoint)
    {
        if (_pushStore is null || string.IsNullOrEmpty(endpoint)
            || !_pushStore.GetSubscriptions(userId).Any(s => string.Equals(s.Endpoint, endpoint, StringComparison.Ordinal)))
        {
            return false;
        }

        _pushStore.Remove(endpoint);
        return true;
    }

    // The devices a Jellyfin message goes to, of those online that can show it: the one used most recently for a one device
    // message, else all of them.
    internal static List<T> Devices<T>(IReadOnlyList<T> online, bool oneDevice, Func<T, DateTime> lastActive)
        => oneDevice ? online.OrderByDescending(lastActive).Take(1).ToList() : online.ToList();

    // The values every template can use, with the plugin's own on top.
    internal static Dictionary<string, string> Values(NotifyMessage message)
    {
        var values = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["link"] = Absolute(message.LinkUrl) ?? string.Empty,
            ["image"] = Absolute(message.ImageUrl) ?? string.Empty,
            ["thumbnail"] = Absolute(message.ThumbnailUrl) ?? string.Empty,
            ["color"] = message.Color?.ToString(CultureInfo.InvariantCulture) ?? string.Empty,
            ["time"] = message.Timestamp is { } time ? UtcText(time) : string.Empty,
            ["language"] = message.Language ?? string.Empty
        };
        foreach (var (key, value) in message.Values)
        {
            values[key] = value ?? string.Empty;
        }

        return values;
    }

    // A Discord embed, from the message's text, fields, images, link, color, and time.
    internal static JsonObject? BuildDiscord(NotifyDestination destination, NotifyMessage message)
    {
        var values = Values(message);

        // Discord shows an embed's title as plain text, so only the description and fields escape their values.
        var title = NotifyTemplate.Clip(NotifyTemplate.Fill(message.Title, values), DiscordTitleLength);
        var description = NotifyTemplate.Clip(NotifyTemplate.Fill(message.Text, values, NotifyTemplate.EscapeDiscord), DiscordDescriptionLength);
        var fields = new JsonArray();
        foreach (var field in message.Fields.Where(f => !string.IsNullOrWhiteSpace(f.Value)).Take(DiscordFieldCount))
        {
            fields.Add(new JsonObject
            {
                ["name"] = NotifyTemplate.Clip(field.Name, DiscordFieldNameLength),
                ["value"] = NotifyTemplate.Clip(NotifyTemplate.EscapeDiscord(field.Value.Trim()), DiscordFieldValueLength),
                ["inline"] = field.Inline
            });
        }

        if (title.Length == 0 && description.Length == 0 && fields.Count == 0)
        {
            return null;
        }

        var embed = new JsonObject { ["title"] = title, ["description"] = description };
        if (message.Color is { } color)
        {
            embed["color"] = color & 0xFFFFFF;
        }

        if (Absolute(message.LinkUrl) is { } link)
        {
            embed["url"] = link;
        }

        if (fields.Count > 0)
        {
            embed["fields"] = fields;
        }

        if (Absolute(message.ThumbnailUrl) is { } thumbnail)
        {
            embed["thumbnail"] = new JsonObject { ["url"] = thumbnail };
        }

        if (Absolute(message.ImageUrl) is { } image)
        {
            embed["image"] = new JsonObject { ["url"] = image };
        }

        if (message.Timestamp is { } time)
        {
            embed["timestamp"] = UtcText(time);
        }

        // Mentions are off, so nothing people wrote can ping anyone.
        var post = new JsonObject
        {
            ["username"] = NotifyTemplate.Clip(string.IsNullOrWhiteSpace(destination.Username) ? DefaultUsername : destination.Username.Trim(), DiscordUsernameLength)
        };
        if (Absolute(destination.AvatarUrl) is { } avatar)
        {
            post["avatar_url"] = avatar;
        }

        post["embeds"] = new JsonArray(embed);
        post["allowed_mentions"] = new JsonObject { ["parse"] = new JsonArray() };
        return post;
    }

    // A webhook's JSON: the message's data first, in its order, then the title, text, and link, and the images, color, time,
    // language, and fields that are set, each only where the data does not set the key itself.
    internal static JsonObject BuildWebhook(NotifyMessage message)
    {
        var values = Values(message);
        var post = new JsonObject();
        foreach (var (key, value) in message.Data)
        {
            post[key] = value?.DeepClone();
        }

        void Add(string key, JsonNode? value, bool always = false)
        {
            if (!post.ContainsKey(key) && (always || value is not null))
            {
                post[key] = value;
            }
        }

        Add("title", NotifyTemplate.Fill(message.Title, values), true);
        Add("message", NotifyTemplate.Fill(message.Text, values), true);
        Add("link", Absolute(message.LinkUrl), true);
        Add("image", Absolute(message.ImageUrl));
        Add("thumbnail", Absolute(message.ThumbnailUrl));
        Add("language", string.IsNullOrEmpty(message.Language) ? null : message.Language);
        Add("color", message.Color);
        Add("time", message.Timestamp is { } time ? UtcText(time) : null);
        var fields = new JsonArray();
        foreach (var field in message.Fields.Where(f => !string.IsNullOrWhiteSpace(f.Value)))
        {
            fields.Add(new JsonObject { ["name"] = field.Name, ["value"] = field.Value.Trim() });
        }

        Add("fields", fields.Count > 0 ? fields : null);
        return post;
    }

    // A time as UTC in ISO 8601 with a trailing Z, as Discord and webhooks read it.
    internal static string UtcText(DateTimeOffset time) => time.UtcDateTime.ToString("o", CultureInfo.InvariantCulture);

    // A Discord or webhook post: its custom body filled in, or the JSON built from the message, or why there is none.
    internal static PostBuild BuildPost(NotifyDestination destination, NotifyMessage message)
    {
        var discord = destination.Channel == NotifyChannel.Discord;
        if (!destination.UseCustomBody)
        {
            if (!discord)
            {
                return new PostBuild(BuildWebhook(message).ToJsonString(), "application/json", null);
            }

            return BuildDiscord(destination, message) is { } built
                ? new PostBuild(built.ToJsonString(), "application/json", null)
                : new PostBuild(string.Empty, string.Empty, EmptyText());
        }

        // In Discord, what people wrote shows as typed, as in the built post, so no masked link appears under the webhook's name.
        var values = Values(message);
        if (discord)
        {
            foreach (var key in message.Values.Keys.Where(k => !message.PlainKeys.Contains(k)).ToList())
            {
                values[key] = NotifyTemplate.EscapeDiscord(values[key]);
            }
        }

        values["updateTitle"] = NotifyTemplate.Fill(message.Title, values);
        values["updateMessage"] = NotifyTemplate.Fill(message.Text, values);
        var json = message.Data.ToDictionary(p => p.Key, p => p.Value, StringComparer.OrdinalIgnoreCase);
        var (text, isJson) = NotifyTemplate.RenderBody(destination.Body, values, json);
        if (discord && !isJson)
        {
            return new PostBuild(string.Empty, string.Empty, BaseTranslations.Text("Base.NotifyDiscordJson", "Discord needs a JSON body."));
        }

        // A custom Discord body pings no one unless it says so itself.
        if (discord && JsonNode.Parse(text) is JsonObject post && !post.ContainsKey("allowed_mentions"))
        {
            post["allowed_mentions"] = new JsonObject { ["parse"] = new JsonArray() };
            text = post.ToJsonString();
        }

        return new PostBuild(text, isJson ? "application/json" : "text/plain", null);
    }

    // The header and text of a Jellyfin message. Its apps may show them as HTML, so the values lose their angle brackets.
    internal static (string Header, string Text) JellyfinMessage(NotifyMessage message)
    {
        var values = Values(message);
        return (NotifyTemplate.Fill(message.Title, values, NotifyTemplate.StripMarkup), NotifyTemplate.Fill(message.Text, values, NotifyTemplate.StripMarkup));
    }

    // The JSON a service worker reads from a web push, made to fit one record: the image, then the icon, then the text, then the
    // title, then the link give way.
    internal static string PushPayload(NotifyMessage message)
    {
        var values = Values(message);
        var payload = new PushJson(
            NotifyTemplate.Fill(message.Title, values),
            NotifyTemplate.Fill(message.Text, values),
            Absolute(message.ThumbnailUrl),
            Absolute(message.ImageUrl),
            PushLink(message.LinkUrl),
            string.IsNullOrWhiteSpace(message.Tag) ? null : NotifyTemplate.Clip(message.Tag.Trim(), 64),
            string.IsNullOrWhiteSpace(message.Language) ? null : message.Language.Trim(),
            message.Timestamp?.ToUnixTimeMilliseconds());
        while (true)
        {
            var json = JsonSerializer.Serialize(payload, PushJsonOptions);
            var over = Encoding.UTF8.GetByteCount(json) - WebPushEncryption.MaxPlaintextLength;
            if (over <= 0)
            {
                return json;
            }

            payload = payload.Image is not null ? payload with { Image = null }
                : payload.Icon is not null ? payload with { Icon = null }
                : payload.Body.Length > 1 ? payload with { Body = NotifyTemplate.Clip(payload.Body, Math.Max(1, payload.Body.Length - over)) }
                : payload.Title.Length > 1 ? payload with { Title = NotifyTemplate.Clip(payload.Title, Math.Max(1, payload.Title.Length - over)) }
                : payload with { Url = null, Tag = null };
        }
    }

    private static readonly JsonSerializerOptions PushJsonOptions = new() { DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull };

    // A web push link: an http or https address, or a relative one, which the worker resolves against its scope. Any other
    // scheme is left out.
    internal static string? PushLink(string? url)
    {
        var text = (url ?? string.Empty).Trim();
        if (text.Length == 0 || text.Any(char.IsControl))
        {
            return null;
        }

        // A colon before any slash, question mark, or hash starts a scheme, so the address is absolute.
        var colon = text.IndexOf(':', StringComparison.Ordinal);
        var path = text.IndexOfAny(PathMarks);
        return colon >= 0 && (path < 0 || colon < path) ? Absolute(text) : text;
    }

    private static readonly char[] PathMarks = { '/', '?', '#' };

    private static string? Absolute(string? url)
        => UrlUtilities.TryGetHttpUri(url, out var uri) ? uri.AbsoluteUri : null;

    private static string EmptyText() => BaseTranslations.Text("Base.NotifyEmpty", "The message has no title or text.");

    private static NotifyResult Fail(NotifyDestination destination, string message, int status = 0)
        => new(destination.Id, destination.Channel, false, message, status);

    private async Task SendInBackgroundAsync(List<NotifyDestination> destinations, Func<NotifyDestination, NotifyMessage?> messageFor)
    {
        try
        {
            await SendAsync(destinations, messageFor, CancellationToken.None).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            // Sent in the background, where nothing else would see it fail.
            _logger.LogWarning(ex, "Sending a notification failed");
        }
    }

    private string Unprotect(string value)
        => _secrets is not null ? _secrets.Unprotect(value) : SecretProtector.IsProtected(value) ? string.Empty : value;

    private async Task<NotifyResult> PostAsync(NotifyDestination destination, NotifyMessage message, CancellationToken cancellationToken)
    {
        var url = Unprotect(destination.Url).Trim();
        if (url.Length == 0)
        {
            return Fail(destination, BaseTranslations.Text("Base.NotifyNoAddress", "Save an address first."));
        }

        var post = BuildPost(destination, message);
        if (post.Error is not null)
        {
            return Fail(destination, post.Error);
        }

        var headers = destination.Channel == NotifyChannel.Webhook ? NotifyTemplate.ParseHeaders(Unprotect(destination.Headers)) : Array.Empty<KeyValuePair<string, string>>();
        if (headers is null)
        {
            return Fail(destination, BaseTranslations.Text("Base.NotifyHeadersInvalid", "The headers are not valid. Write each one on its own line as a name, a colon, and a value."));
        }

        var result = await WithRetryAsync(
            ct => BaseHttp.SendAsync(_httpClientFactory, HttpMethod.Post, url, ct, headers, post.Body, post.ContentType, guard: WebhookGuard),
            cancellationToken).ConfigureAwait(false);
        if (!result.Ok)
        {
            _logger.LogWarning("{Destination} answered {Status}", FormatUtilities.SanitizeForLog(destination.Name), result.Status);
            return Fail(destination, Answer(result), result.Status);
        }

        return new NotifyResult(destination.Id, destination.Channel, true, BaseTranslations.Text("Base.NotifySent", "Sent."), result.Status);
    }

    private static string Answer(HttpResult result)
        => result.Status == 0
            ? BaseTranslations.Text("Base.NotifyUnreachable", "Could not reach the address.")
            : BaseTranslations.Text("Base.NotifyAnswered", "The address answered {0}.", result.Status.ToString(CultureInfo.InvariantCulture));

    private async Task<NotifyResult> ShowInJellyfinAsync(NotifyDestination destination, NotifyMessage message, CancellationToken cancellationToken)
    {
        var people = message.Recipients.Where(p => p != Guid.Empty).Distinct().ToList();
        if (people.Count == 0)
        {
            return Fail(destination, NoRecipientsText());
        }

        var (header, text) = JellyfinMessage(message);
        if (header.Length == 0 && text.Length == 0)
        {
            return Fail(destination, EmptyText());
        }

        var shown = 0;
        var held = 0;
        foreach (var person in people)
        {
            var count = await ShowAsync(Devices(Showing(person), message.OneDevice, s => s.LastActivityDate), header, text, cancellationToken).ConfigureAwait(false);
            if (count == 0 && message.Hold && _heldStore is not null)
            {
                _heldStore.Hold(new NotifyHeldMessage(Guid.NewGuid(), person, header, text, DateTime.UtcNow, message.OneDevice, message.Subject ?? string.Empty));
                held++;
            }

            shown += count;
        }

        if (shown > 0)
        {
            var said = shown == 1
                ? BaseTranslations.Text("Base.NotifyShownOne", "Shown on 1 device.")
                : BaseTranslations.Text("Base.NotifyShownMany", "Shown on {0} devices.", shown);
            return new NotifyResult(destination.Id, destination.Channel, true, said, 0, shown, held);
        }

        return held > 0
            ? new NotifyResult(destination.Id, destination.Channel, true, BaseTranslations.Text("Base.NotifyHeld", "Held until a device is online."), 0, 0, held)
            : Fail(destination, BaseTranslations.Text("Base.NotifyNoDevice", "No device that can show messages is online."));
    }

    // Someone's devices that are online and can show messages.
    private List<SessionInfo> Showing(Guid userId)
        => _sessionManager.Sessions.Where(s => s.UserId == userId && CanShowMessages(s)).ToList();

    // Shows a message on each device, and says on how many it showed.
    private async Task<int> ShowAsync(List<SessionInfo> sessions, string header, string text, CancellationToken cancellationToken)
    {
        var command = new MessageCommand { Header = header, Text = text, TimeoutMs = MessageTimeoutMs };
        var shown = 0;
        foreach (var session in sessions)
        {
            try
            {
                await _sessionManager.SendMessageCommand(null, session.Id, command, cancellationToken).ConfigureAwait(false);
                shown++;
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception ex)
            {
                // A device that cannot show it never stops the others from hearing about it.
                _logger.LogDebug(ex, "Could not message session {Session}", FormatUtilities.SanitizeForLog(session.Id));
            }
        }

        return shown;
    }

    private async Task<NotifyResult> PushAsync(NotifyDestination destination, NotifyMessage message, CancellationToken cancellationToken)
    {
        if (_pushStore?.GetKeys() is not { } keys)
        {
            return Fail(destination, BaseTranslations.Text("Base.NotifyNoKeys", "Web push is not set up."));
        }

        var people = message.Recipients.Where(p => p != Guid.Empty).Distinct().ToList();
        if (people.Count == 0)
        {
            return Fail(destination, NoRecipientsText());
        }

        var subscriptions = people.SelectMany(p => _pushStore.GetSubscriptions(p) ?? Array.Empty<WebPushSubscription>()).Where(s => s is not null).ToList();
        if (subscriptions.Count == 0)
        {
            return Fail(destination, BaseTranslations.Text("Base.NotifyNoSubscription", "No device is signed up for notifications."));
        }

        var payload = Encoding.UTF8.GetBytes(PushPayload(message));
        var sent = 0;
        HttpResult? failed = null;
        foreach (var subscription in subscriptions)
        {
            var result = await PushOneAsync(keys, subscription, payload, message, cancellationToken).ConfigureAwait(false);
            if (result.Ok)
            {
                sent++;
            }
            else
            {
                failed = result;
            }
        }

        if (sent > 0)
        {
            var said = sent == 1
                ? BaseTranslations.Text("Base.NotifyPushedOne", "Sent to 1 device.")
                : BaseTranslations.Text("Base.NotifyPushedMany", "Sent to {0} devices.", sent);
            return new NotifyResult(destination.Id, destination.Channel, true, said, 0, sent);
        }

        return Fail(destination, Answer(failed!), failed!.Status);
    }

    // Sends one encrypted push, and removes the subscription when its push service no longer knows it.
    private async Task<HttpResult> PushOneAsync(WebPushKeys keys, WebPushSubscription subscription, byte[] payload, NotifyMessage message, CancellationToken cancellationToken)
    {
        byte[] body;
        try
        {
            body = WebPushEncryption.Encrypt(payload, subscription.P256dh, subscription.Auth);
        }
        catch (Exception ex) when (ex is ArgumentException or System.Security.Cryptography.CryptographicException)
        {
            // A key the browser could never decrypt with is a subscription no push can reach.
            _logger.LogWarning(ex, "Removing a web push subscription with a key that is not valid");
            _pushStore!.Remove(subscription.Endpoint);
            return new HttpResult(0, ex.Message);
        }

        var headers = new List<KeyValuePair<string, string>>
        {
            new("TTL", ((long)Math.Clamp(message.TimeToLive.TotalSeconds, 0, int.MaxValue)).ToString(CultureInfo.InvariantCulture)),
            new("Urgency", "normal"),
            new("Content-Encoding", "aes128gcm"),
            new("Authorization", keys.Authorization(subscription.Endpoint, Clock.GetUtcNow()))
        };
        var result = await WithRetryAsync(
            ct => BaseHttp.SendBytesAsync(_httpClientFactory, HttpMethod.Post, subscription.Endpoint, body, "application/octet-stream", ct, headers, guard: PushGuard),
            cancellationToken).ConfigureAwait(false);
        if (result.Status is (int)HttpStatusCode.NotFound or (int)HttpStatusCode.Gone)
        {
            _pushStore!.Remove(subscription.Endpoint);
        }
        else if (!result.Ok)
        {
            _logger.LogWarning("A push service answered {Status}", result.Status);
        }

        return result;
    }

    // Sends with retries for a failure that may pass, and returns the last answer.
    private async Task<HttpResult> WithRetryAsync(Func<CancellationToken, Task<HttpResult>> send, CancellationToken cancellationToken)
    {
        try
        {
            return await RetryPolicy.ExecuteWithRetryAsync(
                async ct =>
                {
                    var r = await send(ct).ConfigureAwait(false);
                    return (r.Status == 0 && !r.IsRefused) || r.Status >= 500 || r.Status == 429 ? throw new SendException(r) : r;
                },
                Retries,
                _logger,
                "Notification",
                cancellationToken).ConfigureAwait(false);
        }
        catch (SendException ex)
        {
            return ex.Result;
        }
    }

    private static string NoRecipientsText() => BaseTranslations.Text("Base.NotifyNoRecipients", "The message has no one to go to.");

    // A post built from a destination and a message, or why it cannot be built.
    internal readonly record struct PostBuild(string Body, string ContentType, string? Error);

    private sealed record PushJson(
        [property: System.Text.Json.Serialization.JsonPropertyName("title")] string Title,
        [property: System.Text.Json.Serialization.JsonPropertyName("body")] string Body,
        [property: System.Text.Json.Serialization.JsonPropertyName("icon")] string? Icon,
        [property: System.Text.Json.Serialization.JsonPropertyName("image")] string? Image,
        [property: System.Text.Json.Serialization.JsonPropertyName("url")] string? Url,
        [property: System.Text.Json.Serialization.JsonPropertyName("tag")] string? Tag,
        [property: System.Text.Json.Serialization.JsonPropertyName("lang")] string? Lang,
        [property: System.Text.Json.Serialization.JsonPropertyName("timestamp")] long? Timestamp);

    // Hands BaseHttp the notifier's own client, whatever name it asks for.
    private sealed class NamedClientFactory : IHttpClientFactory
    {
        private readonly IHttpClientFactory _inner;

        public NamedClientFactory(IHttpClientFactory inner) => _inner = inner;

        public HttpClient CreateClient(string name) => _inner.CreateClient(HttpClientName);
    }

    private sealed class SendException : HttpRequestException
    {
        public SendException(HttpResult result)
            : base("Answered " + result.Status.ToString(CultureInfo.InvariantCulture), null, result.Status == 0 ? null : (HttpStatusCode)result.Status)
        {
            Result = result;
        }

        public HttpResult Result { get; }
    }
}
