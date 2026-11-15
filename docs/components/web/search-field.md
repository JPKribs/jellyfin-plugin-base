# Search Field

A search input with a clear button that shows while it has text. Escape clears it, and clearing returns focus to the input.

## When to Use

* Use it to filter a list the page holds in memory, or to feed a table's `setSearch`.

## When Not to Use

* Never add one to a [Paginated Table](paginated-table.md). The table has its own search.

## Usage

```js
import { createSearchField } from './configurationpage?name=myplugin_jpkribs_shared.js';

var search = createSearchField({ placeholder: 'alice', onInput: function (value) { applyFilter(value); } });
container.appendChild(search.element);
```

Classes: `jpk-search`, `jpk-search-clear`. The handle is `{ element, input, getValue, setValue, focus, destroy }`.

## States and Modifiers

* `onInput` is debounced by `delay`, 250 ms by default, and also runs after a clear. `onSearch` runs at once on Enter.
* `setValue` does not call `onInput`.
* The input is `type="search"` with the browser clear mark hidden. The clear button shows while the input has text.
* The labels default to "Search" and "Clear". `label` and `clearLabel` replace them.

## Used By

No plugin uses it today. Custom Pages, Live Channels, Remote Access, Server Sync, Requests, and Scripts have a search input of their own.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/search-field.html" title="Search Field example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "search-field.html"
```
