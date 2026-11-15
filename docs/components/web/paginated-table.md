# Paginated Table

A searchable, filterable table of rows that reads a paged endpoint. It offers infinite scroll or Load More buttons, optional row selection with bulk actions, status badges, thumbnails, and clickable rows.

## When to Use

* Use it for any server side list too long to render at once.

## When Not to Use

* Use a [Sortable Card List](sortable-card-list.md) for a short, ordered, editable list, and a [Static Table](static-table.md) for a few fixed rows.

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
        { key: 'Name', type: 'custom', className: 'jpk-table-cell-with-thumb',
          render: function (item) {
              return '<div class="jpk-table-item-info"><div class="jpk-table-item-title">' + shared.escapeHtml(item.Name) + '</div>' +
                  '<div class="jpk-table-item-sub">' + shared.escapeHtml(item.Path) + '</div></div>';
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

The endpoint answers a `PagedResult`, `{ Items: [...], TotalCount: n }`, for `endpoint?skip=0&take=50`, plus `&search=text` when searching and `&filter=value` when a filter is set. The request goes through `shared.apiRequest`, so `apiPrefix` applies.

The handle has `load`, `reload`, `refresh`, `setSearch`, `setFilter`, `setFilterValue`, `setFilterOptionVisible`, `getItems`, `getTotalCount`, `getSelectedIds`, `getSelectedItems`, `clearSelection`, `getBulkActionsContainer`, `getControlsContainer`, `disconnectObserver`, `reconnectObserver`, and `destroy`.

Classes: `jpk-table-wrapper`, `jpk-table-controls`, `jpk-table-search`, `jpk-table-filter-wrapper`, `jpk-table-filter`, `jpk-table-filter-arrow`, `jpk-table-selection-header`, `jpk-table-select-all-label`, `jpk-table-select-all`, `jpk-table-checkbox-custom`, `jpk-table-select-all-text`, `jpk-table-selected-count`, `jpk-table-bulk-actions`, `jpk-table-header-spacer`, `jpk-table-reload-btn`, `jpk-table-reload-icon`, `jpk-table-body`, `jpk-table-row`, `jpk-table-row-clickable`, `jpk-table-cell`, `jpk-table-cell-checkbox`, `jpk-table-cell-status`, `jpk-table-cell-with-thumb`, `jpk-table-row-checkbox`, `jpk-table-item-info`, `jpk-table-item-title`, `jpk-table-item-sub`, `jpk-table-item-error`, `jpk-table-status-badge`, `jpk-table-status-btn`, `jpk-table-empty`, `jpk-table-loading-more`, `jpk-table-scroll-sentinel`, `jpk-table-footer`, `jpk-table-item-count`, `jpk-table-footer-actions`, `jpk-table-load-more`, `jpk-table-load-all`, `jpk-table-loading`, `jpk-table-row-thumb`, `jpk-table-row-thumb-portrait`, `jpk-table-row-thumb-landscape`, `jpk-table-row-thumb-placeholder`, `jpk-table-row-thumb-user`, `jpk-table-row-thumb-user-placeholder`.

## States and Modifiers

* Nested option objects merge over the defaults. `pagination.loadMore: true` turns the scroll observer off, and the footer shows Load More and Load All.
* A column is `{ key, type, className, hidden, render, label }`. A plain cell shows `key` escaped. `type: 'custom'` inserts the HTML that `render(item, value)` returns. `type: 'status'` renders a status badge button.
* `filters` takes `{ options, buildParams, onChange, initialValue, allValue, allLabel }`. The first choice is "All". The first load already carries `initialValue`.
* `search` takes `{ enabled, placeholder, debounceMs }` with a default of 300 ms.
* `selection` adds the checkbox column and the selection header with select all, the count, bulk actions, and a reload button. Select all covers the loaded rows and shows an indeterminate state for a partial selection.
* A selected row has `selected`, an accent wash. A re-render keeps it for every id still selected.
* `reload()` resets paging and the selection, then loads. `refresh()` resets paging and keeps the selection. `clearSelection()` always reports to `onSelectionChange`.
* A newer load supersedes one in flight, and the old answer is dropped.
* A clickable row has `tabindex="0"` and answers Enter and Space when the row itself has focus. The status badge button opens the row too, and neither fires the click twice.
* The footer reads "1 item", "N items", "Showing X of N items" while more remain, or "X/N items" in Load More mode.
* `jpk-table-loading` goes on the host element while the first page loads. The rows drop to 60 percent opacity and take no pointer events, and the search and filters stay usable.
* At 768px and below the toolbar stacks. At 600px and below a row wraps: the first column keeps at least 60 percent of the width, and the other columns move to the next line, with the status cell at the end.
* A custom cell with `jpk-table-cell-with-thumb` takes a thumbnail: `jpk-table-row-thumb` with `jpk-table-row-thumb-portrait` or `jpk-table-row-thumb-landscape`, `jpk-table-row-thumb-placeholder` for a row with no image, and `jpk-table-row-thumb-user` with `jpk-table-row-thumb-user-placeholder` for a round user avatar.

## Gotchas

* `custom` render output is not escaped, so escape inside it.
* Nothing loads by itself. Call `load()` once. A failed request is rethrown from `load()` after the state is restored, so catch it if you call `load()` yourself.
* Ids are strings in the selection and in `data-id`. Row events are rebound after every render.
* The reload button is part of the selection header, so a table without `selection.enabled` has no reload button.
* The column `label` is written as `data-label` on each cell, but the table draws no header row, so nothing reads it.
* The default labels "Select All", "Reload", "Load More", and "Load All" have no option to replace them.
* Call `destroy()` on `viewhide`. It disconnects the observer and clears the search timer.

## Used By

Server Sync and Requests use it.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/paginated-table.html" title="Paginated Table example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "paginated-table.html"
```
