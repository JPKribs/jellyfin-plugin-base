# Banner

A callout with a Dismiss button. It remembers a dismissal only when the caller gives a key and a storage object, so Base never touches browser storage on its own.

## Decision

| When | Use |
| :--- | :--- |
| A notice the user may close, such as a tip | Banner |
| A notice that stays | [Callout](callout.md) |

## Usage

```js
import { createBanner } from './configurationpage?name=myplugin_jpkribs_shared.js';

var banner = createBanner({
    kind: 'warn',
    text: 'Back up first.',
    key: 'backup-tip',
    storage: { get: function (k) { return store[k]; }, set: function (k, v) { store[k] = v; } }
});
container.appendChild(banner.element);
```

Classes: `base-banner`, `base-banner-close`. The handle is `{ element, getValue, setValue, show, dismiss, destroy }`.

Parts: `base-banner-body`, `base-banner-title`.

## States and Modifiers

* `kind` is `info` (default), `success`, `warn`, `error`, or `neutral`. The banner also takes the matching [Callout](callout.md) class, and shows the icon of its kind beside the text.
* `title` adds a bold first line. `dismissible: false` hides the button. `dismissLabel` replaces "Dismiss".
* Dismissal is remembered only with both `key` and `storage`. With a key and a storage whose `get(key)` is true, the banner starts hidden.
* `getValue()` returns `{ kind, title, text, dismissed }`, and `setValue({ kind, title, text })` changes what it shows. `show()` brings back a dismissed banner, and `dismiss()` closes it from code.
* `onDismiss()` runs when it is dismissed.
* `actions` are small buttons under the text, `[{ text, primary, className, onClick(button) }]`, such as Apply. `primary` draws the main one, and the rest are secondary. `setActions(actions)` replaces them, and `null` removes them.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createBanner`

<code>function createBanner(options?: BannerOptions): BannerHandle</code>

A callout with a Dismiss button. It remembers a dismissal only when the caller gives a key and a storage object, so Base never touches browser storage on its own.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `kind` | <code>BannerKind &#124; string</code> | 'info', 'success', 'warn', 'error', or 'neutral' (default 'info') |
| `title` | <code>string</code> | bold first line [optional] |
| `text` | <code>string</code> | the message sentence [optional] |
| `dismissible` | <code>boolean</code> | false hides the button (default true) |
| `dismissLabel` | <code>string</code> | title and aria-label of the button (default 'Dismiss') |
| `key` | <code>string</code> | name that identifies this banner in the storage [optional] |
| `storage` | <code>BannerStorage &#124; null</code> | { get: function(key), set: function(key, true) } that remembers a dismissal [optional] |
| `actions` | <code>BannerAction[] &#124; null</code> | array of { text, primary, className, onClick(button) } drawn as small buttons under the text, such as Apply [optional] |
| `onDismiss` | <code>(): void</code> | function() called when the user dismisses it [optional] |

| Handle member | Type |
| :--- | :--- |
| `getValue` | <code>(): BannerValue</code> |
| `setValue` | <code>(next: BannerValue): void</code> |
| `show` | <code>(): void</code> |
| `dismiss` | <code>(): void</code> |
| `setActions` | <code>(actions: BannerAction[] &#124; null &#124; undefined): void</code> |
| `destroy` | <code>(): void</code> |

| Type | What it is |
| :--- | :--- |
| `BannerKind` | The tone of a banner, which picks its tint and glyph. |
| `BannerStorage` | Where a banner remembers a dismissal, given by the caller so Base never touches browser storage itself. |
| `BannerValue` | What a banner's getValue returns, and the kind, title, and text its setValue takes. |
| `BannerAction` | A button under a banner's text. primary draws it as the main action, and onClick gets the button, which it may disable while it works. |

| Class | What it looks like |
| :--- | :--- |
| `base-banner-actions` | The buttons under a banner's text, such as Apply |

<!-- reference:end -->

## Example

<iframe class="base-preview" src="../../../assets/previews/banner.html" title="Banner example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "banner.html"
```
