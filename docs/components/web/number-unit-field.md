# Number Unit Field

A number input beside a unit select, such as 512 MB or 2 GB. The number is checked against `min` and `max`, and a unit may carry a factor so the field can also report and take a base value.

## When to Use

* Use it for sizes, durations, and limits that the user thinks of in different units.

## When Not to Use

* Use a [Slider Field](slider-field.md) for a value with a small range.

## Usage

```js
import { createNumberUnitField } from './configurationpage?name=myplugin_jpkribs_shared.js';

var limit = createNumberUnitField({ units: [{ value: 'MB', factor: 1 }, { value: 'GB', factor: 1024 }], min: 1, max: 4096 });
limit.setBaseValue(config.LimitMb);
config.LimitMb = limit.getValue().base;
```

Classes: `jpk-number-unit`, `jpk-number-unit-row`. The handle is `{ element, input, select, getValue, setValue, setBaseValue, isValid, destroy }`.

## States and Modifiers

* `units` is required, an array of strings or of `{ value, label, factor }`. The factor is how many base units one of this unit holds.
* `getValue()` returns `{ value, unit, base }`. `value` is null while the input is empty, and `base` is the value times the unit's factor, or null with no factor.
* `setBaseValue` picks the largest unit that divides the base evenly.
* A number outside `min` and `max` shows an inline error and sets `aria-invalid`. The messages are "Enter a number from {min} to {max}.", "Enter {min} or more.", and "Enter {max} or less.", and `rangeText`, `minText`, and `maxText` replace them.
* The labels default to "Value" and "Unit".

## Used By

No plugin builds this today. Remote Access (advanced limits in seconds, KB, and MB) could adopt it.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/number-unit-field.html" title="Number Unit Field example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "number-unit-field.html"
```
