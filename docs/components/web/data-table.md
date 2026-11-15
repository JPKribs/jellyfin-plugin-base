# Data Table

A sortable, filterable table. It is a [Filtered List](filtered-list.md) whose items are rows, framed by a header whose sortable columns sort ascending, descending, then not at all. The Filtered List brings the search, the filter selects, the data view, the selection (`selectable: true` or `'single'` for one row, `'multiple'` for a checkbox column with a select all and `bulkActions`), `onOpen`, `actions`, and `limit`, and the [List](list.md) under it owns the rows' height, scrolling, and empty and loading states. It works on local rows or on a server that searches, filters, sorts, and pages.

## Decision

| When | Use |
| :--- | :--- |
| Rows with columns a reader sorts and filters, such as activity, bans, or counts by country | Data Table |
| A table paired with a [World Map](world-map.md) | `linkWorldMap` |
| The Jellyfin item tables with thumbnails, status buttons, and bulk selection | [Paginated Table](paginated-table.md) |
| A few fixed rows with no sorting | [Static Table](static-table.md) |

## Usage

```js
import { createDataTable } from './configurationpage?name=myplugin_jpkribs_shared.js';

var table = createDataTable({
    columns: [
        { key: 'name', label: 'Country' },
        { key: 'people', label: 'People', align: 'end' },
        { key: 'last', label: 'Last', value: function (row) { return new Date(row.last); }, render: function (row) { return shared.formatRelativeTime(new Date(row.last)); } }
    ],
    rows: rows,
    rowKey: 'country',
    sort: { key: 'people', dir: 'desc' },
    search: { keys: ['name'], placeholder: 'Search countries' },
    filters: [{ name: 'type', label: 'Types', options: [{ value: 'failed', label: 'Failed' }] }],
    selectable: true,
    onSelect: function (row, key) { showDetail(row); }
});
view.querySelector('#tableHost').appendChild(table.element);
```

For server data, pass `fetch(query)` instead of `rows`. It gets `{ search, filters, sort, page, pageSize }` and returns `{ Items, TotalCount }` or an array. An answer that is no longer the latest is dropped.

The handle is `{ element, setRows, setSearch, setFilter, setFilterOptions, setSort, select, getSelected, getSelectedKeys, getSelectedRows, setSelectedKeys, clearSelection, onSelect, setHeight, getState, reload, edit, cancelEdit, getEditing, setColumnHidden, destroy }`. `onSelect(listener)` adds a listener beside the option and returns a function that removes it. Under `'multiple'`, `getSelectedKeys`, `getSelectedRows`, and `setSelectedKeys` read and set the checked rows.

Rows can open into fields:

```js
var table = createDataTable({
    columns: columns, rows: rows, rowKey: 'id',
    editable: {
        fields: [{ key: 'name', label: 'Name', required: true }, { key: 'limit', label: 'Limit', type: 'number', min: 0 }],
        onSave: function (row, values) { return shared.apiRequest('Rules/' + row.id, 'POST', values); }
    }
});
```

## States and Modifiers

* A column is sortable unless `sortable: false`. A click on its heading sorts ascending, again descending, and a third time not at all. The heading carries `aria-sort` and an arrow that shows only while it is sorted.
* `value(row)` gives the value the column sorts and shows. `render(row)` draws the cell instead, as text or a node. Numbers sort as numbers and text in the reader's language, with blanks last.
* `align: 'end'` right-aligns a column with even-width digits in a fixed track that the heading shares, so headings and values line up. `width` sets a column's grid track instead, a share of the width by default.
* `hidden: true` starts a column hidden, and `setColumnHidden(key, hidden)` hides or shows its heading and its cells, which carry `data-column` with the column's key. The other columns share its width, and the compact layout counts only the shown columns.
* When the table is too narrow for its number columns, it turns `compact`: number columns narrow, and a column with `icon` shows that icon in its heading in place of the label, which stays its tooltip and accessible name.
* Each filter is a select whose first choice is "All {label}". `setFilter(name, values)` sets it from code, such as from a map.
* With `selectable`, a click, Enter, or Space on a row selects it, and again clears it. The row takes the accent wash with a leading bar. `select(key)` highlights a row picked elsewhere without reporting it.
* `pageSize` shows that many rows and loads more as the list scrolls to its end. `height` and `maxHeight` work as a List's do.
* With nothing matching it shows `emptyText`, "Nothing matches." by default.
* `editable` adds an edit button at the end of each row, "Edit {value}" by `editLabel`, where the value is the first column. It opens the row into [Repeater](repeater.md) fields under its cells, with Save and Cancel. Save checks every field through the validation core, then calls `onSave(row, values)`. A promise that fails keeps the row open with "Could not save." (`failedText`). Cancel and Escape close it and return focus to the edit button.
* An open row stays open, with what was typed, while `setRows` or a fetch refreshes the rows. `edit(key)` opens a row from code, and `getEditing()` names the open one.

