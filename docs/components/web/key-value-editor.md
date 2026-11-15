# Key Value Editor

Rows of a key input and a value input with Add and Remove, for headers, tags, and mappings. It is a [Repeater](repeater.md) of two text fields, so its rows, Add, Remove, limits, and validation come from there. Each row validates its key and value.

## Decision

| When | Use |
| :--- | :--- |
| Webhook headers, variables, and path mappings | Key Value Editor |
| Entries with no value | [String List](string-list.md) |
| Rows with more than two fields, or a field that is not text | [Repeater](repeater.md) |
| Keys from a fixed list, with each value from a select | [Mapping Table](mapping-table.md) |

## Usage

```js
import { createKeyValueEditor } from './configurationpage?name=myplugin_jpkribs_shared.js';

var headers = createKeyValueEditor({ values: config.Headers, onChange: function (values) { config.Headers = values; } });
container.appendChild(headers.element);
if (!headers.isValid()) { return; }
```

Classes: `base-kv-editor`, `base-kv-head`, `base-kv-row`. The handle is `{ element, getValue, setValue, setItems, isValid, addRow, setHeight, destroy }`.

Parts: `base-kv-key`, `base-kv-value`, `base-kv-remove`, `base-kv-rows`. The editor also carries the Repeater's classes, `base-repeater inline`, and each field sits in a `base-field-cell`.

## States and Modifiers

* `values` is an array of `{ key, value }`, or an object whose properties become rows. An object passed to `setValue` becomes rows too.
* `getValue()` returns `{ key, value }` rows and leaves out a row where both are empty.
* A repeated key is an error unless `duplicateKeys` is on. A value with no key shows "Enter a key." and a repeated key shows "Key is already used.".
* `validate(key, value, index)` returns an error sentence, or an empty value when valid. `maxRows` caps the rows.
* Each row validates on input and shows its message under the key. `isValid()` checks every row and shows every message, and leaves focus where it is.
* `emptyText` is a sentence shown under the rows while there is none. It is the List's empty sentence, `base-list-empty outside`, and nothing shows without it.
* The labels default to "Key", "Value", and "Add". `showLabels: false` hides the column labels. `removeLabel` is "Remove {value}", where the value is the key or "Row 2".
* `height`, `maxHeight`, and `minHeight` set the height of the rows as a [List](list.md) takes them, `'auto'` by default so the rows grow with the page. `setHeight(height, maxHeight)` changes them later.
* When the editor itself is narrow it turns `compact`: the column labels hide, each field shows its own label, and a row stacks to one column with a rule between rows.
* `size` is `small`, `medium` (default), or `large`, and sizes its fields on the [size scale](design-tokens.md).

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createKeyValueEditor`

<code>function createKeyValueEditor(options?: KeyValueEditorOptions): KeyValueEditorHandle</code>

Rows of a key input and a value input with Add and Remove, for headers, tags, and mappings. It is a Repeater of two text fields. Each row validates its key and value as it is typed, and a repeated key is an error unless duplicateKeys is on.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `values` | <code>KeyValueSource &#124; null</code> | array of { key, value }, or an object whose properties become rows [optional] |
| `keyLabel` | <code>string</code> | column label and aria-label of the key inputs (default 'Key') |
| `valueLabel` | <code>string</code> | column label and aria-label of the value inputs (default 'Value') |
| `showLabels` | <code>boolean</code> | true shows the column labels above the rows (default true) |
| `keyPlaceholder` | <code>string</code> | a valid example key [optional] |
| `valuePlaceholder` | <code>string</code> | a valid example value [optional] |
| `addText` | <code>string</code> | text of the add button (default 'Add') |
| `removeLabel` | <code>string</code> | aria-label of a remove button, where {value} is the key or "Row 2" (default 'Remove {value}') |
| `rowName` | <code>string</code> | prefix of that fallback row name (default 'Row') |
| `requiredText` | <code>string</code> | message for a value with no key (default 'Enter a key.') |
| `duplicateText` | <code>string</code> | message for a repeated key (default 'Key is already used.') |
| `duplicateKeys` | <code>boolean</code> | true allows a repeated key (default false) |
| `maxRows` | <code>number</code> | most rows allowed, after which Add is disabled and the limit message shows [optional] |
| `limitText` | <code>string</code> | message when maxRows is reached (default 'No more rows can be added.') |
| `emptyText` | <code>string</code> | sentence shown while there is no row [optional] |
| `height` | <code>ListHeight</code> | height of the rows, as createList takes it (default 'auto') |
| `maxHeight` | <code>number &#124; string &#124; null</code> | height past which the rows scroll [optional] |
| `minHeight` | <code>number &#124; string &#124; null</code> | least height of a filling list [optional] |
| `size` | <code>'small' &#124; 'medium' &#124; 'large'</code> | 'small', 'medium', or 'large' for its fields (default 'medium') |
| `validate` | <code>(key: string, value: string, index: number): string &#124; null &#124; undefined</code> | function(key, value, index) returning an error sentence, or an empty value when valid [optional] |
| `onChange` | <code>(values: KeyValuePair[]): void</code> | function(values) [optional] |

| Handle member | Type |
| :--- | :--- |
| `getValue` | <code>(): KeyValuePair[]</code> |
| `setValue` | <code>(next: KeyValueSource &#124; null): void</code> |
| `setItems` | <code>(next: KeyValueSource &#124; null): void</code> |
| `isValid` | <code>(): boolean</code> |
| `addRow` | <code>(data?: { key?: string; value?: string; } &#124; null): boolean</code> |
| `setHeight` | <code>(height: ListHeight, maxHeight?: number &#124; string &#124; null): void</code> |
| `destroy` | <code>(): void</code> |

| Type | What it is |
| :--- | :--- |
| `KeyValuePair` | One row of the editor, as getValue and onChange give it. |
| `KeyValueSource` | Rows to load, as an array of key and value records or an object whose properties become rows. |

| Class | What it looks like |
| :--- | :--- |
| `base-kv-editor` | Editor of key and value rows, a Repeater of two text fields, with column labels and an add button |
| `base-kv-head` | Column labels over the key and value columns, the repeater's head, hidden while the editor is narrow |
| `base-kv-rows` | Rows of a key cell, a value cell, and a remove button, the repeater's rows, which stack while the editor is narrow |

<!-- reference:end -->

## Example

<iframe class="base-preview" src="../../../assets/previews/key-value-editor.html" title="Key Value Editor example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "key-value-editor.html"
```
