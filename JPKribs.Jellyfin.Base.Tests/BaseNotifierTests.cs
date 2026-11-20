using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;
using MediaBrowser.Common.Net;
using MediaBrowser.Controller.Session;
using MediaBrowser.Model.Session;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>
/// Verifies that <see cref="BaseNotifier"/> builds each channel's post as Discord, a webhook, Jellyfin, and a browser expect, previews
/// exactly what it sends, holds Jellyfin messages until a device is online, and drops a web push subscription its push service no longer knows.
/// </summary>
public class BaseNotifierTests
{
    // Address literals, so BaseHttp's default check never asks DNS.
    private const string HookUrl = "http://203.0.113.10/hook";
    private const string PushA = "https://203.0.113.20/push/a";
    private const string PushB = "https://203.0.113.20/push/b";

    private static readonly Guid Viewer = Guid.Parse("11111111111111111111111111111111");
    private static readonly Guid Admin = Guid.Parse("22222222222222222222222222222222");

    private static NotifyMessage Sample()
    {
        var message = new NotifyMessage
        {
            Title = "Rejected: {title}",
            Text = "{title} was rejected. {reason}",
            LinkUrl = "https://jf.example.com/web/#/details?id=1",
            ThumbnailUrl = "https://image.tmdb.org/t/p/w342/x.jpg",
            Color = 0xF44336,
            Timestamp = new DateTimeOffset(2026, 11, 20, 12, 0, 0, TimeSpan.Zero),
            Language = "en-us",
            Fields = { new NotifyField("Seasons", "Season 2"), new NotifyField("Notes", "Season 2 *please*", false), new NotifyField("Empty", " ") },
            Values = { ["title"] = "Severance (2022), Season 2", ["reason"] = "Not on this server", ["link"] = "https://jf.example.com/web/#/details?id=1" },
            PlainKeys = { "link" }
        };
        message.Data["event"] = "Declined";
        return message;
    }

    /// <summary>
    /// A Discord post is one embed with the title as written, the text and field values escaped, the color, link, thumbnail, fields, and time, the default name, and mentions off.
    /// True: Discord shows the update as the preview does, and nothing people wrote pings or links.
    /// False: Discord would refuse the post, or a value could post markdown under the webhook's name.
    /// </summary>
    [Fact]
    public void BuildDiscord_PostsOneEmbedWithEscapedValues()
    {
        var post = BaseNotifier.BuildDiscord(new NotifyDestination { Channel = NotifyChannel.Discord }, Sample())!;

        var embed = post["embeds"]![0]!;
        Assert.Equal("Jellyfin", post["username"]!.GetValue<string>());
        Assert.Null(post["avatar_url"]);
        Assert.Equal("Rejected: Severance (2022), Season 2", embed["title"]!.GetValue<string>());
        Assert.Equal(@"Severance \(2022\), Season 2 was rejected. Not on this server", embed["description"]!.GetValue<string>());
        Assert.Equal(0xF44336, embed["color"]!.GetValue<int>());
        Assert.Equal("https://jf.example.com/web/#/details?id=1", embed["url"]!.GetValue<string>());
        Assert.Equal("https://image.tmdb.org/t/p/w342/x.jpg", embed["thumbnail"]!["url"]!.GetValue<string>());
        Assert.Null(embed["image"]);
        Assert.Equal("2026-11-20T12:00:00.0000000+00:00", embed["timestamp"]!.GetValue<string>());
        Assert.Equal(new[] { "Seasons: Season 2: true", @"Notes: Season 2 \*please\*: false" }, embed["fields"]!.AsArray().Select(f => f!["name"] + ": " + f["value"] + ": " + f["inline"]));
        Assert.Empty(post["allowed_mentions"]!["parse"]!.AsArray());
    }

    /// <summary>
    /// Discord's limits hold: a title of 256, a description of 4000, a field name of 256 and value of 1024, 25 fields, and a name of 80, and only http and https images, links, and avatars.
    /// True: a long update is cut to fit instead of being refused.
    /// False: Discord would refuse the whole post with 400.
    /// </summary>
    [Fact]
    public void BuildDiscord_KeepsToDiscordsLimits()
    {
        var message = new NotifyMessage { Title = new string('t', 300), Text = new string('d', 5000), ImageUrl = "../Items/1/Images/Primary", LinkUrl = "javascript:alert(1)" };
        for (var i = 0; i < 30; i++)
        {
            message.Fields.Add(new NotifyField(new string('n', 300), new string('v', 2000)));
        }

        var post = BaseNotifier.BuildDiscord(new NotifyDestination { Username = new string('u', 100), AvatarUrl = "https://example.com/a.png" }, message)!;

        var embed = post["embeds"]![0]!;
        Assert.Equal(256, embed["title"]!.GetValue<string>().Length);
        Assert.EndsWith("…", embed["title"]!.GetValue<string>(), StringComparison.Ordinal);
        Assert.Equal(4000, embed["description"]!.GetValue<string>().Length);
        Assert.Equal(25, embed["fields"]!.AsArray().Count);
        Assert.Equal(256, embed["fields"]![0]!["name"]!.GetValue<string>().Length);
        Assert.Equal(1024, embed["fields"]![0]!["value"]!.GetValue<string>().Length);
        Assert.Equal(80, post["username"]!.GetValue<string>().Length);
        Assert.Equal("https://example.com/a.png", post["avatar_url"]!.GetValue<string>());
        Assert.Null(embed["image"]);
        Assert.Null(embed["url"]);
        Assert.Null(BaseNotifier.BuildDiscord(new NotifyDestination(), new NotifyMessage { Title = " {missing} ", Values = { ["missing"] = string.Empty } }));
    }

