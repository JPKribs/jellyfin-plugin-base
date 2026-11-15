# Record Card

A bordered card of label and value rows for one record's details.

## When to Use

* Use it for the details of one item, such as a last result and an id.

## When Not to Use

* Never confuse it with the status card of [Count Cards](count-cards.md).

## Usage

```html
<div class="jpk-record-card">
    <div class="jpk-record-row"><span class="jpk-record-label">Last result</span><span>OK</span></div>
    <div class="jpk-record-row"><span class="jpk-record-label">ID</span><span class="jpk-mono">2f40d5d8</span></div>
</div>
```

Classes: `jpk-record-card`, `jpk-record-row`, `jpk-record-label`.

## States and Modifiers

* The value is the last child that is not a label. It breaks anywhere and aligns right, so a long id wraps inside the card.
* The last block inside takes no bottom margin.
* Use a [Definition List](definition-list.md) when the rows need no card surface.

## Gotchas

* There is no JavaScript.

## Used By

Live Channels, Remote Access, Requests, and Server Sync use it.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/record-card.html" title="Record Card example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "record-card.html"
```
