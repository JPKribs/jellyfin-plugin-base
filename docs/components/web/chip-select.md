# Chip Select

A typeahead picker. The user types to search, then clicks a result or presses Enter to add it as a removable chip. It runs over a static list or an async search, and can keep a single value.

## When to Use

* Use it to pick several values from a list too long for checkboxes, such as genres or languages.
* Use `single: true` with `searchFn` for an async picker that stores an opaque id and keeps a friendly label.

## When Not to Use

* Use a [Checkbox List](checkbox-list.md) when every option should stay visible, and a [Combo Box](combo-box.md) for one free text value.

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

Classes: `jpk-chip-select`, plus the chip and dropdown classes on [Tags](tags.md) and [Combo Box](combo-box.md). The handle is `{ element, getValue, getItems, setValue, setOptions, clear, refresh, destroy }`.

## States and Modifiers

* `getItems()` returns `{ value, label }` pairs, so a caller keying an opaque id can persist the label too.
* `pill: true` draws each chip as a `jpk-tag-pill`. `allowCreate: true` lets Enter add typed text as a value when no option is highlighted.
* The list opens on input and on focus, and shows all unselected choices when the input is empty. Selected values are hidden from the list.
* Arrow Down and Up move through the results, wrapping. Enter adds the highlighted result. Backspace on an empty input removes the last chip. Escape closes the list.
* Each chip has a real remove button with the label "Remove Name", which `removeText` replaces.
* The input is a `combobox` with `aria-autocomplete="list"`. The list is a `listbox` of `option` rows, and `aria-activedescendant` names the row the arrow keys are on.
* An empty chip list collapses, so there is no gap above the input.

## Gotchas

* Call `destroy()` when the page hides. It removes the document click listener.
* `setValue` does not call `onChange`. Values are compared as strings.

## Used By

Remote Access, Requests, and Scripts use it.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/chip-select.html" title="Chip Select example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "chip-select.html"
```
