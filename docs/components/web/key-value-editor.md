# Key Value Editor

Rows of a key input and a value input with Add and Remove, for headers, tags, and mappings. Each row validates its key and value.

## When to Use

* Use it for webhook headers, variables, and path mappings.

## When Not to Use

* Use a [String List](string-list.md) when there is no value.

## Usage

```js
import { createKeyValueEditor } from './configurationpage?name=myplugin_jpkribs_shared.js';

var headers = createKeyValueEditor({ values: config.Headers, onChange: function (values) { config.Headers = values; } });
container.appendChild(headers.element);
if (!headers.isValid()) { return; }
```

Classes: `jpk-kv-editor`, `jpk-kv-head`, `jpk-kv-row`. The handle is `{ element, getValue, setValue, setItems, isValid, addRow, destroy }`.

Parts: `jpk-kv-key`, `jpk-kv-remove`, `jpk-kv-rows`.

## States and Modifiers

* `values` is an array of `{ key, value }`, or an object whose properties become rows. An object passed to `setValue` becomes rows too.
* `getValue()` returns `{ key, value }` rows and leaves out a row where both are empty.
* A repeated key is an error unless `duplicateKeys` is on. A value with no key shows "Enter a key." and a repeated key shows "Key is already used.".
* `validate(key, value, index)` returns an error sentence, or an empty value when valid. `maxRows` caps the rows.
* Each row validates on input and shows its message under the key.
* The labels default to "Key", "Value", and "Add". `showLabels: false` hides the column labels. `removeLabel` is "Remove {value}", where the value is the key or "Row 2".
* At 600px and below the column labels hide and a row stacks to one column with a rule between rows.

## Used By

No plugin builds this today. Scripts (webhook headers and variables) and Server Sync (path mappings) could adopt it.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/key-value-editor.html" title="Key Value Editor example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "key-value-editor.html"
```
