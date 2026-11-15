# Tree View

Nested rows that open and close, on a [List](list.md) with the collapsible pattern. Children can load when a node opens, through a promise. With `selectable` each node has a checkbox through the selection core, and a parent is checked, partly checked, or clear from its children. A node can show a thumbnail through the thumb core.

## Decision

| When | Use |
| :--- | :--- |
| Picking from a hierarchy, such as libraries, series, seasons, and episodes, or folders | Tree View |
| Picking one server folder | [Folder Picker](folder-picker.md) |
| A flat list | [Checkbox List](checkbox-list.md) |

## Usage

```js
import { createTreeView } from './configurationpage?name=myplugin_jpkribs_shared.js';

var tree = createTreeView({
    nodes: libraries.map(function (l) { return { id: l.Id, label: l.Name, icon: 'video_library', hasChildren: true }; }),
    loadChildren: function (node) {
        return shared.apiRequest('Items?parentId=' + node.id, 'GET').then(function (r) {
            return r.Items.map(function (i) { return { id: i.Id, label: i.Name, image: itemImage(i), imageShape: 'portrait', hasChildren: i.IsFolder }; });
        });
    },
    selectable: true,
    value: config.ItemIds,
    onChange: function (ids) { config.ItemIds = ids; }
});
view.querySelector('#treeHost').appendChild(tree.element);
```

Classes: `base-tree`, `base-tree-row`, `base-tree-toggle`, `base-tree-spacer`, `base-tree-check`, `base-tree-icon`, `base-tree-thumb`, `base-tree-text`, `base-tree-loading`. The handle is `{ element, getValue, setValue, setNodes, expand, collapse, destroy }`.

## States and Modifiers

* A node is `{ id, label, secondary, icon, image, imageShape, children, hasChildren }`. `children` are known children. `hasChildren` marks a node whose children `loadChildren(node)` fetches when it first opens, while the node says "Loading" by `loadingText`. A failed load closes it again.
* The open button turns its `expand_more` chevron by `aria-expanded`, and is named "Expand {value}" or "Collapse {value}".
* With `selectable`, checking a node checks every loaded node under it. A parent is checked when all its children are, partly checked when some are, and clear otherwise, and is in `getValue()` only while checked. Children that load under a checked parent start checked. A value may name a parent alone.
* The tree is `role="tree"` with `treeitem` rows that carry `aria-level`, `aria-expanded`, and `aria-checked`, and one row takes focus at a time. Up and Down move, Right opens or moves to the first child, Left closes or moves to the parent, Home and End go to the ends, Space checks, and Enter calls `onOpen(node)`, or opens and closes without it.
* A click on a row calls `onOpen`, or opens it, or checks a leaf.
* `expanded` names the nodes that start open, and `expand(id)` resolves once the children show.
* `label` names the tree, "Tree" by default. `selectLabel` names each checkbox, "Select {value}" by default. `emptyText` shows while there is no node, "Nothing to show." by default, and `height`, `maxHeight`, and `minHeight` work as a List's do.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createTreeView`

<code>function createTreeView(options?: TreeViewOptions): TreeViewHandle</code>

Nested rows that open and close, on a List with the collapsible pattern. Children can load when a node opens, through a promise. With selectable each node has a checkbox through the selection core, and a parent is checked, partly checked, or clear from its children. Arrow keys move and open, Enter opens, Space checks, and a node can show a thumbnail through the thumb core.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `nodes` | <code>TreeNode[] &#124; null</code> | array of { id, label, secondary, icon, image, imageShape, children, hasChildren } [optional] |
| `loadChildren` | <code>(node: TreeNode): Promise&lt;TreeNode[]&gt; &#124; TreeNode[]</code> | function(node) returning the node's children, or a promise of them, when a node with hasChildren opens [optional] |
| `selectable` | <code>boolean</code> | true draws a checkbox on each node (default false) |
| `value` | <code>unknown[] &#124; null</code> | the ids that start checked [optional] |
| `expanded` | <code>unknown[] &#124; null</code> | the ids that start open [optional] |
| `label` | <code>string</code> | aria-label of the tree (default 'Tree') |
| `emptyText` | <code>string</code> | shown while there is no node (default 'Nothing to show.') |
| `loadingText` | <code>string</code> | shown on a node while its children load (default 'Loading') |
| `expandLabel` | <code>string</code> |  |
| `collapseLabel` | <code>string</code> |  |
| `selectLabel` | <code>string</code> | aria-label of a checkbox, where {value} is the label (default 'Select {value}') |
| `height` | <code>ListHeight</code> |  |
| `maxHeight` | <code>number &#124; string &#124; null</code> |  |
| `minHeight` | <code>number &#124; string &#124; null</code> |  |
| `onChange` | <code>(ids: string[]): void</code> | function(ids) after the checked ids change [optional] |
| `onOpen` | <code>(node: TreeNode): void</code> | function(node) when a node is clicked or gets Enter [optional] |

| Handle member | Type |
| :--- | :--- |
| `getValue` | <code>(): string[]</code> |
| `setValue` | <code>(ids: unknown[] &#124; null): void</code> |
| `setNodes` | <code>(nodes: TreeNode[] &#124; null): void</code> |
| `expand` | <code>(id: unknown): Promise&lt;void&gt;</code> |
| `collapse` | <code>(id: unknown): void</code> |
| `destroy` | <code>(): void</code> |

| Type | What it is |
| :--- | :--- |
| `TreeNode` | One node of the tree. children are known children, and hasChildren marks a node whose children loadChildren fetches when it opens. image is a thumbnail address. |

| Class | What it looks like |
| :--- | :--- |
| `base-tree.base-list.plain` | A List of nested rows that open and close, one row per visible node |
| `base-tree-row` | One node: indented by its level, then its open button, its checkbox, its picture, and its text. The focused row takes an accent ring, and a checked one the shared selection |
| `base-tree-toggle` | The open button, a row button whose chevron points down while closed and turns up while open |
| `base-tree-check` | The checkbox, the thumbnail a text line tall, the icon, and the text with its dimmed secondary part |
| `base-tree-loading` | The line a node shows while its children load |

<!-- reference:end -->

## Example

<iframe class="base-preview" src="../../../assets/previews/tree-view.html" title="Tree View example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "tree-view.html"
```
