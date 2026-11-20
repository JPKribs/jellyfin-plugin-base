# Overflow Menu

A button, by default with the three dot icon, that opens a small menu of actions.

## Decision

| When | Use |
| :--- | :--- |
| The row actions of a table or card, when several buttons would crowd the row | Overflow Menu |
| The one action users need most | A [Row Button](row-button.md), never hidden in the menu |

## Usage

```js
import { createOverflowMenu } from './configurationpage?name=myplugin_jpkribs_shared.js';

var menu = createOverflowMenu({
    items: [{ label: 'Edit', value: 'edit' }, { label: 'Remove', value: 'remove', destructive: true }],
    onSelect: function (value) { act(value, row); }
});
cell.appendChild(menu.element);
```

Classes: `base-menu`, `base-menu-start`, `base-menu-list`, `base-menu-item`. The handle is `{ element, setItems, getItems, open, close, isOpen, destroy }`.

## States and Modifiers

* An item is `{ label, value, disabled, destructive, icon }`. `destructive` shows it red. `onSelect(value, item)` gets the item's label as the value when it has no `value`.
* `label` ("More actions") is the title and `aria-label` of the button and the menu. `icon` defaults to `more_vert`.
* `align: 'end'` (default) opens toward the left from the button's right edge, and `'start'` opens toward the right.
* The button has `aria-haspopup` and `aria-expanded`. Arrow Down and Up open it and move between items, skipping a disabled one. Home and End jump. Enter and Space choose. Escape closes and returns focus. Tab or an outside click closes.
* The list is a `role="menu"` of `role="menuitem"` buttons.

## Gotchas

* The list is fixed to the window, so a parent with `overflow: hidden` never clips it. It flips above the button when there is no room below, and it follows the button on a scroll.
* `setItems` replaces the items, so call it to change a label or disable an item.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createOverflowMenu`

<code>function createOverflowMenu(options?: OverflowMenuOptions): OverflowMenuHandle</code>

A button, by default with the three dot icon, that opens a small menu of actions. Arrow keys move between the items, Enter and Space choose one, Escape closes the menu and returns focus to the button, and a click outside closes it.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `items` | <code>OverflowMenuItem[]</code> | array of { label, value, disabled, destructive, icon } [optional] |
| `label` | <code>string</code> | title and aria-label of the button and the menu (default 'More actions') |
| `icon` | <code>string</code> | Material icon name on the button (default 'more_vert') |
| `align` | <code>'start' &#124; 'end'</code> | 'end' opens toward the left from the button's right edge, 'start' toward the right (default 'end') |
| `onSelect` | <code>(value: unknown, item: OverflowMenuItem): void</code> | function(value, item) called when an item is chosen [optional] |

| Handle member | Type |
| :--- | :--- |
| `setItems` | <code>(next: OverflowMenuItem[]): void</code> |
| `getItems` | <code>(): OverflowMenuItem[]</code> |
| `open` | <code>(): void</code> |
| `close` | <code>(): void</code> |
| `isOpen` | <code>(): boolean</code> |
| `destroy` | <code>(): void</code> |

| Type | What it is |
| :--- | :--- |
| `OverflowMenuItem` | One action in an overflow menu. An item with no value reports its label. |

| Class | What it looks like |
| :--- | :--- |
| `base-menu` | Wrapper that places a menu button and its floating list |
| `base-menu-list` | Floating list of actions on the base-float surface, fixed to the viewport, placed by the menu under the button, or above it with no room, and aligned to its right edge or its left with base-menu-start |
| `base-menu-item` | One action row built as base-icon-text, which tints on hover and focus, and shows red as destructive |

<!-- reference:end -->

## Example

<iframe class="base-preview" src="../../../assets/previews/overflow-menu.html" title="Overflow Menu example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "overflow-menu.html"
```
