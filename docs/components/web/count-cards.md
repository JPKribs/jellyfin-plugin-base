# Count Cards

A row of large counts over labels, tinted by status.

## When to Use

* Use it for a summary of counts at the top of a page or tab.

## When Not to Use

* Use a [Stat Card](stat-card.md) when each count needs a trend. Never confuse it with `jpk-card-list` and `jpk-card-item` (records) or the [Record Card](record-card.md).

## Usage

```html
<div class="jpk-cards jpk-cards-rows" id="mainStatusRow">
    <div class="jpk-card green"><span class="jpk-card-count">0</span><span class="jpk-card-label">Synced</span></div>
    <div class="jpk-card purple"><span class="jpk-card-count">0</span><span class="jpk-card-label">Pending</span></div>
</div>
```

```js
shared.renderCards('statusRow', [
    { label: 'Queued', count: 12, color: 'orange' },
    { label: 'Synced', count: 340, color: 'green' }
]);
```

Classes: `jpk-cards`, `jpk-cards-rows`, `jpk-card`, `jpk-card-count`, `jpk-card-label`.

## States and Modifiers

* `shared.renderCards(containerId, cards)` takes an id or element, adds `jpk-cards` to it, and fills `[{ label, count, color }]`. Count and label are escaped. A null count shows nothing. A missing element is ignored.
* The color modifiers are `green`, `red`, `orange`, `purple`, `blue`, `gray`, `yellow`, `pink`, and `teal`.
* `jpk-cards-rows` is a grid where every card is the same width, in one row when they fit and never more than two rows. A card with `hidden` takes no column.
* `--jpk-cards-per-row` caps the columns. `style="--jpk-cards-per-row: 4"` never shows more than four cards in a row.
* Put a `title` on a card for a tooltip, as Server Sync does.

## Gotchas

* The color passed to `renderCards` is not sanitized.
* There is no keyboard behavior.

## Used By

Custom Pages, Requests, and Scripts use it.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/count-cards.html" title="Count Cards example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "count-cards.html"
```
