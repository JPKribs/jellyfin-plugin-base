# Count Cards

A row of large counts over labels, tinted by status.

## When to Use

* Use it for a summary of counts at the top of a page or tab.

## When Not to Use

* Use a [Stat Card](stat-card.md) when each count needs a trend. Never confuse it with `base-card-list` and `base-card-item` (records) or the [Record Card](record-card.md).

## Usage

```html
<div class="base-cards compact" id="mainStatusRow">
    <div class="base-card green"><span class="base-card-count">0</span><span class="base-card-label">Synced</span></div>
    <div class="base-card purple"><span class="base-card-count">0</span><span class="base-card-label">Pending</span></div>
</div>
```

```js
shared.renderCards('statusRow', [
    { label: 'Queued', count: 12, color: 'orange' },
    { label: 'Synced', count: 340, color: 'green' }
]);
```

Classes: `base-cards`, `base-card`, `base-card-count`, `base-card-label`.

## States and Modifiers

* `shared.renderCards(containerId, cards)` takes an id or element, adds `base-cards` to it, and fills `[{ label, count, color }]`. Count and label are set as text. A null count shows nothing. A missing element is ignored.
* The color modifiers are `green`, `red`, `orange`, `purple`, `blue`, `gray`, `yellow`, `pink`, and `teal`. `renderCards` also takes a hex code such as `#e91e63`, drawn with the `custom` modifier.
* The cards wrap in [Balanced Rows](balanced-rows.md), so five cards that do not fit in one row become three and two, never four and one. A card with `hidden` takes no place.
* `compact` makes a tighter row of small cards, with a smaller gap, padding, and label, for many counts on a phone.
* `--base-balance-max` caps the cards in a row. `style="--base-balance-max: 4"` never shows more than four.
* Cards in page markup are balanced by `createConfigPage`, or by `bindBalancedRows(view)` on a page built another way.
* Put a `title` on a card for a tooltip.

## Gotchas

* `renderCards` draws only a known color name or a hex code. Any other color leaves the card untinted.
* There is no keyboard behavior.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

| Class | What it looks like |
| :--- | :--- |
| `base-cards` | Row of count cards that wraps to fit |
| `base-card` | Rounded card showing a large count over a label, tinted by status |
| `base-card-count` | Large bold count at the top of a card |
| `base-card-label` | Small label under the count |
| `base-card.green` | Status color modifiers for a card, each tinting the fill, text, and border |
| `base-cards.compact` | A tighter row of small count cards, for many counts in little room, such as on a phone |

<!-- reference:end -->

## Used By

Custom Pages, Live Channels, Requests, Scripts, Server Sync, User Management, and YouTube Audio use it.

## Example

<iframe class="base-preview" src="../../../assets/previews/count-cards.html" title="Count Cards example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "count-cards.html"
```
