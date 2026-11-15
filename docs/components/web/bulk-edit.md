# Bulk Edit Bar and Edit Row

Inline editing blocks. A bordered bulk edit toolbar sits above a table, and table rows expand into stacked lines of fields.

## Decision

| When | Use |
| :--- | :--- |
| Editing several selected rows at once | Bulk Edit Bar |
| Editing one row in place | Edit Row |
| A record with many fields | [Editor Dialog](editor-dialog.md) |

## Usage

```html
<div class="base-bulk-edit-bar">
    <div class="base-bulk-edit-title">Bulk edit, 3 selected</div>
    <div class="base-edit-line">
        <div class="base-field"><label for="txtArtist">Artist</label><input type="text" id="txtArtist"></div>
        <span class="base-edit-secondary">2.34 MB</span>
        <button class="raised base-button small primary">Apply</button>
    </div>
</div>

<div class="base-table-row base-edit-row">
    <div class="base-edit-line"><div class="base-field"></div></div>
</div>
```

Classes: `base-bulk-edit-bar`, `base-bulk-edit-title`, `base-edit-row`, `base-edit-line`, `base-edit-secondary`.

## States and Modifiers

* `base-edit-row` goes with `base-table-row`. It stacks its lines in a column.
* `base-edit-line` is a line of fields, bottom aligned and full width. Push a control to the end with `margin-left: auto`.
* `base-edit-secondary` is muted, non wrapping side text.
* A `base-button` in an edit line sits at its bottom, level with the fields. Add `field` to match their height.

## Gotchas

* `base-edit-row` sets `align-items` and `padding`, but `paginated-table.css` loads after it and `base-table-row` has the same specificity, so a table row that also has `base-edit-row` takes the table row values for those two properties.
* There is no JavaScript.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

| Class | What it looks like |
| :--- | :--- |
| `base-bulk-edit-bar` | Bordered toolbar above a table holding a stack of field lines for editing many rows at once |
| `base-bulk-edit-title` | Heading that labels the bulk-edit region |
| `base-edit-row` | Table row stacked into a column for a multi-line field editor |
| `base-edit-line` | One line of fields placed side by side inside an editor |
| `base-edit-secondary` | Muted, non-wrapping secondary text within an editor line, such as a file size |

<!-- reference:end -->

## Example

<iframe class="base-preview" src="../../../assets/previews/bulk-edit.html" title="Bulk Edit Bar and Edit Row example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "bulk-edit.html"
```
