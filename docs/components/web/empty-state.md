# Empty State

Three ways to show an empty region, a boxed message, a compact message, and a small dimmed line. A [List](list.md), and every component built on it, shows its own empty text.

## When to Use

* Use `shared.emptySection` for a list with no rows yet.

## When Not to Use

* Use a List's `emptyText` for a list built with a List, a [Filtered List](filtered-list.md), or a table built on one.

## Usage

```html
<div class="base-empty-section">No servers yet. Add one below.</div>
<div class="base-empty">No records yet</div>
<div class="base-empty-inline">This folder is empty.</div>
```

```js
container.innerHTML = shared.emptySection('No source users available.');
container.innerHTML = shared.emptySection('No records yet', { inline: true });
```

Classes: `base-empty-section`, `base-empty`, `base-empty-inline`. A List's own empty text is `base-list-empty`.

## States and Modifiers

* `shared.emptySection(message, opts)` returns a `div` with the message escaped. It is `base-empty-section`, or the compact `base-empty` with `{ inline: true }`.
* `base-empty-section` is a bordered box with centered, faded text. Its border mixes `--base-fg`.
* `base-empty-inline` is a small dimmed line for a region that is not a List, and hides with the `hidden` attribute.

## Gotchas

* Only `emptySection` has a helper.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

| Class | What it looks like |
| :--- | :--- |
| `base-empty-section` | Bordered box with centered muted text for an empty region |
| `base-empty-inline` | Small dimmed line that says a region holds nothing yet, for a region that is not a List |
| `base-empty` | Compact dimmed message for an empty list |

<!-- reference:end -->

## Used By

Artwork Generator, Custom Pages, Live Channels, Requests, Scripts, Server Sync, and User Management use it.

## Example

<iframe class="base-preview" src="../../../assets/previews/empty-state.html" title="Empty State example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "empty-state.html"
```