    /// <summary>
    /// A webhook's JSON carries the title, text, and link, then the images, color, time, language, and fields that are set, then the message's data.
    /// True: a machine gets every part of the update under fixed keys.
    /// False: a webhook could not match the update or would miss its fields.
    /// </summary>
    [Fact]
    public void BuildWebhook_CarriesTheMessageThenItsData()
    {
        var message = Sample();
        message.Data["request"] = new JsonObject { ["Title"] = "Severance" };

        var post = BaseNotifier.BuildWebhook(message);

        Assert.Equal(new[] { "title", "message", "link", "thumbnail", "language", "color", "time", "fields", "event", "request" }, post.Select(p => p.Key));
        Assert.Equal("Severance (2022), Season 2 was rejected. Not on this server", post["message"]!.GetValue<string>());
        Assert.Equal(2, post["fields"]!.AsArray().Count);
        Assert.Equal("Severance", post["request"]!["Title"]!.GetValue<string>());
        Assert.Null(BaseNotifier.BuildWebhook(new NotifyMessage { Title = "t" })["link"]);
        Assert.True(BaseNotifier.BuildWebhook(new NotifyMessage { Title = "t" }).ContainsKey("link"));
    }

    /// <summary>
    /// A custom Discord body escapes the values people wrote but not the plain ones, fills the update's own title and message, leaves out what is empty, and turns mentions off.
    /// A webhook takes text that is not JSON as plain text, and a data value goes in as JSON.
    /// True: a custom body is as safe as the built one, and ntfy gets plain text.
    /// False: a requester's name could post a masked link, or a body that is not JSON would fail a webhook.
    /// </summary>
    [Fact]
    public void BuildPost_FillsCustomBodies()
    {
        var message = new NotifyMessage
        {
            Title = "Approved: {title}",
            Text = "{title} was approved.",
            Color = 42204,
            Values = { ["title"] = "Say \"Hi\" (2021)", ["user"] = "[Click](https://evil.example)", ["poster"] = string.Empty, ["link"] = "https://a.example/x_(y)" },
            PlainKeys = { "link", "poster" }
        };
        message.Data["request"] = new JsonObject { ["Type"] = "Movie" };
        var discord = new NotifyDestination
        {
            Channel = NotifyChannel.Discord,
            UseCustomBody = true,
            Body = "{\"content\": \"{updateTitle} for {user} {link}\", \"embeds\": [{\"thumbnail\": {\"url\": \"{poster}\"}, \"color\": {color}}]}"
        };

        var post = BaseNotifier.BuildPost(discord, message);

        Assert.Null(post.Error);
        Assert.Equal("application/json", post.ContentType);
        Assert.Equal("{\"content\":\"Approved: Say \\u0022Hi\\u0022 \\\\(2021\\\\) for \\\\[Click\\\\]\\\\(https://evil.example\\\\) https://a.example/x_(y)\",\"embeds\":[{\"color\":42204}],\"allowed_mentions\":{\"parse\":[]}}", post.Body);

        discord.Body = "{updateTitle}";
        Assert.NotNull(BaseNotifier.BuildPost(discord, message).Error);

        var hook = new NotifyDestination { Channel = NotifyChannel.Webhook, UseCustomBody = true, Body = "{updateMessage}" };
        Assert.Equal(("Say \"Hi\" (2021) was approved.", "text/plain"), (BaseNotifier.BuildPost(hook, message).Body, BaseNotifier.BuildPost(hook, message).ContentType));
        hook.Body = "{\"what\": \"{updateTitle}\", \"request\": {request}}";
        var whole = JsonNode.Parse(BaseNotifier.BuildPost(hook, message).Body)!;
        Assert.Equal("Movie", whole["request"]!["Type"]!.GetValue<string>());
        Assert.Equal("Approved: Say \"Hi\" (2021)", whole["what"]!.GetValue<string>());
    }

    /// <summary>
    /// A Jellyfin message drops angle brackets from the values, and keeps the template's own text.
    /// True: nothing people wrote becomes markup in a Jellyfin app.
    /// False: a title could inject HTML on an administrator's screen.
    /// </summary>
    [Fact]
    public void JellyfinMessage_DropsAngleBracketsFromValues()
    {
        var message = new NotifyMessage { Title = "New: {title}", Text = "<b>{title}</b> asked by {user}", Values = { ["title"] = "<script>x</script>", ["user"] = "a>b" } };

        var (header, text) = BaseNotifier.JellyfinMessage(message);

        Assert.Equal("New: scriptx/script", header);
        Assert.Equal("<b>scriptx/script</b> asked by ab", text);
    }

