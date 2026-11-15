# Ordered List

A light ordered list of rows with an up and a down button on each. `render` may return `{ primary, secondary }`, so every row's secondary text starts at the same place.

## Decision

| When | Use |
| :--- | :--- |
| A short list the user ranks, with no editor and no drag | Ordered List |
| Records that each open an editor | [Sortable Card List](sortable-card-list.md) |
| Plain text values the reader also adds, edits, and removes | [String List](string-list.md) |

## Usage

```js
import { createOrderedList } from './configurationpage?name=myplugin_jpkribs_shared.js';

var order = createOrderedList({
    items: config.Steps,
    render: function (step) { return '<strong>' + shared.escapeHtml(step.Name) + '</strong>'; },
    label: function (step) { return step.Name; },
    onMove: function (from, to, items) { config.Steps = items; tracker.check(); }
});
container.appendChild(order.element);
```

Classes: `base-ordered-list`, `base-ordered-item`, `base-ordered-main`, `base-ordered-arrows`, `base-ordered-up`, `base-ordered-down`. The handle is `{ element, setItems, getItems, setHeight, destroy }`.

## States and Modifiers

* `render(item, index)` is required and returns a node, an HTML string that is already escaped, or `{ primary, secondary }` as text or nodes for a boxed row whose secondary text lines up across the rows.
* `label(item, index)` names the row for the button labels, "Item 1", "Item 2" by default.
* `onMove(from, to, items)` receives the two indexes and a copy of the new order.
* `moveUpTitle` and `moveDownTitle` replace the tooltips "Move Up" and "Move Down". `moveUpLabel` and `moveDownLabel` replace the labels "Move {value} up" and "Move {value} down", as a template where `{value}` is the row's name or as a function(name).
* The first up button and the last down button are disabled. A move keeps focus on the button that was pressed, or on the other button of the row when that one is now disabled.
* The buttons are native, so Enter and Space work.
* `height`, `maxHeight`, and `minHeight` set the height of the list as a [List](list.md) takes them, `'auto'` by default so the list grows with the page. `setHeight(height, maxHeight)` changes them later.

## Gotchas

* `createOrderedList` throws without a `render` function.
* `base-ordered-up` and `base-ordered-down` are hooks with no CSS rules.
* `destroy()` empties the list and ignores later clicks.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createOrderedList`

<code>function createOrderedList&lt;T = any&gt;(options: OrderedListOptions&lt;T&gt;): OrderedListHandle&lt;T&gt;</code>

A light ordered list of rows, each with an up and a down button. The caller draws the rows, and a move reorders the items, redraws, and keeps focus on the button that was pressed.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `items` | <code>T[]</code> | array of records in order, replaced with setItems [optional] |
| `render` (required) | <code>(item: T, index: number): Node &#124; string &#124; ItemRowParts</code> | function(item, index) returning a node or an HTML string for the row, where a string must already be escaped [required] |
| `label` | <code>(item: T, index: number): string</code> | function(item, index) returning the row's name for the button labels (default "Item 1", "Item 2") |
| `onMove` | <code>(fromIndex: number, toIndex: number, items: T[]): void</code> | function(fromIndex, toIndex, items) called after a move, so the caller can save [optional] |
| `moveUpTitle` | <code>string</code> | tooltip of the up button (default 'Move Up') |
| `moveDownTitle` | <code>string</code> | tooltip of the down button (default 'Move Down') |
| `moveUpLabel` | <code>RowLabel</code> | the up button's aria-label, where {value} is the row's name, or a function(name) returning it (default 'Move {value} up') |
| `moveDownLabel` | <code>RowLabel</code> | the down button's aria-label, where {value} is the row's name, or a function(name) returning it (default 'Move {value} down') |
| `height` | <code>ListHeight</code> | height of the list, as createList takes it (default 'auto') |
| `maxHeight` | <code>number &#124; string &#124; null</code> | height past which the list scrolls [optional] |
| `minHeight` | <code>number &#124; string &#124; null</code> | least height of a filling list [optional] |

| Handle member | Type |
| :--- | :--- |
| `element` | <code>HTMLOListElement</code> |
| `setItems` | <code>(next: T[] &#124; null): void</code> |
| `getItems` | <code>(): T[]</code> |
| `setHeight` | <code>(height: ListHeight, maxHeight?: number &#124; string &#124; null): void</code> |
| `destroy` | <code>(): void</code> |

| Class | What it looks like |
| :--- | :--- |
| `base-ordered-list` | Light ordered list of rows with move buttons, built by createOrderedList |
| `base-ordered-main` | Content of a row that takes the free width and clips |

<!-- reference:end -->

## Example

<iframe class="base-preview" src="../../../assets/previews/ordered-list.html" title="Ordered List example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "ordered-list.html"
```
