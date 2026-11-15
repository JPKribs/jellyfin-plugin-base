# Empty State

Two ways to show an empty region, a boxed message and a compact line. The table has its own empty text.

## When to Use

* Use `shared.emptySection` for a list with no rows yet.

## When Not to Use

* Never write `jpk-empty-state`. See [Deprecated](deprecated.md).

## Usage

```html
<div class="jpk-empty-section">No servers yet. Add one below.</div>
<div class="jpk-empty">No records yet</div>
```

```js
container.innerHTML = shared.emptySection('No source users available.');
container.innerHTML = shared.emptySection('No records yet', { inline: true });
```

Classes: `jpk-empty-section`, `jpk-empty`. The table's own empty text is `jpk-table-empty`. See [Paginated Table](paginated-table.md).

## States and Modifiers

* `shared.emptySection(message, opts)` returns a `div` with the message escaped. It is `jpk-empty-section`, or the compact `jpk-empty` with `{ inline: true }`.
* `jpk-empty-section` is a bordered box. Its border uses `--jpk-fg`.

## Gotchas

* Only `emptySection` has a helper.

## Used By

Scripts, Server Sync, and User Management use it.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/empty-state.html" title="Empty State example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "empty-state.html"
```
