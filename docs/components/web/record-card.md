# Record Card

A bordered card of label and value rows for one record's details.

## Decision

| When | Use |
| :--- | :--- |
| The details of one item, such as a last result and an id | Record Card. |
| Rows that need no card surface, or are built from data | [Definition List](definition-list.md). |
| The status card of counts | [Count Cards](count-cards.md). Never confuse it with the Record Card. |

## Usage

```html
<div class="base-record-card">
    <div class="base-record-row"><span class="base-record-label">Last result</span><span>OK</span></div>
    <div class="base-record-row"><span class="base-record-label">ID</span><span class="base-mono">2f40d5d8</span></div>
</div>
```

Classes: `base-record-card`, `base-record-row`, `base-record-label`.

## States and Modifiers

* The value is the last child that is not a label. It breaks anywhere and aligns right, so a long id wraps inside the card.
* The last block inside takes no bottom margin.

## Gotchas

* There is no JavaScript.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

| Class | What it looks like |
| :--- | :--- |
| `base-record-card` | Detail card showing label and value rows for a single item, on the panel's surface and padding from panel.css |
| `base-record-row` | Label and value pair on one line |
| `base-record-label` | Dimmed label that keeps its natural width |

<!-- reference:end -->

## Example

<iframe class="base-preview" src="../../../assets/previews/record-card.html" title="Record Card example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "record-card.html"
```
