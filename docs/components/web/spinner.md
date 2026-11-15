# Spinner

An inline spinner with a hidden status label. Its size is small, medium, or large.

## When to Use

* Use it beside a button or inside a region while one request is in flight.

## When Not to Use

* Use a [Skeleton](skeleton.md) for content that has a known shape, and a [Progress Ring](progress-ring.md) when you know the percent.

## Usage

```js
import { createSpinner } from './configurationpage?name=myplugin_jpkribs_shared.js';

status.appendChild(createSpinner({ size: 'small', label: 'Saving' }).element);
```

Classes: `jpk-loading`, `jpk-loading-small`, `jpk-loading-medium`, `jpk-loading-large`, `jpk-loading-ring`. The handle is `{ element, getValue, setValue, destroy }`.

The one animation in the kit is the `jpk-spin` keyframes, a turn from 0 to 360 degrees. A plugin may use it for its own element.

```css
.my-spinner { animation: jpk-spin 0.8s linear infinite; }
```

## States and Modifiers

* `jpk-loading` is an inline wrapper with `role="status"`, and `label` ("Loading") is the text a screen reader reads.
* With reduced motion asked for, the ring turns slower and still turns.
* `jpk-table-reload-btn.spinning .jpk-table-reload-icon` uses `jpk-spin` for the table reload button.

## Gotchas

* The `jpk-spinner` class belongs to the status page template. See [Status Page](status-page.md).
* The ring is `jpk-loading-ring`. There is no spinner class in the bundled CSS other than these.

## Used By

No plugin uses it today. Artwork Generator shows "Loading preview" text, and several pages call `Dashboard.showLoadingMsg`.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/spinner.html" title="Spinner example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "spinner.html"
```
