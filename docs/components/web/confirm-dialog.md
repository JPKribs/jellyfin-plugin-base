# Confirm Dialog

A narrow dialog that asks a yes or no question and resolves to a boolean.

## When to Use

* Use it before an action that removes or overwrites data.

## When Not to Use

* Use an [Editor Dialog](editor-dialog.md) when the user must also edit values.

## Usage

```js
import { confirmDialog } from './configurationpage?name=myplugin_jpkribs_shared.js';

confirmDialog('Remove this server? Its links stop playing.', {
    title: 'Remove Server', confirmText: 'Remove', destructive: true
}).then(function (confirmed) { if (confirmed === true) { removeServer(); } });
```

## States and Modifiers

* `opts` is `{ title, confirmText, cancelText, destructive, html }`. The buttons default to "Confirm" and "Cancel", and there is no default title, so pass one that names the action.
* `destructive` makes the confirm button `base-button destructive`. Otherwise it is `base-button primary`. A destructive confirm is never focused first, so Cancel takes focus and Enter cannot confirm by accident.
* The message is plain text and is escaped unless `html: true`. Escape HTML you pass yourself.
* It resolves `true` only for the confirm button. Escape, the backdrop, and Cancel resolve `false`. It never rejects.

### Typed Confirm

`typeToConfirm` asks the reader to type a word before a confirm that cannot be undone, such as deleting a database.

```js
confirmDialog('This deletes the sync database and every link in it. It cannot be undone.', {
    title: 'Delete Database', confirmText: 'Delete', destructive: true, typeToConfirm: 'Database'
}).then(function (confirmed) { if (confirmed === true) { deleteDatabase(); } });
```

* A field under the message is labelled "Type Database to confirm.", from `typeLabel`, where `{value}` is the word.
* The confirm button stays disabled until the field holds the word exactly, case and spaces included.
* Enter confirms only when the word matches. Otherwise the field shows `mismatchText`, "The text does not match.", under it through the [Field Message](field-message.md), which clears once the text matches or is emptied.
* The field takes focus on open, except on a touch screen, and the destructive button never does.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `confirmDialog`

<code>function confirmDialog(message: string, opts?: ConfirmDialogOptions): Promise&lt;boolean&gt;</code>

Opens a yes or no dialog that resolves to true when confirmed and false otherwise. With typeToConfirm it is a typed confirm, whose confirm button stays off until the field holds that exact text, and Enter confirms only then.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `title` | <code>string</code> | the dialog title, which names the action [optional] |
| `confirmText` | <code>string</code> | the confirm button label (default 'Confirm') |
| `cancelText` | <code>string</code> | the cancel button label (default 'Cancel') |
| `destructive` | <code>boolean</code> | true makes the confirm button destructive (default false) |
| `html` | <code>boolean</code> | true treats the message as HTML (default false) |
| `typeToConfirm` | <code>string</code> | text the reader must type exactly before confirming, such as the name of what is deleted [optional] |
| `typeLabel` | <code>string</code> | the field's label, where {value} is the text to type (default 'Type {value} to confirm.') |
| `mismatchText` | <code>string</code> | the error under the field when Enter is pressed before it matches (default 'The text does not match.') |

<!-- reference:end -->

## Used By

Custom Pages, Live Channels, Remote Access, Requests, Scripts, Server Sync, User Management, and YouTube Audio use it.

## Example

<iframe class="base-preview" src="../../../assets/previews/confirm-dialog.html" title="Confirm Dialog example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "confirm-dialog.html"
```
