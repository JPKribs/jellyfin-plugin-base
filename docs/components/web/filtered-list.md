# Filtered List

A [List](list.md) with a search, filters, a sort, a summary line, selection, and actions. It is the base the [Data Table](data-table.md), the [Paginated Table](paginated-table.md), and the [Checkbox List](checkbox-list.md) are built on: the List owns the frame, the height, the scrolling, and the empty and loading states, and the Filtered List adds the controls, the data view, and the selection core, so every variation inherits each feature below.

## When to Use

* Use it for items a reader narrows down, such as a sync queue of media cards or a list of synced content.

## When Not to Use

* Use a plain [List](list.md) when there is nothing to search, filter, sort, or select.
* Use a [Data Table](data-table.md) when the items are rows with columns that sort, or a [Paginated Table](paginated-table.md) for rows a server pages through with Previous and Next.
* Use a [Checkbox List](checkbox-list.md) when the items are choices the reader checks, such as libraries or users.

## Usage

```js
import { createFilteredList, createMediaCard } from './configurationpage?name=myplugin_jpkribs_shared.js';

var queue = createFilteredList({
    items: rows,
    render: function (row) { return createMediaCard({ title: row.Name, itemId: row.ItemId, status: { label: row.State } }); },
    search: { keys: ['Name'], placeholder: 'Search the queue' },
    filters: [
        { name: 'State', label: 'States', kind: 'cards', options: [
            { value: 'Queued', label: 'Queued', color: 'orange' },
            { value: 'Synced', label: 'Synced', color: 'green' },
            { value: 'Errored', label: 'Errored', color: 'red' }
        ] },
        { name: 'Direction', label: 'Directions', kind: 'pills', options: [{ value: 'Pull', label: 'Pull' }, { value: 'Push', label: 'Push' }] }
    ],
    sorts: [{ key: 'Added', label: 'Newest', dir: 'desc' }, { key: 'Name', label: 'Name' }],
    height: 'fill'
});
view.querySelector('#queueHost').appendChild(queue.element);
```

For server data, pass `fetch(query)` instead of `items`, and `setCounts(name, { value: count })` for the counts on its filters.

The handle is `{ element, list, toolbar, selectBar, bulkBar, toggleSort, setItems, setSearch, setFilter, setFilterOptions, setSort, setCounts, setHeight, getSelected, getSelectedItems, setSelected, clearSelection, redraw, getState, query, more, setLoadOnScroll, reload, destroy }`. `list` is the List underneath, and `toolbar` the row a variation adds its own controls to.

A sync queue with selection, actions, and a live refresh:

```js
var queue = createFilteredList({
    items: rows,
    rowKey: 'Id',
    render: function (row) {
        return createMediaCard({ title: row.Name, itemId: row.ItemId, status: { label: row.State, color: colors[row.State] },
            detail: row.Detail, error: row.Error, size: row.Bytes });
    },
    filters: [
        { name: 'State', label: 'States', kind: 'cards', options: stateOptions },
        { name: 'Peer', label: 'Servers', kind: 'pills', clearable: true, options: [] }
    ],
    selectable: 'multiple',
    bulkActions: [{ id: 'ignore', label: 'Ignore', icon: 'block', onClick: function (rows) { ignore(rows); } }],
    actions: [{ id: 'retry', label: 'Retry Errors', icon: 'refresh', onClick: retryErrors, visible: function (state) { return hasErrors(); } }],
    limit: 200,
    limitText: 'Showing the latest {shown} of {total}. Filter by state or server to see more.',
    onOpen: function (row) { openDetail(row); }
});
queue.setFilterOptions('Peer', peers.map(function (p) { return { value: p.Key, label: p.Name }; }));
setInterval(function () { load().then(function (rows) { queue.setItems(rows); }); }, 3000);
```

## States and Modifiers

