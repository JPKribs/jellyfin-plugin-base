# Field Message

A message for under a field, with a state of `error`, `warn`, `success`, or `info`. Bound to an input, it keeps `aria-invalid` and `aria-describedby` in step, and it is a polite live region.

## When to Use

* Use `setFieldState` to report a validation result under any input.

## When Not to Use

* Never report a field error with `Dashboard.alert`. Use this so the message sits under the field.

## Usage

```js
import { createFieldMessage, setFieldState } from './configurationpage?name=myplugin_jpkribs_shared.js';

setFieldState(input, 'error', 'Enter a port from 1 to 65535.');
setFieldState(input, '', '');
```

Class: `jpk-field-message`. The handle is `{ element, getValue, setValue, set, clear, bind, destroy }`, and `getValue()` returns `{ state, text }`.

## States and Modifiers

* `createFieldMessage` takes `{ state, text, input, id }`. `input` is the input, select, or textarea to wire.
* `setFieldState` creates one message after the input and reuses it. The error state sets `aria-invalid`, and every visible state adds the message to `aria-describedby`.
* `input[aria-invalid="true"]` gets a red border, also on a config page and in a dialog.
* The other editors on this page use it for their errors.

## Used By

No plugin builds this today. Artwork Generator checks names with `Dashboard.alert` and could adopt it.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/field-message.html" title="Field Message example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "field-message.html"
```
