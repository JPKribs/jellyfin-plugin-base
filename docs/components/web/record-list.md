# Record List

A [List](list.md) of static rows, each a title, a secondary line, tags with an icon and an off state, and at its end a chevron that opens the row or an aside control. Each row is a boxed `base-item-row` whose title and secondary text line up down the list, and a refresh keeps the rows that did not change.

## When to Use

* Use it for a short list of records the reader opens one at a time, such as destinations, rules, or accounts.

## When Not to Use

* Use a [Sortable Card List](sortable-card-list.md) when the records are ordered and edited in place, and a [Data Table](data-table.md) for many records with columns.

## Usage

```js
import { createRecordList } from './configurationpage?name=myplugin_jpkribs_shared.js';

var list = createRecordList({
    items: destinations.map(function (d) {
        return { id: d.Id, title: d.Name, secondary: d.Url, tags: d.Libraries.map(function (l) { return { label: l.Name, icon: 'video_library', off: !l.Enabled }; }) };
    }),
    onOpen: function (item) { openEditor(item.id); }
});
view.querySelector('#listHost').appendChild(list.element);
```

Classes: `base-record-list`, `base-record-list-row`, `base-record-list-body`, `base-record-list-tags`, `base-record-list-open`, `base-record-list-aside`, and the List's `base-item-row` parts. The handle is `{ element, getValue, setValue, setItems, setHeight, destroy }`.

## States and Modifiers

* An item is `{ id, title, secondary, tags, aside }`. A tag is `{ label, icon, off }`. An off tag is faded and struck through, `base-tag-off`, with a hidden word, "off" by `offText`.
* With `onOpen` a row opens by a click, by Enter or Space, and by its chevron, "Open {value}" by `openLabel`.
* `aside` is a node or a handle with an `element`, such as a button, drawn in place of the chevron. A click on it opens nothing.
* `label` sets the list's `aria-label`.
* `rowKey` names a row, `id` by default, so `setItems` keeps a row whose content did not change.
* `emptyText` shows while there is no row, "Nothing to show." by default. `height`, `maxHeight`, and `minHeight` work as a List's do.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createRecordList`

<code>function createRecordList(options?: RecordListOptions): RecordListHandle</code>

A List of static rows, each a title, a secondary line, tags with an icon and an off state, and at its end a chevron that opens the row or an aside control. Each row is a boxed item row whose title and secondary text line up down the list, and a refresh keeps the rows whose title, secondary line, and tags did not change, with their aside.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `items` | <code>RecordListItem[] &#124; null</code> | array of { id, title, secondary, tags: [{ label, icon, off }], aside } [optional] |

| Handle member | Type |
| :--- | :--- |
| `getValue` | <code>(): RecordListItem[]</code> |
| `setValue` | <code>(next: RecordListItem[] &#124; null): void</code> |
| `setItems` | <code>(next: RecordListItem[] &#124; null): void</code> |
| `setHeight` | <code>(height: ListHeight, maxHeight?: number &#124; string &#124; null): void</code> |
| `destroy` | <code>(): void</code> |

| Type | What it is |
| :--- | :--- |
| `RecordListTag` | A tag on a record row. icon is a Material icon before its label, and off shows it faded and struck through, such as a destination that is turned off. |
| `RecordListItem` | One record row. aside is a control drawn at the row's end in place of the chevron, such as a button or a toggle. |

| Class | What it looks like |
| :--- | :--- |
| `base-record-list.base-list.plain` | A List of boxed record rows a gap apart |
| `base-record-list-row` | One record row: its title and secondary line, its tags under them, and a chevron or an aside control at its end. A row that opens takes the shared hover and focus ring |
| `base-record-list-tags` | The row's tags, each an icon and a label, which wrap under the text |
| `base-record-list-open` | The chevron at the end of a row that opens, and the aside control that takes its place |

<!-- reference:end -->

## Used By

No plugin uses it today.

## Example

<iframe class="base-preview" src="../../../assets/previews/record-list.html" title="Record List example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "record-list.html"
```
