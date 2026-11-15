# Mapping Table

A table that pairs each source with one target picked from a select, such as remote libraries to local libraries or remote users to local users. It uses the [Static Table](static-table.md) styling and stacks the two columns on a narrow screen.

## When to Use

* Use it to pair a fixed list of sources with a list of targets, one target per source.
* Use it with `unique` when two sources must never share a target.

## When Not to Use

* Use a [Key Value Editor](key-value-editor.md) when the user types both sides or adds rows.
* Use a [Static Table](static-table.md) for read only rows.

## Usage

```js
import { createMappingTable } from './configurationpage?name=myplugin_jpkribs_shared.js';

var map = createMappingTable({
    rows: remoteLibraries.map(function (l) { return { value: l.Id, label: l.Name }; }),
    targets: localLibraries.map(function (l) { return { value: l.Id, label: l.Name }; }),
    value: config.LibraryMap,
    sourceHeader: 'Remote Library',
    targetHeader: 'Local Library',
    unique: true,
    onChange: function (value) { config.LibraryMap = value; }
});
container.appendChild(map.element);
```

Classes: `base-mapping-table`, `base-mapping-table-grid` on a `base-static-table` inside a `base-static-table-scroll`. The handle is `{ element, getValue, setValue, setRows, setTargets, getDetails, setDetails, isValid, destroy }`.

Parts: `base-mapping-table-row`, `base-mapping-table-source`, `base-mapping-table-name`, `base-mapping-table-description`, `base-mapping-table-target`, `base-mapping-table-empty`, `base-mapping-table-toggle`, `base-mapping-table-extra`, `base-mapping-table-remove`, `base-mapping-table-remove-btn`.

A row can carry more than its target:

```js
var map = createMappingTable({
    rows: sources, targets: targets, value: config.LibraryMap,
    toggle: true,
    removable: true,
    fields: [{ key: 'mode', label: 'Mode', type: 'select', options: ['Copy', 'Link'] }],
    details: config.LibraryDetails,
    onChange: function () { config.LibraryMap = map.getValue(); config.LibraryDetails = map.getDetails(); }
});
```

## States and Modifiers

* `rows` is an array of `{ value, label, description }`, `targets` an array of `{ value, label }`, and the value an object from source value to target value. A label defaults to its value.
* `getValue()` returns only the shown sources whose target exists. A source on "None" is left out.
* `unique: true` disables a target in the other rows once one row picks it.
* The labels default to "Source", "Target", "None", and "Nothing to map.". `targetLabel` is the aria-label of each select, "Target for {value}", where the value is the source label.
* The empty sentence shows in place of the table while there is no source. It takes a List's empty look, `base-list-empty outside`.
* At 600px and below the header row hides and each source sits above its select.
* `size` is `small`, `medium` (default), or `large`, and sizes its fields on the [size scale](design-tokens.md).
* `fields` adds a column per [Repeater](repeater.md) field to each row, with the same types and validation. Their values come back from `getDetails()`, by source, as `{ target, enabled, ...fields }`, and `details` or `setDetails` starts them.
* `toggle: true` adds an on and off control first in each row, labeled "Enable {value}" by `enabledLabel`, under the "Enabled" header. A row that is off takes `off`, dims, and is left out of `getValue()`, and its pair is kept.
* `removable: true` adds a remove button last in each row, "Remove {value}" by `removeLabel`. It drops the source and its pair, calls `onRemove(source)`, and moves focus to the next remove button.
* A table with `fields`, `toggle`, or `removable` takes `extended`.
* `isValid()` checks every extra field and shows each message.

## Gotchas

