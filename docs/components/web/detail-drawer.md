# Detail Drawer

A panel that slides in from the right edge to show the details of one item, with a header, a body that scrolls, and optional footer buttons. It is a [Dialog](dialog.md) on the same panel and the same modal behavior, docked to the edge.

## When to Use

* Use it to open a row of a [Filtered List](filtered-list.md) or a [Data Table](data-table.md) and show everything about it.

## When Not to Use

* Use an [Editor Dialog](editor-dialog.md) to edit a record with change tracking, and a [Dialog](dialog.md) for a short task.

## Usage

```js
import { detailDrawerOpener, createDataTable, createDefinitionList } from './configurationpage?name=myplugin_jpkribs_shared.js';

var show = detailDrawerOpener(function (row) {
    return {
        title: row.name,
        subtitle: row.kind + ' on ' + row.peer,
        badge: { label: row.state, color: row.state },
        body: createDefinitionList({ items: [{ label: 'Items', value: row.items }, { label: 'Size', value: row.size }] }).element,
        buttons: [{ text: 'Done', className: 'base-button primary' }]
    };
});
var table = createDataTable({ columns: columns, rows: rows, onOpen: show });
```

`openDetailDrawer(options)` opens one directly and returns `{ element, content, close, dismiss, isOpen, setTitle, setContent, destroy }`, where `content` is the body.

## States and Modifiers

* The header shows `title`, an optional `subtitle` under it, and an optional `badge` beside it, `{ label, color }`, where `color` is a status color name, a hex code, or a [Badge](badge.md) state name. The close button sits in the top right corner, inset by the panel's padding, as in every dialog.
* The body scrolls on its own between the header and the footer. `body` is HTML or a node.
* `buttons` is the footer, a dialog button row pinned to the bottom, as [Dialog](dialog.md) takes them. A destructive button sits apart on the left.
* `size` takes its width from the dialog scale: `small` is 40% of the window, `medium` 60% (the default), and `large` 80%. Below 700px the drawer is a full screen sheet that slides up.
* `setContent({ title, subtitle, badge, body, buttons })` swaps what it shows without closing it. A footer button that swaps the content, such as Next, keeps focus on the same button in the new footer.
* `detailDrawerOpener(render, options)` returns a function for `onOpen`. The first item opens a drawer, and each later item swaps its content in while it is open.
* Escape, the backdrop, and the close button close it, asking `beforeClose` first. Focus moves in, stays inside, and returns to the row that opened it, and the page behind does not scroll.
* The slide is off under `prefers-reduced-motion: reduce`.

## Gotchas

* A string `body` is HTML, so escape data in it.
* The drawer is modal, so the rows behind it cannot be clicked while it is open. Swap items from inside it, such as with Previous and Next.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `openDetailDrawer`

<code>function openDetailDrawer(opts?: DetailDrawerOptions): DetailDrawerHandle</code>

Opens a detail drawer, a dialog that slides in from the right edge, with a header of a title, an optional subtitle and badge, and the close button in its corner, a body that scrolls, and an optional footer of buttons. Below the compact width it is a full screen sheet that slides up. It closes, traps focus, locks the page scroll, and returns focus as every dialog does.

| Option | Type | What it does |
| :--- | :--- | :--- |

| Handle member | Type |
| :--- | :--- |
| `element` | <code>HTMLDivElement</code> |
| `content` | <code>HTMLDivElement</code> |
| `close` | <code>(value?: unknown): void</code> |
| `dismiss` | <code>(): void</code> |
| `isOpen` | <code>(): boolean</code> |
| `setTitle` | <code>(text: string): void</code> |
| `setContent` | <code>(next: DetailDrawerContent): void</code> |
| `destroy` | <code>(): void</code> |

### `detailDrawerOpener`

<code>function detailDrawerOpener&lt;T&gt;(render: (item: T) =&gt; DetailDrawerContent, opts?: DetailDrawerOptions): (item: T) =&gt; DetailDrawerHandle</code>

Returns a function that shows an item in a detail drawer, for a Filtered List's or Data Table's onOpen. It opens the drawer for the first item, and while that drawer is open it swaps in the next item's content without closing it.

| Option | Type | What it does |
| :--- | :--- | :--- |

| Type | What it is |
| :--- | :--- |
| `DetailDrawerContent` | What a detail drawer shows: a title, an optional subtitle and badge, the body, and the footer buttons. |

| Class | What it looks like |
| :--- | :--- |
| `base-dialog.base-drawer` | A dialog overlay whose panel docks to the right edge of the window at full height |
| `base-dialog-content.base-drawer-content` | The drawer panel, as wide as a dialog of its size, that slides in from the right with its header and footer fixed and its body scrolling between them |
| `base-drawer-head` | The drawer header, the title with its badge and the subtitle under it, clear of the close button |
| `base-drawer-badge` | The badge beside the drawer title |
| `base-drawer-subtitle` | The dimmed line under the drawer title |
| `base-drawer-content` | The drawer body, which scrolls on its own between the header and the footer, edge to edge so its scroll bar sits at the panel edge |

<!-- reference:end -->

## Used By

No plugin uses it today.

## Example

<iframe class="base-preview" src="../../../assets/previews/detail-drawer.html" title="Detail Drawer example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "detail-drawer.html"
```
