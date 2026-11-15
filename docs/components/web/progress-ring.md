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

Classes: `base-ring`, `base-ring-small`, `base-ring-medium`, `base-ring-large`, `base-ring-pie`, `base-ring-arc`. The handle is `{ element, getValue, setValue, destroy }`.

Parts: `base-ring-track`, `base-ring-value`.

## States and Modifiers

* `value` is a percent from 0 to 100. `setValue` clamps it and updates `aria-valuenow`.
* `size` is `small`, `medium` (default), or `large`. `color` is a status color name or a hex code for the arc, the accent by default. A hex code sets `--base-custom` on the ring.
* `showValue: false` hides the percent text. `label` ("Progress") is the `aria-label`.
* `pie: true` fills a small disc like a pie, with no text, such as beside a small button. The [Task Progress Button](task-progress-button.md) draws one.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createProgressRing`

<code>function createProgressRing(options?: ProgressRingOptions): ProgressRingHandle</code>

A circular progress indicator with its percent in the middle. It is an SVG ring, role progressbar, and the arc length is set through stroke-dasharray on a path of length 100.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `value` | <code>number &#124; string</code> | percent from 0 to 100 (default 0) |
| `size` | <code>'small' &#124; 'medium' &#124; 'large' &#124; string</code> | 'small', 'medium', or 'large' (default 'medium') |
| `color` | <code>string</code> | status color name or hex code for the arc, such as 'green' or '#e91e63' (default the accent) |
| `label` | <code>string</code> | aria-label (default 'Progress') |
| `showValue` | <code>boolean</code> | false hides the percent text (default true) |
| `pie` | <code>boolean</code> | true fills a small disc like a pie, with no text, such as beside a small button (default false) |

| Handle member | Type |
| :--- | :--- |
| `getValue` | <code>(): number</code> |
| `setValue` | <code>(next: number &#124; string): void</code> |
| `destroy` | <code>(): void</code> |

| Class | What it looks like |
| :--- | :--- |
| `base-ring` | Circular progress with its percent in the middle, in three sizes and any status color |
| `base-ring-pie` | A small disc that fills like a pie with no text, such as beside a small button that is running a task |

<!-- reference:end -->

## Used By

No plugin uses it today.

## Example

<iframe class="base-preview" src="../../../assets/previews/progress-ring.html" title="Progress Ring example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "progress-ring.html"
```
