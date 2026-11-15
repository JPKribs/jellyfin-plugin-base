# Repeater

The base for any list of rows or cards of mixed fields. Each item is a row of fields, or a boxed card with a title and its fields in a grid. Rows add and remove, keep a least and a most, and move up and down. It is built on the row editor core, which the [Access Schedule](access-schedule.md) shares, and its rows sit in a [List](list.md). The [Key Value Editor](key-value-editor.md) and the [Rule Builder](rule-builder.md) are built on it. Every field checks through the validation core, so a [Save Bar](save-bar.md) with `form`, or `validateAll`, covers it.

## When to Use

* Use it for a list of records the reader adds, edits, and removes in place, such as servers, webhooks, or schedules.
* Use `layout: 'card'` when a record has more fields than fit on one row.

## When Not to Use

* Use a [Key Value Editor](key-value-editor.md) for two text fields, and a [String List](string-list.md) for one.
* Use a [Data Table](data-table.md) with `editable` when the records are mostly read and edited one at a time.

## Usage

```js
import { createRepeater } from './configurationpage?name=myplugin_jpkribs_shared.js';

var servers = createRepeater({
    fields: [
        { key: 'name', label: 'Name', required: true },
        { key: 'url', label: 'Address', placeholder: 'https://jellyfin.example.com', width: '2fr' },
        { key: 'token', label: 'Token', type: 'secret', allowExpose: true },
        { key: 'kind', label: 'Kind', type: 'select', options: [{ value: 'main', label: 'Main' }, { value: 'backup', label: 'Backup' }] },
        { key: 'on', label: 'Enabled', type: 'toggle' }
    ],
    value: config.Servers,
    reorder: true,
    addText: 'Add Server',
    onChange: function (value) { config.Servers = value; bar.setDirty(true); }
});
view.querySelector('#serversHost').appendChild(servers.element);
```

The handle is `{ element, getValue, setValue, setItems, addRow, isValid, setHeight, destroy }`.

## States and Modifiers

* A field is `{ key, label, type, options, placeholder, required, requiredText, min, max, step, allowExpose, width, validate, render }`.
* `type` picks the control. `text` is a text box, `secret` a secret field with its three states and the eye with `allowExpose`, `select` the form select of `options`, `number` a number box with Base's arrows, `tags` the [Tag Input](tag-input.md), `time` a time box with its picker icon, `toggle` an on and off control a field tall, and `custom` the control `render(value, change)` returns as `{ element, input, getValue, setValue, destroy }`.
* A secret's value is the kept sentinel, `SECRET_KEPT`, while a secret is stored but not on the page, and `getValue()` gives it back for a field left untouched.
* `required`, `min`, `max`, and `validate(value, item, index)` check through the validation core, with the field's label as the noun, such as "Enter a name.". A message shows under its field once the reader leaves it, then follows each change. `isValid()` checks every field, shows every message, and moves focus to the first invalid one.
* `layout: 'inline'` (default) draws a row per item on shared column tracks under the field labels. `width` sets a field's track, a share by default. `showLabels: false` hides the labels.
* `layout: 'card'` draws each item as a card whose title is `titleText`, "Item {index}" by default, where `{index}` is its number and `{key}` any field's value. Its row buttons sit at the top right.
* `reorder: true` adds up and down buttons to each row, and focus stays on the pressed one.
* `height`, `maxHeight`, and `minHeight` size the rows as a [List](list.md) takes them, `'auto'` by default, and `setHeight` changes them. `size` is `'small'`, `'medium'` (default), or `'large'` for every field.
* `minRows` disables Remove at that count and fills empty rows up to it. `maxRows` disables Add and shows `limitText`.
* `removeText` is "Remove {value}", where the value is the row's name: its first text field, else "Row 2" from `rowName`, or a card's title. `upText` and `downText` are "Move {value} up" and "Move {value} down".
* `emptyText` shows under the rows while there is none.
* An inline repeater too narrow for its fields side by side turns `compact`: the column labels hide, and each row stacks its fields full width under their own labels, with the row buttons at the top right.

## Gotchas

