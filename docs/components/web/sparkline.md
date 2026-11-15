# Sparkline

A small line with no axes that shows the shape of a series, one line of text tall and as wide as its container. Its accessible name gives the first, last, lowest, and highest values.

## Decision

| When | Use |
| :--- | :--- |
| The recent shape of a number, beside it, such as on a [Stat Card](stat-card.md) with `sparkline` | Sparkline |
| Values or an axis the reader needs | [Line Chart](line-chart.md) |

## Usage

```js
import { createSparkline } from './configurationpage?name=myplugin_jpkribs_shared.js';

var spark = createSparkline({ label: 'Syncs this week', values: [3, 5, 4, 8, 6, 9, 12] });
view.querySelector('#sparkHost').appendChild(spark.element);
```

Classes: `base-sparkline`, with the parts `base-sparkline-line` and `base-sparkline-area`, and `base-stat-sparkline` inside a [Stat Card](stat-card.md). The handle is `{ element, getValue, setValue, destroy }`.

## States and Modifiers

* `values` are drawn left to right, and a missing value is skipped.
* `color` is a status color name or a hex code, and the accent by default.
* `area: false` drops the shading under the line.
* The name reads "Trend, from 3 to 12, low 3, high 12". `label` replaces "Trend", and `summaryText` replaces the rest, with `{first}`, `{last}`, `{low}`, and `{high}`. `unit` and `format(value)` set how a value reads.
* The line stretches to any width and keeps its stroke thickness.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createSparkline`

<code>function createSparkline(options?: SparklineOptions): SparklineHandle</code>

A small line with no axes that shows the shape of a series, such as beside a number on a stat card. It fills the width it is given and is one line of text tall. It is an image whose name gives the first, last, lowest, and highest values, so a screen reader hears the numbers the shape shows.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `values` | <code>Array&lt;number &#124; null &#124; undefined&gt;</code> | the numbers, left to right, where a missing value is skipped [optional] |
| `color` | <code>string</code> | status color name or hex code of the line (default the accent) |
| `label` | <code>string</code> | what the values are, the start of the accessible name (default 'Trend') |
| `unit` | <code>string</code> | text after each number in the name, such as 'GB' [optional] |
| `area` | <code>boolean</code> | true shades the area under the line (default true) |
| `summaryText` | <code>string</code> | the name after the label, where {first}, {last}, {low}, and {high} are the values (default 'from {first} to {last}, low {low}, high {high}') |
| `format` | <code>(value: number): string</code> | function(value) returning the text of a value, which wins over unit [optional] |

| Handle member | Type |
| :--- | :--- |
| `getValue` | <code>(): number[]</code> |
| `setValue` | <code>(values: Array&lt;number &#124; null &#124; undefined&gt; &#124; null): void</code> |
| `destroy` | <code>(): void</code> |

| Class | What it looks like |
| :--- | :--- |
| `base-sparkline` | A small line with no axes, one line of text tall, that fills its width, in the accent or a status color |
| `base-stat-sparkline` | A sparkline under a stat card's label, in the card's own color |

<!-- reference:end -->

## Example

<iframe class="base-preview" src="../../../assets/previews/sparkline.html" title="Sparkline example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "sparkline.html"
```
