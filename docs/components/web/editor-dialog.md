# Editor Dialog

The record editor a config page builds. It has Remove (unless the record is new), Cancel, and Done, asks "Discard your changes?" when dismissed with edits, and tracks its own changes.

## Decision

| When | Use |
| :--- | :--- |
| Adding or editing one record, such as a server | Editor Dialog |
| A quick value | [Prompt Dialog](prompt-dialog.md) |

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

* `title`, `body`, `className`, `size`, `onClose`, `autofocus`, and `returnFocus` are as on [Dialog](dialog.md). It is `large` unless `size` is set.
* `page` is the `createConfigPage` handle. An open editor then counts toward `guardUnsaved` and closes when the page hides.
* `isNew` marks a record not saved yet. It has no Remove button.
* `serialize()` returns a stable string of the editor state. `ready` is a promise to wait on before taking the clean snapshot, for fields still loading.
* `doneText`, `removeText`, and `cancelText` replace "Done", "Remove", and "Cancel".
* `onDone(close)` returns `false`, or a promise of `false`, to stay open. Done is disabled while a returned promise is pending, and a rejection enables it again. A true or undefined result closes with `'done'`.
* `onRemove(close)` closes the dialog itself. Remove shows only when this is set and `isNew` is false.
* Dismissing with changes opens a destructive confirm titled "Unsaved Changes" that asks "Discard your changes?".

## Gotchas

* The clean snapshot is taken when `ready` settles. Call `markClean()` after a save that keeps the dialog open.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `openEditorDialog`

<code>function openEditorDialog(opts?: EditorDialogOptions): EditorDialogHandle</code>

Opens an editor dialog for one record with Remove, Cancel, and Done buttons, and asks before it discards edits. Given the createConfigPage handle, it counts toward the page unsaved guard and closes when the page hides.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `page` | <code>Pick&lt;PageHandle, 'trackEditor' &#124; 'untrackEditor'&gt; &#124; null</code> | the createConfigPage handle [optional] |
| `isNew` | <code>boolean</code> | true for a record not saved yet, which has no Remove button (default false) |
| `serialize` | <code>(): string</code> | function() returning a stable string of the editor's state, for its change tracking |
| `ready` | <code>unknown</code> | a promise to wait on before taking the clean snapshot, such as fields still loading [optional] |
| `doneText` | <code>string</code> |  |
| `removeText` | <code>string</code> |  |
| `cancelText` | <code>string</code> |  |

| Handle member | Type |
| :--- | :--- |
| `isDirty` | <code>(): boolean</code> |
| `markClean` | <code>(): void</code> |

<!-- reference:end -->

## Example

<iframe class="base-preview" src="../../../assets/previews/editor-dialog.html" title="Editor Dialog example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "editor-dialog.html"
```
