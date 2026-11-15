# Dialog

A modal over the page with a title, a body, and footer buttons. All dialog helpers are built on one panel. `openDialog` creates the markup, and [Bound Dialog](bound-dialog.md) adds the behavior to markup already in the page. The [Detail Drawer](detail-drawer.md) is the same panel docked to the right edge.

## Decision

| When | Use |
| :--- | :--- |
| A short task or a detail view that needs the user's full attention | Dialog |
| A yes or no question | [Confirm Dialog](confirm-dialog.md) |
| A few values | [Prompt Dialog](prompt-dialog.md) |
| A record | [Editor Dialog](editor-dialog.md) |
| The details of a row | [Detail Drawer](detail-drawer.md) |

## Usage

```js
import { openDialog } from './configurationpage?name=myplugin_jpkribs_shared.js';

var dialog = openDialog({
    title: 'Session Log',
    body: '<p>Backdrop click, the close button, and Escape all close it.</p>',
    size: 'small',
    buttons: [
        { text: 'Close', className: 'base-button secondary', action: function (close) { close(); } },
        { text: 'Retry', className: 'base-button primary', value: 'retry' }
    ],
    onClose: function (value) { /* 'retry' or undefined */ }
});
```

The handle is `{ element, content, close, dismiss, setTitle }`. `element` is the overlay and `content` is the body element.

The markup `openDialog` builds, which `bindDialog` also expects:

```html
<div class="base-dialog">
    <div class="base-dialog-content" role="dialog" aria-modal="true" aria-labelledby="base-dialog-title-1">
        <button type="button" class="base-row-btn base-dialog-close" title="Close" aria-label="Close"><span class="material-icons" aria-hidden="true">close</span></button>
        <h2 class="base-modal-title" id="base-dialog-title-1">Session Log</h2>
        <div class="base-modal-body"></div>
        <div class="base-modal-button-row">
            <button type="button" class="raised base-modal-button base-button secondary">Close</button>
        </div>
    </div>
</div>
```

Classes: `base-dialog`, `base-dialog-content`, with the size modifiers `small`, `medium`, and `large`, `base-dialog-close` on a [Row Button](row-button.md), `base-modal-title`, `base-modal-body`, `base-modal-field`, `base-modal-field-label`, `base-modal-button-row`, `base-modal-button`.

## States and Modifiers

* `body` is an HTML string or a DOM node. A string is inserted as HTML, so escape data in it.
* `ariaLabel` names a dialog with no `title`. Without it the name is the start of the body text, else "Dialog".
* `size` sets the panel's width as a share of the window: `small` is 40% (at least 320px), `medium` is 60% (at least 420px, the default), and `large` is 80% (at least 560px). A panel never grows past the screen, and below 600px every size takes the screen's width.
* `className` adds classes to the panel. `dismissable` (default true) allows the backdrop, Escape, and the close button. `closeButton` shows the corner button and is never shown when the dialog is not dismissable.
* `beforeClose()` returns `false`, or a promise of `false`, to keep the dialog open when it is dismissed.
* `buttons` is `[{ text, className, value, action(close, dismiss, button) }]`. Without `action` a button closes with its `value`. `dismiss` closes the way Escape does, asking `beforeClose`.
* `autofocus` is an element or selector to focus on open, or `false` to focus the panel. `returnFocus` is where focus goes on close when the opener is gone.
* Focus on open goes to `autofocus`, else the first visible field in the body, else a non destructive footer button, else the close button, else the panel. A `base-button destructive` button is never focused automatically. On a touch screen a text field is not focused, so the keyboard does not cover the dialog.
* Tab and Shift+Tab cycle inside the panel. Only the top dialog answers Escape. A backdrop `mousedown` dismisses. The page behind does not scroll while a dialog is open.
* On close, focus returns to the control that opened it, else `returnFocus`, else the first heading of the config page. A dialog still open underneath takes focus back.
* A `large` panel is for an editor. Its button row is sticky at the bottom, with a destructive button apart on the left, and below 600px it fills the whole screen. Confirm and prompt dialogs are `small`.
* `setTitle(text)` changes the title and adds or removes the heading and `aria-labelledby` as needed.
* The close button sits in the top right corner, inset by the panel's padding and level with the title, in every dialog. The padding is `--base-dialog-pad` on the panel, which the parts that reach its edges, such as a large dialog's button row, also read.
* A footer button that is disabled, such as a typed confirm's button before the text matches, is dimmed.
* Links in a dialog that are not buttons take the accent color. The form rules apply inside a dialog without a class.

