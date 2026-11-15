# Sortable Card List

Records as cards in priority order. Each card has a numbered head with a status dot, badges, up and down arrows, and a drag handle, plus a body that the open card shows. One editor element moves into whichever card is open.

## Decision

| When | Use |
| :--- | :--- |
| A short ordered list where each record opens an editor, such as servers or channels | Sortable Card List |
| Ranking with no editor | [Ordered List](ordered-list.md) |
| A long list | [Paginated Table](paginated-table.md) |

## Usage

```html
<div id="serverList" class="base-card-list"></div>
<div class="base-card-list-actions">
    <button is="emby-button" type="button" id="btnAddServer" class="raised base-button primary">
        <span class="material-icons" aria-hidden="true">add</span><span>Add Server</span>
    </button>
</div>
<div id="serverEditorHolder" class="hidden"><div id="serverEditor"></div></div>
```

```js
import { createSortableCardList } from './configurationpage?name=myplugin_jpkribs_shared.js';

var cards = createSortableCardList(view.querySelector('#serverList'), {
    items: servers,
    editor: view.querySelector('#serverEditor'),
    collapsible: false,
    render: function (server, index) {
        return { title: server.Name, subtitle: server.Url, dot: server.Ok ? 'ok' : 'bad',
                 disabled: server.IsEnabled === false, badges: [{ label: server.Mode, cls: 'blue' }] };
    },
    onBeforeLeave: function (index) { readEditorInto(servers[index]); },
    onSelect: function (index) { loadEditor(servers[index]); },
    onMove: function (from, to) { saveOrder(); }
});
cards.setSelected(0);
```

The handle is `{ render, setItems, getSelected, setSelected, setHeight, destroy }`.

Classes: `base-card-list`, `base-card-item`, `base-card-item-head`, `base-card-item-head-static`, `base-card-item-grip`, `base-card-item-num`, `base-card-item-main`, `base-card-item-title`, `base-card-item-sub`, `base-card-item-sub-text`, `base-card-item-tags`, `base-card-item-arrows`, `base-card-item-chevron`, `base-card-item-body`, `base-card-list-actions`. The dot is a [Status Dot](status-dot.md), `base-dot`, the badges are [Badges](badge.md), and the chevron is the [Collapsible Section](collapsible-section.md) chevron, `base-collapsible-icon`, which turns by the head's `aria-expanded`.

## States and Modifiers

* `render(item, index)` returns `{ title, subtitle, badges: [{ label, cls }], dot, dotTitle, disabled }`. `dot` is `'ok'` (green), `'bad'` (red), `'checking'` (orange), `'unknown'` (gray), a status color name or hex code, or `'none'` to omit it, and any other word gives a gray dot. `dotTitle` names the dot as its title and `aria-label`, and defaults to Active, Error, Checking, Unknown, or the color's meaning. `cls` is a badge color or hex code, with `medium`, `large`, or other classes beside it, `gray` by default.
* The editor parks in a hidden holder after the list while the list re-renders, so its fields and bindings survive.
* `setSelected(index, { collapsed })` opens a card and calls `onSelect`. A bad index clears the selection. `setItems(next)` re-renders and clamps the selection. `getSelected()` is the open index or -1.
* `height`, `maxHeight`, and `minHeight` set the height of the list as a [List](list.md) takes them, `'auto'` by default so the list grows with the page. `setHeight(height, maxHeight)` changes them later.
* `reorder` (default true) turns on the arrows and drag. `collapsible` (default true) lets a click on the open head fold it. False keeps the open card open.
* A click, Enter, or Space on a head opens the card. The keys are handled only when the head itself has focus.
* A card can be `selected`, `collapsed`, `disabled`, or `dragging`. `drop-before` and `drop-after` draw a 3px accent line above or below the drop target.
* The head is `role="button"` with `aria-expanded`. The arrow buttons are titled "Move Up" and "Move Down" and labelled "Move {value} up" and "Move {value} down", where `{value}` is the card's title or "Item 2". `moveUpTitle`, `moveDownTitle`, `moveUpLabel`, and `moveDownLabel` replace them, and after a move focus stays on the pressed arrow, or the other one when it is now disabled.
* At 768px and below the mono subtitle line is hidden. `base-card-item-sub-text` stays, for words rather than an address.
* The same card classes make a plain record list without the helper. A head with `base-card-item-head-static` only holds a control at its end.

## Gotchas

