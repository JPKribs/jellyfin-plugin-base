# Row Button

A low emphasis icon button for table and list rows.

## When to Use

* Use it for the edit, save, and copy actions in a row.

## When Not to Use

* Use a [Button](button.md) for an action with a label.

## Usage

```html
<button type="button" class="base-row-btn" title="Edit"><span class="material-icons">edit</span></button>
```

Classes: `base-row-btn`, `base-row-arrows`.

## States and Modifiers

* `save` turns the icon accent on hover.
* `destructive` turns the icon red on hover, for a button that deletes.
* `success` forces the success color and full opacity.
* `dirty` forces the warning color and full opacity, for an unsaved change on the row.
* `move` marks an up or down arrow and draws its chevron at the secondary chevron size. `base-row-arrows` holds a pair of them side by side at the end of a row.
* A disabled row button fades and loses its hover.

## Gotchas

* Give an icon only button a `title` or `aria-label`.
* Base builds the move arrows of the [Ordered List](ordered-list.md), the [Sortable Card List](sortable-card-list.md), and the [Repeater](repeater.md) from it, as well as the close button of a [Dialog](dialog.md), the icon of a [Help Hint](help-hint.md), the clear button of a [Search Field](search-field.md), and the copy button of a [Copy Field](copy-field.md).

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

| Class | What it looks like |
| :--- | :--- |
| `base-row-btn` | Low emphasis icon button for table and list rows, with save, success, and dirty states |
| `base-row-btn.destructive` | A row button that destroys data, red on hover, as the destructive button variant |
| `base-row-btn.move` | Up or down row button that moves its row, with a secondary chevron |
| `base-row-arrows` | Up and down row buttons side by side at the end of a row |

<!-- reference:end -->

## Used By

Live Channels, Requests, Scripts, Server Sync, and YouTube Audio use it.

## Example

<iframe class="base-preview" src="../../../assets/previews/row-button.html" title="Row Button example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "row-button.html"
```
