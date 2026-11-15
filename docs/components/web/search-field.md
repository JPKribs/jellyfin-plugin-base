# Search Field

A search input with a search icon at its trailing end, which a clear button replaces while it has text. Escape clears it, and clearing returns focus to the input.

## Decision

| When | Use |
| :--- | :--- |
| Filtering a list the page holds in memory | Search Field. |
| Feeding a [Data Table](data-table.md)'s `setSearch` from a search that sits elsewhere on the page | Search Field. |
| A [Paginated Table](paginated-table.md) | Not the Search Field. It has its own search. |
| A [Data Table](data-table.md) or a [Filtered List](filtered-list.md) | Its `search` option, which draws one. |

## Usage

```js
import { createSearchField } from './configurationpage?name=myplugin_jpkribs_shared.js';

var search = createSearchField({ placeholder: 'alice', onInput: function (value) { applyFilter(value); } });
container.appendChild(search.element);
```

Classes: `base-search`, `base-search-clear`. The handle is `{ element, input, getValue, setValue, setSize, focus, destroy }`.

## States and Modifiers

* `onInput` is debounced by `delay`, 250 ms by default, and also runs after a clear. `onSearch` runs at once on Enter.
* `setValue` does not call `onInput`.
* The input is `type="search"` with the browser's own marks hidden. The search icon shows while it is empty, and the clear button takes its place while it has text.
* The labels default to "Search" and "Clear". `label` and `clearLabel` replace them.
* `size` is `small`, `medium` (default), or `large`, and sizes its fields on the [size scale](design-tokens.md). `setSize(size)` changes it later.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createSearchField`

<code>function createSearchField(options?: SearchFieldOptions): SearchFieldHandle</code>

A search input with a search icon at its trailing end, which a clear button replaces while it has text. Escape clears it, and clearing returns focus to the input.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `value` | <code>string</code> | first text [optional] |
| `placeholder` | <code>string</code> | a valid example search [optional] |
| `label` | <code>string</code> | aria-label of the input (default 'Search') |
| `clearLabel` | <code>string</code> | title and aria-label of the clear button (default 'Clear') |
| `delay` | <code>number</code> | milliseconds to wait after typing before onInput runs (default 250) |
| `size` | <code>'small' &#124; 'medium' &#124; 'large'</code> | 'small', 'medium', or 'large' for its fields (default 'medium') |
| `onInput` | <code>(value: string): void</code> | function(value) called after typing stops, and after a clear [optional] |
| `onSearch` | <code>(value: string): void</code> | function(value) called at once on Enter [optional] |

| Handle member | Type |
| :--- | :--- |
| `input` | <code>HTMLInputElement</code> |
| `getValue` | <code>(): string</code> |
| `setValue` | <code>(text?: string): void</code> |
| `setSize` | <code>(size?: 'small' &#124; 'medium' &#124; 'large'): void</code> |
| `focus` | <code>(): void</code> |
| `destroy` | <code>(): void</code> |

| Class | What it looks like |
| :--- | :--- |
| `base-search` | Search input with a search icon at its trailing end, which a clear button replaces while it has text |

<!-- reference:end -->

## Example

<iframe class="base-preview" src="../../../assets/previews/search-field.html" title="Search Field example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "search-field.html"
```
