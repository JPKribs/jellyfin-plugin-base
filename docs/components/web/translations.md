# Translations

`loadTranslations(url, options)` loads the plugin's strings in the viewer's language from the plugin's translations endpoint, and returns a handle that reads, formats, cases, and applies them. The handle becomes the page's current translations, which every component reads its default text from. `titleCase` and `sentenceCase` convert English text. How a plugin declares Jellyfin strings and adds its own is on [Translations](../../Translations.md).

## Decision

| When | Use |
| :--- | :--- |
| Text on a config page or a standalone page in the viewer's language | `loadTranslations`, then `t.tr` and `t.format` |
| Static markup with a key | `data-str`, `data-str-title`, `data-str-label`, or `data-str-placeholder`, then `t.apply(root)` |
| Strings that came another way, such as in a page's first response | `createTranslations(strings, language)` |
| A count in a sentence | `t.format('QuotaLeft', used, total)`, with the plural forms as separate keys |
| A string in title case or sentence case | `t.title(key)` or `t.sentence(key)` |
| Any English text in title case or sentence case | `titleCase(text, options)` or `sentenceCase(text, options)` |
| Components in the viewer's language | `loadTranslations` before building them |
| Text the server writes, such as an activity entry | [BaseTranslations](../csharp/translations.md#basetranslations) in C# |

## Usage

```js
import { loadTranslations } from './configurationpage?name=myplugin_jpkribs_shared.js';

loadTranslations('MyPlugin/Translations').then(function (t) {
    t.apply(view);
    view.querySelector('#quota').textContent = t.format('QuotaLeft', 3, 5);
});
```

```html
<h2 data-str="MyRequests">My Requests</h2>
<input data-str-placeholder="Search" placeholder="Search">
```

Load the translations before building components, so their default text is translated.

```js
loadTranslations('MyPlugin/Translations').then(function (t) {
    t.apply(view);
    createPaginatedTable(view, shared, { containerId: 'rows', endpoint: 'Rows', columns: columns });
});
```

The endpoint answers with `BaseTranslations.Serve`. A relative address goes through `ApiClient.getUrl`, so the page works on a server hosted under a base URL. A standalone page with no `ApiClient` passes an address that starts with `/`.

## States and Modifiers

* The language is `options.language`, else the viewer's display setting in the web client, else the browser's language. `options.userId` names whose display setting to read on a page with no `ApiClient`.
* `tr(key, fallback)` gives the string, else `fallback`, else the key.
* `has(key)` is `true` only for a key the plugin has a string for.
* `currentLanguage()` reads the viewer's language on its own, and `formatText(text, ...args)` fills placeholders in any text.
* `currentTranslations()` gives the page's current translations, the handle `loadTranslations` gave last, or `null`.
* `t.title(key)` and `t.sentence(key)` convert in the handle's language, so only English changes, and keep the words of `t.casing`, Base's defaults and the plugin's casing list.
* `titleCase` and `sentenceCase` keep Base's defaults, the casing list of the page's current translations, and `options.exceptions`. They convert English, the default, and return text in any other `options.language` as it is. The rules are on [Casing](../../Translations.md#casing).

## Gotchas

* A load never rejects. A failed load gives a handle with no strings, so the page shows its fallbacks, and the next call asks again.
* Each address and language is loaded once per page load.
* `apply` sets text only, never HTML. Markup whose key has no string keeps its own text.
* A component reads its default text when it is built. One built before the translations load stays in US English until it is built again.
* A failed load keeps the translations an earlier load made current.
* The endpoint answers with `{ language, strings, casing }`. A plain object of strings also loads, with no casing list.

## Reference

<!-- reference:start -->

### `formatText`

<code>function formatText(text: string, ...args: unknown[]): string</code>

Fills the {0}, {1} placeholders of a text with the values after it. A placeholder with no value is kept.

### `currentLanguage`

<code>function currentLanguage(userId?: string): string</code>

Reads the viewer's language as the web client picks it: their display setting, else the browser's language.

### `titleCase`

<code>function titleCase(text: string, options?: CaseOptions): string</code>

Writes English text in title case, such as "Allow Media Playback", with the same rules as TextCase.ToTitleCase in C#. Short words such as of and the stay lower case unless first, last, or after a colon. Any other language returns the text as it is.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `exceptions` | <code>string[]</code> |  |
| `language` | <code>string</code> |  |

### `sentenceCase`

<code>function sentenceCase(text: string, options?: CaseOptions): string</code>

Writes English text in sentence case, such as "Allow media playback", with the same rules as TextCase.ToSentenceCase in C#. Words with a capital inside them, such as TV or iPhone, stay as written. Any other language returns the text as it is.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `exceptions` | <code>string[]</code> |  |
| `language` | <code>string</code> |  |

### `currentTranslations`

<code>function currentTranslations(): TranslationsHandle &#124; null</code>

The page's current translations: the handle loadTranslations gave last, which every component reads its default text from. null until a load finishes.

| Handle member | Type |
| :--- | :--- |
| `language` | <code>string</code> |
| `strings` | <code>Record&lt;string, string&gt;</code> |
| `casing` | <code>string[]</code> |
| `tr` | <code>(key: string, fallback?: string): string</code> |
| `format` | <code>(key: string, ...args: unknown[]): string</code> |
| `title` | <code>(key: string): string</code> |
| `sentence` | <code>(key: string): string</code> |
| `has` | <code>(key: string): boolean</code> |
| `apply` | <code>(root?: ParentNode): void</code> |

### `createTranslations`

<code>function createTranslations(strings: Record&lt;string, string&gt;, language?: string, casing?: string[]): TranslationsHandle</code>

Builds a translations handle over strings already loaded.

| Handle member | Type |
| :--- | :--- |
| `language` | <code>string</code> |
| `strings` | <code>Record&lt;string, string&gt;</code> |
| `casing` | <code>string[]</code> |
| `tr` | <code>(key: string, fallback?: string): string</code> |
| `format` | <code>(key: string, ...args: unknown[]): string</code> |
| `title` | <code>(key: string): string</code> |
| `sentence` | <code>(key: string): string</code> |
| `has` | <code>(key: string): boolean</code> |
| `apply` | <code>(root?: ParentNode): void</code> |

### `applyTranslations`

<code>function applyTranslations(translations: TranslationsHandle, root?: ParentNode): void</code>

Translates marked markup under a root. data-str sets the text, and data-str-title, data-str-label, and data-str-placeholder set the title, aria-label, and placeholder. A key with no string keeps the markup's own text.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `language` (required) | <code>string</code> |  |
| `strings` (required) | <code>Record&lt;string, string&gt;</code> |  |
| `casing` (required) | <code>string[]</code> |  |
| `tr` (required) | <code>(key: string, fallback?: string): string</code> |  |
| `format` (required) | <code>(key: string, ...args: unknown[]): string</code> |  |
| `title` (required) | <code>(key: string): string</code> |  |
| `sentence` (required) | <code>(key: string): string</code> |  |
| `has` (required) | <code>(key: string): boolean</code> |  |
| `apply` (required) | <code>(root?: ParentNode): void</code> |  |

### `loadTranslations`

<code>function loadTranslations(url: string, options?: TranslationsOptions): Promise&lt;TranslationsHandle&gt;</code>

Loads the plugin's strings in the viewer's language from its translations endpoint, once per address and language. It never rejects. A failed load gives a handle with no strings, so every tr falls back. The handle becomes the page's current translations, which components read their default text from, so load them before building components. The endpoint answers with { language, strings, casing }, or with the strings alone.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `language` | <code>string</code> |  |
| `userId` | <code>string</code> |  |

<!-- reference:end -->

## Example

<iframe class="base-preview" src="../../../assets/previews/translations.html" title="Translations example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "translations.html"
```
