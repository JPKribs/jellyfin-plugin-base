# Matrix Grid

A grid of row labels, each with a hint, by column headers, with a control in each cell: a toggle, a select, a number box, a text box, or a time box, or a read only badge or text. It is a [Data Table](data-table.md) whose cells hold controls, so it shares its column tracks, its compact layout with icon headings, its hidden columns, and its sideways scroll inside its frame.

## Decision

| When | Use |
| :--- | :--- |
| Setting the same few things for many rows, such as what each library syncs | Matrix Grid |
| A read only table of what each role can do | Matrix Grid with badge columns |
| Pairing each row with one target | [Mapping Table](mapping-table.md) |
| A flat set of boxes | [Check Grid](check-grid.md) |

## Usage

```js
import { createMatrixGrid } from './configurationpage?name=myplugin_jpkribs_shared.js';

var grid = createMatrixGrid({
    rows: libraries.map(function (l) { return { key: l.Id, label: l.Name, hint: l.Count + ' items' }; }),
    columns: [
        { key: 'watched', label: 'Watched', icon: 'visibility' },
        { key: 'ratings', label: 'Ratings', icon: 'star' },
        { key: 'mode', label: 'Mode', type: 'select', options: ['Copy', 'Link'] }
    ],
    value: config.LibrarySync,
    onChange: function (value) { config.LibrarySync = value; }
});
view.querySelector('#gridHost').appendChild(grid.element);
```

A bandwidth table, whose Hours row holds time boxes under the speed columns, with the Scheduled column hidden while scheduling is off:

```js
var speeds = createMatrixGrid({
    rows: [
        { key: 'downloads', label: 'Downloads', hint: 'Shared by every download to here' },
        { key: 'hours', label: 'Hours', hint: 'Uses the server clock', cells: { normal: { type: 'time', unit: '' }, scheduled: { type: 'time', unit: '' } } }
    ],
    columns: [
        { key: 'normal', label: 'Normal', type: 'number', min: 0, unit: 'Mbps' },
        { key: 'scheduled', label: 'Scheduled', type: 'number', min: 0, unit: 'Mbps', hidden: !config.EnableBandwidthScheduling }
    ],
    note: '0 is no limit.'
});
scheduleToggle.addEventListener('change', function () { speeds.setColumnHidden('scheduled', !scheduleToggle.checked); });
```

Classes: `base-matrix-grid`, `base-matrix-cell`, `base-matrix-label`, `base-matrix-name`, `base-matrix-hint`, `base-matrix-badge`, `base-matrix-static`, `base-matrix-text`, `base-matrix-empty`, `base-matrix-note`. The handle is `{ element, getValue, setValue, setRows, isValid, setColumnHidden, destroy }`. `setRows` draws other rows and keeps every value.

## States and Modifiers

