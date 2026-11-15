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

Classes: `jpk-timeline`, `jpk-timeline-item`, `jpk-timeline-marker`. The handle is `{ element, getValue, setValue, setItems, destroy }`.

Parts: `jpk-timeline-body`, `jpk-timeline-empty`, `jpk-timeline-text`, `jpk-timeline-time`, `jpk-timeline-title`, `jpk-timeline-wrap`.

## States and Modifiers

* An item is `{ time, datetime, title, body, status, icon }`. `status` is a status color name that colors the marker, and `icon` is a Material icon name.
* A `datetime` makes the time a `time` element.
* A status also shows an icon in its marker and a hidden label, so the status never rests on color alone. `statusLabels` maps a status color name to the hidden label, such as `{ green: 'Done' }`.
* `emptyText` is a sentence shown while there are no events.

## Used By

No plugin uses it today. Server Sync and Scripts list history as table rows and could adopt it for a short feed.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/timeline.html" title="Timeline example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "timeline.html"
```
