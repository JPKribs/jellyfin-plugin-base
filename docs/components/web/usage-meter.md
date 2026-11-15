# Usage Meter

A progress bar of how much of something is used, such as disk space, with a label and an "X of Y used" line. It turns orange past a warning share and red past a danger share, and splits into colored parts with a legend.

## When to Use

* Use it for a used amount out of a known total, such as a cache, a drive, or a quota.

## When Not to Use

* Use a [Progress Ring](progress-ring.md) for a task's progress, and a [Bar Chart](bar-chart.md) to compare amounts with no total.

## Usage

```js
import { createUsageMeter } from './configurationpage?name=myplugin_jpkribs_shared.js';

var meter = createUsageMeter({ label: 'Cache', used: 12.4e9, total: 50e9, bytes: true });
view.querySelector('#meterHost').appendChild(meter.element);
meter.setValue({ used: 20e9 });
```

Classes: `base-usage-meter`, with the `warning` and `danger` modifiers, and the parts `base-usage-meter-head`, `base-usage-meter-label`, `base-usage-meter-text`, `base-usage-meter-bar`, `base-usage-meter-fill`, and `base-usage-meter-legend`. The handle is `{ element, getValue, setValue, destroy }`. `setValue` merges `{ used, total, parts }` and draws again.

## States and Modifiers

* The bar is the [Progress Bar](progress-bar.md) track, `base-progress`, a narrow gap tall, with one `base-progress-bar` fill per part.
* `bytes: true` writes the amounts as sizes, such as 12.4 GB, through the shared size format. Otherwise `unit` follows a plain number, and `format(value)` replaces both.
* `usedText` is "{used} of {total} used" by default, and also takes `{percent}`.
* The meter takes `warning` at 80 percent and `danger` at 95 percent by default. Its line takes the same color.
* `parts: [{ label, value, color }]` splits the used amount into segments, each in its color, a status color name or a hex code. A part with no color takes the chart series colors in turn. With two or more parts a legend lists each part and its amount. A segmented meter keeps its part colors past a threshold, and only its line turns orange or red.
* `used` defaults to the sum of the parts. A `total` of 0 shows an empty bar.
* The bar is a `meter` to a screen reader, named by the label, with the line as its value text.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createUsageMeter`

<code>function createUsageMeter(options?: UsageMeterOptions): UsageMeterHandle</code>

A progress bar that shows how much of something is used, such as disk space, with a label and an "X of Y used" line. The bar turns orange past the warning share and red past the danger share. With parts it is segmented, one colored segment per part, with a legend of the parts and their amounts. It is a meter to a screen reader, with the same line as its value text.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `label` | <code>string</code> | the name over the bar, such as 'Storage' [optional] |
| `bytes` | <code>boolean</code> | true writes the numbers as sizes, such as 2.4 GB (default false) |
| `unit` | <code>string</code> | text after plain numbers, such as 'items' [optional] |
| `warning` | <code>number</code> | percent of the total from which the bar turns orange (default 80) |
| `danger` | <code>number</code> | percent of the total from which the bar turns red (default 95) |
| `usedText` | <code>string</code> | the line, where {used}, {total}, and {percent} are filled in (default '{used} of {total} used') |
| `format` | <code>(value: number): string</code> | function(value) returning the text of an amount, which wins over bytes and unit [optional] |

| Handle member | Type |
| :--- | :--- |
| `getValue` | <code>(): UsageMeterValue</code> |
| `setValue` | <code>(next: UsageMeterValue &#124; null): void</code> |
| `destroy` | <code>(): void</code> |

| Type | What it is |
| :--- | :--- |
| `UsageMeterPart` | One part of a segmented usage meter, such as the space movies take. color is a status color name or a hex code. |
| `UsageMeterValue` | What a usage meter shows: how much is used out of a total, or the parts that add up to what is used. |

| Class | What it looks like |
| :--- | :--- |
| `base-usage-meter` | A progress bar of how much is used, with a label and an "X of Y used" line over it, and a legend under it when it holds several parts |
| `base-progress.base-usage-meter-bar` | The bar, the progress bar's track a narrow gap tall, whose fills sit side by side, each as wide as its share |
| `base-usage-meter.warning` | A meter past its warning share turns orange, and past its danger share turns red, with its line in the same color. A segmented meter keeps its part colors and colors only the line |
| `base-usage-meter-legend` | The legend of a segmented meter: a swatch, a name, and an amount per part, wrapping as a row |

<!-- reference:end -->

## Used By

No plugin uses it today.

## Example

<iframe class="base-preview" src="../../../assets/previews/usage-meter.html" title="Usage Meter example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "usage-meter.html"
```
