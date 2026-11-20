# Notifications

How a plugin sends an update to Discord, a webhook, a Jellyfin user's devices, and a browser through web push. The plugin writes one `NotifyMessage`, and `BaseNotifier` sends it to each `NotifyDestination` in that place's own format. A failed send is a `NotifyResult`, never an exception.

!!! warning "Web push needs HTTPS"
    Browsers allow push only on a page opened over HTTPS, with `localhost` the one exception. On an iPhone or iPad, the person must add the page to the home screen first. The person must allow notifications on every device.

## How It Works

| Channel | What the place gets | Who it reaches |
| :--- | :--- | :--- |
| `Discord` | A webhook post with one embed, its color, title, text, fields, image, link, and time | Everyone in the channel |
| `Webhook` | A POST of JSON built from the message, or a custom body with placeholders, with extra headers | Any service, such as Home Assistant, ntfy, or n8n |
| `Jellyfin` | A message on each device that can show one, held until a device is online | The message's `Recipients` |
| `WebPush` | An encrypted push that the plugin's service worker shows as a notification | The browsers the `Recipients` signed up |

* Posts go through `BaseHttp`, so every address is checked by `SsrfGuard`. A failure that may pass, such as 503 or no answer, is tried again up to two times.
* At most four destinations are sent to at once across the plugin, so a burst of updates never opens a connection for each.
* A destination's address and headers are stored encrypted, and never reach a page.
* Base's own words, such as "Sent." or "Discord needs a JSON body.", come from Base's own strings in the language of the call path. See [Server Messages in the Page's Language](Translations.md#server-messages-in-the-pages-language).

## Set Up

Register the notifier, its stores, and the secret protector in the plugin's service registrator. Each store is optional, and the part that needs it is off without it.

```csharp
public void RegisterServices(IServiceCollection services, IServerApplicationHost host)
{
    services.AddPluginSecretProtector("Jellyfin.Plugin.MyPlugin");
    services.AddSingleton<INotifyHeldStore, MyHeldStore>();
    services.AddSingleton<IWebPushStore, MyPushStore>();
    services.AddBaseNotifier();
}
```

`AddBaseNotifier` registers `BaseNotifier` and `NotifyHeldWatcher`, which shows a held Jellyfin message as soon as one of its recipient's devices comes online.

Keep the destinations in the plugin's configuration. `NotifyDestination` serializes with it, and a plugin may derive from it to add its own settings, such as which updates go there.

```csharp
public List<NotifyDestination> Destinations { get; set; } = new();
```

When a page saves the configuration, keep each destination's secrets with `NotifyDestination.ResolveSecrets`, and hide them in what goes back to the page with `HideSecrets`.

```csharp
foreach (var destination in incoming.Destinations)
{
    var before = stored.Destinations.FirstOrDefault(d => d.Id == destination.Id);
    NotifyDestination.ResolveSecrets(destination, before, _secrets);
}
```

## Send an Update

```csharp
var message = new NotifyMessage
{
    Title = "Approved: {title}",
    Text = "{title} was approved by {admin}.",
    LinkUrl = "https://jellyfin.example.com/web/#/details?id=" + itemId,
    ThumbnailUrl = posterUrl,
    Color = 0x00A4DC,
    Timestamp = DateTimeOffset.UtcNow,
    Language = BaseTranslations.ServerLanguage(_serverConfig),
    Values = { ["title"] = "Dune (2021)", ["admin"] = adminName },
    Fields = { new NotifyField("Requester", userName) },
    Recipients = { requesterId },
    Tag = "request-" + requestId
};
message.Data["event"] = "Approved";

var destinations = new[]
{
    new NotifyDestination { Name = "Movie night", Channel = NotifyChannel.Discord, Url = protectedDiscordUrl },
    new NotifyDestination { Name = "Home Assistant", Channel = NotifyChannel.Webhook, Url = protectedHookUrl, Headers = protectedHeaders },
    new NotifyDestination { Name = "Requester", Channel = NotifyChannel.Jellyfin },
    new NotifyDestination { Name = "Browser", Channel = NotifyChannel.WebPush }
};

// In the background, without waiting.
_notifier.Send(destinations, message);

// Or wait, such as for a test, and show each result.
IReadOnlyList<NotifyResult> results = await _notifier.SendAsync(destinations, message, cancellationToken).ConfigureAwait(false);
```

* `Send` and `SendAsync` with a list pass over a destination that is off. `SendAsync` with one destination sends to it whether it is on or not, for a test.
* Pass a function in place of the message to build each destination's own, or to skip one with `null`, such as a channel that does not name the requester.
* The Jellyfin and web push channels send to the message's `Recipients`, the Jellyfin user ids.

## Placeholders and Escaping

The title and text may hold `{name}` placeholders, filled from `Values` for each channel with that channel's escaping. A placeholder with no value is left as written.

| Channel | Each value is |
| :--- | :--- |
| `Discord` | Escaped for Discord's markdown in the text and the field values, so a masked link or a mention shows as typed. The title is plain text and is not escaped |
| `Jellyfin` | Stripped of angle brackets, since an app may show the message as HTML |
| `Webhook`, `WebPush` | Written as given |

Base adds `{link}`, `{image}`, `{thumbnail}`, `{color}`, `{time}`, and `{language}` from the message, and the plugin's own values replace them. `NotifyTemplate` holds the rules, for a plugin that fills its own text.

## Custom Bodies

A Discord or webhook destination with `UseCustomBody` sends its `Body` in place of the JSON built from the message.

* A body that is JSON gets each value escaped for a JSON string, and a key whose value comes out empty is left out. Discord needs JSON. A webhook body that is not JSON is sent as `text/plain`, which suits ntfy.
* `{updateTitle}` and `{updateMessage}` are the message's own title and text, filled.
* A key of the message's `Data` fills a placeholder `Values` does not have as JSON, without quotes, such as `{request}` for a whole object.
* In a Discord body, every value is escaped for Discord's markdown except the ones named in `PlainKeys`, such as links and ids.
* A custom Discord body pings no one unless it sets `allowed_mentions` itself.

```json
{ "content": "{updateTitle}", "embeds": [{ "url": "{link}", "color": {color} }] }
```

## Previews

`BaseNotifier.Preview` returns what a destination would get, built by the same code that sends it, and sends nothing: the method, the content type, the body exactly as sent, a Discord post as data, a Jellyfin message's header and text, or why nothing would be sent.

```csharp
[HttpPost("Notifications/Preview")]
public ActionResult<List<NotifyPreview>> Preview([FromBody] PreviewRequest body)
{
    using var scope = BaseTranslations.UseLanguage(BaseTranslations.RequestLanguage(Request));
    var message = BuildMessage(body);
    return Plugin.Instance!.ReadConfiguration(c => c.Destinations.Select(d => BaseNotifier.Preview(d, message)).ToList());
}
```

The page draws each one with [Notify Preview](components/web/notify-preview.md).

```js
previews.forEach(function (p) { host.appendChild(createNotifyPreview({ preview: p }).element); });
```

## Held Messages

A Jellyfin message for someone with no device online that can show messages is held by the plugin's `INotifyHeldStore`, such as a table in its database, and shown once a device comes online. `Hold = false` sends only to devices online now, as a test does.

```csharp
public sealed class MyHeldStore : INotifyHeldStore
{
    public void Hold(NotifyHeldMessage message) => _db.Insert(message);

    public IReadOnlyList<NotifyHeldMessage> Take(Guid userId) => _db.TakeHeld(userId);

    public bool IsStillDue(NotifyHeldMessage message) => _db.Exists(message.Subject);
}
```

* `Take` removes and returns every held message at once, so a second device that connects at the same time finds none.
* `IsStillDue` drops a message that is no longer worth showing, such as a reminder about something already decided. Every message is due by default.
* `OneDevice` sends to each recipient's most recent device only, and a held one shows only on the first device that comes online.
* `Subject` is the plugin's own key, kept with a held message, so the plugin can drop it when its subject is removed.

## Web Push

Web push follows the standards: delivery by RFC 8030, `aes128gcm` encryption by RFC 8291, and VAPID by RFC 8292, signed with ES256. It is built on .NET's own cryptography, with no package.

### The Keys

Generate the VAPID keys once and keep them in the configuration, the private key encrypted. The plugin's `IWebPushStore` reads them back.

```csharp
if (WebPushKeys.FromStored(config.PushPublicKey, config.PushPrivateKey, _secrets) is null)
{
    var keys = WebPushKeys.Generate();
    config.PushPublicKey = keys.PublicKey;
    config.PushPrivateKey = keys.ProtectPrivateKey(_secrets);
}
```

```csharp
public WebPushKeys? GetKeys()
    => WebPushKeys.FromStored(_config.PushPublicKey, _config.PushPrivateKey, _secrets, _config.PushContact, _config.ServerUrl);
```

The contact is how a push service reaches the server's administrator. It is a `mailto:` or https address the administrator sets, else the server's address when it is https, else `https://jellyfin.org`.

### The Subscriptions

The plugin's `IWebPushStore` keeps each user's subscriptions, such as in its database. `BaseNotifier` removes one when its push service answers 404 or 410. Endpoints for the page let a signed in user subscribe and unsubscribe their own browser.

```csharp
[HttpGet("Push/Key")]
public ActionResult<object> Key() => new { PublicKey = _notifier.GetPublicKey() };

[HttpPost("Push/Subscribe")]
public ActionResult Subscribe([FromBody] PushBody body)
    => _notifier.Subscribe(User.GetUserId(), body.Endpoint, body.Keys?.P256dh, body.Keys?.Auth, body.Label) ? NoContent() : BadRequest();

[HttpPost("Push/Unsubscribe")]
public ActionResult Unsubscribe([FromBody] PushBody body)
    => _notifier.Unsubscribe(User.GetUserId(), body.Endpoint) ? NoContent() : NotFound();
```

A subscription needs an https endpoint with no user info, a P-256 key, and a 16 octet secret. A push goes only to a public address, through `SsrfGuard.PublicOnly`.

### The Service Worker

The plugin's own service worker shows the push. Serve Base's script from a route beside it, and load it with `importScripts`, or copy `WebPushWorker.Script` into the worker.

```csharp
[HttpGet("push-worker.js")]
[AllowAnonymous]
public ContentResult PushWorker() => WebPushWorker.Serve(Response);
```

```js
importScripts('push-worker.js');
```

On `push` the script shows the notification the payload describes, its title, text, icon, image, tag, and language. On `notificationclick` it focuses a window already at the payload's address, or opens one. An address that is not http or https opens the worker's scope instead.

### The Page

The page asks for permission and subscribes with [Web Push](components/web/web-push.md).

```js
subscribeWebPush({
    registration: navigator.serviceWorker.register('sw.js'),
    publicKey: key.PublicKey,
    save: function (subscription) { return shared.apiRequest('Push/Subscribe', 'POST', subscription); }
}).then(function (r) { status.textContent = r.message; });
```

## Gotchas

* A Discord post keeps to Discord's limits: a title of 256 characters, a text of 4000, 25 fields of a 256 character name and a 1024 character value, and a name of 80. Longer text ends in an ellipsis.
* Only absolute http and https images, links, and avatars are sent. Any other address, such as one relative to the page, is left out, since Discord refuses the whole post for one.
* A webhook's headers are one `Name: value` a line. A line that is not a header fails the send, so a post never goes without the token it needs.
* A web push payload fits one record of 4096 octets. The image, then the icon give way, then the text is cut.
* `Send` copies nothing. Do not change a message after passing it.
* A result's sentence is in the language of the call path, so a test endpoint wraps its call in `BaseTranslations.UseLanguage`.
