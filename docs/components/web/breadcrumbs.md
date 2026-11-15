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

Classes: `jpk-breadcrumbs`, `jpk-breadcrumb-list`, `jpk-breadcrumb-link`, `jpk-breadcrumb-current`. The handle is `{ element, getValue, setValue, setItems, destroy }`.

Parts: `jpk-breadcrumb`.

## States and Modifiers

* An item with an `href` is a link. An item without one is a button that reports itself through `onSelect`.
* The last item is the current page. It is plain text with `aria-current="page"`.

## Used By

No plugin uses it today.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/breadcrumbs.html" title="Breadcrumbs example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "breadcrumbs.html"
```
