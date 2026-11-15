# Toast

A stack of transient messages in a live region. A toast closes itself after its timeout, closes from its Dismiss button, and pauses its timer while the pointer or focus is on it.

## When to Use

* Use it to confirm an action or report a problem without moving the page.

## When Not to Use

* Use [Status Text](status-text.md) for a result that belongs beside a button, and a [Callout](callout.md) for a message that stays.

## Usage

```js
import { createToaster } from './configurationpage?name=myplugin_jpkribs_shared.js';

var toaster = createToaster({ timeout: 5000 });
toaster.success('Saved.');
toaster.error('Could not connect.', 0);
```

Classes: `base-toaster`, `base-toaster-bottom-end`, `base-toaster-bottom-start`, `base-toaster-top-end`, `base-toaster-top-start`, `base-toast`, `base-toast-close`. The handle is `{ element, show, info, success, warn, error, clear, destroy }`. `show({ message, kind, title, timeout })` returns `{ element, dismiss }`, and each kind method takes `(message, timeout)`.

Parts: `base-toaster-live`, `base-toast-body`, `base-toast-title`.

## States and Modifiers

* A toast is `info`, `success`, `warn`, or `error`. The first three have `role="status"`, and an error has `role="alert"`.
* The stack holds two `base-toaster-live` regions, a polite one with `role="status"` and an assertive one with `role="alert"` for errors.
* `position` is `bottom-end` (default), `bottom-start`, `top-end`, or `top-start`. `parent` is the element that holds the stack, the document body by default.
* `timeout` is 5000 ms by default, and 0 keeps the toast until dismissed. An error toast stays until dismissed unless a timeout is set. `max` is 5, and the oldest closes first.
* `label` ("Notifications") names the stack and `dismissLabel` ("Dismiss") names the button. `onDismiss(spec)` runs when a toast closes.
* While a dialog is open and no `parent` is given, the stack moves into the dialog on top, so the modal does not hide it from a screen reader.

## Gotchas

* The stack is fixed to a corner, so pass `parent` to keep it inside a page or a preview.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createToaster`

<code>function createToaster(options?: ToasterOptions): ToasterHandle</code>

A stack of transient messages in persistent live regions. A toast closes itself after the timeout, closes from its Dismiss button, and pauses its timer while the pointer or focus is on it. Info, success, and warn toasts join a polite region, and an error toast joins an assertive one, so a screen reader announces each as it arrives. An error toast stays until dismissed unless a timeout is set.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `parent` | <code>HTMLElement &#124; null</code> | element that holds the stack (default the document body, or the open dialog while one is open, so a modal does not hide the toast from a screen reader) |
| `position` | <code>'bottom-end' &#124; 'bottom-start' &#124; 'top-end' &#124; 'top-start' &#124; string</code> | 'bottom-end', 'bottom-start', 'top-end', or 'top-start' (default 'bottom-end') |
| `timeout` | <code>number</code> | milliseconds before a toast closes, and 0 keeps it until dismissed (default 5000, and 0 for an error toast unless set here or on the toast) |
| `max` | <code>number</code> | most toasts shown at once, where the oldest closes first (default 5) |
| `label` | <code>string</code> | aria-label of the stack (default 'Notifications') |
| `dismissLabel` | <code>string</code> | title and aria-label of the dismiss button (default 'Dismiss') |
| `onDismiss` | <code>(spec: ToastSpec): void</code> | function(toastOptions) called when a toast closes [optional] |

| Handle member | Type |
| :--- | :--- |
| `show` | <code>(spec: ToastSpec &#124; string): Toast</code> |
| `info` | <code>(message: string, timeout?: number): Toast</code> |
| `success` | <code>(message: string, timeout?: number): Toast</code> |
| `warn` | <code>(message: string, timeout?: number): Toast</code> |
| `error` | <code>(message: string, timeout?: number): Toast</code> |
| `clear` | <code>(): void</code> |
| `destroy` | <code>(): void</code> |

| Type | What it is |
| :--- | :--- |
| `ToastKind` | The tone of a toast. An error toast joins the assertive live region, and the rest the polite one. |
| `ToastSpec` | What show takes for one toast. A plain string is the message. |
| `Toast` | One shown toast, as show returns it. |

| Class | What it looks like |
| :--- | :--- |
| `base-toaster` | Fixed stack of toasts in a corner of the screen, which lets clicks through around the toasts |
| `base-toaster-live` | Persistent live region inside the stack that holds the toasts of one urgency |
| `base-toast` | One message on the base-float surface, built as base-icon-text with an icon, text, and a dismiss button, bordered in the color of its kind |
| `base-toast-close` | The dismiss button, pinned to the toast's top right corner and inset by its padding |

<!-- reference:end -->

## Used By

No plugin uses it today.

## Example

<iframe class="base-preview" src="../../../assets/previews/toast.html" title="Toast example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "toast.html"
```
