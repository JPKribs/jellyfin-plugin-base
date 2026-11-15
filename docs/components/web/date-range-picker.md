# Date Range Picker

Two date boxes, from and to, each with the date field's calendar icon inside, under a row of preset pills: Today, Last 7 Days, Last 30 Days, and Custom. The pills are [Pill Group](pill-group.md) pills on the pressed group core, the boxes come from the [Field Adornments](field-adornments.md), and the range checks through the validation core.

## Decision

| When | Use |
| :--- | :--- |
| Picking a range of days, such as for a report or a history | Date Range Picker. |
| A [Filtered List](filtered-list.md) filter of kind `daterange` | Date Range Picker. The Filtered List uses it for this filter. |
| One day | A date input, which Base adorns. |
| Times within a day | [Time Range Field](time-range-field.md). |

## Usage

```js
import { createDateRangePicker } from './configurationpage?name=myplugin_jpkribs_shared.js';

var range = createDateRangePicker({ onChange: function (value) { loadHistory(value.from, value.to); } });
view.querySelector('#rangeHost').appendChild(range.element);
```

Classes: `base-date-range`, `base-date-range-presets`, `base-date-range-row`, `base-date-range-from`, `base-date-range-to`. The handle is `{ element, from, to, getValue, setValue, getPreset, isValid, setSize, destroy }`, and `getValue()` returns `{ from, to }` as `'YYYY-MM-DD'`, with `''` for an open side.

## States and Modifiers

* A preset fills both dates, counting back from today. A second click on it clears them, and typing dates presses the matching preset, or Custom.
* `presets` replaces the pills with `[{ value, label, days }]`, where `days` counts back from today and no `days` is Custom. `[]` hides the row. The default list is `DATE_RANGE_PRESETS`. `getPreset()` returns the pressed preset's value, or `null`.
* `setValue` presses the matching preset and does not call `onChange`.
* An end before the start shows "End must be on or after the start.". `required` requires both dates, and it, `min`, `max`, and `validate({ from, to })` check through the core.
* `today` sets the day the presets count from, the local date by default.
* The labels default to "From", "To", and "Range" for the preset group. `fromLabel`, `toLabel`, and `presetsLabel` replace them.
* `dateKey(value)` reads any date as its local day, and `shiftDays(day, n)` moves a day.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `DATE_RANGE_PRESETS`

<code>var DATE_RANGE_PRESETS: DateRangePreset[]</code>

The presets a date range picker shows by default.

### `dateKey`

<code>function dateKey(value: unknown): string</code>

Reads a date as the local day it falls on, as 'YYYY-MM-DD'. A 'YYYY-MM-DD' text stays as it is, and a Date, a time in milliseconds, or an ISO text with a time reads in the local time zone.

### `shiftDays`

<code>function shiftDays(day: string, days: number): string</code>

Moves a day by a number of days, such as '2026-03-01' back one to '2026-02-28'.

### `createDateRangePicker`

<code>function createDateRangePicker(options?: DateRangePickerOptions): DateRangePickerHandle</code>

Two date boxes, from and to, each with the date field's calendar icon inside, under a row of preset pills on the pressed group: Today, Last 7 Days, Last 30 Days, and Custom by default. A preset fills both dates, a second click on it clears them, and typing dates presses the matching preset, or Custom. An end before the start is an error through the validation core.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `value` | <code>Partial&lt;DateRangeValue&gt; &#124; null</code> | { from, to } as 'YYYY-MM-DD' [optional] |
| `presets` | <code>DateRangePreset[] &#124; null</code> | array of { value, label, days }, where days counts back from today and no days is Custom, or [] for none (default Today, Last 7 Days, Last 30 Days, and Custom) |
| `today` | <code>string</code> | the day presets count back from, as 'YYYY-MM-DD' (default the local date) |
| `min` | <code>string</code> | the earliest day allowed [optional] |
| `max` | <code>string</code> | the latest day allowed [optional] |
| `required` | <code>boolean</code> | true requires both dates (default false) |
| `fromLabel` | <code>string</code> | aria-label of the from box (default 'From') |
| `toLabel` | <code>string</code> | aria-label of the to box (default 'To') |
| `presetsLabel` | <code>string</code> | aria-label of the preset group (default 'Range') |
| `endBeforeStartText` | <code>string</code> | message for an end before the start (default 'End must be on or after the start.') |
| `size` | <code>'small' &#124; 'medium' &#124; 'large'</code> | 'small', 'medium', or 'large' for its fields (default 'medium') |
| `validate` | <code>(value: DateRangeValue): string &#124; null &#124; undefined</code> | function({ from, to }) returning an error sentence, or an empty value when valid [optional] |
| `onChange` | <code>(value: DateRangeValue): void</code> | function({ from, to }) after each change [optional] |

| Handle member | Type |
| :--- | :--- |
| `from` | <code>HTMLInputElement</code> |
| `to` | <code>HTMLInputElement</code> |
| `getValue` | <code>(): DateRangeValue</code> |
| `setValue` | <code>(next?: Partial&lt;DateRangeValue&gt; &#124; null): void</code> |
| `getPreset` | <code>(): string &#124; null</code> |
| `isValid` | <code>(): boolean</code> |
| `setSize` | <code>(size?: 'small' &#124; 'medium' &#124; 'large'): void</code> |
| `destroy` | <code>(): void</code> |

| Type | What it is |
| :--- | :--- |
| `DateRangeValue` | A range of days, each as 'YYYY-MM-DD', or '' while open on that side. |
| `DateRangePreset` | One preset pill. days sets the range to that many days ending today, so 1 is today, and no days is Custom, which leaves the dates to the reader. |

| Class | What it looks like |
| :--- | :--- |
| `base-date-range` | Preset pills over a from and a to date box, each with the calendar icon inside, and the range's message under them |

<!-- reference:end -->

## Example

<iframe class="base-preview" src="../../../assets/previews/date-range-picker.html" title="Date Range Picker example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "date-range-picker.html"
```
