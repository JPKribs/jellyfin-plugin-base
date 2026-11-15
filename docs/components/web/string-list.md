# String List

An editor for a list of strings. The user types a value and presses Add or Enter, and each row has a Remove button and, when reorder is on, up and down buttons.

## Decision

| When | Use |
| :--- | :--- |
| Hosts, paths, or names the user lists one at a time | String List |
| Short free form tags | [Tag Input](tag-input.md) |
| Pairs | [Key Value Editor](key-value-editor.md) |
| Entries with more than one field | [Repeater](repeater.md) |
| Reordering a set of items the reader does not type | [Ordered List](ordered-list.md) |

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

Classes: `base-string-list`, `base-string-items`, `base-string-item`, `base-string-add`, `base-string-empty`. The handle is `{ element, input, getValue, setValue, setItems, add, setHeight, destroy }`.

Parts: `base-string-text`.

## States and Modifiers

* `add(value)` returns true when the value was added and shows the error otherwise.
* `validate(value)` returns an error sentence, or an empty value when valid. `maxItems` caps the rows, and `duplicates: true` allows a repeated value.
* `trim` (default true) trims each value. `reorder: true` adds up and down buttons.
* The defaults are "New Item" (`inputLabel`), "Add" (`addText`), "Remove {value}", "Move {value} up", "Move {value} down", the tooltips "Move Up" and "Move Down" (`moveUpTitle`, `moveDownTitle`), "Already in the list." (`duplicateText`), and "The list is full." (`limitText`). `emptyText` is a sentence shown while the list is empty. It is the List's empty sentence, `base-list-empty outside`, under the rows, and nothing shows without it.
* Enter adds the value and Escape clears the input. A refusal shows an inline message under the input through the [validation core](field-message.md#validation), with `aria-invalid` and `aria-describedby`, and it updates as the reader types.
* Remove returns focus to the input, and a move keeps focus on the pressed button.
* `base-string-items` is hidden while empty.
* `height`, `maxHeight`, and `minHeight` set the height of the rows as a [List](list.md) takes them, `'auto'` by default so the list grows with the page. `setHeight(height, maxHeight)` changes them later.
* `size` is `small`, `medium` (default), or `large`, and sizes its fields on the [size scale](design-tokens.md).

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createStringList`

<code>function createStringList(options?: StringListOptions): StringListHandle</code>

An editor for a list of strings. The user types a value and presses Add or Enter, and each row has a Remove button and, when reorder is on, up and down buttons.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `values` | <code>unknown[]</code> | array of strings [optional] |
| `placeholder` | <code>string</code> | a valid example for the input [optional] |
| `inputLabel` | <code>string</code> | aria-label of the input (default 'New Item') |
| `addText` | <code>string</code> | text of the add button (default 'Add') |
| `removeLabel` | <code>string</code> | aria-label of a remove button, where {value} is the row's text (default 'Remove {value}') |
| `moveUpLabel` | <code>string</code> | aria-label of an up button (default 'Move {value} up') |
| `moveDownLabel` | <code>string</code> | aria-label of a down button (default 'Move {value} down') |
| `moveUpTitle` | <code>string</code> | tooltip of an up button (default 'Move Up') |
| `moveDownTitle` | <code>string</code> | tooltip of a down button (default 'Move Down') |
| `emptyText` | <code>string</code> | sentence shown while the list is empty [optional] |
| `duplicateText` | <code>string</code> | message for a repeated value (default 'Already in the list.') |
| `limitText` | <code>string</code> | message when maxItems is reached (default 'The list is full.') |
| `duplicates` | <code>boolean</code> | true allows the same value twice (default false) |
| `reorder` | <code>boolean</code> | true adds up and down buttons (default false) |
| `trim` | <code>boolean</code> | true trims each value (default true) |
| `maxItems` | <code>number</code> | most rows allowed [optional] |
| `height` | <code>ListHeight</code> | height of the rows, as createList takes it (default 'auto') |
| `maxHeight` | <code>number &#124; string &#124; null</code> | height past which the rows scroll [optional] |
| `minHeight` | <code>number &#124; string &#124; null</code> | least height of a filling list [optional] |
| `size` | <code>'small' &#124; 'medium' &#124; 'large'</code> | 'small', 'medium', or 'large' for its fields (default 'medium') |
| `validate` | <code>(value: string): string &#124; null &#124; undefined</code> | function(value) returning an error sentence, or an empty value when valid, checked through the validation core [optional] |
| `onChange` | <code>(values: string[]): void</code> | function(values) [optional] |

| Handle member | Type |
| :--- | :--- |
| `input` | <code>HTMLInputElement</code> |
| `getValue` | <code>(): string[]</code> |
| `setValue` | <code>(next: unknown[] &#124; null): void</code> |
| `setItems` | <code>(next: unknown[] &#124; null): void</code> |
| `add` | <code>(raw: unknown): boolean</code> |
| `setHeight` | <code>(height: ListHeight, maxHeight?: number &#124; string &#124; null): void</code> |
| `destroy` | <code>(): void</code> |

| Class | What it looks like |
| :--- | :--- |
| `base-string-list` | Editor for a list of strings, with rows above an add row |
| `base-string-add` | Row holding the new value input and the add button |

<!-- reference:end -->

## Example

<iframe class="base-preview" src="../../../assets/previews/string-list.html" title="String List example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "string-list.html"
```