* `getValue()` leaves out a row whose fields are all empty. A select with no `placeholder` always holds one of its choices, so its row is never empty.
* `setValue` does not call `onChange`.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createRepeater`

<code>function createRepeater(options: RepeaterOptions): RepeaterHandle</code>

The base for any list of rows or cards of mixed fields, built on the row editor core. Each item is a row of fields, or a card with a title and its fields in a grid. Rows add and remove, keep minRows and maxRows, and move up and down with reorder. Every field validates through the field core, with its message under it.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `fields` (required) | <code>RepeaterField[]</code> | array of { key, label, type ('text', 'secret', 'select', 'number', 'tags', 'time', 'toggle', or 'custom'), options, placeholder, required, requiredText, min, max, step, allowExpose, width, validate(value, item, index), render(value, change) } [required] |
| `layout` | <code>'inline' &#124; 'card'</code> | 'inline' for one row of fields per item, or 'card' for a boxed card per item (default 'inline') |
| `value` | <code>RepeaterItem[] &#124; null</code> | array of items, each an object of values by field key [optional] |
| `addText` | <code>string</code> | text of the add button (default 'Add') |
| `removeText` | <code>string</code> | aria-label of a remove button, where {value} is the row's name (default 'Remove {value}') |
| `upText` | <code>string</code> |  |
| `downText` | <code>string</code> |  |
| `rowName` | <code>string</code> | prefix of the name of an inline row whose first text field is empty (default 'Row') |
| `titleText` | <code>string</code> | a card's title, where {index} is its number and {key} any field's value (default 'Item {index}') |
| `showLabels` | <code>boolean</code> | false hides the column labels over inline rows (default true) |
| `maxRows` | <code>number</code> | most rows allowed, after which Add is disabled and limitText shows [optional] |
| `minRows` | <code>number</code> | fewest rows, below which Remove is disabled, and up to which empty rows are added [optional] |
| `limitText` | <code>string</code> | message when maxRows is reached (default 'No more rows can be added.') |
| `reorder` | <code>boolean</code> | true adds up and down buttons to each row (default false) |
| `emptyText` | <code>string</code> | sentence shown while there is no row [optional] |
| `height` | <code>ListHeight</code> |  |
| `maxHeight` | <code>number &#124; string &#124; null</code> |  |
| `minHeight` | <code>number &#124; string &#124; null</code> |  |
| `size` | <code>'small' &#124; 'medium' &#124; 'large'</code> | 'small', 'medium', or 'large' for its fields (default 'medium') |
| `onChange` | <code>(value: RepeaterItem[]): void</code> | function(value) after each change [optional] |

| Handle member | Type |
| :--- | :--- |
| `getValue` | <code>(): RepeaterItem[]</code> |
| `setValue` | <code>(next: RepeaterItem[] &#124; null): void</code> |
| `setItems` | <code>(next: RepeaterItem[] &#124; null): void</code> |
| `addRow` | <code>(item?: RepeaterItem &#124; null): boolean</code> |
| `isValid` | <code>(): boolean</code> |
| `setHeight` | <code>(height: ListHeight, maxHeight?: number &#124; string &#124; null): void</code> |
| `destroy` | <code>(): void</code> |

| Type | What it is |
| :--- | :--- |
| `RepeaterField` | One field of a repeater row. type picks the control: a text box, a secret with its three states and allowExpose, the form select with options, a number with min, max, and step, the tag input, a time box, a toggle, or a custom control from render(value, change). validate(value, item, index) returns an error sentence, or an empty value when the value is valid. width is the field's grid track in the inline layout, such as '2fr' or '8rem'. |
| `RepeaterFieldType` | The kinds of control a repeater field can be. |
| `RepeaterChoice` | One choice of a select field, as { value, label } or as plain text. |
| `RepeaterControl` | What a custom field's render returns: its element, the input its label names, and how to read and set its value. |
| `RepeaterItem` | One row of a repeater, as an object of field values by key. |
| `RepeaterParts` | The classes and behavior a variation built on the repeater sets, such as the Key Value Editor's own class names. Internal to the web components. |
| `RepeaterRow` | One drawn row of a repeater, with its field group. Internal to the web components. |
| `RepeaterBuild` | What buildRepeater returns: the handle, the rows, and a check that may leave focus alone. Internal to the web components. |

| Class | What it looks like |
| :--- | :--- |
| `base-repeater` | A list of rows or cards of mixed fields, with an Add button under them |
| `base-repeater-head` | Column labels over inline rows, on the rows' own tracks with room for the row buttons |
| `base-repeater-rows` | The rows, a gap apart |
| `base-repeater.inline` | One inline row: a cell per field on the shared tracks, then the row buttons |
| `base-field-cell` | A field's cell: its label, its control, and its message under it |
| `base-control-toggle` | A toggle field: the shared Checkbox a field tall, its box centered on the line of the fields beside it |
| `base-repeater-actions` | The row buttons, the moves and the remove, at the row's end and centered on its first field |
| `base-repeater.card` | One card: a head with the title and the row buttons at the top right, over its fields in a grid |
| `base-field-group.grid` | Fields in as many columns as fit, each under its label |
| `base-repeater.inline.compact` | A narrow inline repeater: each row stacks its fields full width under their labels, with the row buttons pinned top right, level with the first label |

<!-- reference:end -->

## Used By

No plugin uses it today.

## Example

<iframe class="base-preview" src="../../../assets/previews/repeater.html" title="Repeater example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "repeater.html"
```
