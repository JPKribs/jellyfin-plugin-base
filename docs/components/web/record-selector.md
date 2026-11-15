# Record Selector

A stacked dropdown with an action row under it, for picking one record and acting on it. The [User Selector](user-selector.md) is built on it.

## When to Use

* Use it to pick one record from a short list and offer New and Remove beside it.

## When Not to Use

* Use a [Sortable Card List](sortable-card-list.md) when the order matters or each record opens an editor.

## Usage

```html
<div class="base-selector">
    <select class="base-selector-dropdown"><option>Primary</option><option>Backup</option></select>
    <div class="base-selector-actions">
        <button class="base-button"><span class="material-icons">add</span><span>New</span></button>
        <button class="base-button"><span class="material-icons">delete</span><span>Remove</span></button>
    </div>
</div>
```

Classes: `base-selector`, `base-selector-dropdown`, `base-selector-actions`.

## States and Modifiers

* The action row is optional, and its buttons do not grow.
* The dropdown takes its fill, border, and chevron from [Form Fields](form-fields.md).
* A record selector takes one wide gap below it on a config page and in a dialog, as the field containers do.

## Gotchas

* There is no JavaScript for this markup.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

| Class | What it looks like |
| :--- | :--- |
| `base-selector` | Stacked dropdown and action row for picking a record |
| `base-selector-dropdown` | Full width dropdown for the picker, styled by the shared field rules in form.css |
| `base-selector-actions` | Wrapping row of action buttons under the dropdown |

<!-- reference:end -->

## Used By

Artwork Generator, Custom Pages, Live Channels, Remote Access, Scripts, and User Management use it.

## Example

<iframe class="base-preview" src="../../../assets/previews/record-selector.html" title="Record Selector example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "record-selector.html"
```
