# Pagination

A footer for a list that is read a page at a time. It has a page size select, Previous and Next buttons, a window of page numbers, and a total text. It reports `skip` and `take`, so it works with a `PagedResult`.

## When to Use

* Use it under a plain list that loads one page per request.

## When Not to Use

* Never use it with a [Paginated Table](paginated-table.md), a [Filtered List](filtered-list.md), or a [Data Table](data-table.md). They load more as the list scrolls, or from Load More.

## Usage

```js
import { createPagination } from './configurationpage?name=myplugin_jpkribs_shared.js';

var pager = createPagination({ pageSize: 25, onChange: function (v) { load(v.skip, v.take); } });
function load(skip, take) {
    return fetchPage(skip, take).then(function (result) { pager.setResult(result); render(result.Items); });
}
```

Classes: `base-pager`, `base-pager-button`, `base-pager-gap`. The handle is `{ element, getValue, setValue, setTotal, setResult, destroy }`.

Parts: `base-pager-number`, `base-pager-pages`, `base-pager-size`, `base-pager-total`.

## States and Modifiers

* `getValue()` returns `{ page, pageSize, skip, take, total, pageCount }`. `setResult(result)` reads `TotalCount` (or `totalCount`) from a `PagedResult`.
* The page size is 25 by default, and the select offers 10, 25, 50, and 100 by `pageSizes`. A page size change returns to page 1, and a page past the last moves to the last.
* `windowSize` is the most page numbers shown around the current page, 5 by default. The first and last pages always show.
* The total reads "{from} to {to} of {total}" by `totalText`, and "No items." by `emptyText` when the total is 0. `previousText`, `nextText`, `pageSizeLabel`, `navLabel`, and `pageLabel` replace "Previous", "Next", "Page Size", "Pagination", and "Page {value}".
* `base-pager-button` is a page button, and `active` marks the current page. `base-pager-gap` draws dots between numbers.
* The buttons are a field tall and the text is the field text size, so they follow `size`.
* At 600px and below only the current number shows.
* `size` is `small`, `medium` (default), or `large`, and sizes its fields on the [size scale](design-tokens.md).

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createPagination`

<code>function createPagination(options?: PaginationOptions): PaginationHandle</code>

A footer for a list that is read a page at a time. It has a page size select, Previous and Next buttons, a window of page numbers, and a total text. It reports skip and take, so it works with a PagedResult of Items and TotalCount.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `page` | <code>number</code> | first page, counted from 1 (default 1) |
| `pageSize` | <code>number</code> | rows per page (default 25) |
| `total` | <code>number</code> | total rows (default 0) |
| `pageSizes` | <code>number[]</code> | array of numbers in the page size select (default [10, 25, 50, 100]) |
| `windowSize` | <code>number</code> | most page numbers shown around the current page (default 5) |
| `previousText` | <code>string</code> | text of the previous button (default 'Previous') |
| `nextText` | <code>string</code> | text of the next button (default 'Next') |
| `pageSizeLabel` | <code>string</code> | label of the page size select (default 'Page Size') |
| `navLabel` | <code>string</code> | aria-label of the footer (default 'Pagination') |
| `pageLabel` | <code>string</code> | aria-label of a page number button, where {value} is the number (default 'Page {value}') |
| `totalText` | <code>string</code> | summary where {from}, {to}, and {total} are filled in (default '{from} to {to} of {total}') |
| `emptyText` | <code>string</code> | summary when the total is 0 (default 'No items.') |
| `size` | <code>'small' &#124; 'medium' &#124; 'large'</code> | 'small', 'medium', or 'large' for its fields (default 'medium') |
| `onChange` | <code>(value: PaginationValue): void</code> | function({ page, pageSize, skip, take, total, pageCount }) called when the user changes the page or the size [optional] |

| Handle member | Type |
| :--- | :--- |
| `getValue` | <code>(): PaginationValue</code> |
| `setValue` | <code>(next?: { page?: number; pageSize?: number; total?: number; } &#124; null): void</code> |
| `setTotal` | <code>(total: number &#124; null &#124; undefined): void</code> |
| `setResult` | <code>(result: { TotalCount?: number; totalCount?: number; } &#124; null &#124; undefined): void</code> |
| `destroy` | <code>(): void</code> |

| Type | What it is |
| :--- | :--- |
| `PaginationValue` | Where the pager stands, with the skip and take to request that page. |

| Class | What it looks like |
| :--- | :--- |
| `base-pager` | Footer for a list read a page at a time, with a total, a page size select, and page buttons |
| `base-pager-button` | One page button or number, filled with the accent when it is the current page |
| `base-pager-gap` | Gap between page numbers, drawn as three dots |

<!-- reference:end -->

## Used By

No plugin uses it today.

## Example

<iframe class="base-preview" src="../../../assets/previews/pagination.html" title="Pagination example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "pagination.html"
```
