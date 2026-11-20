# Web Push

The page half of web push. It checks whether a page can get notifications, asks the person to allow them, subscribes the plugin's own service worker with the server's VAPID public key, and sends the subscription to the plugin. See [Notifications](../../Notifications.md) for the server half and the service worker.

!!! warning "Web push needs HTTPS"
    Browsers allow push only on a secure origin, a page opened over HTTPS, with `localhost` the one exception. On an iPhone or iPad, the page must be added to the home screen first. The person must allow notifications.

## Decision

| When | Use |
| :--- | :--- |
| A page offers notifications on this device | `subscribeWebPush` from a button's click |
| A page shows whether this device gets them | `webPushState` and its `message` |
| A message in the dashboard while a device is online | The Jellyfin channel of `BaseNotifier`, with no page code |
| A page that loads neither the bundle nor its CSS | The [standalone page script](../csharp/pages-and-templates.md#basepagescript), whose helpers resolve to the state alone |

## Usage

```js
import { webPushState, subscribeWebPush, unsubscribeWebPush } from './configurationpage?name=myplugin_jpkribs_shared.js';

var registration = navigator.serviceWorker.register('sw.js');
webPushState(registration).then(function (r) { status.textContent = r.message; });

button.addEventListener('click', function () {
    shared.apiRequest('Push/Key', 'GET').then(function (key) {
        return subscribeWebPush({
            registration: registration,
            publicKey: key.PublicKey,
            save: function (subscription) { return shared.apiRequest('Push/Subscribe', 'POST', subscription); }
        });
    }).then(function (r) { status.textContent = r.message; });
});
```

## States and Modifiers

| State | When | Message |
| :--- | :--- | :--- |
| `insecure` | `window.isSecureContext` is false | "Notifications work only when the page opens over HTTPS." |
| `install` | An iPhone or iPad page that is not running from the home screen | "Add this page to the home screen to get notifications on an iPhone or iPad." |
| `unsupported` | No service worker, `PushManager`, or `Notification` | "This browser cannot show notifications." |
| `denied` | The person blocked notifications | "Notifications are blocked. Allow them in the browser's settings for this site." |
| `off` | Push works and there is no subscription | "Notifications are off." |
| `on` | The service worker holds a subscription and notifications are allowed | "Notifications are on." |

* `subscribeWebPush` asks for permission, reuses a subscription made with the same key, replaces one made with another, then calls `save` with `{ endpoint, keys: { p256dh, auth }, label }`. It resolves to `on`, or to `denied` or `off` when the person does not allow it.
* `unsubscribeWebPush` calls `remove` with the subscription, then removes it from the browser, and resolves to `off`.
* `webPushText(state)` gives a state's message in the page's language, and `webPushLabel()` a short name for the device, such as "Safari · iPhone", which the subscription carries as its `label`.

## Gotchas

* Call `subscribeWebPush` from a click. Browsers ask for permission only after a gesture, and Safari refuses the ask otherwise.
* The registration is the plugin's own service worker, and its script must show the push. Load Base's worker script into it. See [The Service Worker](../../Notifications.md#the-service-worker).
* `publicKey` is required, and a missing one rejects.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `webPushState`

<code>function webPushState(registration?: ServiceWorkerRegistration &#124; PromiseLike&lt;ServiceWorkerRegistration&gt; &#124; null): Promise&lt;WebPushResult&gt;</code>

Says where a page stands with web push, without asking the person anything. Push works only on a secure origin, HTTPS or localhost, and an iPhone or iPad page only once it is added to the home screen.

### `subscribeWebPush`

<code>function subscribeWebPush(options: WebPushOptions): Promise&lt;WebPushResult&gt;</code>

Asks the person to allow notifications, subscribes the plugin's service worker with the server's VAPID public key, and sends the subscription to the plugin through save. A subscription made with another key is replaced. Call it from a click, since browsers ask only after a gesture.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `registration` (required) | <code>ServiceWorkerRegistration &#124; PromiseLike&lt;ServiceWorkerRegistration&gt;</code> | the plugin's service worker registration, or a promise of it, such as navigator.serviceWorker.register('sw.js') |
| `publicKey` | <code>string</code> | the server's VAPID public key, base64url, from BaseNotifier.GetPublicKey |
| `save` | <code>(subscription: WebPushSubscriptionJson): PromiseLike&lt;unknown&gt;</code> | function(subscription) that sends { endpoint, keys, label } to the plugin and returns a promise [optional] |
| `remove` | <code>(subscription: WebPushSubscriptionJson): PromiseLike&lt;unknown&gt;</code> | not used to subscribe [optional] |

### `unsubscribeWebPush`

<code>function unsubscribeWebPush(options: WebPushOptions): Promise&lt;WebPushResult&gt;</code>

Removes the plugin's subscription from the plugin through remove, then from the browser.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `registration` (required) | <code>ServiceWorkerRegistration &#124; PromiseLike&lt;ServiceWorkerRegistration&gt;</code> | the plugin's service worker registration, or a promise of it |
| `publicKey` | <code>string</code> | not used to unsubscribe [optional] |
| `save` | <code>(subscription: WebPushSubscriptionJson): PromiseLike&lt;unknown&gt;</code> | not used to unsubscribe [optional] |
| `remove` | <code>(subscription: WebPushSubscriptionJson): PromiseLike&lt;unknown&gt;</code> | function(subscription) that tells the plugin to forget it and returns a promise [optional] |

### `webPushText`

<code>function webPushText(state: WebPushState): string</code>

The sentence a page shows for a web push state, in the page's language.

### `webPushLabel`

<code>function webPushLabel(userAgent?: string): string</code>

A short name for the device a page runs on, such as "Safari · iPhone", for the plugin's list of subscriptions.

| Type | What it is |
| :--- | :--- |
| `WebPushState` | Where a page stands with web push. unsupported has no push in the browser, insecure is a page not on HTTPS, install is an iPhone or iPad page not yet added to the home screen, denied is a person who blocked notifications, off has none yet, and on is subscribed. |
| `WebPushSubscriptionJson` | The subscription a page sends its plugin, as PushSubscription.toJSON gives it, with a short name for the device. |
| `WebPushResult` | What subscribeWebPush, unsubscribeWebPush, and webPushState resolve to: the state, and its sentence for the person. |

<!-- reference:end -->

## Example

<iframe class="base-preview" src="../../../assets/previews/web-push.html" title="Web Push example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "web-push.html"
```
