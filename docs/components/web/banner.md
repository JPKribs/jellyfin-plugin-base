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

Classes: `jpk-banner`, `jpk-banner-close`. The handle is `{ element, getValue, setValue, show, dismiss, destroy }`.

Parts: `jpk-banner-body`, `jpk-banner-title`.

## States and Modifiers

* `kind` is `info` (default), `success`, `warn`, `error`, or `neutral`. The banner is also the matching callout class.
* `title` adds a bold first line. `dismissible: false` hides the button. `dismissLabel` replaces "Dismiss".
* Dismissal is remembered only with both `key` and `storage`. With a key and a storage whose `get(key)` is true, the banner starts hidden.
* `getValue()` returns `{ kind, title, text, dismissed }`.

## Used By

No plugin uses it today.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/banner.html" title="Banner example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "banner.html"
```