    /// <summary>
    /// Each preview is the body, content type, and method the destination is sent, with Discord's post as data, and a destination that cannot be built says why.
    /// True: the settings page shows exactly what goes out.
    /// False: a preview that differed from the post would mislead.
    /// </summary>
    [Fact]
    public async Task Preview_IsExactlyWhatIsSent()
    {
        var sent = new List<(string Body, string? ContentType, string? Header)>();
        var notifier = Notifier(Handler(async request =>
        {
            sent.Add((await request.Content!.ReadAsStringAsync().ConfigureAwait(false), request.Content.Headers.ContentType?.MediaType, request.Headers.TryGetValues("X-Token", out var token) ? token.Single() : null));
            return new HttpResponseMessage(HttpStatusCode.NoContent);
        }), out var secrets);
        var discord = new NotifyDestination { Id = "discord", Channel = NotifyChannel.Discord, Url = secrets.Protect(HookUrl), Username = "Media Bot" };
        var hook = new NotifyDestination { Id = "hook", Channel = NotifyChannel.Webhook, Url = secrets.Protect(HookUrl), Headers = secrets.Protect("X-Token: abc") };
        var bad = new NotifyDestination { Id = "bad", Channel = NotifyChannel.Discord, UseCustomBody = true, Body = "not json", Url = HookUrl };

        var results = await notifier.SendAsync(new[] { discord, hook }, Sample(), CancellationToken.None);
        var previews = new[] { discord, hook, bad, new NotifyDestination { Id = "jf", Channel = NotifyChannel.Jellyfin } }.Select(d => BaseNotifier.Preview(d, Sample())).ToList();

        Assert.All(results, r => Assert.True(r.Ok));
        Assert.Equal("Sent.", results[0].Message);
        Assert.Equal((previews[0].Body, "application/json", (string?)null), sent[0]);
        Assert.Equal((previews[1].Body, "application/json", "abc"), sent[1]);
        Assert.Equal("POST", previews[0].Method);
        Assert.Equal("Media Bot", previews[0].Discord!["username"]!.GetValue<string>());
        Assert.Null(previews[1].Discord);
        Assert.Equal("Discord needs a JSON body.", previews[2].Error);
        Assert.Equal(string.Empty, previews[2].Body);
        Assert.Equal("Rejected: Severance (2022), Season 2", previews[3].Header);
        Assert.Equal(string.Empty, previews[3].Method);
    }

    /// <summary>
    /// A post with no address, headers that do not read, or an answer that is not a success says so in a sentence, and the answer's status comes back.
    /// True: a test on the settings page tells the administrator what to fix.
    /// False: a failed send would look like success, or throw.
    /// </summary>
    [Fact]
    public async Task SendAsync_SaysWhyAPostFailed()
    {
        var notifier = Notifier(Handler(_ => Task.FromResult(new HttpResponseMessage(HttpStatusCode.InternalServerError))), out _);
        notifier.Retries = 0;
        var message = Sample();

        var noAddress = await notifier.SendAsync(new NotifyDestination { Channel = NotifyChannel.Webhook }, message, CancellationToken.None);
        var badHeaders = await notifier.SendAsync(new NotifyDestination { Channel = NotifyChannel.Webhook, Url = HookUrl, Headers = "no colon" }, message, CancellationToken.None);
        var answered = await notifier.SendAsync(new NotifyDestination { Channel = NotifyChannel.Webhook, Url = HookUrl }, message, CancellationToken.None);
        var unreachable = await Notifier(Handler(_ => throw new HttpRequestException("down")), out _, retries: 0).SendAsync(new NotifyDestination { Channel = NotifyChannel.Discord, Url = HookUrl }, message, CancellationToken.None);

        Assert.Equal((false, "Save an address first."), (noAddress.Ok, noAddress.Message));
        Assert.False(badHeaders.Ok);
        Assert.StartsWith("The headers are not valid.", badHeaders.Message, StringComparison.Ordinal);
        Assert.Equal((false, "The address answered 500.", 500), (answered.Ok, answered.Message, answered.Status));
        Assert.Equal((false, "Could not reach the address.", 0), (unreachable.Ok, unreachable.Message, unreachable.Status));
    }

