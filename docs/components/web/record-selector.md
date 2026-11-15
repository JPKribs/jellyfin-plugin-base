# Record Selector

A stacked dropdown with an action row under it, for picking one record and acting on it. The [User Selector](user-selector.md) is built on it.

## When to Use

* Use it to pick one record from a short list and offer New and Remove beside it.

## When Not to Use

* Use a [Sortable Card List](sortable-card-list.md) when the order matters or each record opens an editor.

## Usage

```html
<div class="jpk-selector">
    <select class="jpk-selector-dropdown"><option>Primary</option><option>Backup</option></select>
    <div class="jpk-selector-actions">
        <button class="jpk-icon-btn"><span class="material-icons">add</span><span>New</span></button>
        <button class="jpk-icon-btn"><span class="material-icons">delete</span><span>Remove</span></button>
    </div>
</div>
```

Classes: `jpk-selector`, `jpk-selector-dropdown`, `jpk-selector-actions`.

## States and Modifiers

* The action row is optional, and its buttons do not grow.
* The dropdown takes its fill, border, and chevron from [Form Fields](form-fields.md).

## Gotchas

* There is no JavaScript for this markup.

## Used By

Artwork Generator, Custom Pages, Live Channels, Remote Access, Scripts, and User Management use it.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/record-selector.html" title="Record Selector example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "record-selector.html"
```