* The value is `{ rowKey: { columnKey: value } }`. A cell with no value starts from its control, off for a toggle and the first choice for a select.
* A row is `{ key, label, hint, cells }`, and the hint shows dimmed under the label.
* A column is `{ key, label, icon, type, options, min, max, step, placeholder, unit, hidden }`. `type` is `toggle` (default), `select`, `number`, `text`, `time`, or the read only `badge` and `static`. A select's `options` are values or `{ value, label }`. A toggle column takes the narrow number track.
* `unit` on a number column, such as `Mbps`, is drawn dimmed inside each box before its arrows, through the [Field Adornments](field-adornments.md) unit, and is never typed.
* A row's `cells` changes its own cell in a column by the column's key. A part of a column, such as `{ type: 'time' }` or `{ unit: 'to', max: 23 }`, replaces those settings for that one cell, and `null` leaves the cell empty, with no control and no value.
* A `badge` cell shows its value as a [Badge](badge.md). The value is the label, or `{ label, color }` where color is a status color name, a hex code, or a badge state name, gray by default. A `static` cell shows its value as text. Neither takes input, their values pass through `getValue` as given, and `isValid` skips them. A cell with no value is blank.
* `hidden: true` starts a column hidden, and `setColumnHidden(key, hidden)` hides or shows its heading and its cells. The other columns share the width, and `isValid` skips a hidden column, while its values stay in `getValue`.
* `disabled: true` on a column, or on a row's part of one, greys out the cell's control. It shows its value, takes no input, and `isValid` skips it.
* `note` is a dimmed line under the grid, for a rule that applies to every row.
* Each control is named "{column} for {row}" by `cellLabel`, and checks through the validation core, so a number out of range shows its message in the cell. `isValid()` checks every shown cell that takes input.
* `rowHeader` heads the label column, empty by default. `label` names the grid, "Grid" by default, and `emptyText` shows while there is no row, "Nothing to show." by default.
* `onChange(value, rowKey, columnKey)` runs after a cell changes.
* A grid too narrow for its columns turns compact as the Data Table does, and a column with `icon` shows the icon in its heading.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createMatrixGrid`

<code>function createMatrixGrid(options: MatrixGridOptions): MatrixGridHandle</code>

A grid of row labels, each with a hint, by column headers, with a control in each cell: a toggle, a select, a number box, a text box, or a time box, or a read only badge or text. It is a Data Table whose cells hold controls, so it shares its column tracks, its compact layout with icon headings, its hidden columns, and its sideways scroll inside its frame.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `rows` (required) | <code>MatrixGridRow[]</code> | array of { key, label, hint, cells (by column key, part of a column that changes this row's cell, or null for an empty cell) } [required] |
| `columns` (required) | <code>MatrixGridColumn[]</code> | array of { key, label, icon, type ('toggle', 'select', 'number', 'text', 'time', or the read only 'badge' and 'static'; default 'toggle'), options, min, max, step, placeholder, unit (a number's suffix inside its box), hidden (default false), disabled (greys out the cells, which keep their value; default false) } [required] |
| `value` | <code>MatrixGridValue &#124; null</code> | object of row key to an object of column key to value [optional] |
| `rowHeader` | <code>string</code> | header of the label column (default '') |
| `cellLabel` | <code>string</code> | aria-label of a cell's control, where {column} and {row} are the labels (default '{column} for {row}') |
| `label` | <code>string</code> | aria-label of the grid (default 'Grid') |
| `emptyText` | <code>string</code> | shown while there is no row (default 'Nothing to show.') |
| `size` | <code>'small' &#124; 'medium' &#124; 'large'</code> | 'small', 'medium', or 'large' for its fields (default 'medium') |
| `note` | <code>string</code> | a dimmed line under the grid [optional] |
| `onChange` | <code>(value: MatrixGridValue, rowKey: string, columnKey: string): void</code> | function(value, rowKey, columnKey) after a cell changes [optional] |

| Handle member | Type |
| :--- | :--- |
| `getValue` | <code>(): MatrixGridValue</code> |
| `setValue` | <code>(next: MatrixGridValue &#124; null): void</code> |
| `setRows` | <code>(rows: MatrixGridRow[] &#124; null): void</code> |
| `isValid` | <code>(): boolean</code> |
| `setColumnHidden` | <code>(key: string, hidden: boolean): void</code> |
| `destroy` | <code>(): void</code> |

| Type | What it is |
| :--- | :--- |
| `MatrixGridRow` | One row of the grid: its key, its label, and a dimmed hint under the label. cells changes a cell of this row by column key, such as its type, options, or unit, or null leaves that cell empty. |
| `MatrixGridColumn` | One column: its key, its header, an icon the header shows when the grid is narrow, and the control in each of its cells. badge and static cells show their value and take no input. unit is a number's fixed suffix inside its box, and disabled greys out the control so it shows its value and takes no input, as a row's cells can do for one cell. |
| `MatrixGridBadge` | A badge cell's value: its label, or { label, color } where color is a status color name, a hex code, or a badge state name. |
| `MatrixGridValue` | Every cell's value, by row key and then column key. |

| Class | What it looks like |
| :--- | :--- |
| `base-matrix-grid` | A Data Table of row labels by column headers with a control in each cell, on the table's own column tracks, compact layout, and sideways scroll |
| `base-matrix-label` | A row's label over its dimmed hint, each ending in an ellipsis with the full text in its tooltip |
| `base-matrix-cell` | One cell's control with its message under it. A toggle column takes the narrow number track with its box centered under its heading |
| `base-matrix-badge` | A read only cell that shows its value as a badge or as text, centered on the row's line, with no control |
| `base-matrix-note` | A dimmed line under the grid, inset to its rows |
| `base-matrix-grid.has-units` | A grid with a unit in its number boxes, whose columns keep room for the digits, the unit, and the arrows, and scroll sideways before they would hide digits |
| `base-matrix-cell.disabled` | A disabled cell, its control greyed out with its value still shown |

<!-- reference:end -->

## Example

<iframe class="base-preview" src="../../../assets/previews/matrix-grid.html" title="Matrix Grid example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "matrix-grid.html"
```
