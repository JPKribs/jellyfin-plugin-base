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

Class: `base-field-message`. The handle is `{ element, getValue, setValue, set, clear, bind, destroy }`, and `getValue()` returns `{ state, text }`.

## States and Modifiers

* `createFieldMessage` takes `{ state, text, input, id }`. `input` is the input, select, or textarea to wire.
* `setFieldState` creates one message after the input, or after the box Base adorned it with or the label a checkbox sits in, and reuses it. The error state sets `aria-invalid`, and every visible state adds the message to `aria-describedby`.
* `input[aria-invalid="true"]` gets a red border, also on a config page and in a dialog.
* Base's editors, such as the [Number Unit Field](number-unit-field.md), the [Color Picker](color-picker.md), and the [Tag Input](tag-input.md), show their errors through it.

## Validation

Every Base field validates through one core, which shows its errors through this message. Rules come from the field's own attributes, `required`, `min`, `max`, `step`, `minlength`, `maxlength`, `pattern`, and a `number`, `url`, `email`, `time`, or `date` type, plus an optional `validate` function.

```js
import { bindValidation, validateAll } from './configurationpage?name=myplugin_jpkribs_shared.js';

var port = bindValidation(view.querySelector('#port'), { noun: 'port' });
if (!validateAll(view.querySelector('form'))) return;
```

* `bindValidation(input, options)` returns `{ input, check, isValid, show, clear, destroy }`. It checks when the reader leaves a field they changed, then on every change while the error shows. `check()` shows the result, and `isValid()` only reads it.
* `validateAll(root)` checks every bound field and every field with a rule under `root`, shows every message, focuses the first invalid field, and returns whether all are valid. Disabled fields are skipped.
* Validation applies by itself on a page built with `createConfigPage`. On every `viewshow` it binds every field on the page that carries a rule in its attributes, and each one added later, so the field shows its message when it is left. `bindFieldAdornments(root)` does the same for a page or dialog built another way.
* Binding never blocks a save. The [Save Bar](save-bar.md) with `form` runs `validateAll` on Save and refuses to save while a field is invalid. A page that saves another way calls `validateAll` itself.
* The messages are plain sentences, such as "Fill this in.", "Enter a number from {min} to {max}.", "Enter {min} or more.", "Enter a whole number.", "Enter a web address.", and "Enter an email address.". `messages` replaces any of them by key.
* `noun`, or a `data-base-label` on the field, names the value, so a port reads "Enter a port from 1 to 65535.". `noun: true` reads the field's label.
* `inputs` lists more fields that share one message, such as the boxes of a [Duration Field](duration-field.md), and `value` reads the text to check from them.
* A secret that is stored counts as filled for `required`.
* `validateValue(value, rules, options)` checks text without a field and returns the message or `''`.
* `readRules(input)` returns the rules a field carries, `hasRules(input)` says whether it carries any, `validationOf(input)` returns its binding or `null`, and `VALIDATION_MESSAGES` holds the default sentences.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createFieldMessage`

<code>function createFieldMessage(options?: FieldMessageOptions): FieldMessageHandle</code>

Builds a message for under a field, with a state of error, warn, success, or info. Bound to an input, it keeps aria-invalid and aria-describedby in step, and it is a persistent polite live region so a screen reader hears each change.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `state` | <code>string</code> | 'error', 'warn', 'success', or 'info', or '' for none [optional] |
| `text` | <code>string</code> | the message sentence [optional] |
| `input` | <code>Element &#124; null</code> | input, select, or textarea to wire with aria-invalid (error only) and aria-describedby [optional] |
| `id` | <code>string</code> | id for the message element (default generated) [optional] |

| Handle member | Type |
| :--- | :--- |
| `getValue` | <code>(): FieldMessageValue</code> |
| `setValue` | <code>(value?: Partial&lt;FieldMessageValue&gt; &#124; null): void</code> |
| `set` | <code>(state?: string, text?: string): void</code> |
| `clear` | <code>(): void</code> |
| `bind` | <code>(target?: Element &#124; null): void</code> |
| `destroy` | <code>(): void</code> |

### `setFieldState`

<code>function setFieldState(input: Element, state: string, text?: string): FieldMessageHandle</code>

Shows a message under an input, creating it on first use, and wires aria-invalid and aria-describedby. An empty state clears the message and the attributes.

| Handle member | Type |
| :--- | :--- |
| `getValue` | <code>(): FieldMessageValue</code> |
| `setValue` | <code>(value?: Partial&lt;FieldMessageValue&gt; &#124; null): void</code> |
| `set` | <code>(state?: string, text?: string): void</code> |
| `clear` | <code>(): void</code> |
| `bind` | <code>(target?: Element &#124; null): void</code> |
| `destroy` | <code>(): void</code> |

| Type | What it is |
| :--- | :--- |
| `FieldMessageValue` | A message state, such as 'error', 'warn', 'success', 'info', or '' for none, and its sentence. |

| Class | What it looks like |
| :--- | :--- |
| `base-field-message.error` | The color of each message state, one rule for the field message, the status line, and the toast's icon |

<!-- reference:end -->

## Used By

No plugin uses it today.

## Example

<iframe class="base-preview" src="../../../assets/previews/field-message.html" title="Field Message example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "field-message.html"
```
