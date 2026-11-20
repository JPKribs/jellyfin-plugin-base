# Access Schedule

A list of time windows, each a day choice and a start and end time, with Add and Remove, like the access schedule in Jellyfin's parental control. The value is Jellyfin's own `AccessSchedule` shape, so a plugin can pass it straight through.

## Decision

| When | Use |
| :--- | :--- |
| The times a user or a group may sign in or stream | Access Schedule |
| Any list of weekly windows that Jellyfin stores as `AccessSchedule` | Access Schedule |
| One run time on chosen days | [Schedule Picker](schedule-picker.md) |
| An interval, such as every 5 minutes | [Number Unit Field](number-unit-field.md) |

## Usage

```js
import { createAccessSchedule } from './configurationpage?name=myplugin_jpkribs_shared.js';

var schedule = createAccessSchedule({
    label: 'Access Schedule',
    value: group.AccessSchedules,
    onChange: function (windows) { group.AccessSchedules = windows; }
});
container.appendChild(schedule.element);
if (!schedule.isValid()) { return; }
```

Classes: `base-access-schedule`, `base-access-schedule-head`, `base-access-schedule-row`. The handle is `{ element, getValue, setValue, isValid, setHeight, destroy }`.

Parts: `base-access-schedule-label`, `base-access-schedule-description`, `base-access-schedule-rows`, `base-access-schedule-fields`, `base-access-schedule-day`, `base-access-schedule-range`, `base-access-schedule-start`, `base-access-schedule-end`, `base-access-schedule-remove`, `base-access-schedule-empty`, `base-access-schedule-add`.

## States and Modifiers

* A window is `{ DayOfWeek, StartHour, EndHour }`. `DayOfWeek` is "Sunday" to "Saturday", "Everyday", "Weekday", or "Weekend". The hours run from 0 to 24 in steps of `step`, which is 0.5 by default, so 0.5 is 12:30 AM and 24 is midnight at the end of the day.
* `label` names the group through `aria-labelledby`, and `description` describes it through `aria-describedby`. Each hides while it is empty.
* `getValue()` returns every row, valid or not. `isValid()` checks every row, shows its error, and returns `true` when every end is after its start.
* The start and end are a [Time Range Field](time-range-field.md), two time boxes with the clock icon. A typed time moves to the nearest `step`, an end of 00:00 is 24, and a loaded hour off the step reads back exactly until it is edited.
* An end at or before its start marks the row with `error` and shows "The end must be after the start." under the times, with `aria-invalid` on both boxes.
* The remove label names the hours as the user's locale time, such as "1:30 AM", and as "01:30" where the locale form is not available.
* Add appends an Every day window from midnight to midnight and focuses its day.
* The empty sentence is the List's, `base-list-empty outside`, under the rows.
* `maxRows` disables Add at that count and shows `limitText`, "No more rows can be added.". `height`, `maxHeight`, and `minHeight` size the rows as a [List](list.md) takes them, `'auto'` by default, and `setHeight(height, maxHeight)` changes them later.
* The labels default to "Day", "Start", "End", "Add window", and "No windows. Access is allowed at any time.". The days default to "Sunday" to "Saturday", "Every day", "Weekdays", and "Weekends", and `dayLabels` replaces any of them by key, such as `{ Everyday: 'Daily' }`.
* `removeText` is "Remove {value}", where the value is the window from `windowText`, "{day} {start} to {end}".
* At 600px and below the column labels hide, the day takes the first line, and the times share the second.
* `size` is `small`, `medium` (default), or `large`, and sizes its fields on the [size scale](design-tokens.md).

## Gotchas

