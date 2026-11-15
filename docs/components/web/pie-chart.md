# Pie Chart

A pie or donut chart drawn as inline SVG on the shared chart core, the same core as the [Bar Chart](bar-chart.md). Each slice is its share of the total, and a legend lists every slice with its value and percent, so the colors always have a key.

## Decision

| When | Use |
| :--- | :--- |
| How a whole splits into a few parts, such as storage by library or streams by client | Pie Chart |
| The same split with the total in the middle | Pie Chart with `donut: true` and `centerText` |
| Comparing amounts that are not parts of one whole | [Bar Chart](bar-chart.md) |
| Used out of a limit, such as disk space against its capacity | [Usage Meter](usage-meter.md) |
| One share, such as a task's progress | [Progress Ring](progress-ring.md) |

## Usage

```js
import { createPieChart } from './configurationpage?name=myplugin_jpkribs_shared.js';

var chart = createPieChart({
    label: 'Storage by library',
    unit: 'GB',
    donut: true,
    centerText: '2.2 TB',
    centerLabel: 'Total',
    slices: [
        { label: 'Movies', value: 820 },
        { label: 'Shows', value: 1240 },
        { label: 'Music', value: 96, color: 'teal' }
    ],
    onSelect: function (slice, index) { showLibrary(slice ? slice.label : null); }
});
view.querySelector('#chartHost').appendChild(chart.element);
chart.setSlices([{ label: 'Movies', value: 900 }, { label: 'Shows', value: 1300 }]);
```

Classes: `base-chart` and `base-pie-chart`, with the parts `base-chart-plot`, `base-chart-mark`, `base-pie-chart-legend`, `base-pie-chart-key`, `base-pie-chart-center`, `base-chart-empty`, and `base-chart-tip`. The handle is `{ element, getValue, setValue, setSlices, getSelected, select, redraw, destroy }`. `setValue` and `setSlices` both take the slices and draw again.

## States and Modifiers

* A slice's `color` is a status color name or a hex code. A slice without one takes blue, green, orange, purple, red, teal, pink, and yellow in turn, by its place in the list.
* Slices start at twelve o'clock and run clockwise in the order given. One slice with a value draws a full circle.
* A zero, negative, or missing value draws no slice and is left out of the total. Its legend row stays, with its value and 0%, and is disabled, since there is nothing to select.
* Every slice keeps its own slice and legend row, however small. Nothing merges into an "Other" slice, so sort or group the data first when there are many slivers.
* A percent is a whole number from 10%, has one decimal under it, and reads "<0.1%" for a sliver, so the percents may not add to exactly 100%.
* `size` is `small`, `medium` (the default), or `large`, and sets the pie's diameter to five times that size's control height. It never grows past the chart's width.
* `donut: true` adds `donut` and draws a ring. `centerText` sits in its center in the large font, over `centerLabel` in the small font. Each ends in an ellipsis when it is wider than the hole, with the full text as its tooltip.
* The legend sits beside the pie, and moves under it with `compact` when the chart is narrower than 480 pixels. Each row is a button with the slice's color dot, label, value, and percent, the values and percents each in one column. `showLegend: false` hides it, which leaves the tooltips as the only key to the colors.
* Every slice is a button named with its label, value, and percent, such as "Movies, 820 GB, 38%". Hovering it shows the same on the shared tooltip surface. The plot takes focus, the arrow keys move the tooltip from slice to slice, and Escape hides it.
* A click on a slice or its legend row selects it, as do Enter and Space on the plot for the slice the arrow keys reached. A second one clears it. The selected row takes the accent wash and bar, the other slices dim, and `onSelect(slice, index)` reports it, with `(null, -1)` when it clears.
* `unit` follows each value, such as "GB", and `format(value)` replaces the text of every value.
* While no slice has a positive value, the chart shows `emptyText` (default "Nothing to show.") in the List's empty look, in place of the pie and the legend.
* A visually hidden table holds every value and percent, captioned by `label`, under the column heading `valueName` (default "Value").

## Gotchas

* Call `destroy()` when the page hides. It stops the resize watches.
* The total is the sum of the positive values. A part of something larger, such as used space out of a disk, belongs in a [Usage Meter](usage-meter.md).

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createPieChart`

<code>function createPieChart(options?: PieChartOptions): PieChartHandle</code>

A pie or donut chart on the shared chart core, drawn as inline SVG at a size from the size scale. Each slice is its share of the total, in its color, and is a button whose name and tooltip give its label, value, and percent. A legend beside the pie, or under it when the chart is narrow, lists every slice with its value and percent. A click, Enter, or Space on a slice or a legend row selects it, and again clears it. The core keeps a visually hidden table of every number.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `slices` | <code>PieSlice[]</code> | [{ label, value, color }] where color is a status color name or a hex code (default the series colors in turn) [optional] |
| `label` | <code>string</code> | the chart's accessible name and the hidden table's caption [optional] |
| `donut` | <code>boolean</code> | true draws a ring with room in the center (default false) |
| `centerText` | <code>string</code> | the large text in a donut's center, such as the total [optional] |
| `centerLabel` | <code>string</code> | the small text under centerText, such as 'Total' [optional] |
| `unit` | <code>string</code> | text after each value, such as 'GB' [optional] |
| `showLegend` | <code>boolean</code> | false hides the legend (default true) |
| `emptyText` | <code>string</code> | the sentence shown while no slice has a positive value (default 'Nothing to show.') |
| `valueName` | <code>string</code> | the heading of the value column in the hidden table (default 'Value') |
| `size` | <code>'small' &#124; 'medium' &#124; 'large'</code> | 'small', 'medium', or 'large', the pie's diameter on the size scale (default 'medium') |
| `format` | <code>(value: number): string</code> | function(value) returning the text of a value, which wins over unit [optional] |
| `onSelect` | <code>(slice: PieSlice &#124; null, index: number): void</code> | function(slice, index) called when a slice is selected, and with (null, -1) when it is cleared [optional] |

| Handle member | Type |
| :--- | :--- |
| `getValue` | <code>(): PieSlice[]</code> |
| `setValue` | <code>(slices: PieSlice[] &#124; null): void</code> |
| `setSlices` | <code>(slices: PieSlice[] &#124; null): void</code> |
| `getSelected` | <code>(): number</code> |
| `select` | <code>(index: number &#124; null): void</code> |
| `redraw` | <code>(): void</code> |
| `destroy` | <code>(): void</code> |

| Type | What it is |
| :--- | :--- |
| `PieSlice` | One slice of a pie: its name, its amount, and an optional status color name or hex code. |
| `PieAngle` | The start and end angle of one slice, in radians clockwise from twelve o'clock, and its share of the whole from 0 to 1. |

| Class | What it looks like |
| :--- | :--- |
| `base-pie-chart` | A pie chart on the shared chart core: the pie, a diameter on the size scale, beside its legend |
| `base-pie-chart.compact` | A narrow pie chart, which stacks the legend under the pie |
| `base-pie-chart-slice` | One slice in its color, parted from the next by a line of the surface, dimmed while another is under the pointer or selected |
| `base-pie-chart-center` | The value and its label in a donut's center |
| `base-pie-chart-legend` | The legend of a pie: a row per slice with its color dot, label, value, and percent, the values and percents each in one column |

<!-- reference:end -->

## Example

<iframe class="base-preview" src="../../../assets/previews/pie-chart.html" title="Pie Chart example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "pie-chart.html"
```
