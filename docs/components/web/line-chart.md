# Line Chart

A line chart drawn as inline SVG on the shared chart core, the same core as the [Bar Chart](bar-chart.md). Each series is a line through one point per label, and a missing value breaks the line.

## When to Use

* Use it for a value over time, such as streams by hour or response time by day.

## When Not to Use

* Use a [Bar Chart](bar-chart.md) to compare a few separate amounts, and a [Sparkline](sparkline.md) for a small shape with no axes.

## Usage

```js
import { createLineChart } from './configurationpage?name=myplugin_jpkribs_shared.js';

var chart = createLineChart({
    label: 'Response time',
    labels: ['Mon', 'Tue', 'Wed'],
    unit: 'ms',
    series: [{ name: 'Den', color: 'blue', values: [120, 135, 110] }]
});
view.querySelector('#chartHost').appendChild(chart.element);
```

Classes: `base-chart` and `base-line-chart`, with the parts `base-chart-line`, `base-chart-area`, and `base-chart-dot`. The handle is `{ element, getValue, setValue, redraw, destroy }`.

## States and Modifiers

* It takes every [Bar Chart](bar-chart.md) option that is not about bars, with the same colors, axis, legend, tooltip, and hidden table.
* `area: true` shades the area under each line. `dots: false` adds `quiet`, which shows a point only on hover and focus.
* A `null` value leaves a gap in its line.
* The first and last labels align to the plot's edges, so they never spill out of it.
* Labels along the x axis thin out to every second or later one when they would overlap.

## Gotchas

* Call `destroy()` when the page hides. It stops the resize watch.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createLineChart`

<code>function createLineChart(options?: LineChartOptions): LineChartHandle</code>

A line chart on the shared chart core, drawn as inline SVG at its own width. Each series is a line through one point per label, in the series' color, and a missing value breaks the line. It draws again when its width changes, shows a tooltip on hover and focus of each point, adds a legend only with several series, and keeps a visually hidden table of every number.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `area` | <code>boolean</code> | true shades the area under each line (default false) |
| `dots` | <code>boolean</code> | false draws the points only on hover and focus (default true) |

| Handle member | Type |
| :--- | :--- |
| `destroy` | <code>(): void</code> |

| Class | What it looks like |
| :--- | :--- |
| `base-chart-line` | A line chart on the shared chart core: a line per series with a dot on each point, and an optional shaded area under it |
| `base-line-chart.quiet` | A quiet line chart, whose dots show only under the pointer |

<!-- reference:end -->

## Used By

No plugin uses it today.

## Example

<iframe class="base-preview" src="../../../assets/previews/line-chart.html" title="Line Chart example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "line-chart.html"
```
