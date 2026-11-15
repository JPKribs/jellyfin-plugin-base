# Stat Card

A status card with a number, a label, and an optional trend. The trend is a number with an arrow, green when the change is good, red when it is bad, and gray at zero.

## When to Use

* Use it for a headline number that changes over time.

## When Not to Use

* Use [Count Cards](count-cards.md) for a plain row of counts.

## Usage

```js
import { createStatCard } from './configurationpage?name=myplugin_jpkribs_shared.js';

cards.appendChild(createStatCard({ value: 1204, label: 'Items', color: 'blue', trend: 12, trendSuffix: '%' }).element);
```

Classes: `jpk-stat`, `jpk-stat-trend`. Place the cards in `jpk-cards`. The handle is `{ element, getValue, setValue, destroy }`.

## States and Modifiers

* `jpk-stat` is added to `jpk-card`, so the count, label, and color modifiers apply.
* `trend` is a change, where 12 is up 12 and -3 is down 3. `trendSuffix` goes after the number, and `trendLabel` after that, such as `'vs last week'`.
* `positiveIsGood: false` makes an increase red and a decrease green. The trend line is `good`, `bad`, or `flat`.
* The arrow has hidden text for the direction. `trendUpText`, `trendDownText`, and `trendFlatText` replace "Up", "Down", and "No change".

## Used By

No plugin uses it today. Server Sync has health cards, and several plugins use `renderCards`.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/stat-card.html" title="Stat Card example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "stat-card.html"
```