## Gotchas

* A cell's text is clipped with an ellipsis. Put long text in a column with more width.
* `rowClass(row, index)` marks a row from its first draw, such as `selected` for a row picked elsewhere, which takes the table's selected look. It is the Filtered List's `itemClass`, so it follows every `setRows` and refresh. With `selectable` on, the selection owns `selected`, so give a picked row another name.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createDataTable`

<code>function createDataTable&lt;T = any&gt;(options: DataTableOptions&lt;T&gt;): DataTableHandle&lt;T&gt;</code>

A sortable, filterable table: a Filtered List whose items are rows, framed by a header whose sortable columns sort ascending, descending, then not at all. The Filtered List brings the search, the filter selects, the data view over local rows or a server fetch, and the List the rows sit in. With selectable a click or Enter on a row selects it, and again clears it, and onSelect reports it, so a map or a detail pane can follow. select(key) highlights a row picked elsewhere.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `columns` (required) | <code>DataTableColumn&lt;T&gt;[]</code> | array of { key, label, icon (a Material icon the heading shows in place of the label when the table is narrow), sortable (default true), align ('start', 'end', or 'center' for a narrow column such as a checkbox), width (a grid track; default a share, or a fixed number column for end and center), hidden (true starts it hidden; default false), value(row), render(row) } [required] |
| `rows` | <code>T[] &#124; null</code> | local rows [optional] |
| `fetch` | <code>(query: DataQuery): Promise&lt;PagedResult&lt;T&gt; &#124; T[]&gt; &#124; PagedResult&lt;T&gt; &#124; T[]</code> | function(query) returning a page { Items, TotalCount } or an array, for server data [optional] |
| `rowKey` | <code>string &#124; ((row: T) =&gt; unknown); rowClass?(row: T, index: number): unknown; search?: { keys?: string[]</code> | the field or function that names a row (default 'id') |
| `placeholder` | <code>string</code> |  |
| `label` | <code>string</code> | aria-label of the table (default 'Table') |

| Handle member | Type |
| :--- | :--- |
| `setRows` | <code>(rows: T[] &#124; null &#124; undefined): void</code> |
| `setSearch` | <code>(text: string): void</code> |
| `setFilter` | <code>(name: string, values: string[] &#124; null &#124; undefined): void</code> |
| `setSort` | <code>(key: string &#124; null, dir?: 'asc' &#124; 'desc'): void</code> |
| `select` | <code>(key: unknown): void</code> |
| `getSelected` | <code>(): string &#124; null</code> |
| `getSelectedKeys` | <code>(): string[]</code> |
| `getSelectedRows` | <code>(): T[]</code> |
| `setSelectedKeys` | <code>(keys: unknown[] &#124; null &#124; undefined): void</code> |
| `clearSelection` | <code>(): void</code> |
| `setFilterOptions` | <code>(name: string, options: FilteredListOption[] &#124; null &#124; undefined): void</code> |

| Type | What it is |
| :--- | :--- |
| `DataTableColumn` | One column. value gives the sort and display value, and render draws the cell, else the value is shown as text. hidden starts it hidden. |
| `DataTableFilter` | A filter shown as a select above the table. field is the row field it matches, and options its choices. |
| `DataTableEditing` | Inline row editing. fields are Repeater fields read from the row by key, and onSave gets the row and the edited values, and may return a promise. |

| Class | What it looks like |
| :--- | :--- |
| `base-data-table` | A sortable, filterable table, a Filtered List whose rows sit in a grid under a header of column headings |
| `base-filtered-list.base-data-table` | A table spans its toolbar and its grid across its frame, where the Filtered List alone would center them |
| `base-data-grid` | The header row and each body row share the column tracks, so headings and cells line up |
| `base-data-heading.center` | A narrow centered column, such as a checkbox, its heading centered over its cells |
| `base-data-sort` | A sortable heading, a button whose arrow shows only while the column is sorted, and turns over when descending |
| `base-data-glyph` | A narrow table: number columns shrink, and a heading with an icon shows the icon in place of its label |
| `base-data-row` | A body row at least a field tall, with a hover wash, and the accent wash with a leading bar while selected |
| `base-data-cell.base-data-edit-cell` | The edit button's column, one row button wide |
| `base-data-row.editing` | An open row's editor under its cells, spanning every column: its fields in a grid, a message, and Save and Cancel |

<!-- reference:end -->

## Example

<iframe class="base-preview" src="../../../assets/previews/data-table.html" title="Data Table example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "data-table.html"
```
