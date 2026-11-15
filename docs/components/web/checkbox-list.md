# Checkbox List

A searchable list of checkbox rows for picking many arbitrary items, such as series, libraries, or files. It is the generic sibling of the [User Multi Selector](user-multi-selector.md).

## When to Use

* Use it to pick many items from a list the user may need to search.

## When Not to Use

* Use a [Chip Select](chip-select.md) for a very long list, and a [Check Grid](check-grid.md) for a short fixed set.

## Usage

```js
import { createCheckboxList } from './configurationpage?name=myplugin_jpkribs_shared.js';

var series = createCheckboxList({
    items: seriesList,
    value: ['s2'],
    disabledIds: ['s9'],
    searchKeys: ['name'],
    showSelectAll: true,
    renderRow: function (s) { return { label: s.name, sublabel: 'First aired ' + s.year, imageUrl: s.poster, note: '' }; },
    onChange: function (ids) { tracker.check(); }
});
container.appendChild(series.element);
series.ready.then(function () { series.setValue(config.SeriesIds); });
```

Classes: `jpk-check-list`, `jpk-check-list-search`, `jpk-check-list-body`, `jpk-check-row`, `jpk-check-row-input`, `jpk-check-thumb`, `jpk-check-text`, `jpk-check-label`, `jpk-check-sub`, `jpk-check-note`, `jpk-check-selectall`, `jpk-check-row-disabled`, `jpk-check-empty`. The handle is `{ element, ready, getValue, setValue, setDisabled, refresh, destroy }`.

## States and Modifiers

* `items` is a static array. `fetchItems()` returns an array or a promise of one (or `{ Items }`) and overrides it.
* `showSelectAll` adds a "Select all" row that acts on the rows currently visible. `selectAllText` replaces the label.
* The search box debounces 200 ms. `placeholder` sets its text, "Search" by default. A failed load shows `emptyMessage`, "No items available." by default.
* Selected ids survive searches because they are kept apart from the rendered rows.
* Each row is a native label and checkbox, so Space toggles and the label is clickable.

## Gotchas

* Matching always reads the item properties named in `searchKeys` (default `name`), never the rendered label.
* `getValue()` returns ids as strings.
* `ready` is a promise of the loaded items. `refresh()` reloads and returns a promise.

## Used By

Scripts uses it. Artwork Generator writes the `jpk-check-list`, `jpk-check-row`, and `jpk-check-label` markup by hand.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/checkbox-list.html" title="Checkbox List example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "checkbox-list.html"
```
