# Badge

A short status label in a status color. There are two badges. `jpk-badge` takes a color name, and `jpk-table-status-badge` takes a state name, as the table status column uses.

## When to Use

* Use `shared.badge` for a label you color yourself, and `shared.statusBadge` to map a status code to a color.

## When Not to Use

* Never use a badge as a button. The table status column renders its own button. See [Paginated Table](paginated-table.md).

## Usage

```html
<span class="jpk-badge green">Active</span>
<span class="jpk-table-status-badge Queued">Queued</span>
```

```js
import { BADGE_STATES } from './configurationpage?name=myplugin_jpkribs_shared.js';
container.innerHTML = shared.badge('green', 'Active') + shared.statusBadge('Queued', 'Queued');
```

Classes: `jpk-badge`, `jpk-table-status-badge`.

## States and Modifiers

* Color names for `jpk-badge`: `green`, `red`, `orange`, `purple`, `blue`, `gray`, `yellow`, `pink`, and `teal`.
* State names for `jpk-table-status-badge`: Active, Synced, Downloaded, Completed, and Enabled are green. Disabled, Errored, Error, Deleting, Pending-Deletion, and Failed are red. Expired, Queued, and Paused are orange. Locked, Running, Downloading, Pending, and Pending-Download are purple. Admin, Imported, and Pending-Replacement are blue. Ignored, Group, Skipped, and Unknown are gray.
* `BADGE_STATES` is `{ names, colors }`, the one source of truth for mapping a status code to a badge.
* `shared.badge(cls, label)` escapes the label and reduces `cls` to letters, digits, `_`, and `-`. `shared.statusBadge(text, stateClass)` follows the same class rule.
* A plugin may set the class on an existing element, as Server Sync does in its detail dialog, `el.className = 'jpk-table-status-badge ' + status`.
* The swatches are the same in light and dark themes.

## Gotchas

* A state name outside the list gets the base pill with no color.
* A state with spaces is split into several classes.
* `jpk-badge` and `jpk-table-status-badge` read the same swatch tokens, and `statusBadge` works anywhere, not only in tables.

## Used By

Remote Access, Requests, and Server Sync use it.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/badge.html" title="Badge example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "badge.html"
```
