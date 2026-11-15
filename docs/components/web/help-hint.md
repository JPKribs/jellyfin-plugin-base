# Help Hint

A small help icon button for next to a label, with a bubble that explains the field. The bubble shows on hover and focus, and a click or tap toggles it.

## When to Use

* Use it for a long explanation that would crowd a `fieldDescription`.

## When Not to Use

* Use a [Placeholder Hint](placeholder-hint.md) to insert tokens into a field.

## Usage

```js
import { createHelpHint } from './configurationpage?name=myplugin_jpkribs_shared.js';

label.appendChild(createHelpHint({ text: 'Seconds between checks.' }).element);
```

Classes: `jpk-help`, `jpk-help-button`, `jpk-help-tip`. The handle is `{ element, getValue, setValue, show, hide, destroy }`.

## States and Modifiers

* `text` is the plain text explanation and is required. `label` ("Help") names the button. `icon` defaults to `help_outline`.
* The bubble shows on hover, focus within, and the `open` modifier. The button is described by the bubble through `aria-describedby`.
* Escape or a click outside closes it.
* `getValue()` returns the text and `setValue` replaces it.

## Used By

No plugin uses it today.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/help-hint.html" title="Help Hint example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "help-hint.html"
```
