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
* `destructive` makes the confirm button `jpk-button-destructive`. Otherwise it is `jpk-button-submit`. A destructive confirm is never focused first, so Cancel takes focus and Enter cannot confirm by accident.
* The message is plain text and is escaped unless `html: true`. Escape HTML you pass yourself.
* It resolves `true` only for the confirm button. Escape, the backdrop, and Cancel resolve `false`. It never rejects.

## Used By

Custom Pages, Live Channels, Remote Access, Requests, Scripts, Server Sync, User Management, and YouTube Audio use it.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/confirm-dialog.html" title="Confirm Dialog example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "confirm-dialog.html"
```
