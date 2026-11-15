# Field Adornments

A number field gets Base's own up and down buttons at its trailing end, in place of the browser's spinner. A date or time field shows its picker icon at its trailing end, which opens the browser's picker. A search box gets a search icon, and a secret marked `data-base-reveal` gets an eye that shows and hides it.

## Decision

| When | Use |
| :--- | :--- |
| A page built with `createConfigPage` | Nothing. It adorns every number, date, time, and search field on the page, and the ones added later. |
| A page or dialog built another way | `bindFieldAdornments(root)`. |
| One field | `adornField(input)`. |
| A spinner or calendar button beside a field | The field's type, so Base adorns it. Never draw your own. |

## Usage

```js
import * as base from './configurationpage?name=myplugin_jpkribs_shared.js';

var adornments = base.bindFieldAdornments(view);
// later, on viewhide
adornments.destroy();
```

## States and Modifiers

* The up and down buttons step by the field's `step`, stay within its `min` and `max`, and fire `input` and `change`, as typing does.
* A disabled or read only number does not step.
* A number with `data-base-unit`, such as `data-base-unit="%"`, shows the unit dimmed inside the box before its arrows, and the number aligns right.
* `bindFieldAdornments`, and so `createConfigPage`, also binds the [validation core](field-message.md#validation) on every field with a rule in its attributes.
* A date, month, week, or date and time field shows `calendar_today`. A time field shows `schedule`.
* A `type="search"` input, or a text input marked `data-base-search`, shows `search` and none of the browser's own marks. An input already inside a [Search Field](search-field.md) is left alone.
* A secret input marked `data-base-reveal` gets an eye that switches it between dots and text. `data-base-reveal-label` and `data-base-hide-label` replace its "Show" and "Hide" titles. The [Secret Field](secret-field.md) adds it with `allowExpose`.
* The adornments follow the field size, so a small or large field keeps them inside its box.
* `destroy()` puts each field back as it was.

## Gotchas

* The buttons leave the tab order, since the arrow keys already step a focused number.
* A field is wrapped in a `base-adorned` box, so a selector such as `.row > input` does not find it. Select the input by its id or class.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `adornField`

<code>function adornField(input: HTMLInputElement): FieldAdornmentHandle</code>

Wraps one field in a box with controls at its trailing end. A number gets up and down buttons in place of the browser's spinner, a date or time gets its icon, which opens the browser's picker, and a search box, type search or marked data-base-search, gets a search icon. A secret marked data-base-reveal gets an eye that shows and hides it, with data-base-reveal-label and data-base-hide-label for its titles (default 'Show' and 'Hide'). A number marked data-base-unit, such as data-base-unit="%", shows that unit dimmed inside the box before its arrows. Any other field is left as it is.

| Handle member | Type |
| :--- | :--- |
| `destroy` | <code>(): void</code> |

### `bindFieldAdornments`

<code>function bindFieldAdornments(root: ParentNode): FieldAdornmentHandle</code>

Adorns every number, date, time, and search field under a root, and the ones added later, so each shows Base's own up and down buttons or its picker icon at the trailing end. It also binds the validation core on every field that carries a rule, such as required, min, max, pattern, or a number, url, email, time, or date type. createConfigPage runs it on every page.

| Handle member | Type |
| :--- | :--- |
| `destroy` | <code>(): void</code> |

| Class | What it looks like |
| :--- | :--- |
| `base-adorned` | A field in a box with Base's controls at its trailing end, laid out by adornField |
| `base-adorned-steps` | Up and down buttons that step a number, stacked at the field's trailing end in place of the browser's spinner |
| `base-adorned-icon` | The trailing icon of a date, time, or search field. A date or time field's own picker button sits invisible over it |
| `base-adorned-search` | A search box with a search icon at its trailing end, and none of the browser's own clear or search marks |
| `base-adorned-eye` | An eye at a secret field's trailing end that shows and hides the value, added only when the page opts in |
| `base-adorned-with-unit` | A unit such as % or h inside a number's box, dimmed and never typed, just before the up and down buttons |

<!-- reference:end -->

## Example

<iframe class="base-preview" src="../../../assets/previews/field-adornments.html" title="Field Adornments example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "field-adornments.html"
```
