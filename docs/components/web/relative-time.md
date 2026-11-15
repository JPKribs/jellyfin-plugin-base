# Relative Time

A live time, such as "3 minutes ago" or "in 2 hours", with the full date as its title. Every live time on a page runs on one shared clock, which ticks only when a text is due to change, more slowly as a value ages, and stops when none is left on the page.

## Decision

| When | Use |
| :--- | :--- |
| A last sync, a last seen, or a next run | Relative Time |
| A wait that ends soon, such as a gathering window before a sync sends | `countdown: true` |
| A column in a [Data Table](data-table.md), or a [Filtered List](filtered-list.md) row | `renderRelative(key)`, as the column's `render` or in the row |
| A moment where the exact time matters more than how long ago it was | A plain date |

## Usage

```js
import { createRelativeTime, renderRelative, createDataTable } from './configurationpage?name=myplugin_jpkribs_shared.js';

var last = createRelativeTime({ value: status.LastSync });
view.querySelector('#lastSync').appendChild(last.element);

var gather = createRelativeTime({ countdown: true, ring: true, start: status.GatherStart, value: status.GatherEnd, onDone: refresh });

createDataTable({ columns: [{ key: 'name', label: 'Server' }, { key: 'seen', label: 'Last Seen', render: renderRelative('seen') }], rows: servers });
```

Classes: `base-relative-time`, with `countdown` and `done` modifiers, and the part `base-relative-time-text`. The handle is `{ element, getValue, setValue, destroy }`.

## States and Modifiers

* `value` is a Date, milliseconds, or a date string such as an ISO date. `setValue(value, start)` shows another one.
* The text comes from the browser's `Intl.RelativeTimeFormat` in the page's language, or `locale`. Under 45 seconds it reads "just now".
* The text sits in a `time` element with `datetime` set, and its `title` is the full date. `emptyText` shows when there is no moment.
* A countdown shows the time left as a clock, such as 1:28, and `doneText` ("Now") once it ends, when `onDone` runs once and `done` is added. `ring: true` with `start` adds a small pie [Progress Ring](progress-ring.md) that fills as the wait passes, named by `ringLabel` ("Time elapsed").
* `relativeText(diff, locale)`, `countdownText(ms)`, and `toDate(value)` give the same text and parsing without an element.

## Gotchas

* A live time left on the page keeps ticking. One that leaves the page drops off the clock at its next tick, and `destroy()` drops it at once.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createRelativeTime`

<code>function createRelativeTime(options?: RelativeTimeOptions): RelativeTimeHandle</code>

A live time, such as "3 minutes ago" or "in 2 minutes", with the full date as its title. Every live time on a page runs on one shared clock that ticks only when a text is due to change, more slowly as a value ages, and stops when none is left on the page. The countdown mode shows the time left as a clock, such as 4:05, with an optional progress ring from start to the moment, and calls onDone once when it reaches zero.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `value` | <code>RelativeTimeValue</code> | the moment, a Date, milliseconds, or a date string [optional] |
| `countdown` | <code>boolean</code> | true shows the time left as a clock (default false) |
| `start` | <code>RelativeTimeValue</code> | when the wait began, which the ring fills from [optional] |
| `ring` | <code>boolean</code> | true adds a small progress ring beside a countdown, which needs start (default false) |
| `doneText` | <code>string</code> | the text once a countdown reaches zero (default 'Now') |
| `emptyText` | <code>string</code> | the text with no moment (default '') |
| `ringLabel` | <code>string</code> | the ring's accessible name (default 'Time elapsed') |
| `locale` | <code>string</code> | the language of the text and the title (default the browser's) |
| `onDone` | <code>(): void</code> | function() called once when a countdown reaches zero [optional] |

| Handle member | Type |
| :--- | :--- |
| `getValue` | <code>(): Date &#124; null</code> |
| `setValue` | <code>(value: RelativeTimeValue, start?: RelativeTimeValue): void</code> |
| `destroy` | <code>(): void</code> |

### `renderRelative`

<code>function renderRelative&lt;T&gt;(pick: string &#124; ((row: T) =&gt; RelativeTimeValue), options?: RelativeTimeOptions): (row: T) =&gt; HTMLElement</code>

A render function for a Data Table column or a Filtered List that draws a live relative time from each row.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `value` | <code>RelativeTimeValue</code> |  |
| `countdown` | <code>boolean</code> |  |
| `start` | <code>RelativeTimeValue</code> |  |
| `ring` | <code>boolean</code> |  |
| `doneText` | <code>string</code> |  |
| `emptyText` | <code>string</code> |  |
| `ringLabel` | <code>string</code> |  |
| `locale` | <code>string</code> |  |
| `onDone` | <code>(): void</code> |  |

| Type | What it is |
| :--- | :--- |
| `RelativeTimeValue` | A moment a relative time shows: a Date, milliseconds since 1970, or a date string such as an ISO date. |

| Class | What it looks like |
| :--- | :--- |
| `base-relative-time` | A live time, such as "3 minutes ago", with its full date as the title, in even width digits |
| `base-relative-time.countdown` | A countdown, a clock of the time left with an optional small ring that fills as the wait passes |

<!-- reference:end -->

## Example

<iframe class="base-preview" src="../../../assets/previews/relative-time.html" title="Relative Time example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "relative-time.html"
```
