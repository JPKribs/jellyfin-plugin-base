# Row Button

A low emphasis icon button for table and list rows.

## When to Use

* Use it for the edit, save, and copy actions in a row.

## When Not to Use

* Use a [Button](button.md) for an action with a label.

## Usage

```html
<button type="button" class="jpk-row-btn" title="Edit"><span class="material-icons">edit</span></button>
```

Class: `jpk-row-btn`.

## States and Modifiers

* `save` turns the icon accent on hover.
* `success` forces the success color and full opacity.
* `dirty` forces the warning color and full opacity, for an unsaved change on the row.

## Gotchas

* Give an icon only button a `title` or `aria-label`.
* The [Sortable Card List](sortable-card-list.md) and the [Ordered List](ordered-list.md) use it for their arrows.

## Used By

Live Channels, Requests, Scripts, Server Sync, and YouTube Audio use it.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/row-button.html" title="Row Button example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "row-button.html"
```