* `setValue` reads an enum number from 0 for Sunday to 9 for Weekend and a day name in any case. An unknown day reads as "Everyday", and an hour outside 0 to 24 is clamped.
* `setValue` does not call `onChange`.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createAccessSchedule`

<code>function createAccessSchedule(options?: AccessScheduleOptions): AccessScheduleHandle</code>

A list of time windows, each a day choice and a start and end time, with Add and Remove, like Jellyfin's parental control access schedule. The value is Jellyfin's AccessSchedule shape, so a plugin can pass it straight through. The start and end are a Time Range Field, so each is a time box with its clock icon, and an end of 00:00 is midnight at the end of the day.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `value` | <code>AccessScheduleSource[] &#124; null</code> | array of { DayOfWeek, StartHour, EndHour } [optional] |
| `label` | <code>string</code> | heading above the list [optional] |
| `description` | <code>string</code> | sentence under the heading, which describes the group [optional] |
| `dayLabel` | <code>string</code> | column label and aria-label of the day selects (default 'Day') |
| `startLabel` | <code>string</code> | column label and aria-label of the start boxes (default 'Start') |
| `endLabel` | <code>string</code> | column label and aria-label of the end boxes (default 'End') |
| `addText` | <code>string</code> | text of the add button (default 'Add window') |
| `removeText` | <code>string</code> | aria-label of a remove button, where {value} is the window from windowText (default 'Remove {value}') |
| `windowText` | <code>string</code> | name of a window, with {day}, {start}, and {end} (default '{day} {start} to {end}') |
| `emptyText` | <code>string</code> | sentence shown while there is no window (default 'No windows. Access is allowed at any time.') |
| `endBeforeStartText` | <code>string</code> | message for an end at or before the start (default 'The end must be after the start.') |
| `dayLabels` | <code>Partial&lt;Record&lt;AccessScheduleDay, string&gt;&gt;</code> | object that replaces day names by DayOfWeek key, such as { Everyday: 'Daily' } [optional] |
| `step` | <code>number</code> | hours between allowed times, where a typed time moves to the nearest one (default 0.5) |
| `maxRows` | <code>number</code> | most windows allowed, after which Add is disabled and the limit message shows [optional] |
| `limitText` | <code>string</code> | message when maxRows is reached (default 'No more rows can be added.') |
| `height` | <code>ListHeight</code> | height of the rows, as createList takes it (default 'auto') |
| `maxHeight` | <code>number &#124; string &#124; null</code> | height past which the rows scroll [optional] |
| `minHeight` | <code>number &#124; string &#124; null</code> | least height of a filling list [optional] |
| `size` | <code>'small' &#124; 'medium' &#124; 'large'</code> | 'small', 'medium', or 'large' for its fields (default 'medium') |
| `onChange` | <code>(value: AccessScheduleWindow[]): void</code> | function(windows) [optional] |

| Handle member | Type |
| :--- | :--- |
| `getValue` | <code>(): AccessScheduleWindow[]</code> |
| `setValue` | <code>(next: AccessScheduleSource[] &#124; null): void</code> |
| `isValid` | <code>(): boolean</code> |
| `setHeight` | <code>(height: ListHeight, maxHeight?: number &#124; string &#124; null): void</code> |
| `destroy` | <code>(): void</code> |

| Type | What it is |
| :--- | :--- |
| `AccessScheduleDay` | A day choice of a window, as Jellyfin's DynamicDayOfWeek names it. |
| `AccessScheduleWindow` | One time window in Jellyfin's AccessSchedule shape. The hours run from 0 to 24, where 0.5 is 12:30 AM and 24 is midnight at the end of the day. |
| `AccessScheduleSource` | A window to load. DayOfWeek may also be the enum number from 0 for Sunday to 9 for Weekend, and an hour may be a numeric string. |

| Class | What it looks like |
| :--- | :--- |
| `base-access-schedule` | List of time windows with a heading, column labels, rows of day, start, and end selects, and an add button |
| `base-access-schedule-label` | Heading and the sentence under it |
| `base-access-schedule-head` | Column labels over the day, start, and end columns |
| `base-access-schedule-rows` | Rows of windows, each with its day select, its start and end time boxes, and its remove button, with the times' message under them |

<!-- reference:end -->

## Example

<iframe class="base-preview" src="../../../assets/previews/access-schedule.html" title="Access Schedule example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "access-schedule.html"
```
