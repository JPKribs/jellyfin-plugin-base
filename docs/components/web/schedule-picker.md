# Schedule Picker

A time of day and, optionally, days of the week as a group of toggle buttons. The value is plain data.

## When to Use

* Use it for a daily or weekly run time.

## When Not to Use

* Never use it for an interval such as every 5 minutes. Use a [Number Unit Field](number-unit-field.md).

## Usage

```js
import { createSchedulePicker } from './configurationpage?name=myplugin_jpkribs_shared.js';

var run = createSchedulePicker({ value: { time: '02:30', days: [1, 3, 5] }, onChange: function (value) { config.Schedule = value; } });
container.appendChild(run.element);
```

Classes: `jpk-schedule`, `jpk-schedule-days`. The handle is `{ element, getValue, setValue, destroy }`.

Parts: `jpk-schedule-time`.

## States and Modifiers

* The value is `{ time: "HH:mm", days: [0 to 6] }`, with 0 for Sunday. `getValue()` returns the days sorted from 0, and `time` is `''` while the input is empty.
* `showTime: false` and `showDays: false` hide a part. `weekStart: 1` starts the week on Monday.
* The days are the `jpk-toggle-group` of buttons, each with `aria-pressed`.
* The labels default to "Time", "Days", and "Sun" to "Sat". `timeLabel`, `daysLabel`, and `dayLabels` replace them.

## Used By

No plugin uses it today. Live Channels (start and end times), User Management (schedule rows with a day), and Scripts (day of week) build these by hand.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/schedule-picker.html" title="Schedule Picker example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "schedule-picker.html"
```
