# Stat Card

A status card with a number or a short text status, a label, and an optional trend and detail lines. The trend is a number with an arrow, green when the change is good, red when it is bad, and dimmed at zero.

## Decision

| When | Use |
| :--- | :--- |
| A headline number that changes over time | Stat Card |
| A text status, such as the last delivery to a server, with a line or two of detail under it | `layout: 'label-top'` |
| A plain row of counts | [Count Cards](count-cards.md) |

## Usage

```js
import { createStatCard } from './configurationpage?name=myplugin_jpkribs_shared.js';

cards.appendChild(createStatCard({ value: 1204, label: 'Items', color: 'blue', trend: 12, trendSuffix: '%' }).element);

var peer = createStatCard({ layout: 'label-top', label: 'Office', value: 'Paused until 14:00', valueColor: 'orange', detail: ['Sends files and users', 'The server asked to pause.'] });
cards.appendChild(peer.element);
peer.setValue({ value: 'Delivered 3m ago', valueColor: 'green', detail: 'Sends files and users' });
```

Classes: `base-stat`, `base-stat-trend`, `base-stat-detail`, `label-top`. Place the cards in `base-cards`. The handle is `{ element, getValue, setValue, destroy }`.

## States and Modifiers

* `base-stat` is added to `base-card`, so the count, label, and color modifiers apply.
* `trend` is a change, where 12 is up 12 and -3 is down 3. `trendSuffix` goes after the number, and `trendLabel` after that, such as `'vs last week'`.
* `positiveIsGood: false` makes an increase red and a decrease green. The trend line carries `good`, `bad`, or `flat`.
* `sparkline` is a list of numbers drawn as a [Sparkline](sparkline.md) under the trend, in the card's text color or `sparklineColor`, named by the label.
* `value` may be text, such as "Delivered 3m ago". Text wraps at full size and is never shrunk to fit.
* `valueColor` colors the value text by a status name or a hex code, through the color core, such as `orange` for a paused state. The value carries the color class.
* `detail` is one line or an array of up to two, drawn dimmed under the value and label as `base-stat-detail`. A line too long for the card ends in an ellipsis, with the full text as its tooltip.
* `layout: 'label-top'` puts the small, dimmed label first, then the value at the large text size, then the details, aligned to the start. The card carries `label-top`. The default, `'value-top'`, is the large value over the label.
* `setValue` takes the new fields too, so a status can change its text, color, details, and layout in place.
* The arrow has hidden text for the direction. `trendUpText`, `trendDownText`, and `trendFlatText` replace "Up", "Down", and "No change".

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createStatCard`

<code>function createStatCard(options?: StatCardOptions): StatCardHandle</code>

A status card with a number or a short text status, a label, and an optional trend and detail lines. The trend is a number with an arrow, green when the change is good and red when it is bad, and gray at zero.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `value` | <code>unknown</code> | the number or text shown large, such as 1204 or 'Delivered 3m ago'. Text wraps and is never shrunk [optional] |
| `label` | <code>string</code> | text under the value, or above it with layout 'label-top' [optional] |
| `color` | <code>string</code> | card color name such as 'blue' or 'green', as the base-card modifiers [optional] |
| `trend` | <code>number</code> | change as a number, where 12 is up 12 and -3 is down 3 [optional] |
| `trendSuffix` | <code>string</code> | text after the trend number, such as '%' [optional] |
| `trendLabel` | <code>string</code> | text after the trend, such as 'vs last week' [optional] |
| `positiveIsGood` | <code>boolean</code> | false makes an increase red and a decrease green (default true) |
| `trendUpText` | <code>string</code> | hidden text for an increase (default 'Up') |
| `trendDownText` | <code>string</code> | hidden text for a decrease (default 'Down') |
| `trendFlatText` | <code>string</code> | hidden text for no change (default 'No change') |
| `sparkline` | <code>Array&lt;number &#124; null &#124; undefined&gt; &#124; null</code> | numbers drawn as a small line under the trend, through createSparkline, named by the label [optional] |
| `sparklineColor` | <code>string</code> | status color name or hex code of the line (default the card's text color) |
| `detail` | <code>string &#124; string[]</code> | one or two dimmed lines under the value and label, each ending in an ellipsis with the full text as its tooltip [optional] |
| `layout` | <code>'value-top' &#124; 'label-top'</code> | 'value-top' (default) puts the value over the label, and 'label-top' puts the small label first, then the value, then the details |
| `valueColor` | <code>string</code> | status color name or hex code of the value text, such as 'orange' for a paused state (default the card's text color) |

| Handle member | Type |
| :--- | :--- |
| `getValue` | <code>(): StatCardOptions</code> |
| `setValue` | <code>(next: StatCardOptions): void</code> |
| `destroy` | <code>(): void</code> |

| Class | What it looks like |
| :--- | :--- |
| `base-stat-trend` | Status card that adds a trend line under its count and label, built by createStatCard, the trend built as small base-icon-text |
| `base-stat` | A stat card whose value is text, which wraps between words at full size and is as wide as its longest word, never wider than its row |
| `base-stat-detail` | Dimmed detail line under a stat card's value, cut with an ellipsis and titled with its full text |
| `base-stat.label-top` | Stat card laid out label first, a small label over a text status and its details, aligned to the start |

<!-- reference:end -->

## Example

<iframe class="base-preview" src="../../../assets/previews/stat-card.html" title="Stat Card example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "stat-card.html"
```
