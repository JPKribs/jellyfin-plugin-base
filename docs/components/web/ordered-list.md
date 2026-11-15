# Ordered List

A light ordered list of rows with an up and a down button on each.

## When to Use

* Use it for a short list the user ranks, with no editor and no drag.

## When Not to Use

* Use a [Sortable Card List](sortable-card-list.md) when each record opens an editor.

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

Classes: `jpk-ordered-list`, `jpk-ordered-item`, `jpk-ordered-main`, `jpk-ordered-arrows`, `jpk-ordered-up`, `jpk-ordered-down`. The handle is `{ element, setItems, getItems, destroy }`.

## States and Modifiers

* `render(item, index)` is required and returns a node, or an HTML string that is already escaped.
* `label(item, index)` names the row for the button labels, "Item 1", "Item 2" by default.
* `onMove(from, to, items)` receives the two indexes and a copy of the new order.
* `moveUpTitle` and `moveDownTitle` replace the tooltips "Move Up" and "Move Down". `moveUpLabel(name)` and `moveDownLabel(name)` replace the labels "Move Name up" and "Move Name down".
* The first up button and the last down button are disabled. A move keeps focus on the button that was pressed, or on the other button of the row when that one is now disabled.
* The buttons are native, so Enter and Space work.

## Gotchas

* `createOrderedList` throws without a `render` function.
* `jpk-ordered-up` and `jpk-ordered-down` are hooks with no CSS rules.
* `destroy()` empties the list and ignores later clicks.

## Used By

No plugin uses it today.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/ordered-list.html" title="Ordered List example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "ordered-list.html"
```