    /// <summary>
    /// A failure that may pass, such as 503, is tried again, and one that will not, such as 400, is not.
    /// True: a brief outage at Discord does not lose the update.
    /// False: every hiccup would lose an update, or a bad post would be sent three times.
    /// </summary>
    [Fact]
    public async Task SendAsync_TriesAgainOnlyForAFailureThatMayPass()
    {
        var calls = 0;
        var flaky = Notifier(Handler(_ => Task.FromResult(new HttpResponseMessage(++calls == 1 ? HttpStatusCode.ServiceUnavailable : HttpStatusCode.OK))), out _, retries: 1);
        var refused = 0;
        var bad = Notifier(Handler(_ =>
        {
            refused++;
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.BadRequest));
        }), out _, retries: 1);

        var ok = await flaky.SendAsync(new NotifyDestination { Channel = NotifyChannel.Webhook, Url = HookUrl }, Sample(), CancellationToken.None);
        var no = await bad.SendAsync(new NotifyDestination { Channel = NotifyChannel.Webhook, Url = HookUrl }, Sample(), CancellationToken.None);

        Assert.True(ok.Ok);
        Assert.Equal(2, calls);
        Assert.False(no.Ok);
        Assert.Equal(1, refused);
    }

    /// <summary>
    /// A list of destinations passes over one that is off and one given no message, and sends the rest each their own message, in order.
    /// True: a plugin sends one update everywhere it goes with one call.
    /// False: a destination switched off would still get updates.
    /// </summary>
    [Fact]
    public async Task SendAsync_PassesOverDestinationsThatAreOffOrGetNoMessage()
    {
        var bodies = new List<string>();
        var notifier = Notifier(Handler(async request =>
        {
            var body = await request.Content!.ReadAsStringAsync().ConfigureAwait(false);
            lock (bodies)
            {
                bodies.Add(body);
            }

            return new HttpResponseMessage(HttpStatusCode.OK);
        }), out _);
        var destinations = new[]
        {
            new NotifyDestination { Id = "a", Name = "A", Channel = NotifyChannel.Webhook, Url = HookUrl },
            new NotifyDestination { Id = "off", Channel = NotifyChannel.Webhook, Url = HookUrl, Enabled = false },
            new NotifyDestination { Id = "skip", Channel = NotifyChannel.Webhook, Url = HookUrl },
            new NotifyDestination { Id = "b", Name = "B", Channel = NotifyChannel.Webhook, Url = HookUrl }
        };

        var results = await notifier.SendAsync(destinations, d => d.Id == "skip" ? null : new NotifyMessage { Title = d.Name }, CancellationToken.None);

        Assert.Equal(new[] { "a", "b" }, results.Select(r => r.DestinationId));
        Assert.Equal(new[] { "A", "B" }, bodies.Select(b => JsonNode.Parse(b)!["title"]!.GetValue<string>()).OrderBy(t => t, StringComparer.Ordinal));
    }

    /// <summary>
    /// A Jellyfin message shows on every device of each recipient that can show messages, or on the most recent one for a one device message, and says how many.
    /// True: the requester sees the update wherever they are signed in, and a reminder nudges once.
    /// False: a reminder would pop up on every device, or a device that cannot show messages would count.
    /// </summary>
    [Fact]
    public async Task SendAsync_ShowsAJellyfinMessageOnTheRecipientsDevices()
    {
        var sessions = Substitute.For<ISessionManager>();
        Online(sessions, Session(sessions, "tv", Viewer, 10), Session(sessions, "phone", Viewer, 1), Session(sessions, "radio", Viewer, 1, canShow: false), Session(sessions, "other", Admin, 1));
        var notifier = new BaseNotifier(Substitute.For<IHttpClientFactory>(), sessions, NullLogger<BaseNotifier>.Instance);
        var jellyfin = new NotifyDestination { Id = "jf", Channel = NotifyChannel.Jellyfin };

        var all = await notifier.SendAsync(jellyfin, new NotifyMessage { Title = "Hi", Text = "<i>{x}</i>", Values = { ["x"] = "<b>" }, Recipients = { Viewer } }, CancellationToken.None);
        var one = await notifier.SendAsync(jellyfin, new NotifyMessage { Text = "Nudge", Recipients = { Viewer }, OneDevice = true }, CancellationToken.None);

        Assert.Equal((true, "Shown on 2 devices.", 2), (all.Ok, all.Message, all.Delivered));
        Assert.Equal((true, "Shown on 1 device.", 1), (one.Ok, one.Message, one.Delivered));
        await sessions.Received(1).SendMessageCommand(null, "tv", Arg.Is<MessageCommand>(m => m.Header == "Hi" && m.Text == "<i>b</i>" && m.TimeoutMs == BaseNotifier.MessageTimeoutMs), Arg.Any<CancellationToken>());
        await sessions.Received(1).SendMessageCommand(null, "phone", Arg.Is<MessageCommand>(m => m.Text == "Nudge"), Arg.Any<CancellationToken>());
        await sessions.DidNotReceive().SendMessageCommand(null, "radio", Arg.Any<MessageCommand>(), Arg.Any<CancellationToken>());
        await sessions.DidNotReceive().SendMessageCommand(null, "other", Arg.Any<MessageCommand>(), Arg.Any<CancellationToken>());
    }

    /// <summary>
    /// With no device online the message is held, unless the message says not to, and once a device comes online the held message shows there.
    /// A one device message shows only on the device that came online, a message no longer due is dropped, and one that cannot show is held again.
    /// True: someone away hears about the update when they come back, once.
    /// False: an update would be lost while they were away, or shown on every device for a reminder.
    /// </summary>
    [Fact]
    public async Task HeldMessages_WaitForADeviceAndShowOnce()
    {
        var sessions = Substitute.For<ISessionManager>();
        Online(sessions);
        var store = new HeldStore();
        var notifier = new BaseNotifier(Substitute.For<IHttpClientFactory>(), sessions, NullLogger<BaseNotifier>.Instance, heldStore: store);
        var jellyfin = new NotifyDestination { Channel = NotifyChannel.Jellyfin };

        var held = await notifier.SendAsync(jellyfin, new NotifyMessage { Title = "Approved", Recipients = { Viewer, Admin, Viewer }, Subject = "r1" }, CancellationToken.None);
        var reminder = await notifier.SendAsync(jellyfin, new NotifyMessage { Title = "Waiting", Recipients = { Viewer }, OneDevice = true }, CancellationToken.None);
        var notHeld = await notifier.SendAsync(jellyfin, new NotifyMessage { Title = "Test", Recipients = { Viewer }, Hold = false }, CancellationToken.None);
        var stale = await notifier.SendAsync(jellyfin, new NotifyMessage { Title = "Stale", Recipients = { Viewer }, Subject = "gone" }, CancellationToken.None);

        Assert.Equal((true, "Held until a device is online.", 2), (held.Ok, held.Message, held.Held));
        Assert.True(reminder.Ok);
        Assert.Equal((false, "No device that can show messages is online."), (notHeld.Ok, notHeld.Message));
        Assert.True(stale.Ok);
        Assert.Equal("r1", store.Held.First().Subject);

        Online(sessions, Session(sessions, "tv", Viewer, 10), Session(sessions, "phone", Viewer, 1));
        await notifier.ReleaseHeldAsync(Viewer, "tv", CancellationToken.None);
        await notifier.ReleaseHeldAsync(Viewer, "tv", CancellationToken.None);

        await sessions.Received(1).SendMessageCommand(null, "tv", Arg.Is<MessageCommand>(m => m.Header == "Approved"), Arg.Any<CancellationToken>());
        await sessions.Received(1).SendMessageCommand(null, "phone", Arg.Is<MessageCommand>(m => m.Header == "Approved"), Arg.Any<CancellationToken>());
        await sessions.Received(1).SendMessageCommand(null, "tv", Arg.Is<MessageCommand>(m => m.Header == "Waiting"), Arg.Any<CancellationToken>());
        await sessions.DidNotReceive().SendMessageCommand(null, "phone", Arg.Is<MessageCommand>(m => m.Header == "Waiting"), Arg.Any<CancellationToken>());
        await sessions.DidNotReceive().SendMessageCommand(Arg.Any<string?>(), Arg.Any<string>(), Arg.Is<MessageCommand>(m => m.Header == "Stale"), Arg.Any<CancellationToken>());
        Assert.Equal(new[] { Admin }, store.Held.Select(h => h.UserId));

        sessions.SendMessageCommand(Arg.Any<string?>(), Arg.Any<string>(), Arg.Any<MessageCommand>(), Arg.Any<CancellationToken>()).Returns(Task.FromException(new InvalidOperationException("gone")));
        store.Hold(new NotifyHeldMessage(Guid.NewGuid(), Viewer, "Again", string.Empty, DateTime.UtcNow));
        await notifier.ReleaseHeldAsync(Viewer, null, CancellationToken.None);
        Assert.Contains(store.Held, h => h.Header == "Again");
    }

    /// <summary>
    /// A web push is encrypted for each of the recipient's browsers, with the VAPID header, TTL, and content encoding, and the browser decrypts the payload the service worker reads.
    /// A subscription its push service answers 404 or 410 for is removed, and one that answers 500 is kept.
    /// True: a browser shows the update, and a browser that unsubscribed stops being sent to.
    /// False: the browser could not decrypt the push, or dead subscriptions would pile up.
    /// </summary>
    [Fact]
    public async Task SendAsync_PushesToEachBrowserAndRemovesGoneSubscriptions()
    {
        var requests = new List<(string Url, byte[] Body, Dictionary<string, string> Headers)>();
        var notifier = Notifier(Handler(async request =>
        {
            var headers = request.Headers.Concat(request.Content!.Headers).ToDictionary(h => h.Key, h => string.Join(",", h.Value), StringComparer.OrdinalIgnoreCase);
            requests.Add((request.RequestUri!.AbsoluteUri, await request.Content.ReadAsByteArrayAsync().ConfigureAwait(false), headers));
            var status = request.RequestUri.AbsolutePath switch
            {
                "/push/a" => HttpStatusCode.Created,
                "/push/b" => HttpStatusCode.Gone,
                "/push/c" => HttpStatusCode.NotFound,
                _ => HttpStatusCode.InternalServerError
            };
            return new HttpResponseMessage(status);
        }), out _, retries: 0, out var push);
        var other = WebPushKeys.Generate();
        push.Add(Viewer, PushA, ReceiverPublic, ReceiverAuth);
        push.Add(Viewer, PushB, other.PublicKey, ReceiverAuth);
        push.Add(Admin, "https://203.0.113.20/push/c", other.PublicKey, ReceiverAuth);
        push.Add(Admin, "https://203.0.113.20/push/d", other.PublicKey, ReceiverAuth);
        var message = Sample();
        message.Recipients.Add(Viewer);
        message.Recipients.Add(Admin);
        message.Tag = "request-1";
        var destination = new NotifyDestination { Channel = NotifyChannel.WebPush };

        var result = await notifier.SendAsync(destination, message, CancellationToken.None);

        Assert.Equal((true, "Sent to 1 device.", 1), (result.Ok, result.Message, result.Delivered));
        Assert.Equal(4, requests.Count);
        var first = requests[0];
        Assert.Equal(PushA, first.Url);
        Assert.Equal("aes128gcm", first.Headers["Content-Encoding"]);
        Assert.Equal("application/octet-stream", first.Headers["Content-Type"]);
        Assert.Equal("86400", first.Headers["TTL"]);
        Assert.StartsWith("vapid t=", first.Headers["Authorization"], StringComparison.Ordinal);
        Assert.EndsWith(", k=" + push.Keys.PublicKey, first.Headers["Authorization"], StringComparison.Ordinal);
        var payload = WebPushEncryptionTests.Decrypt(first.Body, ReceiverPrivate, ReceiverPublic, ReceiverAuth);
        Assert.Equal(BaseNotifier.Preview(destination, message).Body, payload);
        using var json = JsonDocument.Parse(payload);
        Assert.Equal("Rejected: Severance (2022), Season 2", json.RootElement.GetProperty("title").GetString());
        Assert.Equal("Severance (2022), Season 2 was rejected. Not on this server", json.RootElement.GetProperty("body").GetString());
        Assert.Equal("https://jf.example.com/web/#/details?id=1", json.RootElement.GetProperty("url").GetString());
        Assert.Equal("https://image.tmdb.org/t/p/w342/x.jpg", json.RootElement.GetProperty("icon").GetString());
        Assert.Equal("request-1", json.RootElement.GetProperty("tag").GetString());
        Assert.Equal("en-us", json.RootElement.GetProperty("lang").GetString());
        Assert.Equal(new[] { PushA, "https://203.0.113.20/push/d" }, push.All.Select(s => s.Endpoint));
    }

    /// <summary>
    /// With no keys, no recipient, no subscription, or no push service that took it, a web push fails with a sentence, and a refused address is never tried again.
    /// True: the settings page says why a browser got nothing.
    /// False: a web push would claim success with nothing sent.
    /// </summary>
    [Fact]
    public async Task SendAsync_SaysWhyAWebPushWentNowhere()
    {
        var destination = new NotifyDestination { Channel = NotifyChannel.WebPush };
        var calls = 0;
        var notifier = Notifier(Handler(_ =>
        {
            calls++;
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.TooManyRequests));
        }), out _, retries: 0, out var push);
        var noKeys = new BaseNotifier(Substitute.For<IHttpClientFactory>(), Substitute.For<ISessionManager>(), NullLogger<BaseNotifier>.Instance);

        Assert.Equal("Web push is not set up.", (await noKeys.SendAsync(destination, new NotifyMessage { Title = "t", Recipients = { Viewer } }, CancellationToken.None)).Message);
        Assert.Equal("The message has no one to go to.", (await notifier.SendAsync(destination, new NotifyMessage { Title = "t" }, CancellationToken.None)).Message);
        Assert.Equal("No device is signed up for notifications.", (await notifier.SendAsync(destination, new NotifyMessage { Title = "t", Recipients = { Viewer } }, CancellationToken.None)).Message);
        push.Add(Viewer, PushA, ReceiverPublic, ReceiverAuth);
        var busy = await notifier.SendAsync(destination, new NotifyMessage { Title = "t", Recipients = { Viewer } }, CancellationToken.None);
        Assert.Equal((false, "The address answered 429.", 429), (busy.Ok, busy.Message, busy.Status));
        Assert.Single(push.All);

        notifier.PushGuard = SsrfGuard.PublicOnly;
        push.All.Clear();
        push.Add(Viewer, "https://127.0.0.1/push", ReceiverPublic, ReceiverAuth);
        calls = 0;
        notifier.Retries = 2;
        await notifier.SendAsync(destination, new NotifyMessage { Title = "t", Recipients = { Viewer } }, CancellationToken.None);
        Assert.Equal(0, calls);
    }

    /// <summary>
    /// A web push payload always fits one record: the image, then the icon give way, then the text is cut.
    /// True: a long update still reaches the browser.
    /// False: the push service would refuse it with 413.
    /// </summary>
    [Fact]
    public void PushPayload_FitsOneRecord()
    {
        var message = new NotifyMessage { Title = "Long", Text = new string('é', 5000), ImageUrl = "https://example.com/i.png", ThumbnailUrl = "https://example.com/t.png", LinkUrl = "https://example.com/" };

        var payload = BaseNotifier.PushPayload(message);

        Assert.True(System.Text.Encoding.UTF8.GetByteCount(payload) <= WebPushEncryption.MaxPlaintextLength);
        using var json = JsonDocument.Parse(payload);
        Assert.False(json.RootElement.TryGetProperty("image", out _));
        Assert.False(json.RootElement.TryGetProperty("icon", out _));
        Assert.EndsWith("…", json.RootElement.GetProperty("body").GetString(), StringComparison.Ordinal);
        Assert.Equal("https://example.com/", json.RootElement.GetProperty("url").GetString());
        Assert.Equal("{\"title\":\"t\",\"body\":\"\"}", BaseNotifier.PushPayload(new NotifyMessage { Title = "t" }));
    }

    /// <summary>
    /// A subscription is kept only when it checks out, and a user removes only their own.
    /// True: one user cannot remove another's browser, and a made up endpoint is never stored.
    /// False: anyone could unsubscribe anyone, or a plain http endpoint would be pushed to.
    /// </summary>
    [Fact]
    public void SubscribeAndUnsubscribe_CheckTheSubscriptionAndItsOwner()
    {
        var notifier = Notifier(Handler(_ => Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK))), out _, retries: 0, out var push);

        Assert.True(notifier.Subscribe(Viewer, PushA, ReceiverPublic, ReceiverAuth, "Safari · iPhone"));
        Assert.False(notifier.Subscribe(Viewer, "http://203.0.113.20/push", ReceiverPublic, ReceiverAuth, null));
        Assert.False(notifier.Subscribe(Viewer, PushB, "short", ReceiverAuth, null));
        Assert.False(notifier.Subscribe(Guid.Empty, PushB, ReceiverPublic, ReceiverAuth, null));
        Assert.False(notifier.Unsubscribe(Admin, PushA));
        Assert.Equal(push.Keys.PublicKey, notifier.GetPublicKey());
        Assert.Equal("Safari · iPhone", push.All.Single().Label);
        Assert.True(notifier.Unsubscribe(Viewer, PushA));
        Assert.Empty(push.All);
    }

    /// <summary>
    /// A subscription needs an https endpoint with no user info, a P-256 key, and a 16 octet secret, and its label loses control characters and is cut to 100.
    /// True: only a real browser subscription is stored.
    /// False: an endpoint a user made up could point the server anywhere.
    /// </summary>
    [Fact]
    public void WebPushSubscription_TryCreateChecksEveryPart()
    {
        Assert.True(WebPushSubscription.TryCreate(Viewer, PushA, ReceiverPublic + "=", ReceiverAuth, "Chrome\u0007 on " + new string('x', 200), out var subscription));
        Assert.Equal(ReceiverPublic, subscription.P256dh);
        Assert.Equal(100, subscription.Label.Length);
        Assert.StartsWith("Chrome on", subscription.Label, StringComparison.Ordinal);
        Assert.False(WebPushSubscription.TryCreate(Viewer, "https://user:pw@203.0.113.20/push", ReceiverPublic, ReceiverAuth, null, out _));
        Assert.False(WebPushSubscription.TryCreate(Viewer, "https://203.0.113.20/" + new string('a', 2048), ReceiverPublic, ReceiverAuth, null, out _));
        Assert.False(WebPushSubscription.TryCreate(Viewer, PushA, ReceiverPublic, "AAAA", null, out _));
        Assert.False(WebPushSubscription.TryCreate(Viewer, "push/a", ReceiverPublic, ReceiverAuth, null, out _));
    }

    /// <summary>
    /// A destination keeps its stored address while the page posts the kept sentinel, keeps its headers only while the address is the same, refuses an encrypted value copied from elsewhere, and hides both for a page.
    /// True: a stored token never follows a webhook to a new address, and never reaches the browser.
    /// False: changing the address would send the old token to the new host.
    /// </summary>
    [Fact]
    public void NotifyDestination_ResolveSecretsKeepsHeadersOnlyForTheSameAddress()
    {
        var secrets = new SecretProtector("test.purpose", NullLogger.Instance, new EphemeralDataProtectionProvider());
        var stored = new NotifyDestination { Id = "a", Channel = NotifyChannel.Webhook, Url = secrets.Protect(HookUrl), Headers = secrets.Protect("X-Token: abc") };

        var kept = new NotifyDestination { Id = "a", Channel = NotifyChannel.Webhook, Url = SecretProtector.KeptSentinel, Headers = SecretProtector.KeptSentinel };
        NotifyDestination.ResolveSecrets(kept, stored, secrets);
        var moved = new NotifyDestination { Id = "a", Channel = NotifyChannel.Webhook, Url = "https://elsewhere.example/hook", Headers = SecretProtector.KeptSentinel };
        NotifyDestination.ResolveSecrets(moved, stored, secrets);
        var copied = new NotifyDestination { Id = "b", Channel = NotifyChannel.Discord, Url = stored.Url, Headers = "X: y" };
        NotifyDestination.ResolveSecrets(copied, null, secrets);
        var app = new NotifyDestination { Channel = NotifyChannel.Jellyfin, Url = "x", Headers = "y" };
        NotifyDestination.ResolveSecrets(app, null, secrets);

        Assert.Equal((stored.Url, stored.Headers), (kept.Url, kept.Headers));
        Assert.Equal("https://elsewhere.example/hook", secrets.Unprotect(moved.Url));
        Assert.True(SecretProtector.IsProtected(moved.Url));
        Assert.Equal(string.Empty, moved.Headers);
        Assert.Equal((string.Empty, string.Empty), (copied.Url, copied.Headers));
        Assert.Equal((string.Empty, string.Empty), (app.Url, app.Headers));
        kept.HideSecrets();
        Assert.Equal((SecretProtector.KeptSentinel, SecretProtector.KeptSentinel), (kept.Url, kept.Headers));
        moved.HideSecrets();
        Assert.Equal(string.Empty, moved.Headers);
    }

    /// <summary>
    /// The registration gives one notifier and the watcher that shows held messages, with the plugin's stores when it registered them.
    /// True: a plugin wires the engine with one call.
    /// False: the watcher would never start, and held messages would wait forever.
    /// </summary>
    [Fact]
    public void AddBaseNotifier_RegistersTheNotifierAndTheWatcher()
    {
        var services = new ServiceCollection();
        services.AddSingleton(Substitute.For<IHttpClientFactory>());
        services.AddSingleton(Substitute.For<ISessionManager>());
        services.AddLogging();
        services.AddSingleton<INotifyHeldStore>(new HeldStore());

        services.AddBaseNotifier();
        using var provider = services.BuildServiceProvider();

        var notifier = provider.GetRequiredService<BaseNotifier>();
        var hosted = provider.GetServices<IHostedService>();
        Assert.Same(notifier, provider.GetRequiredService<BaseNotifier>());
        Assert.IsType<NotifyHeldWatcher>(Assert.Single(hosted));
        Assert.Null(notifier.GetPublicKey());
    }

    /// <summary>
    /// The worker script is served as JavaScript that is checked again on every load, and handles push and notificationclick.
    /// True: a plugin's service worker loads the current script.
    /// False: a browser would refuse the script or keep a stale copy.
    /// </summary>
    [Fact]
    public void WebPushWorker_ServesTheScriptAsJavaScript()
    {
        var context = new Microsoft.AspNetCore.Http.DefaultHttpContext();

        var result = WebPushWorker.Serve(context.Response);

        Assert.Equal("text/javascript; charset=utf-8", result.ContentType);
        Assert.Equal("no-cache", context.Response.Headers.CacheControl.ToString());
        Assert.Contains("addEventListener('push'", result.Content, StringComparison.Ordinal);
        Assert.Contains("addEventListener('notificationclick'", result.Content, StringComparison.Ordinal);
    }

    private const string ReceiverPublic = "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4";
    private const string ReceiverPrivate = "q1dXpw3UpT5VOmu_cf_v6ih07Aems3njxI-JWgLcM94";
    private const string ReceiverAuth = "BTBZMqHH6r4Tts7J_aSIgg";

    private static BaseNotifier Notifier(StubHandler handler, out SecretProtector secrets, int retries = 2)
        => Notifier(handler, out secrets, retries, out _);

    private static BaseNotifier Notifier(StubHandler handler, out SecretProtector secrets, int retries, out PushStore push)
    {
        var factory = Substitute.For<IHttpClientFactory>();
        factory.CreateClient(NamedClient.Default).Returns(_ => new HttpClient(handler, false));
        secrets = new SecretProtector("test.purpose", NullLogger.Instance, new EphemeralDataProtectionProvider());
        push = new PushStore();
        return new BaseNotifier(factory, Substitute.For<ISessionManager>(), NullLogger<BaseNotifier>.Instance, secrets, null, push)
        {
            Retries = retries,
            PushGuard = SsrfGuard.Disabled
        };
    }

    private static StubHandler Handler(Func<HttpRequestMessage, Task<HttpResponseMessage>> send) => new(send);

    private static SessionInfo Session(ISessionManager manager, string id, Guid user, int minutesAgo, bool canShow = true) => new(manager, NullLogger.Instance)
    {
        Id = id,
        UserId = user,
        LastActivityDate = DateTime.UtcNow.AddMinutes(-minutesAgo),
        Capabilities = new ClientCapabilities { SupportedCommands = canShow ? new[] { GeneralCommandType.DisplayMessage } : Array.Empty<GeneralCommandType>() }
    };

    private static void Online(ISessionManager manager, params SessionInfo[] sessions) => manager.Sessions.Returns(sessions);

    private sealed class StubHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, Task<HttpResponseMessage>> _send;

        public StubHandler(Func<HttpRequestMessage, Task<HttpResponseMessage>> send) => _send = send;

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) => _send(request);
    }

    private sealed class HeldStore : INotifyHeldStore
    {
        public List<NotifyHeldMessage> Held { get; } = new();

        public void Hold(NotifyHeldMessage message) => Held.Add(message);

        public IReadOnlyList<NotifyHeldMessage> Take(Guid userId)
        {
            var taken = Held.Where(h => h.UserId == userId).ToList();
            Held.RemoveAll(h => h.UserId == userId);
            return taken;
        }

        public bool IsStillDue(NotifyHeldMessage message) => message.Subject != "gone";
    }

    private sealed class PushStore : IWebPushStore
    {
        public WebPushKeys Keys { get; } = WebPushKeys.Generate("admin@example.com");

        public List<WebPushSubscription> All { get; } = new();

        public void Add(Guid user, string endpoint, string p256dh, string auth)
            => All.Add(new WebPushSubscription(user, endpoint, p256dh, auth, string.Empty, DateTime.UtcNow));

        public WebPushKeys? GetKeys() => Keys;

        public IReadOnlyList<WebPushSubscription> GetSubscriptions(Guid userId) => All.Where(s => s.UserId == userId).ToList();

        public void Save(WebPushSubscription subscription)
        {
            All.RemoveAll(s => s.Endpoint == subscription.Endpoint);
            All.Add(subscription);
        }

        public void Remove(string endpoint) => All.RemoveAll(s => s.Endpoint == endpoint);
    }
}
