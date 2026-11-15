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

Classes: `base-log`, `base-log-output`, `base-log-line`. The handle is `{ element, output, append, clear, getValue, setValue, setAutoScroll, setHeight, copyAll, destroy }`.

Parts: `base-log-empty`, `base-log-time`, `base-log-toggle`, `base-log-toolbar`.

## States and Modifiers

* `lines` sets the first lines. `append` takes one line or an array. A line is a string or `{ text, level, time }`, where `level` is `debug`, `info`, `warn`, or `error`.
* `maxLines` is 500 by default, and the oldest lines go first.
* The output is a [List](list.md), so `height`, `maxHeight`, `minHeight`, and `setHeight` work as they do there. `height` is 280 by default, and `'fill'` lets a log take the rest of the page.
* Scrolling up turns Auto Scroll off. `autoScroll` sets the first state.
* The toolbar has the "Auto Scroll" toggle and the "Clear" and "Copy All" buttons. `toolbar: false` hides it. `autoScrollText`, `clearText`, `copyText`, `copiedText` ("Copied."), and `failedText` ("Copy failed.") replace the labels, and `onClear` runs after Clear. `emptyText` is "No output yet." by default, and shows in the output as the List's empty sentence.
* The output is `role="log"` with `aria-live="off"`, so a stream does not flood a screen reader. `label` ("Log") names it, and it takes focus for keyboard scrolling. Copy All uses `copyToClipboard`.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createLogViewer`

<code>function createLogViewer(options?: LogViewerOptions): LogViewerHandle</code>

A scrolling mono output area with a toolbar. Lines are appended, colored by level, bounded to maxLines, and scrolled into view while Auto Scroll is on. Scrolling up turns Auto Scroll off.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `lines` | <code>LogLineInput[]</code> | array of strings or { text, level, time } where level is debug, info, warn, or error [optional] |
| `maxLines` | <code>number</code> | most lines kept, where the oldest go first (default 500) |
| `autoScroll` | <code>boolean</code> | true follows new lines (default true) |
| `label` | <code>string</code> | aria-label of the output (default 'Log') |
| `autoScrollText` | <code>string</code> | label of the toggle (default 'Auto Scroll') |
| `clearText` | <code>string</code> | text of the clear button (default 'Clear') |
| `copyText` | <code>string</code> | text of the copy button (default 'Copy All') |
| `copiedText` | <code>string</code> | feedback after a copy (default 'Copied.') |
| `failedText` | <code>string</code> | feedback when the copy failed (default 'Copy failed.') |
| `emptyText` | <code>string</code> | sentence shown while there are no lines (default 'No output yet.') |
| `toolbar` | <code>boolean</code> | false hides the toolbar (default true) |
| `height` | <code>ListHeight</code> | the output's height, 'auto', 'fill', a number of pixels, or a CSS length (default 280) |
| `maxHeight` | <code>number &#124; string &#124; null</code> | the most the output grows to before it scrolls [optional] |
| `minHeight` | <code>number &#124; string &#124; null</code> | the least a filling output takes (default 160px) [optional] |
| `onClear` | <code>(): void</code> | function() called after Clear is pressed [optional] |

| Handle member | Type |
| :--- | :--- |
| `output` | <code>HTMLDivElement</code> |
| `append` | <code>(next: LogLineInput &#124; LogLineInput[]): void</code> |
| `clear` | <code>(): void</code> |
| `getValue` | <code>(): LogLine[]</code> |
| `setValue` | <code>(next: LogLineInput[]): void</code> |
| `setAutoScroll` | <code>(on: boolean): void</code> |
| `setHeight` | <code>(height: ListHeight, maxHeight?: number &#124; string &#124; null): void</code> |
| `copyAll` | <code>(): Promise&lt;boolean&gt;</code> |
| `destroy` | <code>(): void</code> |

| Type | What it is |
| :--- | :--- |
| `LogLine` | One line as the log viewer keeps it. level is debug, info, warn, or error. |
| `LogLineInput` | A line that append takes, as plain text or as an object with a text, a level, and a time. |

| Class | What it looks like |
| :--- | :--- |
| `base-log` | Log viewer with a toolbar over a scrolling mono output area |
| `base-log-output` | Area of lines in the mono font, given its height and scrolling by createList |

<!-- reference:end -->

## Used By

No plugin uses it today.

## Example

<iframe class="base-preview" src="../../../assets/previews/log-viewer.html" title="Log Viewer example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "log-viewer.html"
```
