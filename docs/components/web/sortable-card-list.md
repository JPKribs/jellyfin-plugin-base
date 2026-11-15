# Sortable Card List

Records as cards in priority order. Each card has a numbered head with a status dot, badges, up and down arrows, and a drag handle, plus a body that the open card shows. One editor element moves into whichever card is open.

## When to Use

* Use it for a short ordered list where each record opens an editor, such as servers or channels.

## When Not to Use

* Use an [Ordered List](ordered-list.md) for ranking with no editor, and a [Paginated Table](paginated-table.md) for a long list.

## Usage

```html
<div id="serverList" class="jpk-card-list"></div>
<div class="jpk-card-list-actions">
    <button is="emby-button" type="button" id="btnAddServer" class="raised jpk-icon-btn jpk-button-submit">
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

The handle is `{ render, setItems, getSelected, setSelected, destroy }`.

Classes: `jpk-card-list`, `jpk-card-item`, `jpk-card-item-head`, `jpk-card-item-head-static`, `jpk-card-item-grip`, `jpk-card-item-num`, `jpk-card-item-main`, `jpk-card-item-title`, `jpk-card-item-sub`, `jpk-card-item-sub-text`, `jpk-card-item-tags`, `jpk-card-item-dot`, `jpk-card-item-arrows`, `jpk-card-item-chevron`, `jpk-card-item-body`, `jpk-card-list-actions`.

## States and Modifiers

* `render(item, index)` returns `{ title, subtitle, badges: [{ label, cls }], dot, dotTitle, disabled }`. `dot` is `'ok'`, `'bad'`, `'checking'`, or `'none'` to omit it, and any other word gives a gray dot. `cls` is a badge color, `gray` by default.
* The editor parks in a hidden holder after the list while the list re-renders, so its fields and bindings survive.
* `setSelected(index, { collapsed })` opens a card and calls `onSelect`. A bad index clears the selection. `setItems(next)` re-renders and clamps the selection. `getSelected()` is the open index or -1.
* `reorder` (default true) turns on the arrows and drag. `collapsible` (default true) lets a click on the open head fold it. False keeps the open card open.
* A click, Enter, or Space on a head opens the card. The keys are handled only when the head itself has focus.
* A card can be `selected`, `collapsed`, `disabled`, or `dragging`. `drop-before` and `drop-after` draw a 3px accent line above or below the drop target.
* The head is `role="button"` with `aria-expanded`. The arrow buttons are titled "Move Up" and "Move Down".
* At 768px and below the mono subtitle line is hidden. `jpk-card-item-sub-text` stays, for words rather than an address.
* The same card classes make a plain record list without the helper. A head with `jpk-card-item-head-static` only holds a control at its end.

## Gotchas

* Pass the editor as an element already in the page.
* The badge `cls` and the dot class are escaped, not reduced to class names.
* `render` runs for every card on each render, so keep it cheap. A move does not call `onSelect`.
* `createSortableCardList` throws without a list element or a `render` function.

## Used By

Server Sync uses it for its server list. Requests uses `jpk-card-item-head-static`, `jpk-card-item-sub-text`, and `jpk-card-item-tags` for plain record lists.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/sortable-card-list.html" title="Sortable Card List example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "sortable-card-list.html"
```
