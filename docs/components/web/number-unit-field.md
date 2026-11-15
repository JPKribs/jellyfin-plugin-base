# Number Unit Field

A number input beside a unit select, such as 512 MB or 2 GB. The number is checked against `min` and `max`, and a unit may carry a factor so the field can also report and take a base value.

## Decision

| When | Use |
| :--- | :--- |
| Sizes, durations, and limits that the user thinks of in different units | Number Unit Field |
| A value with a small range | [Slider Field](slider-field.md) |

## Usage

```js
import { createNumberUnitField } from './configurationpage?name=myplugin_jpkribs_shared.js';

var limit = createNumberUnitField({ units: [{ value: 'MB', factor: 1 }, { value: 'GB', factor: 1024 }], min: 1, max: 4096 });
limit.setBaseValue(config.LimitMb);
config.LimitMb = limit.getValue().base;
```

Classes: `base-number-unit`, `base-number-unit-row`. The handle is `{ element, input, select, getValue, setValue, setBaseValue, isValid, setSize, destroy }`.

## States and Modifiers

* `units` is required, an array of strings or of `{ value, label, factor }`. The factor is how many base units one of this unit holds.
* `getValue()` returns `{ value, unit, base }`. `value` is null while the input is empty, and `base` is the value times the unit's factor, or null with no factor.
* `setBaseValue` picks the largest unit that divides the base evenly.
* A number outside `min` and `max` shows an inline error through the [validation core](field-message.md#validation) when the field is left, and sets `aria-invalid`. The messages are "Enter a number from {min} to {max}.", "Enter {min} or more.", and "Enter {max} or less.", and `rangeText`, `minText`, and `maxText` replace them.
* A `step` the caller sets is a rule too, so `step: 0.5` refuses 0.25. With no `step` the arrows step by 1 and any typed number is allowed. `validate({ value, unit, base })` runs after the range.
* A `min` above `max` swaps the two. `unit` sets the first unit, the first in `units` by default.
* The labels default to "Value" and "Unit".
* `size` is `small`, `medium` (default), or `large`, and sizes its fields on the [size scale](design-tokens.md). `setSize(size)` changes it later.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createNumberUnitField`

<code>function createNumberUnitField(options: NumberUnitFieldOptions): NumberUnitFieldHandle</code>

A number input beside a unit select, such as 512 MB or 2 GB. The value is checked against min and max through the validation core, and a unit may carry a factor so the field can also report and take a base value.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `value` | <code>number &#124; string &#124; null</code> | first number [optional] |
| `unit` | <code>string</code> | first unit value (default the first unit) |
| `units` (required) | <code>Array&lt;string &#124; NumberUnit&gt;</code> | array of strings, or of { value, label, factor } where factor is how many base units one of this unit holds [required] |
| `min` | <code>number &#124; string</code> | lowest number allowed, and a min above max swaps the two [optional] |
| `max` | <code>number &#124; string</code> | highest number allowed [optional] |
| `step` | <code>number</code> | step of the number input, and a given step is also a rule, so 0.5 refuses 0.25 (default 1, which the arrows use and typing may leave) |
| `valueLabel` | <code>string</code> | aria-label of the number input (default 'Value') |
| `unitLabel` | <code>string</code> | aria-label of the unit select (default 'Unit') |
| `rangeText` | <code>string</code> | message for a number out of range, where {min} and {max} are filled in (default 'Enter a number from {min} to {max}.') |
| `minText` | <code>string</code> | message when only min is set (default 'Enter {min} or more.') |
| `maxText` | <code>string</code> | message when only max is set (default 'Enter {max} or less.') |
| `size` | <code>'small' &#124; 'medium' &#124; 'large'</code> | 'small', 'medium', or 'large' for its fields (default 'medium') |
| `validate` | <code>(value: NumberUnitValue): string &#124; null &#124; undefined</code> | function({ value, unit, base }) returning an error sentence, or an empty value when valid, after the range passes [optional] |
| `onChange` | <code>(value: NumberUnitValue): void</code> | function({ value, unit, base }) [optional] |

| Handle member | Type |
| :--- | :--- |
| `input` | <code>HTMLInputElement</code> |
| `select` | <code>HTMLSelectElement</code> |
| `getValue` | <code>(): NumberUnitValue</code> |
| `setValue` | <code>(next?: { value?: number &#124; string &#124; null; unit?: string; }): void</code> |
| `setBaseValue` | <code>(base: number): void</code> |
| `isValid` | <code>(): boolean</code> |
| `setSize` | <code>(size?: 'small' &#124; 'medium' &#124; 'large'): void</code> |
| `destroy` | <code>(): void</code> |

| Type | What it is |
| :--- | :--- |
| `NumberUnit` | One unit choice. factor is how many base units one of this unit holds. |
| `NumberUnitValue` | What getValue returns. value is null while the input is empty, and base is null with no factor. |

| Class | What it looks like |
| :--- | :--- |
| `base-number-unit-row` | A number input and a unit select side by side, with a message under them |

<!-- reference:end -->

## Example

<iframe class="base-preview" src="../../../assets/previews/number-unit-field.html" title="Number Unit Field example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "number-unit-field.html"
```
