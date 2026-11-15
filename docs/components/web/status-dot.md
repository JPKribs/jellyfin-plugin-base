# Status Dot

A small round dot in a status color, with a text name as its title and its accessible name.

## Decision

| When | Use |
| :--- | :--- |
| Health or state in a row, such as reachable or not | Status Dot. |
| Color alone as the signal | A name with the color. The dot always carries one, and a badge shows the word on screen. See [Badge](badge.md). |

## Usage

```js
import { createStatusDot } from './configurationpage?name=myplugin_jpkribs_shared.js';

cell.appendChild(createStatusDot({ color: 'green', label: 'Reachable' }).element);
```

Class: `base-dot`. The handle is `{ element, getValue, setValue, destroy }`.

## States and Modifiers

* `color` is `green`, `red`, `orange`, `purple`, `blue`, `gray` (default), `yellow`, `pink`, `teal`, or a hex code such as `#e91e63`. Any other value draws gray.
* `label` defaults to the meaning of the color: "Active" for green, "Error" for red, "Waiting" for orange, "Working" for purple, "Info" for blue, "Off" for gray, and "Note" for the rest.
* `getValue()` returns `{ color, label }` as drawn, and `setValue({ color, label })` redraws it.
* The dot has `role="img"`, and a title and `aria-label`.
* The [Sortable Card List](sortable-card-list.md) draws its card dots as this dot.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createStatusDot`

<code>function createStatusDot(options?: StatusDotOptions): StatusDotHandle</code>

A small round dot in a status color with a text name for it, as a title and as the accessible name.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `color` | <code>'green' &#124; 'red' &#124; 'orange' &#124; 'purple' &#124; 'blue' &#124; 'gray' &#124; 'yellow' &#124; 'pink' &#124; 'teal' &#124; string</code> | 'green', 'red', 'orange', 'purple', 'blue', 'gray', 'yellow', 'pink', 'teal', or a hex code such as '#e91e63' (default 'gray') |
| `label` | <code>string</code> | the name of the state (default the color's meaning, such as 'Active' for green) |

| Handle member | Type |
| :--- | :--- |
| `getValue` | <code>(): { color: string; label: string; }</code> |
| `setValue` | <code>(next: StatusDotOptions): void</code> |
| `destroy` | <code>(): void</code> |

| Class | What it looks like |
| :--- | :--- |
| `base-dot` | Small round dot in a status color, which needs a title and an aria-label |

<!-- reference:end -->

## Example

<iframe class="base-preview" src="../../../assets/previews/status-dot.html" title="Status Dot example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "status-dot.html"
```
