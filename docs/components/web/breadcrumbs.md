# Breadcrumbs

A trail of places that ends at the current one.

## When to Use

* Use it where a page drills into a record and the reader needs a way back.

## When Not to Use

* Never use it as a menu of unrelated pages.

## Usage

```js
import { createBreadcrumbs } from './configurationpage?name=myplugin_jpkribs_shared.js';

var trail = createBreadcrumbs({
    items: [{ label: 'Servers', value: 'servers' }, { label: server.Name }],
    onSelect: function (value) { show(value); }
});
```

Classes: `base-breadcrumbs`, `base-breadcrumb-list`, `base-breadcrumb-link`, `base-breadcrumb-current`. The handle is `{ element, getValue, setValue, setItems, destroy }`.

Parts: `base-breadcrumb`.

## States and Modifiers

* An item with an `href` is a link. An item without one is a button that reports itself through `onSelect(value, item)`, and an item with no `value` reports its label.
* The last item is the current page. It is plain text with `aria-current="page"`.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createBreadcrumbs`

<code>function createBreadcrumbs(options?: BreadcrumbsOptions): BreadcrumbsHandle</code>

A trail of places ending at the current one. An item with an href is a link and an item without one is a button that reports itself, and the last item is the current page and is not a control.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `items` | <code>BreadcrumbItem[]</code> | array of { label, value, href } [optional] |
| `navLabel` | <code>string</code> | aria-label of the nav (default 'Breadcrumb') |
| `onSelect` | <code>(value: unknown, item: BreadcrumbItem): void</code> | function(value, item) called when a button item is pressed [optional] |

| Handle member | Type |
| :--- | :--- |
| `getValue` | <code>(): BreadcrumbItem[]</code> |
| `setValue` | <code>(next: BreadcrumbItem[]): void</code> |
| `setItems` | <code>(next: BreadcrumbItem[]): void</code> |
| `destroy` | <code>(): void</code> |

| Type | What it is |
| :--- | :--- |
| `BreadcrumbItem` | One place in a breadcrumb trail. An item with an href is a link, and one without is a button. |

| Class | What it looks like |
| :--- | :--- |
| `base-breadcrumb-list` | Trail of places that wraps on a narrow screen, with chevrons between them |
| `base-breadcrumb-link` | A place that can be opened, as a link or a button that looks like one |
| `base-breadcrumb-current` | The current place, which is plain text |

<!-- reference:end -->

## Used By

No plugin uses it today.

## Example

<iframe class="base-preview" src="../../../assets/previews/breadcrumbs.html" title="Breadcrumbs example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "breadcrumbs.html"
```
