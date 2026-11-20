# Notify Preview

What one notification destination gets for a message, drawn as its place shows it, from the preview `BaseNotifier.Preview` returns in C#. A Discord post looks as Discord's dark theme shows it, a webhook shows its request line over the body, a Jellyfin message shows as the web client's toast, and a web push shows as a browser notification. See [Notifications](../../Notifications.md) for the C# half.

## Decision

| When | Use |
| :--- | :--- |
| A settings page shows what an update looks like on each place it goes | Notify Preview, one per destination |
| A preview with no server, such as plain JSON | [Code Block](code-block.md) |

## Usage

```js
import { createNotifyPreview } from './configurationpage?name=myplugin_jpkribs_shared.js';

shared.apiRequest('Notifications/Preview', 'POST', { Title: title, Text: text }).then(function (previews) {
    previews.forEach(function (p) {
        host.appendChild(createNotifyPreview({ preview: p }).element);
    });
});
```

Classes: `base-notify-preview`, with the parts `base-notify-preview-line`, `base-notify-preview-method`, `base-notify-preview-address`, `base-notify-preview-type`, and `base-notify-preview-body` for a webhook, `base-notify-preview-screen` and `base-notify-preview-toast` for a Jellyfin message, `base-notify-preview-push` and its `-icon`, `-text`, `-title`, `-body`, `-site`, and `-image` for a web push, and `base-notify-preview-discord` and its parts for a Discord post. The handle is `{ element, setPreview, destroy }`.

## States and Modifiers

* The preview's keys may be PascalCase, as Jellyfin's API writes them, or camelCase. `Channel` is a name, such as `Discord`, or its number.
* A preview with an `Error` shows the error in a [Callout](callout.md), such as "Discord needs a JSON body.".
* A Discord post reads `Discord`, the post as data, else parses `Body`. It shows the name, the "App" tag, the time, any text, and each embed with its color bar, author, title, text, fields three to a row, image, thumbnail, and footer. Discord's markdown in the text is drawn, and a masked link shows in the link color and never as a link. `username` names a post whose body names none, "Jellyfin" by default.
* A webhook shows its method, the address as "Saved address" (`addressText`), since the stored address never reaches the page, and the content type, over the body exactly as sent, laid out when it is JSON.
* A Jellyfin message shows its text as the toast. A note under it names the header, which apps other than the web client show above the text.
* A web push shows its title, text, icon, and image, and the page's host as its site (`site`).
* `setPreview` draws another preview in its place, and `null` clears it.

## Gotchas

* Only http and https images load. Any other address, such as `data:` or `javascript:`, is left out.
* The Discord post keeps Discord's own colors in every Jellyfin theme, from the `--base-discord-*` tokens.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createNotifyPreview`

<code>function createNotifyPreview(options?: NotifyPreviewOptions): NotifyPreviewHandle</code>

Draws what one destination gets for a message, from the preview BaseNotifier returns: a Discord post as Discord's dark theme shows it, a webhook's request line over its body, a Jellyfin message as the web client's toast, or a web push as a browser notification. A preview with an error shows the error.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `preview` | <code>NotifyPreviewData &#124; null</code> | the preview from BaseNotifier.Preview [optional] |
| `username` | <code>string</code> | the name a Discord post comes from when its body names none (default 'Jellyfin') |
| `addressText` | <code>string</code> | the address a webhook's request line shows, since the stored address never reaches the page (default 'Saved address') |
| `site` | <code>string</code> | the site a web push names under its text (default the page's host) |
| `now` | <code>Date</code> | the time a Discord post shows (default the time it is drawn) |

| Handle member | Type |
| :--- | :--- |
| `setPreview` | <code>(preview: NotifyPreviewData &#124; null &#124; undefined): void</code> |
| `destroy` | <code>(): void</code> |

| Type | What it is |
| :--- | :--- |
| `NotifyChannelName` | A channel a notification goes to, by name or by BaseNotifier's number. |
| `NotifyPreviewData` | What BaseNotifier.Preview returns for one destination, with its keys in PascalCase as Jellyfin's API writes them, or in camelCase. |

| Class | What it looks like |
| :--- | :--- |
| `base-notify-preview` | What one notification destination gets, drawn as its place shows it, from BaseNotifier's preview |
| `base-notify-preview-line` | A webhook's request line, its method, address, and content type, joined to the Code Block of its body below |
| `base-notify-preview-screen` | A Jellyfin message as the web client's toast, at the bottom left of a strip of the page, with a note under it |
| `base-notify-preview-push` | A web push as a browser notification on the floating surface: the icon, then the title, text, site, and image |
| `base-notify-preview-discord` | A Discord post in Discord's dark theme, in any Jellyfin theme: the avatar beside the name, app tag, time, text, and embeds |
| `base-notify-preview-discord-embed` | One embed with a bar of its color, from the post as a custom color, beside its parts and an optional thumbnail |

<!-- reference:end -->

## Example

<iframe class="base-preview" src="../../../assets/previews/notify-preview.html" title="Notify Preview example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "notify-preview.html"
```
