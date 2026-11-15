# Tag Input

A free form tag field. The user types a tag and presses Enter or comma to add it, and a pasted list with commas is split into tags. The tags use the `base-tag-pill` style.

## When to Use

* Use it for short free form labels, such as group tags.

## When Not to Use

* Use a [Chip Select](chip-select.md) to pick from a known list.
* Use a [String List](string-list.md) for longer values the reader reviews one per row.

## Usage

```js
import { createTagInput } from './configurationpage?name=myplugin_jpkribs_shared.js';

var tags = createTagInput({ values: group.Tags, onChange: function (values) { group.Tags = values; } });
container.appendChild(tags.element);
```

Classes: `base-tag-input`, `base-tag-input-box`, `base-tag-input-field`. The handle is `{ element, input, getValue, setValue, add, setSize, destroy }`.

## States and Modifiers

* `add(tag)` returns true when the tag was added.
* Enter and the keys in `separators` (comma by default) add the tag. Backspace on an empty input removes the last tag. A refused piece of a pasted list stays in the input.
* `addOnBlur` (default true) adds the typed text when the input loses focus.
* `duplicates: true` allows the same tag twice. `maxTags` caps the tags. `validate(tag)` returns an error sentence, or an empty value when valid. The typed text checks through the [validation core](field-message.md#validation).
* The defaults are "New Tag" (`inputLabel`), "Remove {value}", "Already added." (`duplicateText`), and "No more tags can be added." (`limitText`).
* The box has the field look, with a search icon at its trailing end, and clicking it focuses the input.
* A removed tag passes focus to the next remove button, or to the input.
* `size` is `small`, `medium` (default), or `large`, and sizes its fields on the [size scale](design-tokens.md). `setSize(size)` changes it later.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createTagInput`

<code>function createTagInput(options?: TagInputOptions): TagInputHandle</code>

A free form tag field. The user types a tag and presses Enter or comma to add it, Backspace on an empty input removes the last tag, a removed tag passes focus to the next remove button or the input, and a pasted list that has commas is split into tags. The tags use the base-tag-pill style, and a search icon sits at the box's trailing end.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `values` | <code>unknown[]</code> | array of strings [optional] |
| `placeholder` | <code>string</code> | a valid example tag [optional] |
| `inputLabel` | <code>string</code> | aria-label of the input (default 'New Tag') |
| `removeLabel` | <code>string</code> | title and aria-label of a remove button, where {value} is the tag (default 'Remove {value}') |
| `duplicateText` | <code>string</code> | message for a repeated tag (default 'Already added.') |
| `limitText` | <code>string</code> | message when maxTags is reached (default 'No more tags can be added.') |
| `separators` | <code>string[]</code> | keys that add a tag, besides Enter, where a one character key also splits typed and pasted text (default [',']) |
| `duplicates` | <code>boolean</code> | true allows the same tag twice (default false) |
| `addOnBlur` | <code>boolean</code> | true adds the typed text when the input loses focus (default true) |
| `maxTags` | <code>number</code> | most tags allowed [optional] |
| `size` | <code>'small' &#124; 'medium' &#124; 'large'</code> | 'small', 'medium', or 'large' for its fields (default 'medium') |
| `validate` | <code>(tag: string): string &#124; null &#124; undefined</code> | function(tag) returning an error sentence, or an empty value when valid, checked through the validation core [optional] |
| `onChange` | <code>(values: string[]): void</code> | function(values) [optional] |

| Handle member | Type |
| :--- | :--- |
| `input` | <code>HTMLInputElement</code> |
| `getValue` | <code>(): string[]</code> |
| `setValue` | <code>(next: unknown[] &#124; null): void</code> |
| `add` | <code>(raw: unknown): boolean</code> |
| `setSize` | <code>(size?: 'small' &#124; 'medium' &#124; 'large'): void</code> |
| `destroy` | <code>(): void</code> |

| Class | What it looks like |
| :--- | :--- |
| `base-tag-input-box` | Field box that holds tag pills and a text input that grows to the free width |

<!-- reference:end -->

## Used By

No plugin uses it today.

## Example

<iframe class="base-preview" src="../../../assets/previews/tag-input.html" title="Tag Input example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "tag-input.html"
```
