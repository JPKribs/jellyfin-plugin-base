# Asset List

Rows for uploaded files, with a thumbnail, a name and reference, and action buttons.

## When to Use

* Use it to list files a plugin stores, with a way to copy or remove each.

## When Not to Use

* Use a [File Picker](file-picker.md) to choose files to upload.

## Usage

```html
<div class="base-asset-list">
    <div class="base-asset-item">
        <img class="base-asset-thumb" src="logo.png" alt="">
        <div class="base-asset-info">
            <div class="base-asset-name">logo.png</div>
            <div class="base-asset-ref">asset://logo</div>
        </div>
        <div class="base-asset-actions">
            <button type="button" class="base-row-btn" title="Copy" aria-label="Copy"><span class="material-icons" aria-hidden="true">content_copy</span></button>
            <button type="button" class="base-row-btn destructive" title="Delete" aria-label="Delete"><span class="material-icons" aria-hidden="true">delete</span></button>
        </div>
    </div>
</div>
```

Classes: `base-asset-list`, `base-asset-item`, `base-asset-thumb`, `base-asset-info`, `base-asset-name`, `base-asset-ref`, `base-asset-actions`. Its buttons are [Row Buttons](row-button.md), `base-row-btn`.

## States and Modifiers

* `destructive` on a `base-row-btn` turns its hover red, for a button that deletes the file.
* The thumbnail is contained on a checkerboard of the surface and a wash of the text color, so it follows the theme.

## Gotchas

* There is no JavaScript. Give each row button a `title` and an `aria-label`.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

| Class | What it looks like |
| :--- | :--- |
| `base-asset-list` | Vertical list of uploaded asset rows |
| `base-asset-item` | One asset row with thumbnail, info, and actions |
| `base-asset-thumb` | Square checkerboard thumbnail so transparent images stay visible |
| `base-asset-info` | Column holding the asset name and its reference |
| `base-asset-name` | Bold asset name that clips with an ellipsis |
| `base-asset-ref` | Small dimmed mono reference that breaks anywhere |
| `base-asset-actions` | Row of action buttons at the end of an asset row |

<!-- reference:end -->

## Used By

Custom Pages uses it.

## Example

<iframe class="base-preview" src="../../../assets/previews/asset-list.html" title="Asset List example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "asset-list.html"
```
