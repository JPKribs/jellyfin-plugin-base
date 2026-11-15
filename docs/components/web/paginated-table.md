# Paginated Table

A searchable, filterable table of rows that reads a paged endpoint. It offers infinite scroll or Load More buttons, optional row selection with bulk actions, status badges, thumbnails, and clickable rows. It is a [Filtered List](filtered-list.md) whose items are rows from a server fetch: the search, the multiple selection with its select all and count, opening a row, paging, and the live refresh that keeps unchanged rows all come from it, and the table adds its filter select, status cells, the reload button, and the footer.

## Decision

| When | Use |
| :--- | :--- |
| Any server side list too long to render at once | Paginated Table |
| Rows with column headings that sort, local or from a server | [Data Table](data-table.md) |
| Items that are not table rows, such as media cards | [Filtered List](filtered-list.md) |
| A short, ordered, editable list | [Sortable Card List](sortable-card-list.md) |
| A few fixed rows | [Static Table](static-table.md) |

## Usage

```html
<div id="contentTable"></div>
```

```js
import { createPaginatedTable } from './configurationpage?name=myplugin_jpkribs_shared.js';

var table = createPaginatedTable(view, shared, {
    containerId: 'contentTable',
    endpoint: 'ContentItems',
    search: { placeholder: 'Search items' },
    selection: { enabled: true, idKey: 'Id', onSelectionChange: function (ids) { updateBulkBar(ids.length); } },
    pagination: { pageSize: 50 },
    filters: { options: [{ value: 'Queued', label: 'Queued' }, { value: 'Errored', label: 'Errored' }] },
    columns: [
        { key: 'Name', type: 'custom',
          image: function (item) {
              return function () {
                  return ApiClient.fetch({ url: ApiClient.getUrl('MyPlugin/Image', { itemId: item.Id }), type: 'GET' })
                      .then(function (response) { return response.blob(); });
              };
          }, imageShape: 'portrait',
          render: function (item) {
              return '<div class="base-table-item-info"><div class="base-table-item-title">' + shared.escapeHtml(item.Name) + '</div>' +
                  '<div class="base-table-item-sub">' + shared.escapeHtml(item.Path) + '</div></div>';
          } },
        { key: 'Status', type: 'status' }
    ],
    getDisplayStatus: function (item, value) { return value; },
    getStatusClass: function (item, value) { return value; },
    actions: { onRowClick: function (item) { openDetail(item); }, onReload: function () { loadHealth(); } },
    emptyState: { message: 'No items found.' }
});
table.load();
```

The table is built from Base parts. The search is a [Search Field](search-field.md), the rows are a [List](list.md) of bordered rows that loads more at its end, the select all, the count, and the bulk actions are the Filtered List's selection bar, the reload button is a [Row Button](row-button.md), Load More and Load All are secondary [Buttons](button.md), the filter select takes the shared [select look](form-fields.md), a status cell is the bag's `statusBadge` inside a button, and a thumbnail is the shared `base-thumb` frame. A data view holds the query, the pages, and the loading state, and drops an answer that a newer load replaced.

The endpoint answers a `PagedResult`, `{ Items: [...], TotalCount: n }`, for `endpoint?skip=0&take=50`, plus `&search=text` when searching and `&filter=value` when a filter is set, or one parameter per filter when there are several. The request goes through `shared.apiRequest`, so `apiPrefix` applies.

The handle has `load`, `reload`, `refresh`, `setSearch`, `setFilter`, `setFilterValue`, `setFilterOptionVisible`, `getItems`, `getTotalCount`, `getSelectedIds`, `getSelectedItems`, `clearSelection`, `getBulkActionsContainer`, `getControlsContainer`, `disconnectObserver`, `reconnectObserver`, and `destroy`.

