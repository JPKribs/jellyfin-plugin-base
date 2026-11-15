# Prompt Dialog

A small form dialog that resolves to a map of the values.

## When to Use

* Use it to ask for one to three values, such as a name.

## When Not to Use

* Use an [Editor Dialog](editor-dialog.md) for a record, and the [Form Fields](form-fields.md) on a page for anything larger.

## Usage

```js
import { promptDialog } from './configurationpage?name=myplugin_jpkribs_shared.js';

promptDialog(
    [{ name: 'label', label: 'Label', value: 'My record' },
     { name: 'mode', label: 'Mode', type: 'select', options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }] }],
    { title: 'New Record', submitText: 'Create' }
).then(function (values) { if (values) { create(values.label, values.mode); } });
```

## States and Modifiers

* Each field is `{ name, label, type, value, placeholder, options }`. `type` is `text` (default), `number`, `password`, `textarea`, or `select`, which takes `options: [{ value, label }]`.
* `opts` is `{ title, submitText, cancelText }`, with the buttons "Done" and "Cancel" by default.
* It resolves to `{ name: value }` with every value a string, or to `null` when cancelled.
* The controls are `jpk-edit-input` inside `jpk-modal-field` blocks. Enter in a single line input submits. A prefilled first field is selected on open, except on a touch screen.

## Gotchas

* There is no validation. Check the values yourself and reopen the dialog if needed.

## Used By

Artwork Generator, Requests, and Scripts use it.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/prompt-dialog.html" title="Prompt Dialog example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "prompt-dialog.html"
```