* A filter's `kind` is `select` (default), `pills` (a row with an All pill, one choice at a time), `cards` (count cards that each turn on and off, and with none on every choice shows), or `daterange` (a [Date Range Picker](date-range-picker.md) on its own line that keeps the items whose `field` date falls in the range). A daterange filter needs no `options`, takes `presets`, and its values are `[from, to]`.
* Every choice shows how many items it would match, given the search and the other filters: in its card, after its pill, and in its select option.
* `sorts` adds a sort select. The first sort applies at the start unless `sort` names another.
* The summary line reads "Showing {shown} of {total}." `summaryText` replaces it, and `summary: false` hides it.
* The height is the List's: `auto` grows with the page, a length holds a fixed height that scrolls inside, `maxHeight` caps a growing list, and `fill` reaches the bottom of the window. `pageSize` shows that many and loads more as the list scrolls to its end.
* `layout` is the List's too, so the items can be rows, a grid of cards, or plain.
* `selectable: 'single'` picks one item by a click or Enter, and a second click clears it. `selectable: 'multiple'` draws a checkbox on each item, which `render(item, index, check)` may place itself, and a select all over the items shown that is checked, partly checked, or clear. `onSelectionChange(ids, items)` hears each change, and `matchKey` compares keys, such as one that ignores case.
* `bulkActions` sit on the bar with the select all and the count, such as "3 selected". They are disabled while nothing is selected, and the bar takes the accent wash while something is.
* `onOpen(item)` runs on a click and on Enter or Space on an item, apart from its checkbox or any other control inside it, and the item shows a focus ring.
* `setFilterOptions(name, options)` swaps a filter's choices at runtime, for pills, cards, and selects, and keeps a picked value that still exists. A pill filter with `clearable` goes back to All on a second click of the picked pill.
* `setItems`, and a server reload, keep the scroll position, the selection, and focus, and draw again only the items whose `rowKey` is new or whose content changed, so a poll every few seconds does not jump.
* `limit` caps the items shown, and while more match the summary shows `limitText`, even with `summary: false`.
* `actions` are field height buttons beside the search, each shown only while its `visible(state)` says so.
* The empty sentence is "Nothing matches." unless `emptyText` replaces it.
* With `fetch`, `immediate: false` waits for the first `query` or `reload`, and `loadOnScroll: false` stops the end of the list from loading the next page.
* `onSearch(text)` runs before a typed search and returns `false` to run it another way. `onChange(state)` runs after the items shown change.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createFilteredList`

<code>function createFilteredList&lt;T = any&gt;(options: FilteredListOptions&lt;T&gt;): FilteredListHandle&lt;T&gt;</code>

The List with a search, filters, a sort, a summary line, selection, and actions. It is the base the Data Table, the Paginated Table, and the Checkbox List are built on. It is made from Base parts: a Search Field, selects, pill rows, and count cards that turn on and off, over a data view that searches, filters, sorts, and pages local items or a server fetch, and the selection core. Each filter choice shows how many items it would match, given the search and the other filters. A next page adds its items under the ones shown, with the loading line beneath them while it loads, and new items keep the scroll position, the selection, and focus, drawing again only the items that changed.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `render` (required) | <code>(item: T, index: number, check?: HTMLInputElement &#124; null): ListContent</code> | function(item, index, check) drawing one item, such as a media card, where check is the item's checkbox with multiple selection, placed by render or else at the item's start [required] |
| `items` | <code>T[] &#124; null</code> | local items [optional] |
| `fetch` | <code>(query: DataQuery): Promise&lt;PagedResult&lt;T&gt; &#124; T[]&gt; &#124; PagedResult&lt;T&gt; &#124; T[]</code> | function(query) returning a page { Items, TotalCount } or an array, for server data [optional] |
| `rowKey` | <code>string &#124; ((item: T) =&gt; unknown); search?: { keys?: string[]</code> | the field or function that names an item, so a refresh keeps what did not change (default 'id' while selectable) |
| `placeholder` | <code>string</code> |  |
| `label` | <code>string</code> | aria-label of the list [optional] |
| `delay` | <code>number</code> |  |

| Handle member | Type |
| :--- | :--- |
| `list` | <code>ListHandle&lt;T&gt;</code> |
| `toolbar` | <code>HTMLElement</code> |
| `selectBar` | <code>HTMLElement &#124; null</code> |
| `bulkBar` | <code>HTMLElement &#124; null</code> |
| `toggleSort` | <code>(key: string): void</code> |
| `setItems` | <code>(items: T[] &#124; null &#124; undefined): void</code> |
| `setSearch` | <code>(text: string): void</code> |
| `setFilter` | <code>(name: string, values: string[] &#124; null &#124; undefined): void</code> |
| `setFilterOptions` | <code>(name: string, options: FilteredListOption[] &#124; null &#124; undefined): void</code> |
| `setSort` | <code>(key: string &#124; null, dir?: 'asc' &#124; 'desc'): void</code> |
| `setCounts` | <code>(name: string, counts: Record&lt;string, number&gt;): void</code> |
| `setHeight` | <code>(height: ListHeight, maxHeight?: number &#124; string &#124; null): void</code> |
| `getSelected` | <code>(): string[]</code> |
| `getSelectedItems` | <code>(): T[]</code> |
| `setSelected` | <code>(ids: unknown[] &#124; null &#124; undefined): void</code> |
| `clearSelection` | <code>(): void</code> |
| `redraw` | <code>(): void</code> |
| `getState` | <code>(): DataState&lt;T&gt;</code> |
| `query` | <code>(change: { search?: string; filters?: Record&lt;string, string[]&gt;; sort?: DataSort &#124; null; }): Promise&lt;DataResult&lt;T&gt;&gt;</code> |
| `more` | <code>(): Promise&lt;DataResult&lt;T&gt;&gt;</code> |
| `setLoadOnScroll` | <code>(on: boolean): void</code> |
| `reload` | <code>(): void</code> |
| `destroy` | <code>(): void</code> |

| Type | What it is |
| :--- | :--- |
| `FilteredListOption` | One choice of a filter. color tints its card or pill, as a status color name or a hex code. |
| `FilteredListFilter` | One filter. kind picks how it is shown: a select, a row of pills with an All pill, count cards that each turn on and off, or a Date Range Picker that keeps items whose date field falls in the range. field is the item field it matches (default its name), and test decides a match for anything else. clearable lets a second click on the picked pill go back to All. A daterange filter needs no options, takes presets for its pills, and its values are [from, to]. |
| `FilteredListSort` | One way to sort, shown as a choice in the sort select. |
| `FilteredListBulkAction` | A button on the bar of selected items. onClick receives the selected items. |
| `FilteredListToolbarAction` | A button beside the search. visible decides from the state whether it shows, such as Retry Errors only while an item failed. |

| Class | What it looks like |
| :--- | :--- |
| `base-filtered-list` | A List with a search, filters, a sort, and a summary line above it, the base a Data Table is built on |
| `base-filtered-toolbar` | The search field and the selects on one line that wraps, the search taking the room left over |
| `base-filtered-card` | Count cards that each turn a choice on and off: on is full strength, off is dimmed, and with none on every choice shows |
| `base-filtered-pill-count` | A row of pills, one per choice and an All pill, each with its count |
| `base-filtered-action` | A button beside the search or on the bar of selected items, hidden while its visible test says no |
| `base-filtered-selectbar` | The bar over a list with multiple selection: the select all, the count of selected items, and the bulk actions, washed while it carries actions |
| `base-filtered-checked` | An item that a checkbox leads, when the item's render did not place the checkbox itself. The checkbox sits on the row's center line, where a media card centers its artwork too |
| `base-filtered-summary` | The line under the controls that says how many items show out of how many |

<!-- reference:end -->

## Used By

No plugin uses it today.

## Example

<iframe class="base-preview" src="../../../assets/previews/filtered-list.html" title="Filtered List example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "filtered-list.html"
```
