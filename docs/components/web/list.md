# List

`createList` is the frame around any list of items. It owns the layout, the height, and the empty and loading states, and a `render` function owns each item's content, so a list of media cards, text, or any other component behaves the same way.

With `key`, `setItems` keeps every item whose key and content are unchanged and draws only the rest, so a list that refreshes on a timer keeps its scroll position and focus. A boxed row (`base-item-row`) whose text has a `base-item-row-primary` and a `base-item-row-secondary` part shares the widest primary width across the list, so every secondary text starts at the same place, and wraps under the primary on a narrow row. The List also owns the one selected look every list shares, the accent wash with a leading bar.

## When to Use

* Use it for any list of items a plugin builds, such as a queue, a set of results, or a history.
* Use it when a list needs a fixed height, a height that fills the window, or more items as the user scrolls.

## When Not to Use

* Use a [Filtered List](filtered-list.md) when the reader searches, filters, sorts, or selects the items.
* Use a [Data Table](data-table.md) for rows with columns that sort, or a [Paginated Table](paginated-table.md) for rows a server pages through.
* Use a [Sortable Card List](sortable-card-list.md) or an [Ordered List](ordered-list.md) when the reader reorders or edits the items.

## Usage

```js
import { createList, createMediaCard } from './configurationpage?name=myplugin_jpkribs_shared.js';

var list = createList({
    items: rows,
    render: function (row) { return createMediaCard({ title: row.name, subtitle: row.state }); },
    height: 'fill',
    emptyText: 'Nothing in the queue.'
});
container.appendChild(list.element);
```

`render` returns text, a node, or a component handle such as a media card's. Text is shown as text, never as markup. A handle's `destroy` runs when its item is replaced.

Classes: `base-list`, `base-list-item`. The handle is `{ element, emptyElement, getItems, setItems, append, removeFirst, setHeight, setLoading, scrollToStart, scrollToEnd, cellAt, destroy }`. `removeFirst(count)` drops the oldest items, such as the head of a capped log, and `cellAt(index)` returns the element that holds an item.

## Heights

| `height` | What it does |
| :--- | :--- |
| `'auto'` (default) | Grows with its items, and the page scrolls. |
| A number or a CSS length, such as `240` or `'40vh'` | A fixed height that scrolls inside. |
| `'fill'` | Reaches from the list's top to the bottom of the window, then scrolls inside. A list that starts below the first screen is as tall as the window. Inside a bounded flex column, it also takes the room left. |

* `maxHeight` lets a growing list grow up to a cap, then scroll inside, so a short list stays short.
* `minHeight` is the least a filling list takes, 160px by default. `fillGap` is the room kept below it, 16px by default.
* `setHeight(height, maxHeight)` switches modes later.

## States and Modifiers

* `layout` is `rows` (default), bordered rows with a divider between items, `grid`, tiles in as many columns as fit with `minColumn` as the least width, or `plain`, with no frame.
* `emptyText` is "Nothing to show." by default. `setLoading(true)` shows `loadingText`, "Loading" by default, as a status line.
* A `ul` or `ol` list, or one with `emptyOutside: true`, keeps its empty sentence outside itself as `base-list-empty outside`. The caller places `handle.emptyElement` after the list, and the list shows and hides it. A `ul` or `ol` list's loading line is an `li`.
* A component that shows an empty sentence passes it as `emptyText` rather than building its own, so one rule styles every empty list.
* `onEndReached` runs when the end comes into view, so a page can load more and call `append`. It watches the list when it scrolls inside, and the window when it grows, and waits while the list is loading.
* `element` makes an element the page already has into the list, keeping its own classes.
* `key` names an item by a property or a function. Without one, `setItems` draws every item again.
* `label` sets the list's `aria-label`. `role` replaces the `list` role, and `null` sets none, for an element that already carries its meaning.
* `wrap: false` makes each rendered node the item itself rather than wrapping it in a `base-list-item` cell, so a row keeps its place in the markup.

## Gotchas

