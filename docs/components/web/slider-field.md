# Slider Field

A range input with a readout of its value. The readout is an `output` element and the input carries `aria-valuetext` with the same text.

## When to Use

* Use it for a value in a small range where the position matters, such as an opacity.

## When Not to Use

* Use a [Number Unit Field](number-unit-field.md) when the user needs an exact number.

## Usage

```js
import { createSliderField } from './configurationpage?name=myplugin_jpkribs_shared.js';

var alpha = createSliderField({ min: 0, max: 255, value: 255, label: 'Opacity', onChange: function (value) { preview(value); } });
container.appendChild(alpha.element);
```

Classes: `base-slider`, `base-slider-value`. The handle is `{ element, input, getValue, setValue, destroy }`.

## States and Modifiers

* `min` is 0, `max` is 100, and `step` is 1 by default. `value` defaults to `min`. A `min` above `max` swaps the two.
* `prefix` and `suffix` go around the readout number, such as `'%'`. `showValue: false` hides the readout.
* `getValue()` returns a number. `onChange(value)` runs as the slider moves.
* `label` sets the slider's accessible name, "Value" by default.
* The input is a native range, so the arrow keys, Home, and End work. The readout has a fixed minimum width so the slider does not jump.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createSliderField`

<code>function createSliderField(options?: SliderFieldOptions): SliderFieldHandle</code>

A range input with a readout of its value. The readout is an output element and the input carries aria-valuetext with the same text.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `value` | <code>number &#124; string</code> | first value (default min) |
| `min` | <code>number &#124; string</code> | lowest value (default 0) |
| `max` | <code>number &#124; string</code> | highest value (default 100), and a min above max swaps the two |
| `step` | <code>number &#124; string</code> | step (default 1) |
| `prefix` | <code>string</code> | text before the readout number [optional] |
| `suffix` | <code>string</code> | text after the readout number, such as '%' [optional] |
| `label` | <code>string</code> | aria-label of the slider (default 'Value') |
| `showValue` | <code>boolean</code> | false hides the readout (default true) |
| `onChange` | <code>(value: number): void</code> | function(value) called as the slider moves [optional] |

| Handle member | Type |
| :--- | :--- |
| `input` | <code>HTMLInputElement</code> |
| `getValue` | <code>(): number</code> |
| `setValue` | <code>(value: number &#124; string): void</code> |
| `destroy` | <code>(): void</code> |

| Class | What it looks like |
| :--- | :--- |
| `base-slider` | Range input with a readout that keeps its width so the slider does not jump |

<!-- reference:end -->

## Used By

No plugin uses it today.

## Example

<iframe class="base-preview" src="../../../assets/previews/slider-field.html" title="Slider Field example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "slider-field.html"
```
