# Copy Field

A read only value with a copy button that shows its result. A secret value is masked until the reveal button is pressed.

## When to Use

* Use it for a link or a key the user copies, such as a webhook URL.

## When Not to Use

* Use a [Secret Field](secret-field.md) for a credential the user types.

## Usage

```js
import { createCopyField } from './configurationpage?name=myplugin_jpkribs_shared.js';

var url = createCopyField({ value: config.WebhookUrl, secret: false });
container.appendChild(url.element);
```

Classes: `jpk-copy-field`, `jpk-copy-button`, `jpk-copy-reveal`. The handle is `{ element, input, getValue, setValue, copy, destroy }`.

## States and Modifiers

* `secret: true` masks the value and adds a reveal button. `mono` (default true) shows the value in the mono font.
* The copy button is a `jpk-row-btn`. It takes `success` for the feedback, and shows a check and the feedback text. A hidden status region announces it.
* The feedback is "Copied." or "Copy failed." for 1500 ms (`feedbackMs`). `copiedText` and `failedText` replace the text.
* The labels default to "Value", "Copy", "Show", and "Hide". `label`, `copyLabel`, `revealLabel`, and `hideLabel` replace them.
* `copy()` returns a promise of whether the copy worked. `onCopy(value, ok)` runs after each copy.
* The copy uses `copyToClipboard`, which is also exported on its own.

## Used By

No plugin uses it today. User Management (invite links), Scripts (webhook URL), and Remote Access (share link) copy a value with their own button.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/copy-field.html" title="Copy Field example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "copy-field.html"
```
