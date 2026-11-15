# Tag Input

A free form tag field. The user types a tag and presses Enter or comma to add it, and a pasted list with commas is split into tags. The tags use the `jpk-tag-pill` style.

## When to Use

* Use it for short free form labels, such as group tags.

## When Not to Use

* Use a [Chip Select](chip-select.md) to pick from a known list.

## Usage

```js
import { createTagInput } from './configurationpage?name=myplugin_jpkribs_shared.js';

var tags = createTagInput({ values: group.Tags, onChange: function (values) { group.Tags = values; } });
container.appendChild(tags.element);
```

Classes: `jpk-tag-input`, `jpk-tag-input-box`, `jpk-tag-input-field`. The handle is `{ element, input, getValue, setValue, add, destroy }`.

## States and Modifiers

* `add(tag)` returns true when the tag was added.
* Enter and the keys in `separators` (comma by default) add the tag. Backspace on an empty input removes the last tag. A refused piece of a pasted list stays in the input.
* `addOnBlur` (default true) adds the typed text when the input loses focus.
* `duplicates: true` allows the same tag twice. `maxTags` caps the tags. `validate(tag)` returns an error sentence, or an empty value when valid.
* The defaults are "New Tag" (`inputLabel`), "Remove {value}", "Already added." (`duplicateText`), and "No more tags can be added." (`limitText`).
* The box has the field look, and clicking it focuses the input.

## Used By

No plugin uses it today. User Management builds the same thing by hand in its group tag rows (`perm-tag-input`).

## Example

<iframe class="jpk-preview" src="../../../assets/previews/tag-input.html" title="Tag Input example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "tag-input.html"
```
