# Editor Dialog

The record editor a config page builds. It has Remove (unless the record is new), Cancel, and Done, asks "Discard your changes?" when dismissed with edits, and tracks its own changes.

## When to Use

* Use it to add or edit one record, such as a server.

## When Not to Use

* Use a [Prompt Dialog](prompt-dialog.md) for a quick value.

## Usage

```js
import { openEditorDialog } from './configurationpage?name=myplugin_jpkribs_shared.js';

var editor = openEditorDialog({
    title: 'Edit Server',
    body: editorNode,
    page: page,
    isNew: false,
    serialize: function () { return JSON.stringify(readEditor()); },
    ready: loadingPromise,
    onDone: function (close) { return saveServer().then(function () { return true; }, function () { return false; }); },
    onRemove: function (close) { confirmRemove().then(function (yes) { if (yes) { removeServer(); close('removed'); } }); }
});
```

It returns the `openDialog` handle plus `isDirty()` and `markClean()`.

## States and Modifiers

* `title`, `body`, `className`, `narrow`, `onClose`, `autofocus`, and `returnFocus` are as on [Dialog](dialog.md). It is wide unless `narrow` is set.
* `page` is the `createConfigPage` handle. An open editor then counts toward `guardUnsaved` and closes when the page hides.
* `isNew` marks a record not saved yet. It has no Remove button.
* `serialize()` returns a stable string of the editor state. `ready` is a promise to wait on before taking the clean snapshot, for fields still loading.
* `doneText`, `removeText`, and `cancelText` replace "Done", "Remove", and "Cancel".
* `onDone(close)` returns `false`, or a promise of `false`, to stay open. Done is disabled while a returned promise is pending, and a rejection enables it again. A true or undefined result closes with `'done'`.
* `onRemove(close)` closes the dialog itself. Remove shows only when this is set and `isNew` is false.
* Dismissing with changes opens a destructive confirm titled "Unsaved Changes" that asks "Discard your changes?".

## Gotchas

* The clean snapshot is taken when `ready` settles. Call `markClean()` after a save that keeps the dialog open.

## Used By

Requests uses it.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/editor-dialog.html" title="Editor Dialog example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "editor-dialog.html"
```
