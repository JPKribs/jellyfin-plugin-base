# Definition List

A read only list of label and value pairs. The label sits beside its value and stacks above it on a narrow screen. The columns layout sets each label over its value in balanced columns, with an optional route arrow between two items.

## When to Use

* Use it to show the details of one thing, such as a version and an id.
* Use the columns layout for a few short facts side by side, such as a last sync and a library, or a From and To route.

## When Not to Use

* Use a [Record Card](record-card.md) when the rows need the card surface.

## Usage

```js
import { createDefinitionList } from './configurationpage?name=myplugin_jpkribs_shared.js';

container.appendChild(createDefinitionList({
    items: [{ label: 'Version', value: '1.2.0' }, { label: 'Id', value: id, mono: true }]
}).element);
```

Set short facts side by side, with a size under each path and an arrow from source to local:

```js
container.appendChild(createDefinitionList({
    layout: 'columns',
    arrow: true,
    items: [
        { label: 'Source Path', value: sourcePath, mono: true, meta: '4.2 GB' },
        { label: 'Local Path', value: localPath, mono: true, note: 'Not synced yet.' }
    ]
}).element);
```

Classes: `base-defs`, `base-defs-row`, `base-defs-missing`, `columns`, `compact`, `has-arrow`. The handle is `{ element, getValue, setValue, setItems, setHeight, destroy }`.

Parts: `base-defs-label`, `base-defs-value`, `base-defs-meta`, `base-defs-note`, `base-defs-arrow`.

## States and Modifiers

* An item is `{ label, value, mono, meta, note, arrow }`. `mono` shows the value in the mono font. `meta`, such as a size, and `note` are dimmed small lines under the value, in either layout.
* A value may be a node, which is placed as it is, or `{ text, badge, link, mono }`. `badge` is a label or `{ label, color }` drawn as a [Badge](badge.md), `link` is an address that opens in a new tab with `text` as its words, and `mono` shows the text in the mono font.
* A missing value shows `emptyText`, "None" by default, dimmed with `base-defs-missing`.
* The list is a `dl`. A row is one column at 600px and below.
* `layout: 'columns'` sets each label small, uppercase, and dimmed over its value, with `columns`, in [balanced rows](balanced-rows.md) at least 200px wide on the wash. The List lays it out as a grid. `layout: 'rows'`, the default, keeps each label beside its value.
* In the columns layout, `arrow: true` draws an `arrow_forward` after every item but the last, and `arrow: true` on an item draws one after that item, with `has-arrow` on its row. When two columns no longer fit the list's own width it takes `compact`, the columns stack, and each arrow turns down.
* The rows are a [List](list.md), so `height`, `maxHeight`, `minHeight`, and `setHeight` work as they do there. `height` is `'auto'` by default, so the list grows with its rows.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createDefinitionList`

<code>function createDefinitionList(options?: DefinitionListOptions): DefinitionListHandle</code>

A read-only list of label and value pairs. The label sits beside its value and stacks above it on a narrow screen. The columns layout sets each label over its value, in balanced columns on the wash, and a route arrow between two items, such as From and To, turns down when the items stack.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `items` | <code>DefinitionItem[]</code> | array of { label, value, mono, meta, note, arrow } where value is text, a node, or { text, badge, link, mono }, a badge is a label or { label, color }, a link opens in a new tab, mono shows the value in the mono font, meta and note are dimmed lines under the value, and arrow draws a route arrow after the item [optional] |
| `layout` | <code>'rows' &#124; 'columns'</code> | 'rows' sets each label beside its value, and 'columns' sets it over its value, in balanced columns on the wash (default 'rows') |
| `arrow` | <code>boolean</code> | true draws a route arrow between every two items, in one row that stacks when narrow (default false) |
| `emptyText` | <code>string</code> | text for a missing value (default 'None') |
| `height` | <code>ListHeight</code> | the list's height, 'auto', 'fill', a number of pixels, or a CSS length (default 'auto') |
| `maxHeight` | <code>number &#124; string &#124; null</code> | the most the list grows to before it scrolls [optional] |
| `minHeight` | <code>number &#124; string &#124; null</code> | the least a filling list takes (default 160px) [optional] |

| Handle member | Type |
| :--- | :--- |
| `getValue` | <code>(): DefinitionItem[]</code> |
| `setValue` | <code>(next: DefinitionItem[]): void</code> |
| `setItems` | <code>(next: DefinitionItem[]): void</code> |
| `setHeight` | <code>(height: ListHeight, maxHeight?: number &#124; string &#124; null): void</code> |
| `destroy` | <code>(): void</code> |

| Type | What it is |
| :--- | :--- |
| `DefinitionValue` | A value drawn as more than text: a badge with a status color name or hex code, a link, or text in the mono font. text is the shown text, which a badge or link may also give. |
| `DefinitionItem` | One label and value pair. value is text, a node, or a DefinitionValue, and mono shows a text value in the mono font. meta and note are dimmed lines under the value, and arrow draws a route arrow after the item. |

| Class | What it looks like |
| :--- | :--- |
| `base-defs` | Read-only list of labels and values, side by side and stacked on a narrow screen |
| `base-defs-label` | The dimmed label every label and value list shares, a definition list's and a record card's |
| `base-defs-meta` | Dimmed lines under a value, a meta line such as a size and a note, in the value's column |
| `base-defs-value` | A value drawn as a badge, a link, or mono text, which wrap beside each other |
| `base-defs.columns` | The columns layout, each small uppercase label over its value, in balanced columns on the wash |

<!-- reference:end -->

## Used By

No plugin uses it today.

## Example

<iframe class="base-preview" src="../../../assets/previews/definition-list.html" title="Definition List example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "definition-list.html"
```
