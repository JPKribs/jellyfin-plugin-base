# Duration Field

Hours, minutes, and seconds number boxes on one line, each with Base's up and down arrows and its unit inside the box, like the [Color Picker](color-picker.md)'s percent. It is built on the [Field Adornments](field-adornments.md) number box and checks through the validation core.

## When to Use

* Use it for a length of time a plugin stores in seconds, such as a timeout or an interval.

## When Not to Use

* Never use it for a size or a count with a unit to choose. Use the [Number Unit Field](number-unit-field.md).
* Never use it for a time of day. Use a time input, a [Time Range Field](time-range-field.md), or a [Schedule Picker](schedule-picker.md).

## Usage

```js
import { createDurationField } from './configurationpage?name=myplugin_jpkribs_shared.js';

var timeout = createDurationField({ value: config.TimeoutSeconds, units: ['m', 's'], min: 5, max: 3600 });
view.querySelector('#timeoutHost').appendChild(timeout.element);
```

Classes: `base-duration`, `base-duration-row`. The handle is `{ element, inputs, getValue, setValue, isValid, setSize, destroy }`, and `getValue()` returns the duration in seconds, or `null` while every box is empty.

## States and Modifiers

* `units` picks the boxes, largest first, such as `['h', 'm']` (default `['h', 'm', 's']`). `unitText` replaces the unit inside a box and `unitLabels` its name, "Hours", "Minutes", and "Seconds" by default.
* The largest box holds any count, and each smaller one 0 to 59. `setValue` rounds to the smallest unit shown.
* `min` and `max` are in seconds, and their message names them as durations, such as "Enter a duration from 1m to 2h.". `rangeText`, `minText`, and `maxText` replace it.
* `required` and `validate(seconds)` check through the core. One message under the boxes speaks for all of them.
* `durationText(seconds, units, text)` writes a duration the way the messages do, such as 5400 as "1h 30m". The bag's `formatDuration` writes a clock style time such as "1:30" instead.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `durationText`

<code>function durationText(seconds: number, units?: DurationUnit[], text?: Partial&lt;Record&lt;DurationUnit, string&gt;&gt;): string</code>

Writes seconds as a short duration in the given units, such as 5400 as '1h 30m'. The smallest unit takes what is left, rounded.

### `createDurationField`

<code>function createDurationField(options?: DurationFieldOptions): DurationFieldHandle</code>

Hours, minutes, and seconds number boxes on one line, each with Base's up and down arrows and its unit inside the box, like the color picker's percent. The value is in seconds. Each box and the whole duration check through the validation core, so a minute of 75 or a duration past max shows the message under the boxes.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `value` | <code>number &#124; null</code> | the duration in seconds [optional] |
| `units` | <code>DurationUnit[]</code> | the boxes to show, such as ['h', 'm'] (default ['h', 'm', 's']) |
| `unitText` | <code>Partial&lt;Record&lt;DurationUnit, string&gt;&gt;</code> | the unit shown inside each box, by unit (default 'h', 'm', and 's') |
| `unitLabels` | <code>Partial&lt;Record&lt;DurationUnit, string&gt;&gt;</code> | the aria-label of each box, by unit (default 'Hours', 'Minutes', and 'Seconds') |
| `min` | <code>number</code> | the shortest duration allowed, in seconds [optional] |
| `max` | <code>number</code> | the longest duration allowed, in seconds [optional] |
| `required` | <code>boolean</code> | true requires a duration (default false) |
| `rangeText` | <code>string</code> | message for a duration outside min and max, with {min} and {max} as durations (default 'Enter a duration from {min} to {max}.') |
| `minText` | <code>string</code> | message when only min is set (default 'Enter {min} or more.') |
| `maxText` | <code>string</code> | message when only max is set (default 'Enter {max} or less.') |
| `size` | <code>'small' &#124; 'medium' &#124; 'large'</code> | 'small', 'medium', or 'large' for its fields (default 'medium') |
| `validate` | <code>(seconds: number &#124; null): string &#124; null &#124; undefined</code> | function(seconds) returning an error sentence, or an empty value when valid, after the range passes [optional] |
| `onChange` | <code>(seconds: number &#124; null): void</code> | function(seconds) after each change, with null while every box is empty [optional] |

| Handle member | Type |
| :--- | :--- |
| `inputs` | <code>HTMLInputElement[]</code> |
| `getValue` | <code>(): number &#124; null</code> |
| `setValue` | <code>(seconds: number &#124; null &#124; undefined): void</code> |
| `isValid` | <code>(): boolean</code> |
| `setSize` | <code>(size?: 'small' &#124; 'medium' &#124; 'large'): void</code> |
| `destroy` | <code>(): void</code> |

| Type | What it is |
| :--- | :--- |
| `DurationUnit` | One unit of a duration: hours, minutes, or seconds. |

| Class | What it looks like |
| :--- | :--- |
| `base-duration` | Hours, minutes, and seconds number boxes on one line, each with its unit inside before its arrows, and the message under them |

<!-- reference:end -->

## Used By

No plugin uses it today.

## Example

<iframe class="base-preview" src="../../../assets/previews/duration-field.html" title="Duration Field example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "duration-field.html"
```