* A pair whose target is missing from `targets` shows as unmapped and is left out of `getValue()`. The pair is kept, so it returns once `setTargets` brings the target back. A pair for a source that is not shown is kept the same way.
* With `unique` on, a target that several sources hold stays with the first row, and the later rows show as unmapped.
* `setValue`, `setRows`, and `setTargets` do not call `onChange`.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createMappingTable`

<code>function createMappingTable(options?: MappingTableOptions): MappingTableHandle</code>

A table that pairs each source with one target picked from a select, such as remote libraries to local libraries or remote users to local users. It stacks the two columns on a narrow screen.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `rows` | <code>MappingTableRow[] &#124; null</code> | array of { value, label, description } sources [optional] |
| `targets` | <code>MappingTableTarget[] &#124; null</code> | array of { value, label } choices [optional] |
| `value` | <code>MappingTableValue &#124; null</code> | object from source value to target value [optional] |
| `sourceHeader` | <code>string</code> | header of the source column (default 'Source') |
| `targetHeader` | <code>string</code> | header of the target column (default 'Target') |
| `noneLabel` | <code>string</code> | the choice that leaves a source unmapped (default 'None') |
| `emptyText` | <code>string</code> | sentence shown while there is no source (default 'Nothing to map.') |
| `targetLabel` | <code>string</code> | aria-label of a select, where {value} is the source label (default 'Target for {value}') |
| `unique` | <code>boolean</code> | true disables a target in the other rows once one row picks it (default false) |
| `size` | <code>'small' &#124; 'medium' &#124; 'large'</code> | 'small', 'medium', or 'large' for its fields (default 'medium') |
| `fields` | <code>FieldSpec[] &#124; null</code> | Repeater fields drawn as more columns on each row, as { key, label, type, options, required, validate } [optional] |
| `toggle` | <code>boolean</code> | true adds an on and off control at the start of each row, and a row that is off is left out of getValue (default false) |
| `removable` | <code>boolean</code> | true adds a remove button at the end of each row, which drops the source (default false) |
| `details` | <code>MappingTableDetails &#124; null</code> | object from source value to { enabled, and a value per field key } [optional] |
| `enabledHeader` | <code>string</code> | header of the toggle column (default 'Enabled') |
| `enabledLabel` | <code>string</code> | aria-label of a toggle, where {value} is the source label (default 'Enable {value}') |
| `removeLabel` | <code>string</code> | aria-label of a remove button, where {value} is the source label (default 'Remove {value}') |
| `onChange` | <code>(value: MappingTableValue): void</code> | function(value) after any change [optional] |
| `onRemove` | <code>(source: string): void</code> | function(source) after a row is removed [optional] |

| Handle member | Type |
| :--- | :--- |
| `getValue` | <code>(): MappingTableValue</code> |
| `setValue` | <code>(next: MappingTableValue &#124; null): void</code> |
| `setRows` | <code>(next: MappingTableRow[] &#124; null): void</code> |
| `setTargets` | <code>(next: MappingTableTarget[] &#124; null): void</code> |
| `getDetails` | <code>(): MappingTableDetails</code> |
| `setDetails` | <code>(next: MappingTableDetails &#124; null): void</code> |
| `isValid` | <code>(): boolean</code> |
| `destroy` | <code>(): void</code> |

| Type | What it is |
| :--- | :--- |
| `MappingTableRow` | A source row of the table, such as a remote library or a remote user. |
| `MappingTableTarget` | A target a source can be paired with, such as a local library or a local user. |
| `MappingTableValue` | The pairs, as an object from source value to target value. |
| `MappingTableDetail` | A row's extra state: whether it is on, and the values of its extra fields by key. |
| `MappingTableDetails` | Every row's extra state, by source value. |

| Class | What it looks like |
| :--- | :--- |
| `base-mapping-table` | Static table that pairs each source row with a target select, with a sentence in place of the table while there is no source |
| `base-mapping-table-grid` | Source cell with its name and an optional dimmed description under it |
| `base-mapping-table-target` | Target cell whose select fills it |
| `base-mapping-table-grid.extended` | A table with extra columns: a toggle first, a cell per extra field, and a remove button last. A row switched off dims its source and target |

<!-- reference:end -->

## Used By

No plugin uses it today.

## Example

<iframe class="base-preview" src="../../../assets/previews/mapping-table.html" title="Mapping Table example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "mapping-table.html"
```