* Pass the editor as an element already in the page.
* The badge `cls` is reduced to class names, and the badge label and dot name go through the built in escaper, not the `escapeHtml` option.
* `render` runs for every card on each render, so keep it cheap. A move does not call `onSelect`.
* `createSortableCardList` throws without a list element or a `render` function.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createSortableCardList`

<code>function createSortableCardList&lt;T = any&gt;(listEl: HTMLElement, options: SortableCardListOptions&lt;T&gt;): SortableCardListHandle&lt;T&gt;</code>

Renders records as numbered cards with a status dot, badges, arrow and drag reordering, and a body the open card shows. One editor element moves into whichever card is open, so its fields and bindings survive a re-render.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `items` | <code>T[]</code> | array of records in priority order, replaced with setItems [optional] |
| `render` (required) | <code>(item: T, index: number): CardSpec &#124; null &#124; undefined</code> | function(item, index) returning { title, subtitle, badges: [{ label, cls }], dot: 'ok'&#124;'bad'&#124;'checking'&#124;'unknown'&#124;'none', dotTitle, disabled } [required] |
| `editor` | <code>HTMLElement &#124; null</code> | element placed inside the open card's body [optional] |
| `onSelect` | <code>(index: number): void</code> | function(index) called when a card opens, before the editor is placed [optional] |
| `onBeforeLeave` | <code>(index: number): void</code> | function(index) called when the open card is left, to read the editor back [optional] |
| `onMove` | <code>(fromIndex: number, toIndex: number): void</code> | function(fromIndex, toIndex) called after a reorder, so the caller can save [optional] |
| `reorder` | <code>boolean</code> | allow arrows and drag (default true) |
| `collapsible` | <code>boolean</code> | clicking the open head folds it and a chevron shows the state, where false keeps the open card open (default true) |
| `escapeHtml` | <code>(str: unknown): string</code> | function(str) returning a safe string (default the built in escaper) |
| `moveUpTitle` | <code>string</code> | tooltip of an up arrow (default 'Move Up') |
| `moveDownTitle` | <code>string</code> | tooltip of a down arrow (default 'Move Down') |
| `moveUpLabel` | <code>RowLabel</code> | aria-label of an up arrow, where {value} is the card's title or "Item 2", or a function(name) returning it (default 'Move {value} up') |
| `moveDownLabel` | <code>RowLabel</code> | aria-label of a down arrow, where {value} is the card's title or "Item 2", or a function(name) returning it (default 'Move {value} down') |
| `height` | <code>ListHeight</code> | height of the list, as createList takes it (default 'auto') |
| `maxHeight` | <code>number &#124; string &#124; null</code> | height past which the list scrolls [optional] |
| `minHeight` | <code>number &#124; string &#124; null</code> | least height of a filling list [optional] |

| Handle member | Type |
| :--- | :--- |
| `render` | <code>(): void</code> |
| `setItems` | <code>(next: T[] &#124; null): void</code> |
| `getSelected` | <code>(): number</code> |
| `setSelected` | <code>(index: number &#124; null, opts?: { collapsed?: boolean; }): void</code> |
| `setHeight` | <code>(height: ListHeight, maxHeight?: number &#124; string &#124; null): void</code> |
| `destroy` | <code>(): void</code> |

| Type | What it is |
| :--- | :--- |
| `CardSpec` | What render returns for one card. dot picks the status dot, and a disabled card is dimmed. |

| Class | What it looks like |
| :--- | :--- |
| `base-card-list` | Vertical list of record cards in priority order, each with a head row and a body the open card shows |
| `base-card-item` | One record card. selected marks the open one, collapsed folds it, disabled dims its text, dragging fades it |
| `base-card-item-head` | Clickable head row: grip, number, main text, arrows, and the collapsible chevron, which turns by its aria-expanded. Tinted when the card is open |
| `base-card-item-grip` | Drag handle icon at the left of the head |
| `base-card-item-num` | Round priority number, filled with the accent on the open card |
| `base-card-item-main` | Title line and sub line that take the remaining width and clip |
| `base-card-item-title` | Bold title line that clips with an ellipsis |
| `base-card-item-sub` | Small dimmed mono sub line that clips with an ellipsis |
| `base-card-item-sub.base-card-item-sub-text` | The sub line in the page's own font, for words rather than an address or path |
| `base-card-item-head.base-card-item-head-static` | A head row that only holds a control at its end (such as Unblock) opens nothing itself |
| `base-card-item-body` | Body shown only inside the open, unfolded card |
| `base-card-list-actions` | Action row under the list, for an Add button |

<!-- reference:end -->

## Example

<iframe class="base-preview" src="../../../assets/previews/sortable-card-list.html" title="Sortable Card List example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "sortable-card-list.html"
```
