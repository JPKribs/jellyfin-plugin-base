# Progress Ring

A circular progress indicator with its percent in the middle. It is an SVG ring with `role="progressbar"`, and the arc length is set through `stroke-dasharray` on a path of length 100.

## When to Use

* Use it where the percent is known and space is tight, such as a queue row.

## When Not to Use

* Use a [Progress Bar](progress-bar.md) for a thin line in a row.

## Usage

```js
import { createProgressRing } from './configurationpage?name=myplugin_jpkribs_shared.js';

var ring = createProgressRing({ value: 40, color: 'green' });
ring.setValue(65);
```

Classes: `jpk-ring`, `jpk-ring-small`, `jpk-ring-medium`, `jpk-ring-large`, `jpk-ring-arc`. The handle is `{ element, getValue, setValue, destroy }`.

Parts: `jpk-ring-track`, `jpk-ring-value`.

## States and Modifiers

* `value` is a percent from 0 to 100. `setValue` clamps it and updates `aria-valuenow`.
* `size` is `small`, `medium` (default), or `large`. `color` is a status color name for the arc, the accent by default.
* `showValue: false` hides the percent text. `label` ("Progress") is the `aria-label`.
* No inline style is used.

## Used By

No plugin uses it today. Server Sync draws a small conic gradient ring in its queue.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/progress-ring.html" title="Progress Ring example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "progress-ring.html"
```
