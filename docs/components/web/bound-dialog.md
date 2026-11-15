# Bound Dialog

The same dialog behavior for a `base-dialog` already written in the page markup, whose body is static markup the page fills in.

## When to Use

* Use it for a detail dialog the page fills in before it opens.

## When Not to Use

* Use [Dialog](dialog.md) when the content is built in code.

## Usage

```html
<div id="itemDetailModal" class="base-dialog hidden" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
    <div class="base-dialog-content">
        <button type="button" id="btnModalClose" class="base-dialog-close material-icons" aria-label="Close">close</button>
        <h2 id="modalTitle" class="base-modal-title"></h2>
        <div id="modalContent" class="base-modal-body"></div>
    </div>
</div>
```

```js
import { bindDialog } from './configurationpage?name=myplugin_jpkribs_shared.js';

var detail = bindDialog('itemDetailModal', { root: view, onClose: function (value) { onModalClosed(); } });
detail.open();
```

The handle is `{ element, open, close(value), isOpen, destroy }`.

## States and Modifiers

* `opts` is `{ root, dismissable, beforeClose, onOpen, onClose(value), autofocus, returnFocus }`. `root` is where an id is looked up, the document by default.
* `beforeClose()` returns `false`, or a promise of `false`, to keep the dialog open when it is dismissed. `close(value)` called from code closes it without asking.
* It shows and hides with the `hidden` class. It closes on a backdrop `mousedown`, on Escape when it is the top dialog, and on any `.base-dialog-close` inside, each asking `beforeClose` first.
* It traps focus and restores it on close, with the same rules as [Dialog](dialog.md).
* It adds `role="dialog"`, `aria-modal`, and a label from the first heading to `.base-dialog-content` when neither the panel nor the overlay carries a role.
* `destroy()` closes the dialog and removes the listeners.

## Gotchas

* Closed markup must have the `hidden` class or it shows.
* Keep the markup inside the page so it is hidden with it.
* Unlike `openDialog`, there is no `setTitle` and no footer buttons. Set the title and the body in the markup.
* It throws when the element is not found.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `bindDialog`

<code>function bindDialog(overlay: HTMLElement &#124; string &#124; null, opts?: BindDialogOptions): BoundDialogHandle</code>

Gives a base-dialog already in the page markup the behavior openDialog builds, so it shows and hides by the hidden class, closes on backdrop click, Escape, and any .base-dialog-close button, each asking opts.beforeClose first, and traps and restores focus. The panel gets dialog semantics when the markup does not set them.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `root` | <code>ParentNode &#124; null</code> | element to resolve an id within (default document) |
| `dismissable` | <code>boolean</code> | allow backdrop/Escape/close-button dismissal (default true) |
| `onOpen` | <code>(): void</code> | function() called after the dialog shows [optional] |
| `onClose` | <code>(value: unknown): void</code> | function(value) called once per close [optional] |

| Handle member | Type |
| :--- | :--- |
| `open` | <code>(): void</code> |
| `close` | <code>(value?: unknown): void</code> |
| `isOpen` | <code>(): boolean</code> |
| `destroy` | <code>(): void</code> |

<!-- reference:end -->

## Used By

Artwork Generator, Live Channels, Server Sync, and User Management use it.

## Example

<iframe class="base-preview" src="../../../assets/previews/bound-dialog.html" title="Bound Dialog example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "bound-dialog.html"
```
