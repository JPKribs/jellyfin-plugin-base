# Static Table

A plain bordered table for a few fixed rows, such as a list of settings or a summary.

## When to Use

* Use it for a short table with no paging, search, or selection.

## When Not to Use

* Use a [Paginated Table](paginated-table.md) for a list read from a paged endpoint.

## Usage

```html
<div class="jpk-static-table-scroll">
    <table class="jpk-static-table">
        <thead><tr><th>Name</th><th class="jpk-static-table-num">Size</th></tr></thead>
        <tbody><tr><td>Poster</td><td class="jpk-static-table-num">1,204</td></tr></tbody>
    </table>
</div>
```

Classes: `jpk-static-table`, `jpk-static-table-num`, `jpk-static-table-scroll`.

## States and Modifiers

* `jpk-static-table-num` goes on a `th` or `td` and right aligns digits of equal width.
* The scroll wrapper scrolls sideways when the table is wider than the container, so the page never does. At 375px a wide table scrolls inside it.
* A header cell does not wrap.

## Gotchas

* Give the table a `caption` or a heading above it when the data needs a name.
* There is no JavaScript.

## Used By

No plugin uses it today.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/static-table.html" title="Static Table example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "static-table.html"
```
