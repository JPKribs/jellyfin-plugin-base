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

Classes: `base-help`, `base-help-button`, `base-help-tip`. The handle is `{ element, getValue, setValue, show, hide, destroy }`.

## States and Modifiers

* `text` is the plain text explanation and is required. Without it `createHelpHint` throws. `label` ("Help") names the button. `icon` defaults to `help_outline`.
* The button is a [Row Button](row-button.md), `base-row-btn base-help-button`.
* The bubble shows on hover, focus within, and the `open` modifier. The button is described by the bubble through `aria-describedby`.
* Hover and focus show it while they last. A click pins it open until a second click, Escape, or a click outside. `show()` and `hide()` pin and unpin it from code.
* `getValue()` returns the text and `setValue` replaces it.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createHelpHint`

<code>function createHelpHint(options: HelpHintOptions): HelpHintHandle</code>

A small help icon button for next to a label, with a bubble that explains the field. The bubble shows on hover and focus, and a click or tap toggles it. The button is described by the bubble through aria-describedby, and Escape or a click outside closes it.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `text` (required) | <code>string</code> | the explanation, plain text [required] |
| `label` | <code>string</code> | aria-label of the button (default 'Help') |
| `icon` | <code>string</code> | Material icon name (default 'help_outline') |

| Handle member | Type |
| :--- | :--- |
| `getValue` | <code>(): string</code> |
| `setValue` | <code>(text: string): void</code> |
| `show` | <code>(): void</code> |
| `hide` | <code>(): void</code> |
| `destroy` | <code>(): void</code> |

| Class | What it looks like |
| :--- | :--- |
| `base-help` | Inline wrapper for a help icon button and its bubble, which shows on hover, focus, and a tap |
| `base-help-tip` | Bubble on the base-float surface, fixed to the viewport, that explains the field, placed by the hint beside its icon, and hidden until the hint is hovered, focused, or open |

<!-- reference:end -->

## Used By

No plugin uses it today.

## Example

<iframe class="base-preview" src="../../../assets/previews/help-hint.html" title="Help Hint example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "help-hint.html"
```