Classes: `base-table-wrapper`, `base-table-controls`, `base-table-search`, `base-table-filter`, `base-table-selection-header`, `base-table-select-all-label`, `base-table-select-all`, `base-table-select-all-text`, `base-table-selected-count`, `base-table-bulk-actions`, `base-table-header-spacer`, `base-table-reload-btn`, `base-table-body`, `base-table-row`, `base-table-row-clickable`, `base-table-cell`, `base-table-cell-checkbox`, `base-table-cell-status`, `base-table-cell-with-thumb`, `base-table-thumb`, `base-table-row-checkbox`, `base-table-item-info`, `base-table-item-title`, `base-table-item-sub`, `base-table-item-error`, `base-table-status-btn`, `base-table-footer`, `base-table-item-count`, `base-table-footer-actions`, `base-table-load-more`, `base-table-load-all`, `base-table-loading`.

## States and Modifiers

* Nested option objects merge over the defaults. `pagination.loadMore: true` turns the scroll observer off, and the footer shows Load More and Load All.
* A column is `{ key, type, className, hidden, render, label, image, imageShape }`. A plain cell shows `key` as text. `type: 'custom'` inserts the HTML that `render(item, value)` returns. `type: 'status'` puts the bag's `statusBadge` inside a button.
* A column with `image(item)` draws a thumbnail before the cell's content, in the shape `imageShape` names, `portrait` (default), `wide`, `square`, or `round`. The thumbnail shows the shape's placeholder icon until the image loads, and again when it fails. The cell takes `base-table-cell-with-thumb`.
* `image(item)` returns an address, or a loader, a function that returns an address, a Blob, or a promise of one, as a [Media Card](media-card.md) image does. A loader is called only when its row nears the screen, so a long page fetches only what is seen, such as an image read through a plugin's own proxy endpoint. A Blob shows through an object URL, which is revoked when its row leaves the table and on `destroy()`.
* `filters` takes `{ name, label, options, buildParams, onChange, initialValue, allValue, allLabel }`. The first choice is "All". The first load already carries `initialValue`.
* `filters` may also be an array of those, for a select each. Each value goes on the request under the filter's `name`, `filter` for the first by default, then `filter2` and on, or through its own `buildParams`. `label` is the select's aria-label. `setFilter(value, name)` and `setFilterValue(value, name)` act on the named filter, or the first.
* `search` takes `{ enabled, placeholder, debounceMs }` with a default of 300 ms.
* `selection` adds the checkbox column and the selection header with select all, the count, bulk actions, and a reload button. Select all checks or clears the loaded rows and shows an indeterminate state while only some of them are selected.
* A selected row has `selected`, an accent wash. A re-render keeps it for every id still selected.
* A page that builds its own `base-table-row` markup, outside `createPaginatedTable`, shows a picked row by setting `selected` on it, such as `row.classList.toggle('selected', picked)`.
* `load()` starts from the first page. `reload()` clears the selection, then loads. `refresh()` loads and keeps the selection. `clearSelection()` always reports to `onSelectionChange`.
* A newer load supersedes one in flight, and the old answer is dropped.
* A clickable row has `tabindex="0"` and answers Enter and Space when the row itself has focus. The status badge button opens the row too, and neither fires the click twice.
* The footer reads "1 item", "N items", "Showing X of N items" while more remain, or "X/N items" in Load More mode.
* Until the first answer the rows say "Loading", and with no rows they say the `emptyState` message. A next page shows "Loading" under the rows.
* `base-table-loading` goes on the host element while the first page loads. The rows drop to 60 percent opacity and take no pointer events, and the search and filters stay usable.
* At 768px and below the toolbar stacks. At 600px and below a row wraps: the first column keeps at least 60 percent of the width, and the other columns move to the next line, with the status cell at the end.
* `size` is `small`, `medium` (default), or `large`, and sizes its fields on the [size scale](design-tokens.md).

## Gotchas

