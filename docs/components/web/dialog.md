# Dialog

A modal over the page with a title, a body, and footer buttons. All dialog helpers are built on one panel. `openDialog` creates the markup, and [Bound Dialog](bound-dialog.md) adds the behavior to markup already in the page.

## When to Use

* Use it for a short task or a detail view that needs the user's full attention.

## When Not to Use

* Use a [Confirm Dialog](confirm-dialog.md) for a yes or no question, a [Prompt Dialog](prompt-dialog.md) for a few values, and an [Editor Dialog](editor-dialog.md) for a record.

## Usage

```js
import { openDialog } from './configurationpage?name=myplugin_jpkribs_shared.js';

var dialog = openDialog({
    title: 'Session Log',
    body: '<p>Backdrop click, the close button, and Escape all close it.</p>',
    narrow: true,
    buttons: [
        { text: 'Close', className: 'jpk-secondary', action: function (close) { close(); } },
        { text: 'Retry', className: 'jpk-button-submit', value: 'retry' }
    ],
    onClose: function (value) { /* 'retry' or undefined */ }
});
```

The handle is `{ element, content, close, dismiss, setTitle }`. `element` is the overlay and `content` is the body element.

The markup `openDialog` builds, which `bindDialog` also expects:

```html
<div class="jpk-dialog">
    <div class="jpk-dialog-content" role="dialog" aria-modal="true" aria-labelledby="jpk-dialog-title-1">
        <button type="button" class="jpk-dialog-close" aria-label="Close">&times;</button>
        <h2 class="jpk-modal-title" id="jpk-dialog-title-1">Session Log</h2>
        <div class="jpk-modal-body"></div>
        <div class="jpk-modal-button-row">
            <button type="button" class="raised jpk-modal-button jpk-secondary">Close</button>
        </div>
    </div>
</div>
```

Classes: `jpk-dialog`, `jpk-dialog-wide`, `jpk-dialog-content`, `jpk-dialog-content-narrow`, `jpk-dialog-content-wide`, `jpk-dialog-close`, `jpk-modal-title`, `jpk-modal-body`, `jpk-modal-field`, `jpk-modal-field-label`, `jpk-modal-button-row`, `jpk-modal-button`.

## States and Modifiers

* `body` is an HTML string or a DOM node. A string is inserted as HTML, so escape data in it.
* `narrow` caps the width at 420px. `wide` gives an editor up to 760px whose buttons stay in view at the bottom, and on a phone it fills the screen.
* `className` adds classes to the panel. `dismissable` (default true) allows the backdrop, Escape, and the close button. `closeButton` shows the corner button and is never shown when the dialog is not dismissable.
* `beforeClose()` returns `false`, or a promise of `false`, to keep the dialog open when it is dismissed.
* `buttons` is `[{ text, className, value, action(close, dismiss, button) }]`. Without `action` a button closes with its `value`. `dismiss` closes the way Escape does, asking `beforeClose`.
* `autofocus` is an element or selector to focus on open, or `false` to focus the panel. `returnFocus` is where focus goes on close when the opener is gone.
* Focus on open goes to `autofocus`, else the first visible field in the body, else a non destructive footer button, else the close button, else the panel. A `jpk-button-destructive` button is never focused automatically. On a touch screen a text field is not focused, so the keyboard does not cover the dialog.
* Tab and Shift+Tab cycle inside the panel. Only the top dialog answers Escape. A backdrop `mousedown` dismisses.
* On close, focus returns to the control that opened it, else `returnFocus`, else the first heading of the config page. A dialog still open underneath takes focus back.
* The wide panel is `min(760px, 100%)`. Its button row is sticky at the bottom, with a destructive button apart on the left. Below 700px the panel fills the screen.
* `setTitle(text)` changes the title and adds or removes the heading and `aria-labelledby` as needed.
* Links in a dialog that are not buttons take the accent color. The form rules apply inside a dialog without a class.

## Gotchas

* A string `body` is HTML.
* A button with an `action` must call `close` itself.
* A dialog opened in the page body is outside `.pluginConfigurationPage`. The field rules already cover `.jpk-dialog`, and `className: 'pluginConfigurationPage'` adds the page only rules.

## Used By

Requests and Scripts use it.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/dialog.html" title="Dialog example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "dialog.html"
```
