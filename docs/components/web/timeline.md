# Timeline

A vertical list of events, each with a colored marker, a time, a title, and an optional body.

## When to Use

* Use it for a short feed of what happened and when.

## When Not to Use

* Never use it for a long history. Use a [Paginated Table](paginated-table.md).

## Usage

```js
import { createTimeline } from './configurationpage?name=myplugin_jpkribs_shared.js';

container.appendChild(createTimeline({
    items: [{ time: '10:04', title: 'Library synced', body: '1,204 items.', status: 'green' }]
}).element);
```

Classes: `base-timeline`, `base-timeline-item`, `base-timeline-marker`. The handle is `{ element, getValue, setValue, setItems, setHeight, destroy }`.

Parts: `base-timeline-body`, `base-timeline-empty`, `base-timeline-text`, `base-timeline-time`, `base-timeline-title`, `base-timeline-wrap`.

## States and Modifiers

* An item is `{ time, datetime, title, body, pre, status, icon }`. `pre` is a block of mono text kept as written, such as a log or a stack trace, under the body, as `base-timeline-pre`. `status` is a status color name that colors the marker, and `icon` is a Material icon name, an icon for the status by default.
* A `datetime` makes the time a `time` element.
* A status also shows an icon in its marker and a hidden label, so the status never rests on color alone. `statusLabels` maps a status color name to the hidden label, such as `{ green: 'Done' }`.
* `emptyText` is a sentence shown while there are no events. It is the List's empty sentence, `base-list-empty outside base-timeline-empty`, after the events, and nothing shows without it.
* The events are a [List](list.md), so `height`, `maxHeight`, `minHeight`, and `setHeight` work as they do there. `height` is `'auto'` by default, so the timeline grows with its events.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createTimeline`

<code>function createTimeline(options?: TimelineOptions): TimelineHandle</code>

A vertical list of events, each with a colored marker, a time, a title, and an optional body. A status also shows an icon in its marker and a hidden label, so the status never rests on color alone.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `items` | <code>TimelineItem[]</code> | array of { time, datetime, title, body, pre, status, icon } where pre is mono text kept as written, under the body, and status is a status color name such as 'green', and icon is a Material icon name (default an icon for the status) [optional] |
| `emptyText` | <code>string</code> | sentence shown while there are no events [optional] |
| `statusLabels` | <code>Record&lt;string, string&gt;</code> | map of status color name to the hidden label a screen reader reads, such as { green: 'Done' } (default a word for each color) [optional] |
| `height` | <code>ListHeight</code> | the list's height, 'auto', 'fill', a number of pixels, or a CSS length (default 'auto') |
| `maxHeight` | <code>number &#124; string &#124; null</code> | the most the list grows to before it scrolls [optional] |
| `minHeight` | <code>number &#124; string &#124; null</code> | the least a filling list takes (default 160px) [optional] |

| Handle member | Type |
| :--- | :--- |
| `getValue` | <code>(): TimelineItem[]</code> |
| `setValue` | <code>(next: TimelineItem[]): void</code> |
| `setItems` | <code>(next: TimelineItem[]): void</code> |
| `setHeight` | <code>(height: ListHeight, maxHeight?: number &#124; string &#124; null): void</code> |
| `destroy` | <code>(): void</code> |

| Type | What it is |
| :--- | :--- |
| `TimelineItem` | One event on a timeline. status is a status color name, icon a Material icon name, and pre a block of mono text kept as written, such as a log or a stack trace. |

| Class | What it looks like |
| :--- | :--- |
| `base-timeline` | Vertical list of events joined by a line, each with a colored marker |
| `base-timeline-marker` | Round marker in the status color, with an optional icon in it |
| `base-timeline-pre` | A block of mono text kept as written under an event's body, such as a log or a stack trace, which scrolls sideways inside itself |

<!-- reference:end -->

## Used By

No plugin uses it today.

## Example

<iframe class="base-preview" src="../../../assets/previews/timeline.html" title="Timeline example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "timeline.html"
```
