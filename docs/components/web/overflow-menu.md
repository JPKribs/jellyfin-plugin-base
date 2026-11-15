# Overflow Menu

A button, by default with the three dot icon, that opens a small menu of actions.

## When to Use

* Use it for the row actions of a table or card when several buttons would crowd the row.

## When Not to Use

* Never hide the one action users need most. Use a [Row Button](row-button.md) for it.

## Usage

```js
import { createOverflowMenu } from './configurationpage?name=myplugin_jpkribs_shared.js';

var menu = createOverflowMenu({
    items: [{ label: 'Edit', value: 'edit' }, { label: 'Remove', value: 'remove', destructive: true }],
    onSelect: function (value) { act(value, row); }
});
cell.appendChild(menu.element);
```

Classes: `jpk-menu`, `jpk-menu-start`, `jpk-menu-list`, `jpk-menu-item`. The handle is `{ element, setItems, getItems, open, close, isOpen, destroy }`.

## States and Modifiers

* An item is `{ label, value, disabled, destructive, icon }`. `destructive` shows it red.
* `label` ("More Actions") is the title and `aria-label` of the button and the menu. `icon` defaults to `more_vert`.
* `align: 'end'` (default) opens toward the left from the button's right edge, and `'start'` opens toward the right.
* The button has `aria-haspopup` and `aria-expanded`. Arrow Down and Up open it and move between items, skipping a disabled one. Home and End jump. Enter and Space choose. Escape closes and returns focus. Tab or an outside click closes.
* The list is a `role="menu"` of `role="menuitem"` buttons.

## Gotchas

* The list is absolutely positioned, so a parent with `overflow: hidden` can clip it.

## Used By

No plugin uses it today. Requests builds a menu in its web client.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/overflow-menu.html" title="Overflow Menu example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "overflow-menu.html"
```
