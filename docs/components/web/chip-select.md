# Chip Select

A typeahead picker. The user types to search, then clicks a result or presses Enter to add it as a removable chip. It runs over a static list or an async search, and can keep a single value.

## Decision

| When | Use |
| :--- | :--- |
| Picking several values from a list too long for checkboxes, such as genres or languages | Chip Select |
| An async picker that stores an opaque id and keeps a friendly label | `single: true` with `searchFn` |
| A list where every option should stay visible | [Checkbox List](checkbox-list.md) |
| One free text value | [Combo Box](combo-box.md) |
| Free form tags with no list | [Tag Input](tag-input.md) |
| Picking library items | [Media Picker](media-picker.md) |

## Usage

```js
import { createChipSelect } from './configurationpage?name=myplugin_jpkribs_shared.js';

var genres = createChipSelect({
    placeholder: 'Add genres',
    value: ['drama'],
    options: [{ value: 'action', label: 'Action' }, { value: 'drama', label: 'Drama' }],
    allowCreate: true,
    onChange: function (values, items) { tracker.check(); }
});
container.appendChild(genres.element);
```

An async single picker keeps the label of an opaque id.

```js
var language = createChipSelect({
    single: true,
    value: [{ value: 'eng', label: 'English' }],
    searchFn: function (query, cb) { cb(languages.filter(function (l) { return l.label.toLowerCase().indexOf(query.toLowerCase()) >= 0; })); }
});
```

Classes: `base-chip-select`, plus the chip and dropdown classes on [Tags](tags.md) and [Combo Box](combo-box.md). The handle is `{ element, getValue, getItems, setValue, setOptions, setSize, clear, refresh, destroy }`.

## States and Modifiers

* `getItems()` returns `{ value, label }` pairs, so a caller keying an opaque id can persist the label too.
* `pill: true` draws each chip as a `base-tag-pill`. `allowCreate: true` lets Enter add typed text as a value when no option is highlighted.
* The list opens on input and on focus, and shows all unselected choices when the input is empty. Selected values are hidden from the list.
* Arrow Down and Up move through the results, wrapping. Enter adds the highlighted result. Backspace on an empty input removes the last chip. Escape closes the list.
* Each chip has a real remove button with the label "Remove Name". `removeText` replaces its first word, "Remove". A removed chip passes focus to the next remove button, or to the input.
* `maxResults` caps the list at 50 by default. A search that finds nothing shows "No matches." (`noResultsText`), and a `searchFn` that throws shows "Could not search." (`errorText`).
* `setOptions(list)` swaps the static choices, and `refresh()` runs the search again for the typed text.
* The input is a `combobox` with `aria-autocomplete="list"`. The list is a `listbox` of `option` rows, and `aria-activedescendant` names the row the arrow keys are on.
* An empty chip list collapses, so there is no gap above the input.
* An item's `image` draws a small round picture at the start of its chip, through the thumb core. It is an address, or a function that returns an address, a Blob, or a promise of one, and the chip shows the image icon until it arrives or when it fails.
* `single: true` keeps one chip. A pick replaces it, `setValue` keeps the first value, and `getValue`, `getItems`, and `onChange` each give a list of at most one.
* Typing matches the static `options` by label, without regard to case. A `searchFn` does its own matching.
* The list floats like the [Combo Box](combo-box.md) dropdown, so a scrolling list or a dialog never clips it.
* A search icon sits at the input's trailing end, in a `base-adorned base-adorned-search` wrapper from [Field Adornments](field-adornments.md).
* `size` is `small`, `medium` (default), or `large`, and sizes its fields on the [size scale](design-tokens.md). `setSize(size)` changes it later.

## Gotchas

* Call `destroy()` when the page hides. It removes the document click listener.
* `setValue` does not call `onChange`. Values are compared as strings.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createChipSelect`

<code>function createChipSelect(options?: ChipSelectOptions): ChipSelectHandle</code>

A typeahead multi-select where typing searches and picking a result adds a removable chip. It reads a static option list or an async search function, and focus on the empty input lists the choices.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `value` | <code>ChipSelectItem[]</code> | preselected values, as strings or { value, label, image } pairs, where image is an address or a function as the thumb core takes, drawn in the chip [optional] |
| `options` | <code>ChipSelectItem[]</code> | static list of choices, as strings or { value, label, image } [optional] |

| Handle member | Type |
| :--- | :--- |
| `getValue` | <code>(): unknown[]</code> |
| `getItems` | <code>(): ChipSelectPair[]</code> |
| `setValue` | <code>(values: ChipSelectItem[] &#124; null): void</code> |
| `setOptions` | <code>(list: ChipSelectItem[] &#124; null): void</code> |
| `setSize` | <code>(size?: 'small' &#124; 'medium' &#124; 'large'): void</code> |
| `clear` | <code>(): void</code> |
| `refresh` | <code>(): void</code> |
| `destroy` | <code>(): void</code> |

| Type | What it is |
| :--- | :--- |
| `ChipSelectItem` | A choice or a selection in a chip select. A plain value shows as its own label. |
| `ChipSelectPair` | A choice or a selection after createChipSelect reads it, as a value and a label. |

| Class | What it looks like |
| :--- | :--- |
| `base-chip-select` | Removable chips stacked above a search input with a results dropdown, built by createChipSelect |
| `base-tag-thumb` | A round picture at the start of a chip, from the thumb core, as tall as the chip's text and inset from its edge, for the chip select and the tag input |

<!-- reference:end -->

## Example

<iframe class="base-preview" src="../../../assets/previews/chip-select.html" title="Chip Select example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "chip-select.html"
```
