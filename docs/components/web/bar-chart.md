# Bar Chart

A bar chart drawn as inline SVG on the shared chart core. Each label is a group with one bar per series, in the series' color. It draws at its own width and again when that width changes, so its text never scales.

## Decision

| When | Use |
| :--- | :--- |
| Comparing a few amounts side by side, such as items synced per day or storage per library | Bar Chart |
| A value over many points in time | [Line Chart](line-chart.md) |
| A shape beside a number | [Sparkline](sparkline.md) |
| How a whole splits into a few named parts | [Pie Chart](pie-chart.md) |
| How much of one limit is used | [Usage Meter](usage-meter.md) |

## Usage

```js
import { createBarChart } from './configurationpage?name=myplugin_jpkribs_shared.js';

var chart = createBarChart({
    label: 'Items synced per day',
    labels: ['Mon', 'Tue', 'Wed'],
    series: [{ name: 'Synced', values: [42, 58, 31] }]
});
view.querySelector('#chartHost').appendChild(chart.element);
chart.setValue({ series: [{ name: 'Synced', values: [12, 20, 9] }] });
```

Classes: `base-chart` and `base-bar-chart`, with the parts `base-chart-plot`, `base-chart-mark`, `base-chart-value`, `base-chart-legend`, and `base-chart-tip`. The handle is `{ element, getValue, setValue, redraw, destroy }`. `setValue` takes `{ labels, series }` and draws again. `height` is 200 pixels by default.

## States and Modifiers

* A series' `color` is a status color name or a hex code. A series without one takes blue, green, orange, purple, red, teal, pink, and yellow in turn.
* The y axis shows about `ticks` round gridlines (default 4) from 0, or from the lowest value below it, to a round number above the highest. `min` and `max` fix the range.
* Each value sits above its bar while it fits the bar's width. `valueLabels: false` hides them.
* `unit` follows each value, such as "GB", and `format(value)` replaces the text of every value.
* Every bar keeps its label, shortened with an ellipsis when it does not fit its band.
* A legend shows only with two or more series.
* Hovering a bar shows its label and value on the shared tooltip surface. The plot takes focus, and the arrow keys move the tooltip from bar to bar. Escape hides it.
* A visually hidden table holds every number, captioned by `label`, so a screen reader reads the data.
* Bars grow up as they draw, except under `prefers-reduced-motion: reduce`.

## Gotchas

* Call `destroy()` when the page hides. It stops the resize watch.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createBarChart`

<code>function createBarChart(options?: BarChartOptions): BarChartHandle</code>

A bar chart on the shared chart core, drawn as inline SVG at its own width. Each label is a group with one bar per series, in the series' color, with its value above it when there is room. It draws again when its width changes, shows a tooltip on hover and focus, adds a legend only with several series, and keeps a visually hidden table of every number.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `valueLabels` | <code>boolean</code> | false hides the value above each bar (default true) |

| Handle member | Type |
| :--- | :--- |
| `destroy` | <code>(): void</code> |

| Class | What it looks like |
| :--- | :--- |
| `base-chart` | A chart on the shared chart core: an inline SVG plot that fills its width, a legend under it when there are several series, and a hidden table of the numbers |
| `base-chart-grid` | The gridlines, the ticks, and the labels, in the text color and the small font, so they never scale with the plot |
| `base-chart-series` | One series of marks in its status color, or a hex color through --base-custom, the accent when it names none |
| `base-chart-mark` | A mark under the pointer or the arrow keys, drawn stronger than the rest |
| `base-bar-chart` | Bars grow up from the axis as they draw, except under reduced motion |
| `base-chart-legend` | The legend under a chart with several series: a swatch and a name per series, wrapping as a row |
| `base-chart-swatch` | A small square in a series color, in the legend and the tooltip |
| `base-chart-tip` | The tooltip of a mark, on the shared tooltip surface: the label over the value |
| `base-chart-empty` | The empty sentence that stands in for the plot and the legend when a chart has nothing to draw, in the List's empty look |

<!-- reference:end -->

## Example

<iframe class="base-preview" src="../../../assets/previews/bar-chart.html" title="Bar Chart example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "bar-chart.html"
```
