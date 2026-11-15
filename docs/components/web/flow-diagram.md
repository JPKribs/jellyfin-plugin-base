# Flow Diagram

A hub in the middle with lanes of pills on its left, right, and below, each joined to the hub by a line with arrows that show the way things travel.

## When to Use

* Use it to show what one thing is connected to and which way each connection runs, such as the servers this one pulls from, pushes to, and syncs with.

## When Not to Use

* Never use it for a long list of connections. Use a [List](list.md) or a [Paginated Table](paginated-table.md).
* Never use it for steps in order. Use a [Stepper](stepper.md) or a [Timeline](timeline.md).

## Usage

```js
import { createFlowDiagram } from './configurationpage?name=myplugin_jpkribs_shared.js';

container.appendChild(createFlowDiagram({
    label: 'Servers this one is set up with',
    hub: { label: 'Home' },
    lanes: [
        { key: 'pull', side: 'left', direction: 'in', color: 'green', label: 'Pull', items: [{ label: 'Office', status: 'green' }] },
        { key: 'push', side: 'right', direction: 'out', color: 'blue', label: 'Push', items: [{ label: 'Cabin', status: 'orange' }] }
    ]
}).element);
```

Classes: `base-flow-diagram`, `base-flow-diagram-lane`, `base-flow-diagram-item`, `base-flow-diagram-dot`. The handle is `{ element, getValue, setValue, destroy }`.

Parts: `base-flow-diagram-arrow`, `base-flow-diagram-hub`, `base-flow-diagram-hub-box`, `base-flow-diagram-hub-label`, `base-flow-diagram-join`, `base-flow-diagram-label`, `base-flow-diagram-line`, `base-flow-diagram-pill`, `base-flow-diagram-stub`, `base-flow-diagram-trunk`.

## States and Modifiers

* It is drawn at its own size when it fits its box, never shrunk. When it does not fit, it is drawn again as a stack at full size, with the `stacked` modifier. The hub sits on top and each lane is a list under it, each on its own upright line, so no line crosses another and every label stays readable. It switches back as the box widens.
* A lane is `{ key, side, direction, color, label, items }`. `side` is `'left'`, `'right'`, or `'below'`, and each side draws its first lane only. An empty lane is not drawn, and with no lanes the hub stands alone.
* `direction` sets the arrows. `'in'` points at the hub, `'out'` points at each pill, and `'both'` does both.
* `color` is a status color name or a hex code, gray by default, and colors the lane's lines and arrows. A hex code sets `--base-custom` on the lane, as `applyColor` does.
* An item is `{ label, title, status, id }`. `status` is a status color name or a hex code for the dot in its pill, and an item with no status has no dot. `title` is the pill's tooltip, which is the label and the lane label by default.
* A label longer than `maxLabel` characters, 18 by default, ends in an ellipsis. The tooltip keeps it whole. In the stack a label uses the room it has, and only a `maxLabel` the caller set cuts it.
* A side lane holds eight pills in a column and a lane below holds four in a row, or half the lane when that is more. A second column or row sits in the gaps of the first, so there are never more than two.
* The hub stays in the middle of the picture. `hub.title` is its tooltip, and the label by default.
* The diagram is `role="img"`, and its accessible name lists `label`, the hub, and each item with its lane label. With `onSelect` it is `role="group"`, and each pill is a button that takes focus, answers a click, Enter, and Space, and shows an accent ring while focused.
* Never rely on a dot's color alone. Put the state in the item's `title`.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createFlowDiagram`

<code>function createFlowDiagram(options?: FlowDiagramOptions): FlowDiagramHandle</code>

A hub in the middle with lanes of pills on its left, right, and below, each pill joined to the hub by a line in the lane's color with arrows that show the way things travel. A lane past one pill per row or column wraps into a second, offset into the gaps of the first, and the hub stays centered.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `hub` | <code>FlowDiagramHub</code> | { label, title } for the node in the middle |
| `lanes` | <code>FlowDiagramLane[]</code> | array of { key, side, direction, color, label, items } where side is 'left', 'right', or 'below', direction is 'in', 'out', or 'both', color is a status color name or a hex code (default 'gray'), label names the lane in the accessible name, and items is an array of { label, title, status, id }. An empty lane is not drawn, and each side draws its first lane only |
| `maxLabel` | <code>number</code> | characters of a label before it ends in an ellipsis (default 18) [optional] |
| `label` | <code>string</code> | text the accessible name starts with [optional] |

| Handle member | Type |
| :--- | :--- |
| `getValue` | <code>(): FlowDiagramValue</code> |
| `setValue` | <code>(next: FlowDiagramValue): void</code> |
| `destroy` | <code>(): void</code> |

| Type | What it is |
| :--- | :--- |
| `FlowDiagramHub` | The node in the middle of a flow diagram. title is its tooltip (default the label). |
| `FlowDiagramItem` | One pill in a lane. status is a status color name or a hex code for its dot, and no status draws no dot. |
| `FlowDiagramLane` | One lane of pills on a side of the hub. direction 'in' points the arrows at the hub, 'out' at the pills, and 'both' at both. |
| `FlowDiagramValue` | What a flow diagram draws, as setValue takes it and getValue returns it. |

| Class | What it looks like |
| :--- | :--- |
| `base-flow-diagram` | Hub and lanes picture that shrinks to fit its container and stays centered |
| `base-flow-diagram-hub-box` | The node in the middle, a raised surface box with a neutral border, never a lane color, and a bold label |
| `base-flow-diagram-lane` | One lane, whose lines and arrows take the lane's color |
| `base-flow-diagram-pill` | A pill in a lane, a surface box with a status dot and a label, and an accent ring while focused |
| `base-flow-diagram-dot` | Round status dot inside a pill, in a status color |

<!-- reference:end -->

## Used By

No plugin uses it today.

## Example

<iframe class="base-preview" src="../../../assets/previews/flow-diagram.html" title="Flow Diagram example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "flow-diagram.html"
```
