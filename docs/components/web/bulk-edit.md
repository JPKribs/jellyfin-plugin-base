# Bulk Edit Bar and Edit Row

Inline editing blocks. A bordered bulk edit toolbar sits above a table, and table rows expand into stacked lines of fields.

## When to Use

* Use the bar to edit several selected rows at once, and the edit row to edit one row in place.

## When Not to Use

* Use an [Editor Dialog](editor-dialog.md) for a record with many fields.

## Usage

```html
<div class="jpk-bulk-edit-bar">
    <div class="jpk-bulk-edit-title">Bulk edit, 3 selected</div>
    <div class="jpk-edit-line">
        <div class="jpk-field"><label for="txtArtist">Artist</label><input type="text" id="txtArtist"></div>
        <span class="jpk-edit-secondary">2.34 MB</span>
        <button class="raised jpk-button-small jpk-button-submit">Apply</button>
    </div>
</div>

<div class="jpk-table-row jpk-edit-row">
    <div class="jpk-edit-line"><div class="jpk-field"></div></div>
</div>
```

Classes: `jpk-bulk-edit-bar`, `jpk-bulk-edit-title`, `jpk-edit-row`, `jpk-edit-line`, `jpk-edit-secondary`.

## States and Modifiers

* `jpk-edit-row` goes with `jpk-table-row`. It stacks its lines in a column.
* `jpk-edit-line` is a line of fields, bottom aligned and full width. Push a control to the end with `margin-left: auto`.
* `jpk-edit-secondary` is muted, non wrapping side text.

## Gotchas

* `jpk-edit-row` sets `align-items` and `padding`, but `table.css` loads after it and `jpk-table-row` has the same specificity, so a table row that also has `jpk-edit-row` takes the table row values for those two properties.
* There is no JavaScript.

## Used By

Server Sync uses `jpk-bulk-edit-bar` and `jpk-edit-line` for its sign in panel. YouTube Audio uses `jpk-edit-row`, `jpk-edit-secondary`, and `jpk-bulk-edit-title`, and Requests uses `jpk-bulk-edit-title`.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/bulk-edit.html" title="Bulk Edit Bar and Edit Row example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "bulk-edit.html"
```