## Gotchas

* A string `body` is HTML.
* A button with an `action` must call `close` itself.
* A dialog opened in the page body is outside `.pluginConfigurationPage`. The field rules already cover `.base-dialog`, and `className: 'pluginConfigurationPage'` adds the page only rules.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `openDialog`

<code>function openDialog(opts?: DialogOptions): DialogHandle</code>

Opens a modal that closes on backdrop click, Escape, and the corner close button, each asking opts.beforeClose first. Focus is trapped in the panel and restored on close.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `title` | <code>string</code> | heading text [optional] |
| `ariaLabel` | <code>string</code> | accessible name when there is no title (default the start of the body text, else 'Dialog') [optional] |
| `body` | <code>string &#124; Node</code> | HTML string or a DOM node for the modal body [optional] |
| `size` | <code>'small' &#124; 'medium' &#124; 'large'</code> | 'small' (40% of the window width), 'medium' (60%), or 'large' (80%, filling the screen on a phone with its buttons kept in view) (default 'medium') |
| `className` | <code>string</code> | classes added to the panel, such as pluginConfigurationPage for the page's form look [optional] |
| `dismissable` | <code>boolean</code> | allow backdrop/Escape/close-button dismissal (default true) |
| `closeButton` | <code>boolean</code> | render the corner close button, which also needs dismissable (default true) |
| `beforeClose` | <code>(): boolean &#124; PromiseLike&lt;boolean &#124; void&gt;</code> | function() returning false, or a promise of false, to keep the dialog open when it is dismissed, such as to confirm discarding changes [optional] |
| `buttons` | <code>DialogButton[]</code> | [{ text, className, value, action(close, dismiss, button) }] rendered in the footer row, where dismiss closes as Escape does, asking beforeClose first, and button is the clicked element [optional] |
| `onClose` | <code>(value: unknown): void</code> | function(value) called once when the dialog closes [optional] |
| `autofocus` | <code>HTMLElement &#124; string &#124; false &#124; null</code> | the element or a selector within the dialog to focus on open, or false to focus the panel itself (default the first visible field, else a non-destructive footer button) [optional] |

| Handle member | Type |
| :--- | :--- |
| `element` | <code>HTMLDivElement</code> |
| `content` | <code>HTMLDivElement</code> |
| `close` | <code>(value?: unknown): void</code> |
| `dismiss` | <code>(): void</code> |
| `setTitle` | <code>(text: string): void</code> |

| Type | What it is |
| :--- | :--- |
| `DialogButton` | One footer button. action gets close, dismiss, and the clicked button, and without it a click closes with value. |

| Class | What it looks like |
| :--- | :--- |
| `base-dialog` | Full screen dimmed overlay that centers its panel |
| `base-dialog-content` | Centered, scrollable modal panel, 60% of the window wide at the medium size, whose padding every part inside it is set by |
| `base-dialog-content.small` | A small panel, 40% of the window wide, for a short prompt or confirmation |
| `base-dialog-content.large` | A large panel, 80% of the window wide, for an editor, with its buttons pinned at the bottom and the whole screen on a phone. A drawer's footer shares the pinned row |
| `base-dialog-close` | The corner close button, a row button pinned to the top right corner of the panel and inset by the panel's padding, level with the title |
| `base-modal-title` | Modal heading |
| `base-modal-body` | Modal body region between header and footer |
| `base-modal-field` | Field block with a label inside a modal |
| `base-modal-field-label` | Dimmed label above a modal field |
| `base-modal-button-row` | Footer row of equal width modal buttons |
| `base-modal-button` | Equal width button in the footer row |

<!-- reference:end -->

## Example

<iframe class="base-preview" src="../../../assets/previews/dialog.html" title="Dialog example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "dialog.html"
```
