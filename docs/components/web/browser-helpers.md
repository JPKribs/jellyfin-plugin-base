# Browser Helpers

Small functions exported from the bundle for what a plugin otherwise rewrites. `escapeHtml` and `plural` are also on the [Shared Bag](shared-bag.md).

## When to Use

* Use `escapeHtml` for every value placed into HTML a component builds from a string.
* Use `plural` for any count in a label.

## When Not to Use

* Never build a plural by hand, such as `n + ' items'`.

## Usage

```js
import { downloadJson, pickJsonFile, errorText, plural, escapeHtml, debounce, generateGuid } from './configurationpage?name=myplugin_jpkribs_shared.js';

downloadJson('channels.json', config.Channels);
pickJsonFile().then(function (data) { if (data) { applyImport(data); } },
    function (err) { shared.setStatus('importStatus', err.message, true); });
shared.saveConfig(config).catch(function (err) {
    errorText(err, 'Save failed.').then(function (text) { shared.setStatus('saveStatus', text, true); });
});
```

## States and Modifiers

* `plural(count, one, many)` gives the count, a space, and the word. Only a count of exactly 1 takes `one`. `many` defaults to `one` with an "s".
* `escapeHtml(value)` escapes `&`, `<`, `>`, and both quotes. Null and undefined become an empty string.
* `debounce(fn, ms)` runs `fn` once calls pause for `ms` (default 300) with the latest arguments. It has `cancel()`.
* `downloadJson(filename, value)` saves a pretty printed JSON file.
* `pickJsonFile()` opens a file picker. It resolves to the parsed JSON, resolves to `null` when cancelled, and rejects with "The file is not valid JSON." or "The file could not be read.".
* `generateGuid({ compact })` gives a random version 4 GUID, without dashes when `compact` is true.
* `errorText(err, fallback)` always returns a promise of the reason a failed request gave, read from the `Error`, `error`, `detail`, `title`, or `message` of a JSON body, else `fallback` (default "Could not save.").
* `shared.copyToClipboard(text)` copies with `navigator.clipboard` and falls back to a hidden textarea on HTTP dashboards. It resolves to whether it worked.
* `shared.copyWithFeedback(btn, text, opts)` copies and briefly swaps the button label to "Copied." or "Copy failed.". `opts` takes `copiedText`, `failedText`, and `duration` (default 1500 ms).
* `shared.fetchObjectUrl(endpoint, params)` fetches an authenticated endpoint under `apiPrefix` as a blob and returns an object URL. Revoke the URL when done.

## Gotchas

* `copyToClipboard` is also exported on its own for the [Copy Field](copy-field.md).

## Used By

Artwork Generator, Live Channels, and Scripts use `downloadJson` and `pickJsonFile`. Live Channels, Remote Access, and Scripts use `copyWithFeedback`. Artwork Generator and YouTube Audio use `debounce`.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/browser-helpers.html" title="Browser Helpers example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "browser-helpers.html"
```
