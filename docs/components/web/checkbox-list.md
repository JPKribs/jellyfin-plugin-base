# Checkbox List

A searchable list of checkbox rows for picking many arbitrary items, such as series, libraries, or files. It is a [Filtered List](filtered-list.md) with multiple selection whose items are check rows, so its search, checkboxes, select all, and keyed redraw come from there. The [User Multi Selector](user-multi-selector.md) is a Checkbox List of the server's users.

## When to Use

* Use it to pick many items from a list the user may need to search.

## When Not to Use

* Use a [Chip Select](chip-select.md) for a very long list, and a [Check Grid](check-grid.md) for a short fixed set.
* Use the [User Multi Selector](user-multi-selector.md) to pick the server's users.
* Use a [Filtered List](filtered-list.md) when the selected items are acted on, with bulk actions, rather than saved as a setting.

## Usage

```js
import { createCheckboxList } from './configurationpage?name=myplugin_jpkribs_shared.js';

var series = createCheckboxList({
    items: seriesList,
    value: ['s2'],
    disabledIds: ['s9'],
    searchKeys: ['name'],
    showSelectAll: true,
    renderRow: function (s) { return { label: s.name, sublabel: 'First aired ' + s.year, imageUrl: s.poster, note: '' }; },
    onChange: function (ids) { tracker.check(); }
});
container.appendChild(series.element);
series.ready.then(function () { series.setValue(config.SeriesIds); });
```

Classes: `base-check-list`, `base-check-list-search`, `base-check-list-body`, `base-check-row`, `base-check-row-input`, `base-check-thumb`, `base-check-text`, `base-check-label`, `base-check-sub`, `base-check-avatar`, `base-check-badge`, `base-check-note`, `base-check-selectall`, `base-check-row-disabled`, `base-check-empty`. The handle is `{ element, ready, getValue, setValue, setDisabled, refresh, setHeight, destroy }`.

## States and Modifiers

* `renderRow` returns `{ label, sublabel, imageUrl, image, avatar, badge, note }`, and reads `item.name` by default. `image` is a loader, such as a proxied image, and wins over `imageUrl`. `avatar` is `{ src, name }` and draws a person, with the person icon when there is no picture, in place of `imageUrl`. `badge` is a label or `{ label, color }`, drawn as a `base-badge`. `note` is a gray badge.
* `idKey` names the id property, or is a function of the item, `id` by default. `matchKey(id)` sets how two ids compare, such as ignoring case and dashes in a GUID.
* `items` is a static array. `fetchItems()` returns an array or a promise of one (or `{ Items }`) and overrides it.
* `showSelectAll` adds a "Select all" row that checks or clears the rows in view that are not disabled. It is checked when all of them are, and indeterminate when only some are. `selectAllText` replaces the label.
* The search box waits 200 ms after typing, and `search: false` hides it. `placeholder` sets its text, "Search" by default.
* `search` may be a function of the search text that returns the items the server finds, as an array, `{ Items }`, or a promise of either. It runs through the data view's fetch, once at the start and again for each search, and an answer a newer search replaced is dropped. `refresh()` asks again for the current text. Checked ids stay checked when a search hides their rows.
* While `fetchItems` is pending the rows say "Loading". With no rows, or after a failed load, they say `emptyMessage`, "No items available." by default, as the List's empty text, which keeps the `base-check-empty` class.
* Selected ids survive searches because they are kept apart from the rendered rows.
* Each row is a native label and checkbox, so Space toggles and the label is clickable.
* The rows are a [List](list.md), so `height`, `maxHeight`, and `minHeight` take what a List takes, and `setHeight(height, maxHeight)` changes them later. `maxHeight` is 320 by default, so the rows scroll past 320px, and `null` removes the cap.
* `size` is `small`, `medium` (default), or `large`, and sizes its fields on the [size scale](design-tokens.md).

## Gotchas

* Matching always reads the item properties named in `searchKeys` (default `name`), never the rendered label.
* `getValue()` returns ids as strings, in the order they were picked.
* `ready` is a promise of the loaded items. `refresh()` reloads and returns a promise.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createCheckboxList`

<code>function createCheckboxList(options?: CheckboxListOptions): CheckboxListHandle</code>

A searchable list of checkbox rows for picking many items, with an optional thumbnail, sublabel, and note on each row. It is a Filtered List whose items are check rows, with a select all row over the selection core. It reads a static array or an async fetch.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `items` | <code>any[]</code> | static array of item objects [optional] |
| `fetchItems` | <code>(): any[] &#124; { Items?: any[]; } &#124; Promise&lt;any[] &#124; { Items?: any[]; }&gt;</code> | function() returning an array or a promise of one, which overrides items [optional] |
| `idKey` | <code>string &#124; ((item: any) =&gt; unknown); matchKey?(id: unknown): string; value?: unknown[]; disabledIds?: unknown[]; renderRow?(item: any): CheckboxListRow &#124; null &#124; undefined; search?: boolean &#124; ((text: string) =&gt; any[] &#124; { Items?: any[]</code> | property name or function(item) returning the id (default 'id') |

| Handle member | Type |
| :--- | :--- |
| `ready` | <code>Promise&lt;any[]&gt;</code> |
| `getValue` | <code>(): string[]</code> |
| `setValue` | <code>(ids: unknown[] &#124; null): void</code> |
| `setDisabled` | <code>(ids: unknown[] &#124; null): void</code> |
| `refresh` | <code>(): Promise&lt;any[]&gt;</code> |
| `setHeight` | <code>(height: ListHeight, maxHeight?: number &#124; string &#124; null): void</code> |
| `destroy` | <code>(): void</code> |

| Type | What it is |
| :--- | :--- |
| `CheckboxListRow` | What a checkbox list draws on one row. Only label is needed. avatar draws a person, with the person icon when it has no picture. |

| Class | What it looks like |
| :--- | :--- |
| `base-check-row` | One selectable row with a checkbox, an optional thumbnail, a text block, and an optional note |
| `base-check-row-input` | Checkbox at the start of a row |
| `base-check-thumb` | Thumbnail shown before the text when a row supplies an imageUrl, a base-thumb frame with its placeholder under the image |
| `base-check-text` | Text block that stacks a label over an optional sublabel |
| `base-check-label` | Row label that clips with an ellipsis |
| `base-check-sub` | Small dimmed sublabel that clips with an ellipsis |
| `base-check-avatar` | A person's avatar at the start of a row, the size of a thumbnail, with the person icon when they have no picture |
| `base-check-badge` | A badge or note at the end of a row, drawn as a base-badge |
| `base-check-selectall` | Select all row that sits above the list with a divider |
| `base-check-row-disabled` | Dimmed row that cannot be selected |

<!-- reference:end -->

## Used By

Scripts uses it. Artwork Generator writes the `base-check-list`, `base-check-row`, and `base-check-label` markup by hand.

## Example

<iframe class="base-preview" src="../../../assets/previews/checkbox-list.html" title="Checkbox List example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "checkbox-list.html"
```