* `custom` render output is not escaped, so escape inside it.
* Nothing loads by itself. Call `load()` once. A failed request is rethrown from `load()` after the state is restored, so catch it if you call `load()` yourself.
* Ids are strings in the selection and in `data-id`. The rows answer clicks, keys, and checkbox changes through listeners on the body, so a re-render needs no rebinding.
* The reload button is part of the selection header, so a table without `selection.enabled` has no reload button.
* The column `label` is written as `data-label` on each cell, but the table draws no header row, so nothing reads it.
* The default labels "Select All", "Reload", "Load More", and "Load All" have no option to replace them.
* Call `destroy()` on `viewhide`. It stops loading at the end of the list and drops a pending search. `reconnectObserver()` turns loading at the end back on.
* `rowClass(item, index)` marks a row from its first draw, such as `selected` for a row picked elsewhere, which takes the table's selected look. It is the Filtered List's `itemClass`, so it follows every refresh. With checkbox selection on, the selection owns `selected`, so give a picked row another name.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createPaginatedTable`

<code>function createPaginatedTable&lt;T = any&gt;(view: ParentNode, shared: Shared, options: TableOptions&lt;T&gt;): TableHandle&lt;T&gt;</code>

Builds a searchable, filterable, infinite scrolling table backed by an endpoint that returns Items and TotalCount. It renders into the container and returns a controller. It is a Filtered List whose items are rows from a server fetch, with the Filtered List's search, multiple selection, select all, open action, and paging, and its own filter select, status cells, and footer.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `containerId` (required) | <code>string</code> | id of the element the table renders into [required] |
| `endpoint` (required) | <code>string</code> | path that takes skip, take, search, and filter parameters [required] |
| `columns` (required) | <code>TableColumn&lt;T&gt;[]</code> | [{ key, type: 'status' &#124; 'custom', render(item, value), label, className, hidden, image(item), imageShape }], where label is written on each cell as data-label, and image(item) returns the thumbnail drawn before the cell in imageShape, as an address or a function that returns an address, a Blob, or a promise of one, loaded lazily and freed when its row goes, 'portrait' (default), 'wide', 'square', or 'round' [required] |
| `getDisplayStatus` | <code>(item: T, value: any): string</code> | function(item, value) returning the text of a status column [optional] |
| `getStatusClass` | <code>(item: T, value: any): unknown</code> | function(item, value) returning the state class of a status column [optional] |
| `rowClass` | <code>(item: T, index: number): unknown</code> | function(item, index) returning class names for the row, such as 'selected' for a row picked elsewhere, set after every draw and refresh through the Filtered List's itemClass [optional] |
| `selection` | <code>TableSelection&lt;T&gt;</code> | { enabled, idKey, onSelectionChange(ids) }, where idKey is a property name or a function (default 'id') |
| `pagination` | <code>TablePagination</code> | { pageSize (default 50), loadMore }, where loadMore swaps infinite scroll for Load More and Load All buttons |
| `filters` | <code>TableFilters &#124; TableFilters[] &#124; null</code> | { name, label, options: [{ value, label, id, hidden }], buildParams(value), onChange(value), initialValue, allValue, allLabel }, an array of them for several selects, or null for none. name is the query parameter (default 'filter' for the first, then 'filter2' and on), and label the select's aria-label |
| `search` | <code>TableSearch</code> | { enabled, placeholder, debounceMs } (defaults true, 'Search items', 300) |
| `actions` | <code>TableActions&lt;T&gt;</code> | { onRowClick(item), onReload() } |
| `emptyState` | <code>{ message?: string; }</code> | { message } (default 'No items found.') |
| `size` | <code>'small' &#124; 'medium' &#124; 'large'</code> | 'small', 'medium', or 'large' for its fields (default 'medium') |

| Handle member | Type |
| :--- | :--- |
| `load` | <code>(): Promise&lt;PagedResult&lt;T&gt; &#124; null&gt;</code> |
| `reload` | <code>(): Promise&lt;PagedResult&lt;T&gt; &#124; null&gt;</code> |
| `setFilter` | <code>(value: string, name?: string): Promise&lt;PagedResult&lt;T&gt; &#124; null&gt;</code> |
| `setSearch` | <code>(query: string): Promise&lt;PagedResult&lt;T&gt; &#124; null&gt;</code> |
| `getSelectedIds` | <code>(): string[]</code> |
| `getSelectedItems` | <code>(): T[]</code> |
| `clearSelection` | <code>(): void</code> |
| `getItems` | <code>(): T[]</code> |
| `getTotalCount` | <code>(): number</code> |
| `getBulkActionsContainer` | <code>(): HTMLElement &#124; null &#124; undefined</code> |
| `getControlsContainer` | <code>(): HTMLElement &#124; null &#124; undefined</code> |
| `disconnectObserver` | <code>(): void</code> |
| `reconnectObserver` | <code>(): void</code> |
| `refresh` | <code>(): Promise&lt;PagedResult&lt;T&gt; &#124; null&gt;</code> |
| `destroy` | <code>(): void</code> |
| `setFilterValue` | <code>(value: string, name?: string): void</code> |
| `setFilterOptionVisible` | <code>(optionId: string, visible: boolean): void</code> |

| Type | What it is |
| :--- | :--- |
| `TableColumn` | One column of a paginated table. label is written on each cell as data-label, and image puts a thumbnail of imageShape before the cell's content, from an address or a function that returns an address, a Blob, or a promise of one. |
| `TableFilterOption` | One option of the filter select. A hidden option starts out of view until setFilterOptionVisible shows it. |
| `TableFilters` | One filter select. buildParams runs only for a value other than empty, and initialValue is the filter the first load carries. name is the query parameter, and label the select's aria-label. |
| `TableSelection` | Row selection. idKey is a property name or a function that returns a row's id. |
| `TablePagination` | The page size, and loadMore to swap infinite scroll for Load More and Load All buttons. |
| `TableSearch` | The search box and how long it waits after typing before it loads. |
| `TableActions` | onRowClick runs when a row or its status button is chosen, and onReload after the reload button's load. |

| Class | What it looks like |
| :--- | :--- |
| `base-table-loading` | Dims the rows while the first page loads, with the search and filters still usable |
| `base-table-status-btn` | A status badge from the bag's statusBadge inside a bare button that opens the row |
| `base-table-header-spacer` | Flexible gap that pushes the controls after it to the end of the header |
| `base-table-reload-btn.spinning` | The reload row button, whose icon turns while the table reloads |
| `base-table-body` | The rows, a list of bordered rows |
| `base-table-row` | Single table row |
| `base-list.rows` | A row inside a list, where the list draws the dividers |
| `base-table-cell` | Single cell within a row |
| `base-table-cell.base-table-cell-checkbox` | Narrow cell for a row checkbox |
| `base-table-cell.base-table-cell-status` | Fixed width cell that right aligns a status badge |
| `base-table-row-checkbox` | Checkbox that selects one row |
| `base-table-item-info` | Title over sub text block for a row cell |
| `base-table-item-title` | Medium weight title that clips with an ellipsis |
| `base-table-item-sub` | Small dimmed sub line that clips with an ellipsis |
| `base-table-item-error` | Truncated error subline shown under a row item when it failed |
| `base-table-footer` | Footer line showing the loaded and total counts |
| `base-table-item-count` | Dimmed count of the loaded and total rows |
| `base-table-footer-actions` | The Load More and Load All buttons, shown in the footer while more rows remain |
| `base-table-cell.base-table-cell-with-thumb` | Cell that lines a thumbnail up beside its text |
| `base-table-thumb` | A row thumbnail, a base-thumb frame in the column's imageShape, portrait by default |

<!-- reference:end -->

## Example

<iframe class="base-preview" src="../../../assets/previews/paginated-table.html" title="Paginated Table example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "paginated-table.html"
```
