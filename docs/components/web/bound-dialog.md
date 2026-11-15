# Bound Dialog

The same dialog behavior for a `jpk-dialog` already written in the page markup, whose body is static markup the page fills in.

## When to Use

* Use it for a detail dialog the page fills in before it opens.

## When Not to Use

* Use [Dialog](dialog.md) when the content is built in code.

## Usage

```html
<div id="itemDetailModal" class="jpk-dialog hidden" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
    <div class="jpk-dialog-content">
        <button type="button" id="btnModalClose" class="jpk-dialog-close" aria-label="Close">&times;</button>
        <h2 id="modalTitle" class="jpk-modal-title"></h2>
        <div id="modalContent" class="jpk-modal-body"></div>
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

* `opts` is `{ root, dismissable, onOpen, onClose(value), autofocus, returnFocus }`. `root` is where an id is looked up, the document by default.
* It shows and hides with the `hidden` class. It closes on a backdrop `mousedown`, on Escape when it is the top dialog, and on any `.jpk-dialog-close` inside.
* It traps focus and restores it on close, with the same rules as [Dialog](dialog.md).
* It adds `role="dialog"`, `aria-modal`, and a label from the first heading to `.jpk-dialog-content` when neither the panel nor the overlay carries a role.
* `destroy()` closes the dialog and removes the listeners.

## Gotchas

* Closed markup must have the `hidden` class or it shows.
* Keep the markup inside the page so it is hidden with it.
* Unlike `openDialog`, there is no `beforeClose` and no `setTitle`.
* It throws when the element is not found.

## Used By

Artwork Generator, Live Channels, Server Sync, and User Management use it.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/bound-dialog.html" title="Bound Dialog example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "bound-dialog.html"
```
