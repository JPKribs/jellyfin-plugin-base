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

Classes: `jpk-toaster`, `jpk-toaster-bottom-end`, `jpk-toaster-bottom-start`, `jpk-toaster-top-end`, `jpk-toaster-top-start`, `jpk-toast`, `jpk-toast-close`. The handle is `{ element, show, info, success, warn, error, clear, destroy }`. `show({ message, kind, title, timeout })` returns `{ element, dismiss }`, and each kind method takes `(message, timeout)`.

Parts: `jpk-toaster-live`, `jpk-toast-body`, `jpk-toast-title`.

## States and Modifiers

* A toast is `info`, `success`, `warn`, or `error`. The first three have `role="status"`, and an error has `role="alert"`.
* The stack holds two `jpk-toaster-live` regions, a polite one with `role="status"` and an assertive one with `role="alert"` for errors.
* `position` is `bottom-end` (default), `bottom-start`, `top-end`, or `top-start`. `parent` is the element that holds the stack, the document body by default, or the open dialog while one is open.
* `timeout` is 5000 ms by default, and 0 keeps the toast until dismissed. An error toast stays until dismissed unless a timeout is set. `max` is 5, and the oldest closes first.
* `label` ("Notifications") names the stack and `dismissLabel` ("Dismiss") names the button.

## Gotchas

* The stack is fixed to a corner, so pass `parent` to keep it inside a page or a preview.

## Used By

No plugin uses it today. Artwork Generator, User Management, Requests, and YouTube Audio report with `Dashboard.alert` today.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/toast.html" title="Toast example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "toast.html"
```
