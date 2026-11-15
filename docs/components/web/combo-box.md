# Combo Box

A text input with a floating results dropdown, for a single searchable value. It is on the bag as `shared.createSearchableComboBox` and has no top level export.

## When to Use

* Use it to search a server for one value, such as a library.

## When Not to Use

* Use a [Chip Select](chip-select.md) for several values, and a plain select for a short list.

## Usage

```js
var combo = shared.createSearchableComboBox({
    placeholder: 'Search a library',
    searchFn: shared.createDebouncedSearch('SourceLibraries', 300),
    onSelect: function (value, item) { selectedLibrary = value; }
});
container.appendChild(combo.element);
```

Classes: `jpk-combo`, `jpk-combo-dropdown`, `jpk-combo-option`. The handle is `{ element, getValue, setValue, destroy }`.

## States and Modifiers

* `searchFn(query, cb)` is required and calls `cb(results)`, where each result is a string or `{ value, label }`.
* `shared.createDebouncedSearch(endpoint, delay)` returns a `searchFn`. It needs at least 2 characters, waits `delay` ms (default 300), calls `apiRequest(endpoint + '?query=...')`, and passes the result array, or `[]` on error.
* `getValue()` returns the chosen value, or the free text when nothing was chosen. Typing clears the earlier choice.
* Arrow Down and Up highlight, Enter chooses, and Escape closes. Rows react to `mousedown`, so the input keeps focus.
* The input is a `combobox`, the list is a `listbox` of `option` rows, and `aria-activedescendant` names the highlighted row.

## Gotchas

* The list opens only after typing, unlike the chip select, which also opens on focus.
* The dropdown overlays what follows it, so a parent with `overflow: hidden` clips it.
* `setValue` shows the value, not a label. Call `destroy()` when the page hides.

## Used By

YouTube Audio uses it.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/combo-box.html" title="Combo Box example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "combo-box.html"
```
