# Log Viewer

A scrolling mono output area with a toolbar. Lines are appended, colored by level, bounded to `maxLines`, and scrolled into view while Auto Scroll is on.

## When to Use

* Use it for a session log or the output of a run.

## When Not to Use

* Never use it for a long history. Use a [Paginated Table](paginated-table.md).

## Usage

```js
import { createLogViewer } from './configurationpage?name=myplugin_jpkribs_shared.js';

var log = createLogViewer({ maxLines: 500 });
container.appendChild(log.element);
log.append({ text: 'Started', level: 'info' });
```

Classes: `jpk-log`, `jpk-log-output`, `jpk-log-line`. The handle is `{ element, output, append, clear, getValue, setValue, setAutoScroll, copyAll, destroy }`.

Parts: `jpk-log-empty`, `jpk-log-time`, `jpk-log-toggle`, `jpk-log-toolbar`.

## States and Modifiers

* `append` takes one line or an array. A line is a string or `{ text, level, time }`, where `level` is `debug`, `info`, `warn`, or `error`.
* `maxLines` is 500 by default, and the oldest lines go first.
* Scrolling up turns Auto Scroll off. `autoScroll` sets the first state.
* The toolbar has the "Auto Scroll" toggle and the "Clear" and "Copy All" buttons. `toolbar: false` hides it. `emptyText` is "No output yet." by default.
* The output is `role="log"` with `aria-live="off"`, so a stream does not flood a screen reader, and it takes focus for keyboard scrolling. Copy All uses `copyToClipboard`.

## Used By

No plugin uses it today. Live Channels shows a session log in a dialog, and Scripts shows run output.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/log-viewer.html" title="Log Viewer example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "log-viewer.html"
```
