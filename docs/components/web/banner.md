# Banner

A callout with a Dismiss button. It remembers a dismissal only when the caller gives a key and a storage object, so Base never touches browser storage on its own.

## When to Use

* Use it for a notice the user may close, such as a tip.

## When Not to Use

* Use a [Callout](callout.md) for a notice that stays.

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
| `onDismiss` | <code>(): void</code> | function() called when the user dismisses it [optional] |

| Handle member | Type |
| :--- | :--- |
| `getValue` | <code>(): BannerValue</code> |
| `setValue` | <code>(next: BannerValue): void</code> |
| `show` | <code>(): void</code> |
| `dismiss` | <code>(): void</code> |
| `destroy` | <code>(): void</code> |

| Type | What it is |
| :--- | :--- |
| `BannerKind` | The tone of a banner, which picks its tint and glyph. |
| `BannerStorage` | Where a banner remembers a dismissal, given by the caller so Base never touches browser storage itself. |
| `BannerValue` | What a banner's getValue returns, and the kind, title, and text its setValue takes. |

<!-- reference:end -->

## Used By

No plugin uses it today.

## Example

<iframe class="base-preview" src="../../../assets/previews/banner.html" title="Banner example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "banner.html"
```
