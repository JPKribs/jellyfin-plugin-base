# Schedule Picker

A time of day and, optionally, days of the week as a group of toggle buttons. The value is plain data.

## When to Use

* Use it for a daily or weekly run time.

## When Not to Use

* Never use it for an interval such as every 5 minutes. Use a [Number Unit Field](number-unit-field.md) or a [Duration Field](duration-field.md).
* Use an [Access Schedule](access-schedule.md) for weekly windows with a start and an end, and a [Time Range Field](time-range-field.md) for one start and end.

## Usage

```js
import { createSchedulePicker } from './configurationpage?name=myplugin_jpkribs_shared.js';

var run = createSchedulePicker({ value: { time: '02:30', days: [1, 3, 5] }, onChange: function (value) { config.Schedule = value; } });
container.appendChild(run.element);
```

Classes: `base-schedule`, `base-schedule-days`. The handle is `{ element, getValue, setValue, setSize, isValid, destroy }`.

Parts: `base-schedule-time`.

## States and Modifiers

* The value is `{ time: "HH:mm", days: [0 to 6] }`, with 0 for Sunday. `getValue()` returns the days sorted from 0, and `time` is `''` while the input is empty.
* `showTime: false` and `showDays: false` hide a part. `weekStart: 1` starts the week on Monday.
* The days are the `base-toggle-group` of buttons, each with `aria-pressed`.
* `required` and `validate({ time, days })` check through the [validation core](field-message.md#validation), with the message under the picker. `isValid()` checks and shows it.
* The labels default to "Time", "Days", and "Sun" to "Sat". `timeLabel`, `daysLabel`, and `dayLabels` replace them. A `dayLabels` with fewer than seven labels falls back to the defaults.
* `setValue` keeps each whole number day from 0 to 6 once and ignores the rest.
* `size` is `small`, `medium` (default), or `large`, and sizes its fields on the [size scale](design-tokens.md). `setSize(size)` changes it later.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createSchedulePicker`

<code>function createSchedulePicker(options?: SchedulePickerOptions): SchedulePickerHandle</code>

A time of day and, optionally, days of the week as a group of toggle buttons. The value is plain data, a time as "HH:mm" and days as numbers from 0 for Sunday to 6 for Saturday.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `value` | <code>Partial&lt;SchedulePickerValue&gt; &#124; null</code> | { time: 'HH:mm', days: array of 0 to 6 } [optional] |
| `showTime` | <code>boolean</code> | false hides the time input (default true) |
| `showDays` | <code>boolean</code> | false hides the day toggles (default true) |
| `weekStart` | <code>number</code> | 0 starts the week on Sunday and 1 on Monday (default 0) |
| `timeLabel` | <code>string</code> | aria-label of the time input (default 'Time') |
| `daysLabel` | <code>string</code> | aria-label of the day group (default 'Days') |
| `dayLabels` | <code>string[]</code> | array of seven labels from Sunday (default 'Sun' to 'Sat', and a shorter array falls back to the default) |
| `size` | <code>'small' &#124; 'medium' &#124; 'large'</code> | 'small', 'medium', or 'large' for its fields (default 'medium') |
| `required` | <code>boolean</code> | true makes the time required, checked through the validation core (default false) |
| `validate` | <code>(value: SchedulePickerValue): string &#124; null &#124; undefined</code> | function({ time, days }) returning an error sentence, or an empty value when valid, shown under the time [optional] |
| `onChange` | <code>(value: SchedulePickerValue): void</code> | function({ time, days }) [optional] |

| Handle member | Type |
| :--- | :--- |
| `getValue` | <code>(): SchedulePickerValue</code> |
| `setValue` | <code>(next?: Partial&lt;SchedulePickerValue&gt; &#124; null): void</code> |
| `setSize` | <code>(size?: 'small' &#124; 'medium' &#124; 'large'): void</code> |
| `isValid` | <code>(): boolean</code> |
| `destroy` | <code>(): void</code> |

| Type | What it is |
| :--- | :--- |
| `SchedulePickerValue` | A time as "HH:mm", or '' while empty, and days as numbers from 0 for Sunday to 6 for Saturday. |

| Class | What it looks like |
| :--- | :--- |
| `base-schedule` | Time input and day toggles, side by side where there is room and stacked where there is not |

<!-- reference:end -->

## Used By

No plugin uses it today.

## Example

<iframe class="base-preview" src="../../../assets/previews/schedule-picker.html" title="Schedule Picker example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "schedule-picker.html"
```
