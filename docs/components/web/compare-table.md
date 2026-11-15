# Compare Table

A table of properties by columns of values, such as source, local, and after sync. A row whose values differ wears the accent wash, and each value that differs from the first column is bold. A Show Only Changes toggle hides the rows that match. Section rows group the rows under a heading, and note rows add a line of detail. It is a [Data Table](data-table.md) with no sort, search, or selection.

## When to Use

* Use it to show what a sync or an import would change before it runs.

## When Not to Use

* Use a [Definition List](definition-list.md) for the values of one thing.
* Use a [Data Table](data-table.md) for rows the reader sorts, searches, or selects.

## Usage

```js
import { createCompareTable } from './configurationpage?name=myplugin_jpkribs_shared.js';

var diff = createCompareTable({
    rows: [
        { key: 'title', label: 'Title', values: { source: 'Alien', local: 'Alien', after: 'Alien' } },
        { key: 'year', label: 'Year', values: { source: 1979, local: 1980, after: 1979 } }
    ],
    onlyChanges: true
});
view.querySelector('#diffHost').appendChild(diff.element);
```

Group the rows under section headings, and explain a change with a note:

```js
diff.setRows([
    { section: 'Metadata' },
    { key: 'year', label: 'Year', values: { source: 1979, local: 1980, after: 1979 } },
    { note: 'Changed because the source has a new release date.' },
    { section: 'Genres' },
    { key: 'genres', label: 'Genres', values: { source: 'Horror, Sci-Fi', local: 'Horror', after: 'Horror, Sci-Fi' } }
]);
```

Classes: `base-compare-table`, `base-compare-toggle`, `base-compare-value` with `differs` and `missing`, `base-compare-section`, `base-compare-note`. The handle is `{ element, setRows, getOnlyChanges, setOnlyChanges, getChanged, destroy }`.

## States and Modifiers

* A row is `{ key, label, values }`, where `values` holds a value per column key. A missing value shows "None" by `missingText`, dimmed.
* `columns` is an array of `{ key, label, icon }`, Source, Local, and After Sync by default, keyed `source`, `local`, and `after`. `propertyHeader` heads the first column, "Property" by default.
* A changed row has `changed`. `getChanged()` gives the keys of the changed rows.
* `{ section }` draws a small uppercase dimmed heading across every column, with `base-compare-section`, over the rows after it up to the next section. A section with no row shown under it hides.
* `{ note }` draws a dimmed line across every column, with `base-compare-note`, that wraps rather than cut off. It shows only while the row before it shows, so with only changes shown a note hides with its unchanged row.
* A section or note may carry a `key`, else it takes one from its place. Neither is ever changed, sorted, or counted by `getChanged()`.
* The toggle sits in the table's toolbar, "Show Only Changes" by `changesText`. `onlyChanges: true` starts with it on, and `onChange(onlyChanges)` hears it. With it on and nothing changed, the table says "No changes." by `noChangesText`. With no rows it says "Nothing to compare." by `emptyText`.
* `label` names the table, "Comparison" by default. `height` and `maxHeight` work as the Data Table's do.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createCompareTable`

<code>function createCompareTable(options?: CompareTableOptions): CompareTableHandle</code>

A table of properties by columns of values, such as source, local, and after sync. A row whose values differ is changed: it wears the accent wash, and each value that differs from the first column is marked. A Show Only Changes toggle hides the rows that match. It is a Data Table with no sort, search, or selection. A section row heads the rows after it and a note row adds a line of detail, each across every column. With only changes shown, a section hides while no row under it shows, and a note shows only while the row before it shows.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `rows` | <code>CompareTableEntry[] &#124; null</code> | array of { key, label, values: { columnKey: value } }, { section } for a heading over the rows after it, or { note } for a dimmed line across every column [optional] |
| `columns` | <code>CompareTableColumn[] &#124; null</code> | array of { key, label, icon } (default Source, Local, and After Sync, keyed source, local, and after) |
| `propertyHeader` | <code>string</code> | header of the property column (default 'Property') |
| `onlyChanges` | <code>boolean</code> | true starts with only the changed rows shown (default false) |
| `changesText` | <code>string</code> | label of the toggle (default 'Show Only Changes') |
| `emptyText` | <code>string</code> | shown while there is no row (default 'Nothing to compare.') |
| `noChangesText` | <code>string</code> | shown while only changes are shown and none changed (default 'No changes.') |
| `missingText` | <code>string</code> | shown for a missing value (default 'None') |
| `label` | <code>string</code> | aria-label of the table (default 'Comparison') |
| `height` | <code>ListHeight</code> |  |
| `maxHeight` | <code>number &#124; string &#124; null</code> |  |
| `size` | <code>'small' &#124; 'medium' &#124; 'large'</code> | 'small', 'medium', or 'large' for its fields (default 'medium') |
| `onChange` | <code>(onlyChanges: boolean): void</code> | function(onlyChanges) after the toggle changes [optional] |

| Handle member | Type |
| :--- | :--- |
| `setRows` | <code>(rows: CompareTableEntry[] &#124; null): void</code> |
| `getOnlyChanges` | <code>(): boolean</code> |
| `setOnlyChanges` | <code>(on: boolean): void</code> |
| `getChanged` | <code>(): string[]</code> |
| `destroy` | <code>(): void</code> |

| Type | What it is |
| :--- | :--- |
| `CompareTableRow` | One compared property: its key, its label, and its value in each column by column key. |
| `CompareTableSection` | A heading row across every column that groups the rows after it, up to the next heading. key names it, else one is made. |
| `CompareTableNote` | A dimmed text row across every column, such as why a group changed. It shows while the row before it shows. |
| `CompareTableEntry` | One entry of a compare table: a compared row, a section heading, or a note. |
| `CompareTableColumn` | One column of values, such as the source, the local copy, or the result after a sync. |

| Class | What it looks like |
| :--- | :--- |
| `base-compare-toggle` | A Data Table of properties by columns of values, with a Show Only Changes toggle in its toolbar |
| `base-compare-table` | A row whose values differ, in the accent wash |
| `base-compare-value` | One value. A value that differs from the first column is bold, and a missing one is dimmed |
| `base-compare-section` | A section row, one small uppercase dimmed heading across every column over the rows it groups |
| `base-compare-note` | A note row, a dimmed line of detail across every column that wraps rather than cut off |

<!-- reference:end -->

## Used By

No plugin uses it today.

## Example

<iframe class="base-preview" src="../../../assets/previews/compare-table.html" title="Compare Table example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "compare-table.html"
```
