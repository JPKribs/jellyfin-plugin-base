# Copy Field

A read only value with a copy button beside it that shows its result. A secret value is masked, and with `allowExpose` an eye inside the box shows and hides it.

## Decision

| When | Use |
| :--- | :--- |
| A link or a key the user copies, such as a webhook URL | Copy Field |
| A credential the user types | [Secret Field](secret-field.md) |

## Usage

```js
import { createCopyField } from './configurationpage?name=myplugin_jpkribs_shared.js';

var url = createCopyField({ value: config.WebhookUrl, secret: false });
container.appendChild(url.element);
```

Classes: `base-copy-field`, `base-copy-field-text`, `base-copy-button`, `base-copy-reveal`. The handle is `{ element, input, getValue, setValue, copy, setSize, destroy }`.

## States and Modifiers

* `secret: true` masks the value. `allowExpose: true` adds an eye inside the box, at its trailing end, that shows and hides it. It is off by default, so a secret stays masked unless the page opts in. `mono` (default true) shows the value in the mono font.
* `wrap: true` adds `wrap` and shows the whole value as read-only text in `base-copy-field-text`, broken anywhere over as many lines as it needs, with the buttons level with its first line. Focus or Ctrl+A selects all of it, and `input` stays hidden, holding the value. A secret ignores it.
* `inline: true` adds `inline`, for a field in a row or a table cell, with none of a form field's space below it.
* The copy button is a `base-row-btn`. It takes `success` for the feedback, and shows a check and the feedback text. A hidden status region announces it.
* The feedback is "Copied" or "Copy failed." for 1500 ms (`feedbackMs`). `copiedText` and `failedText` replace the text.
* The labels default to "Value", "Copy", "Show", and "Hide". `label`, `copyLabel`, `revealLabel`, and `hideLabel` replace them.
* `copy()` returns a promise of whether the copy worked. `onCopy(value, ok)` runs after each copy.
* The copy uses `copyToClipboard`, which is also exported on its own.
* `size` is `small`, `medium` (default), or `large`, and sizes its fields on the [size scale](design-tokens.md). `setSize(size)` changes it later.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createCopyField`

<code>function createCopyField(options?: CopyFieldOptions): CopyFieldHandle</code>

A read-only value with a copy button beside it that shows its result. A secret value is masked, and with allowExpose an eye inside the box shows and hides it.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `value` | <code>unknown</code> | the text to show and copy [optional] |
| `inline` | <code>boolean</code> | true sits the field in a row or a table cell, with none of a form field's space below it (default false) |
| `wrap` | <code>boolean</code> | true shows the whole value, broken over as many lines as it needs, with the buttons level with its first line. Ignored for a secret (default false) |
| `secret` | <code>boolean</code> | true masks the value (default false) |
| `allowExpose` | <code>boolean</code> | true adds an eye inside a secret's box that shows and hides it (default false) |
| `mono` | <code>boolean</code> | true shows the value in the mono font (default true) |
| `label` | <code>string</code> | aria-label of the value (default 'Value') |
| `copyLabel` | <code>string</code> | title and aria-label of the copy button (default 'Copy') |
| `copiedText` | <code>string</code> | feedback after a copy (default 'Copied') |
| `failedText` | <code>string</code> | feedback when the copy failed (default 'Copy failed.') |
| `revealLabel` | <code>string</code> | title of the eye while masked (default 'Show') |
| `hideLabel` | <code>string</code> | title of the eye while shown (default 'Hide') |
| `feedbackMs` | <code>number</code> | how long the feedback stays (default 1500) |
| `size` | <code>'small' &#124; 'medium' &#124; 'large'</code> | 'small', 'medium', or 'large' for its fields (default 'medium') |
| `onCopy` | <code>(value: string, ok: boolean): void</code> | function(value, ok) called after each copy [optional] |

| Handle member | Type |
| :--- | :--- |
| `input` | <code>HTMLInputElement</code> |
| `getValue` | <code>(): string</code> |
| `setValue` | <code>(value: unknown): void</code> |
| `copy` | <code>(): Promise&lt;boolean&gt;</code> |
| `setSize` | <code>(size?: 'small' &#124; 'medium' &#124; 'large'): void</code> |
| `destroy` | <code>(): void</code> |

| Class | What it looks like |
| :--- | :--- |
| `base-copy-field` | Read-only value with a copy button beside it, and an optional eye inside a secret's box |
| `base-copy-field.wrap` | A wrapped copy field: the whole value as read-only text over as many lines as it needs, broken anywhere, with the buttons level with its first line |
| `base-copy-field.inline` | An inline copy field, in a row or a table cell, with none of a form field's space below it |

<!-- reference:end -->

## Example

<iframe class="base-preview" src="../../../assets/previews/copy-field.html" title="Copy Field example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "copy-field.html"
```
