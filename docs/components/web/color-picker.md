# Color Picker

A color field. A swatch inside the box opens the browser's color picker. A fixed `#` follows it, so only the hex digits are typed, and the field also takes `rgb()` text. It is RGB by default. With `alpha: true` an opacity box in percent sits beside it on the same line, with the up and down arrows every number gets, and the value carries alpha.

## Decision

| When | Use |
| :--- | :--- |
| Any color a plugin stores, such as an accent, a badge color, or an overlay | Color Picker |
| A color that may be see-through, such as an overlay | `alpha`, turned on only in this case |
| Picking one of Base's status colors | Their names, such as `green`, through a select or a [Choice Group](choice-group.md) |

## Usage

```js
import { createColorPicker } from './configurationpage?name=myplugin_jpkribs_shared.js';

var accent = createColorPicker({ value: config.Accent || '#3498db', onChange: function (hex) { preview.style.backgroundColor = hex; } });
var overlay = createColorPicker({ value: config.Overlay, alpha: true });
// on save
config.Accent = accent.getValue();    // '#3498db'
config.Overlay = overlay.getValue();  // '#e91e6380'
```

The handle is `{ element, input, getValue, setValue, getRgba, isValid, setSize, destroy }`.

## States and Modifiers

* Without `alpha` the value is `#rrggbb`. With `alpha` it is `#rrggbbaa`, and `getRgba()` gives `{ r, g, b, a }` with `a` from 0 to 1.
* The field takes hex digits (3, 4, 6, or 8, with or without a typed `#`), `rgb()`, and `rgba()`. `getValue` always includes the `#`. Without `alpha` any alpha in the text is dropped. With `alpha`, text with no alpha keeps the opacity box's value.
* Text that is not a color shows "Enter a color such as #3498db." under the field when the field is left, and the value stays as it was. `invalidText` replaces the message, and `validate(value)` adds a rule of the plugin's own. Both check through the [validation core](field-message.md#validation).
* The opacity box takes 0 to 100. A value outside it, such as 1200, shows "Enter a number from 0 to 100." and leaves the color as it was.
* `format: 'argb'` reads and writes `#aarrggbb`, as .NET colors take it, and turns on the opacity box unless `alpha` is `false`.
* `opacityOnly: true` hides the color and shows only the opacity box, for a color that comes from elsewhere, such as an image, and turns on `alpha`. `setOpacityOnly(on)` switches between the two and keeps the color.
* The swatch shows the color over a checkerboard, so a see-through color reads as one.
* `size` is `small`, `medium` (default), or `large`, as every field.
* `parseColor(text)` and `toHexColor(rgba, alpha)` are exported for a plugin's own color handling.
* The labels default to "Color", "Pick a color", and "Opacity". `label`, `pickLabel`, and `opacityLabel` replace them.

## Gotchas

* The browser's picker has no alpha, so opacity comes from the opacity box only.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createColorPicker`

<code>function createColorPicker(options?: ColorPickerOptions): ColorPickerHandle</code>

A color field: a swatch inside the box that opens the browser's color picker, then a fixed # and the hex digits, which also take typed rgb() text. It is RGB by default. With alpha, an opacity box in percent sits beside it on the same line, with the shared up and down arrows, and the value is #rrggbbaa. Both boxes check through the validation core: text that is not a color, or an opacity outside 0 to 100, shows a message under the field and leaves the value as it was.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `value` | <code>string</code> | first color, as hex or rgb() text (default '#000000') |
| `alpha` | <code>boolean</code> | true adds the opacity box and gives #rrggbbaa values (default false, and true with format 'argb' or opacityOnly) |
| `opacityOnly` | <code>boolean</code> | true hides the color and shows only the opacity box, for a color that comes from elsewhere, such as an image (default false) |
| `format` | <code>'hex' &#124; 'argb'</code> | 'hex' for #rrggbb or #rrggbbaa, or 'argb' to read and write #aarrggbb, as .NET colors take it (default 'hex') |
| `label` | <code>string</code> | aria-label of the hex field (default 'Color') |
| `pickLabel` | <code>string</code> | title and aria-label of the swatch (default 'Pick a color') |
| `opacityLabel` | <code>string</code> | aria-label of the opacity box (default 'Opacity') |
| `invalidText` | <code>string</code> | message for text that is not a color (default 'Enter a color such as #3498db.') |
| `size` | <code>'small' &#124; 'medium' &#124; 'large'</code> | 'small', 'medium', or 'large' for its fields (default 'medium') |
| `validate` | <code>(value: string): string &#124; null &#124; undefined</code> | function(value) returning an error sentence for a color, or an empty value when valid [optional] |
| `onChange` | <code>(value: string): void</code> | function(value) called with the hex code after each change [optional] |

| Handle member | Type |
| :--- | :--- |
| `input` | <code>HTMLInputElement</code> |
| `getValue` | <code>(): string</code> |
| `setValue` | <code>(value: string): void</code> |
| `getRgba` | <code>(): Rgba</code> |
| `isValid` | <code>(): boolean</code> |
| `setSize` | <code>(size?: 'small' &#124; 'medium' &#124; 'large'): void</code> |
| `setOpacityOnly` | <code>(on: boolean): void</code> |
| `destroy` | <code>(): void</code> |

| Class | What it looks like |
| :--- | :--- |
| `base-color-picker` | A color field: a swatch inside the box with the hex code beside it, and with alpha an opacity box on the same line |
| `base-color-hash` | The # before the hex digits, part of the box so it is never typed |
| `base-color-swatch` | The square at the leading end of the box showing the color, over a soft checkerboard so a see-through color reads as one |
| `base-color-alpha` | The opacity box in percent beside the hex box, with the shared up and down arrows and a percent sign before them |
| `base-color-picker.opacity-only` | Only the opacity box, for a color that comes from elsewhere, such as an image |

<!-- reference:end -->

## Example

<iframe class="base-preview" src="../../../assets/previews/color-picker.html" title="Color Picker example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "color-picker.html"
```
