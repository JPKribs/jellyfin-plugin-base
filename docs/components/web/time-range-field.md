# Time Range Field

Two time boxes, a start and an end, each with the time field's clock icon inside. It is built on the [Field Adornments](field-adornments.md) time box and checks through the validation core, with its message from the [Field Message](field-message.md).

## Decision

| When | Use |
| :--- | :--- |
| A window within a day, such as quiet hours or an access window | Time Range Field |
| A single time | A time input, which Base adorns |
| A range of days | [Date Range Picker](date-range-picker.md) |
| A length of time | [Duration Field](duration-field.md) |
| Several windows on chosen days | [Access Schedule](access-schedule.md) |

## Usage

```js
import { createTimeRangeField, toHours, fromHours } from './configurationpage?name=myplugin_jpkribs_shared.js';

var quiet = createTimeRangeField({ value: { start: fromHours(config.QuietStart), end: fromHours(config.QuietEnd) }, step: 15 });
view.querySelector('#quietHost').appendChild(quiet.element);
// On save: toHours(quiet.getValue().start), toHours(quiet.getValue().end, true)
```

Classes: `base-time-range`, `base-time-range-row`, `base-time-range-start`, `base-time-range-end`. The handle is `{ element, start, end, getValue, setValue, isValid, setSize, destroy }`, and `getValue()` returns `{ start, end }` as `'HH:MM'`.

## States and Modifiers

* `step` is in minutes (default 30). A typed time moves to the nearest allowed one, and `setValue` keeps a time off the step as it is.
* Without `allowOvernight`, an end at or before the start shows "End must be after the start.". An end of `00:00` is midnight at the end of the day, so 22:00 to 00:00 is valid.
* `required` requires both times. It and `validate({ start, end })` check through the core, and `isValid()` checks both times and shows the message. `endBeforeStartText`, `startLabel`, and `endLabel` replace the defaults.
* `toHours(time, end)` reads Jellyfin's decimal hours, with `00:00` as 24 when `end` is true, and `fromHours(hours)` writes them back. `snapTime(time, step)` is the snap the field uses.
* The [Access Schedule](access-schedule.md) builds each window's times on it.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `toHours`

<code>function toHours(time: string, end?: boolean): number &#124; null</code>

Reads a time as decimal hours, as Jellyfin stores an access schedule, such as '09:30' as 9.5. With end, '00:00' reads as 24, midnight at the end of the day.

### `fromHours`

<code>function fromHours(hours: number): string</code>

Writes decimal hours as a time, such as 9.5 as '09:30'. 24 is midnight, '00:00', and an hour outside 0 to 24 is clamped.

### `snapTime`

<code>function snapTime(time: string, step: number): string</code>

Moves a time to the nearest one a step of minutes allows, counted from midnight, such as '09:20' to '09:30' with a step of 30.

### `createTimeRangeField`

<code>function createTimeRangeField(options?: TimeRangeFieldOptions): TimeRangeFieldHandle</code>

Two time boxes, a start and an end, each with the time field's clock icon inside. A typed time moves to the nearest one the step allows, and without allowOvernight an end at or before the start is an error, through the validation core. An end of '00:00' is midnight at the end of the day, so 22:00 to 00:00 is valid. toHours and fromHours convert to and from Jellyfin's decimal hours.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `value` | <code>Partial&lt;TimeRangeValue&gt; &#124; null</code> | { start, end } as 'HH:MM' [optional] |
| `step` | <code>number</code> | minutes between allowed times (default 30) |
| `allowOvernight` | <code>boolean</code> | true lets the end come before the start, for a range that runs past midnight (default false) |
| `required` | <code>boolean</code> | true requires both times (default false) |
| `startLabel` | <code>string</code> | aria-label of the start box (default 'Start') |
| `endLabel` | <code>string</code> | aria-label of the end box (default 'End') |
| `endBeforeStartText` | <code>string</code> | message for an end at or before the start (default 'The end must be after the start.') |
| `size` | <code>'small' &#124; 'medium' &#124; 'large'</code> | 'small', 'medium', or 'large' for its fields (default 'medium') |
| `validate` | <code>(value: TimeRangeValue): string &#124; null &#124; undefined</code> | function({ start, end }) returning an error sentence, or an empty value when valid [optional] |
| `onChange` | <code>(value: TimeRangeValue): void</code> | function({ start, end }) [optional] |

| Handle member | Type |
| :--- | :--- |
| `start` | <code>HTMLInputElement</code> |
| `end` | <code>HTMLInputElement</code> |
| `getValue` | <code>(): TimeRangeValue</code> |
| `setValue` | <code>(next?: Partial&lt;TimeRangeValue&gt; &#124; null): void</code> |
| `isValid` | <code>(): boolean</code> |
| `setSize` | <code>(size?: 'small' &#124; 'medium' &#124; 'large'): void</code> |
| `destroy` | <code>(): void</code> |

| Type | What it is |
| :--- | :--- |
| `TimeRangeValue` | A start and an end time, each as 'HH:MM', or '' while empty. |

| Class | What it looks like |
| :--- | :--- |
| `base-time-range` | A start and an end time side by side, each with the clock icon inside its box, and the range's message under them |

<!-- reference:end -->

## Example

<iframe class="base-preview" src="../../../assets/previews/time-range-field.html" title="Time Range Field example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "time-range-field.html"
```
