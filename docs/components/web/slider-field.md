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

Classes: `jpk-slider`, `jpk-slider-value`. The handle is `{ element, input, getValue, setValue, destroy }`.

## States and Modifiers

* `min` is 0, `max` is 100, and `step` is 1 by default. `value` defaults to `min`.
* `prefix` and `suffix` go around the readout number, such as `'%'`. `showValue: false` hides the readout.
* `getValue()` returns a number. `onChange(value)` runs as the slider moves.
* The input is a native range, so the arrow keys, Home, and End work. The readout has a fixed minimum width so the slider does not jump.

## Used By

No plugin uses it today. Artwork Generator has six hand built alpha sliders, and YouTube Audio has a seek slider.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/slider-field.html" title="Slider Field example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "slider-field.html"
```