* A filling list measures its place again when the window resizes or the page changes height. A list hidden when it measures takes its `minHeight` until it shows.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createList`

<code>function createList&lt;T = any&gt;(options: ListOptions&lt;T&gt;): ListHandle&lt;T&gt;</code>

Builds a list. The list is the frame, its height, and its empty and loading states. Each item's content comes from render, so any Base component, such as a media card, can sit inside it. With key, setItems keeps every item whose key and content are unchanged and draws only the rest, so a list that refreshes on a timer keeps its scroll position and focus.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `items` | <code>T[] &#124; null</code> |  |
| `render` (required) | <code>(item: T, index: number): ListContent</code> |  |
| `element` | <code>HTMLElement &#124; null</code> |  |
| `layout` | <code>ListLayout</code> |  |
| `height` | <code>ListHeight</code> |  |
| `maxHeight` | <code>number &#124; string &#124; null</code> |  |
| `minHeight` | <code>number &#124; string &#124; null</code> |  |
| `fillGap` | <code>number</code> |  |
| `minColumn` | <code>number &#124; string</code> |  |
| `label` | <code>string</code> |  |
| `role` | <code>string &#124; null</code> |  |
| `wrap` | <code>boolean</code> |  |
| `emptyText` | <code>string &#124; null</code> |  |
| `emptyOutside` | <code>boolean</code> |  |
| `loadingText` | <code>string</code> |  |

| Handle member | Type |
| :--- | :--- |
| `getItems` | <code>(): T[]</code> |
| `setItems` | <code>(items: T[] &#124; null &#124; undefined): void</code> |
| `append` | <code>(items: T[] &#124; null &#124; undefined): void</code> |
| `removeFirst` | <code>(count: number): void</code> |
| `setHeight` | <code>(height: ListHeight, maxHeight?: number &#124; string &#124; null): void</code> |
| `setLoading` | <code>(loading: boolean): void</code> |
| `scrollToStart` | <code>(): void</code> |
| `scrollToEnd` | <code>(): void</code> |
| `cellAt` | <code>(index: number): HTMLElement &#124; null</code> |
| `emptyElement` | <code>HTMLElement</code> |
| `destroy` | <code>(): void</code> |

| Type | What it is |
| :--- | :--- |
| `ListHeight` | How tall a list is. `auto` grows with its items so the page scrolls. A number of pixels or a CSS length is a fixed height that scrolls inside. `fill` takes the room from the list's top to the bottom of the window, then scrolls inside. |
| `ListLayout` | How a list lays out its items. `rows` are bordered rows with dividers, `grid` is tiles, `plain` has no frame. |
| `ListItemHandle` | A rendered item with its own teardown, such as the handle a Base component returns. |
| `ListContent` | What a list's render function returns for one item. Text is shown as text, never as markup. |
| `ItemRowParts` | The two parts of a boxed row's text: the primary text, and a dimmed secondary text that starts at the same place on every row of a list. |

| Class | What it looks like |
| :--- | :--- |
| `base-list` | A column of items, bordered rows by default, that may scroll inside a fixed or filling height |
| `base-list.rows` | Rows drawn as one bordered block with a divider between items |
| `base-list.grid` | Tiles in as many columns as fit, each at least --base-list-column wide |
| `base-list.scrolls` | A list that scrolls inside itself rather than growing the page |
| `base-list.fill` | A list that reaches from its top to the bottom of the window, and flexes inside a bounded column |
| `base-list-item.openable` | An item that opens or is picked by a click, with the shared row hover, and an accent ring for a keyboard user |
| `base-list-item.selected` | A selected item or row, in the accent wash with a leading accent bar, the one selection look every list shares |
| `base-list-item.text` | A text item, padded the way a component in a row pads itself |
| `base-list-empty` | The sentence a list shows while it holds no items |
| `base-list-empty.outside` | The empty sentence of a ul or ol list, which sits after the list rather than in it |
| `base-item-row` | A boxed row that looks like a field and is at least a field tall, with its text and row buttons centered, as in a string list |
| `base-item-row-parts` | A row's text in two parts, a primary and a dimmed secondary that starts at the same place on every row of the list, and wraps under the primary when the row is too narrow for both |

<!-- reference:end -->

## Used By

No plugin uses it today.

## Example

<iframe class="base-preview" src="../../../assets/previews/list.html" title="List example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "list.html"
```
