# Badge

A short status label in a status color. There are two badges. `base-badge` takes a color name, and `base-table-status-badge` takes a state name, as the table status column uses.

## When to Use

* Use `shared.badge` for a label you color yourself, and `shared.statusBadge` to map a status code to a color.

## When Not to Use

* Never use a badge as a button. The table status column renders its own button. See [Paginated Table](paginated-table.md).

## Usage

```html
<span class="base-badge green">Active</span>
<span class="base-table-status-badge Queued">Queued</span>
```

```js
import { BADGE_STATES } from './configurationpage?name=myplugin_jpkribs_shared.js';
container.innerHTML = shared.badge('green', 'Active') + shared.statusBadge('Queued', 'Queued');
```

Classes: `base-badge`, `base-table-status-badge`.

## States and Modifiers

* Color names for `base-badge`: `green`, `red`, `orange`, `purple`, `blue`, `gray`, `yellow`, `pink`, and `teal`.
* State names for `base-table-status-badge`: Active, Synced, Downloaded, Completed, and Enabled are green. Disabled, Errored, Error, Deleting, Pending-Deletion, and Failed are red. Expired, Queued, and Paused are orange. Locked, Running, Downloading, Pending, and Pending-Download are purple. Admin, Imported, and Pending-Replacement are blue. Ignored, Group, Skipped, and Unknown are gray.
* `BADGE_STATES` is `{ names, colors, stateColors }`, the one source of truth for mapping a status code to a badge. `stateColors` gives the color each state name draws in.
* `shared.badge(cls, label)` escapes the label. A color name or hex code in `cls` colors it, `medium` or `large` sizes it, and any other word stays as a class reduced to letters, digits, `_`, and `-`.
* `shared.statusBadge(text, stateClass)` draws a `base-badge` in the color `stateColors` gives the state, or in the color itself when `stateClass` is a color name or a hex code, and keeps `base-table-status-badge` and the state name as classes, such as `<span class="base-badge orange base-table-status-badge Queued">`.
* Every badge Base draws, in the bag, the [Media Card](media-card.md), and the [Sortable Card List](sortable-card-list.md), comes from one badge maker, so they look the same.
* A plugin may set the class on an existing element, such as `el.className = 'base-table-status-badge ' + status`.
* The swatches are the same in light and dark themes.

## Gotchas

* A state name outside the list gets the base pill with no color.
* A state with spaces is split into several classes.
* `base-badge` and `base-table-status-badge` read the same swatch tokens, and `statusBadge` works anywhere, not only in tables.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `BADGE_STATES`

<code>var BADGE_STATES: { names: BadgeState[]; colors: BadgeColor[]; stateColors: Record&lt;BadgeState, BadgeColor&gt;; }</code>

The state names a badge knows, in names, the color modifiers that base-badge takes, in colors, and the color each state draws in, in stateColors. A plugin maps its own statuses onto these so the mapping has one source.

| Class | What it looks like |
| :--- | :--- |
| `base-badge` | Pill that shows a short status label in a status color |
| `base-badge.medium` | A badge at the medium or large size of the scale |

<!-- reference:end -->

## Used By

Remote Access, Requests, Scripts, Server Sync, and YouTube Audio use it.

## Example

<iframe class="base-preview" src="../../../assets/previews/badge.html" title="Badge example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "badge.html"
```
