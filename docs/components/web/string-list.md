# String List

An editor for a list of strings. The user types a value and presses Add or Enter, and each row has a Remove button and, when reorder is on, up and down buttons.

## When to Use

* Use it for hosts, paths, or names the user lists one at a time.

## When Not to Use

* Use a [Tag Input](tag-input.md) for short free form tags, and a [Key Value Editor](key-value-editor.md) for pairs.

## Usage

```js
import { createStringList } from './configurationpage?name=myplugin_jpkribs_shared.js';

var hosts = createStringList({
    values: config.Hosts,
    reorder: true,
    onChange: function (values) { config.Hosts = values; tracker.check(); }
});
container.appendChild(hosts.element);
```

Classes: `jpk-string-list`, `jpk-string-items`, `jpk-string-item`, `jpk-string-add`, `jpk-string-empty`. The handle is `{ element, input, getValue, setValue, setItems, add, destroy }`.

Parts: `jpk-string-text`.

## States and Modifiers

* `add(value)` returns true when the value was added and shows the error otherwise.
* `validate(value)` returns an error sentence, or an empty value when valid. `maxItems` caps the rows, and `duplicates: true` allows a repeated value.
* `trim` (default true) trims each value. `reorder: true` adds up and down buttons.
* The defaults are "New Item" (`inputLabel`), "Add" (`addText`), "Remove {value}", "Move {value} up", and "Move {value} down", "Already in the list." (`duplicateText`), and "The list is full." (`limitText`). `emptyText` is a sentence shown while the list is empty.
* Enter adds the value and Escape clears the input. A refusal shows an inline message under the input with `aria-invalid` and `aria-describedby`, and typing again clears it.
* Remove returns focus to the input, and a move keeps focus on the pressed button.
* `jpk-string-items` is hidden while empty.

## Used By

No plugin builds this today. Remote Access, which lists blocked and known countries, could adopt it.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/string-list.html" title="String List example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "string-list.html"
```
