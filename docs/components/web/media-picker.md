# Media Picker

`createMediaPicker` searches the library and picks items. Each result and each picked item shows as a [Media Card](media-card.md) row with its artwork, and each picked item has a Remove button.

## When to Use

* Use it to pick movies, series, or other library items, such as titles to exclude or a collection to follow.

## When Not to Use

* Use a [Chip Select](chip-select.md) for values that have no artwork, and a [User Selector](user-selector.md) for users.

## Usage

```js
import { createMediaPicker } from './configurationpage?name=myplugin_jpkribs_shared.js';

var excluded = createMediaPicker({
    label: 'Excluded Titles',
    itemTypes: ['Movie', 'Series'],
    value: config.ExcludedItems,
    onChange: function (items) { config.ExcludedItems = items; tracker.check(); }
});
container.appendChild(excluded.element);
```

A page with its own source passes `searchFn`, which returns a promise of items.

```js
var picker = createMediaPicker({
    searchFn: function (query) { return shared.apiRequest('Search?term=' + encodeURIComponent(query)); }
});
```

Classes: `base-media-picker`, plus the [Search Field](search-field.md), [Combo Box](combo-box.md), and [Media Card](media-card.md) classes. The handle is `{ element, input, getValue, setValue, setHeight, setSize, destroy }`.

Parts: `base-media-picker-results`, `base-media-picker-option`, `base-media-picker-message`, `base-media-picker-items`, `base-media-picker-item`, `base-media-picker-empty`.

## States and Modifiers

* The default source asks `Items` through `ApiClient.getJSON` with `searchTerm`, `IncludeItemTypes`, `Recursive`, `Limit`, `Fields`, and `EnableImageTypes`, and reads `.Items`. Without `ApiClient` or `searchFn` a search finds nothing.
* An item is `{ Id, Name, Type, ProductionYear }`, with `ImageTags` when the source gives it. `getValue` returns the same shape. An item whose `ImageTags` has no `Primary` tag shows the placeholder icon.
* `label` names the field and the input, and `description` adds a sentence under it.
* `itemTypes` defaults to `['Movie', 'Series']`, `maxResults` to 20, `minChars` to 2, and `delay` to 250 milliseconds. `single: true` keeps one item and replaces it on the next pick.
* The defaults are "Search the library" (`placeholder`), "Clear" (`clearLabel`), "No items selected." (`emptyText`), "No matches." (`noResultsText`), "Could not search the library." (`errorText`), and "Remove {value}" (`removeText`). `typeLabels` names each type on the second line, such as "Collection" for BoxSet.
* The arrow keys move through the results, Enter picks the active one, and a click outside closes them. The first Escape closes the results and keeps the text, and the next clears it.
* An answer that is not the latest, or that comes after the results closed, is dropped.
* The results float like the [Combo Box](combo-box.md) dropdown, so a scrolling list or a dialog never clips them. The search field keeps its own search icon.
* `emptyText` is the picked List's empty text, shown after the list while nothing is picked.
* The picked items are a [List](list.md) of bordered rows, so `height`, `maxHeight`, and `minHeight` take what a List takes, and `setHeight(height, maxHeight)` changes them later. By default the list grows with its items.
* Remove moves focus to the next Remove button, or to the input when the list empties. `setValue` does not call `onChange`.
* `size` is `small`, `medium` (default), or `large`, and sizes its fields on the [size scale](design-tokens.md). `setSize(size)` changes it later.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createMediaPicker`

<code>function createMediaPicker(options?: MediaPickerOptions): MediaPickerHandle</code>

A library search that picks media items. Each result and each picked item shows as a media card with its artwork, and each picked item has a Remove button.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `value` | <code>MediaPickerItem[] &#124; null</code> | picked items, as [{ Id, Name, Type, ProductionYear }] [optional] |
| `itemTypes` | <code>string[]</code> | item types to search (default ['Movie', 'Series']) |
| `single` | <code>boolean</code> | keep at most one item, replacing it on the next pick (default false) |
| `maxResults` | <code>number</code> | most results shown (default 20) |
| `minChars` | <code>number</code> | fewest typed characters that start a search (default 2) |
| `delay` | <code>number</code> | milliseconds to wait after typing before the search runs (default 250) |
| `label` | <code>string</code> | the field label, which also names the input [optional] |
| `description` | <code>string</code> | a sentence under the field [optional] |
| `placeholder` | <code>string</code> | the input placeholder (default 'Search the library') |
| `clearLabel` | <code>string</code> | title and aria-label of the clear button (default 'Clear') |
| `emptyText` | <code>string</code> | sentence shown while nothing is picked (default 'No items selected.') |
| `noResultsText` | <code>string</code> | sentence shown when a search finds nothing (default 'No matches.') |
| `errorText` | <code>string</code> | sentence shown when a search fails (default 'Could not search the library.') |
| `removeText` | <code>string</code> | title and aria-label of a remove button, where {value} is the item's name (default 'Remove {value}') |
| `typeLabels` | <code>Record&lt;string, string&gt;</code> | names of item types on the second line, such as { BoxSet: 'Collection' } [optional] |
| `height` | <code>ListHeight</code> | the picked list's height, 'auto', 'fill', a number of pixels, or a CSS length, as a List takes it (default 'auto') |
| `maxHeight` | <code>number &#124; string &#124; null</code> | the most the picked list grows before it scrolls [optional] |
| `minHeight` | <code>number &#124; string &#124; null</code> | the least a filling picked list takes [optional] |
| `size` | <code>'small' &#124; 'medium' &#124; 'large'</code> | 'small', 'medium', or 'large' for its fields (default 'medium') |
| `searchFn` | <code>(query: string): Promise&lt;MediaPickerItem[] &#124; null &#124; undefined&gt;</code> | function(query) returning a promise of items, which replaces the Items endpoint [optional] |
| `onChange` | <code>(items: MediaPickerItem[]): void</code> | function(items) called when a pick or a removal changes the items [optional] |

| Handle member | Type |
| :--- | :--- |
| `input` | <code>HTMLInputElement</code> |
| `getValue` | <code>(): MediaPickerItem[]</code> |
| `setValue` | <code>(items: MediaPickerItem[] &#124; null): void</code> |
| `setHeight` | <code>(height: ListHeight, maxHeight?: number &#124; string &#124; null): void</code> |
| `setSize` | <code>(size?: 'small' &#124; 'medium' &#124; 'large'): void</code> |
| `destroy` | <code>(): void</code> |

| Type | What it is |
| :--- | :--- |
| `MediaPickerItem` | A library item in a media picker, as the Items endpoint returns it. ImageTags, when given, tells whether a Primary image exists. |

| Class | What it looks like |
| :--- | :--- |
| `base-media-picker` | Library search over a list of picked media rows, built by createMediaPicker |
| `base-combo-dropdown.base-media-picker-results` | Results dropdown tall enough for several rows with artwork |
| `base-combo-option.base-media-picker-option` | One result, a borderless media row with small artwork |

<!-- reference:end -->

## Used By

No plugin uses it today.

## Example

<iframe class="base-preview" src="../../../assets/previews/media-picker.html" title="Media Picker example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "media-picker.html"
```
