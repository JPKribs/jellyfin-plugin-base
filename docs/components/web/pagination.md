# Pagination

A footer for a list that is read a page at a time. It has a page size select, Previous and Next buttons, a window of page numbers, and a total text. It reports `skip` and `take`, so it works with a `PagedResult`.

## When to Use

* Use it under a plain list that loads one page per request.

## When Not to Use

* Never use it with a [Paginated Table](paginated-table.md). The table keeps its own infinite scroll and Load More paging.

## Usage

```js
import { createPagination } from './configurationpage?name=myplugin_jpkribs_shared.js';

var pager = createPagination({ pageSize: 25, onChange: function (v) { load(v.skip, v.take); } });
function load(skip, take) {
    return fetchPage(skip, take).then(function (result) { pager.setResult(result); render(result.Items); });
}
```

Classes: `jpk-pager`, `jpk-pager-button`, `jpk-pager-gap`. The handle is `{ element, getValue, setValue, setTotal, setResult, destroy }`.

Parts: `jpk-pager-number`, `jpk-pager-pages`, `jpk-pager-size`, `jpk-pager-total`.

## States and Modifiers

* `getValue()` returns `{ page, pageSize, skip, take, total, pageCount }`. `setResult(result)` reads `TotalCount` (or `totalCount`) from a `PagedResult`.
* The page size select defaults to 10, 25, 50, and 100. A page size change returns to page 1.
* `jpk-pager-button` is a page button, and `active` marks the current page. `jpk-pager-gap` draws dots between numbers.
* At 600px and below only the current number shows.

## Used By

No plugin uses it today. Requests builds a Previous and Next footer in its public page.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/pagination.html" title="Pagination example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "pagination.html"
```
