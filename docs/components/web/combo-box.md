# Combo Box

A text input with a floating results dropdown, for a single searchable value. It is on the bag as `shared.createSearchableComboBox` and has no top level export.

## Decision

| When | Use |
| :--- | :--- |
| Searching a server for one value, such as a library | Combo Box |
| Several values | [Chip Select](chip-select.md) |
| One value that must come from the list | A [Chip Select](chip-select.md) with `single: true` |
| A short list | A plain select |
| Filtering a list on the page | [Search Field](search-field.md) |

## Usage

```js
var combo = shared.createSearchableComboBox({
    placeholder: 'Search a library',
    searchFn: shared.createDebouncedSearch('SourceLibraries', 300),
    onSelect: function (value, item) { selectedLibrary = value; }
});
container.appendChild(combo.element);
```

Classes: `base-combo`, `base-combo-dropdown`, `base-combo-option`. The handle is `{ element, getValue, setValue, destroy }`.

## States and Modifiers

* `searchFn(query, cb)` is required and calls `cb(results)`, where each result is a string or `{ value, label }`.
* `shared.createDebouncedSearch(endpoint, delay)` returns a `searchFn`. It needs at least 2 characters, waits `delay` ms (default 300), calls `apiRequest(endpoint + '?query=...')`, and passes the result array, or `[]` on error. Only the answer to the latest query arrives, and a shorter query drops one still due.
* `getValue()` returns the chosen value, or the free text when nothing was chosen. Typing clears the earlier choice.
* Arrow Down and Up highlight, Enter chooses, and Escape closes. Rows react to `mousedown`, so the input keeps focus.
* The input is a `combobox`, the list is a `listbox` of `option` rows, and `aria-activedescendant` names the highlighted row.
* A search icon sits at the input's trailing end, in a `base-adorned base-adorned-search` wrapper from [Field Adornments](field-adornments.md).
* The dropdown floats like the [Overflow Menu](overflow-menu.md) list, fixed to the window and as wide as the input. It opens below the input, or above it with no room, stays on a 375px screen, and follows a scroll.
* A search that finds nothing shows "No matches." (`noResultsText`), and a `searchFn` that throws shows "Could not search." (`errorText`). The sentence sits under the input, in the `base-empty-inline` style.
* `onInput()` runs on each keystroke, after the earlier choice is cleared.
* `size` is `small`, `medium` (default), or `large`, and sizes its fields on the [size scale](design-tokens.md).

## Gotchas

* The list opens only after typing, unlike the chip select, which also opens on focus.
* A parent with a `transform` or a `filter` holds a fixed dropdown inside it, as it does the overflow menu.
* `setValue` shows the value, not a label. Call `destroy()` when the page hides.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

| Type | What it is |
| :--- | :--- |
| `ComboBoxMessages` | The sentences a searchable combo box shows under its input, besides ComboBoxOptions. |

| Class | What it looks like |
| :--- | :--- |
| `base-combo` | Text input wrapper with a floating results dropdown |
| `base-combo-dropdown` | Floating list of options on the base-float surface, fixed to the viewport and as wide as the input, placed by the typeahead under the input, or above it with no room |
| `base-combo-option` | One option row that tints in the accent on hover or when active |

<!-- reference:end -->

## Example

<iframe class="base-preview" src="../../../assets/previews/combo-box.html" title="Combo Box example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "combo-box.html"
```
