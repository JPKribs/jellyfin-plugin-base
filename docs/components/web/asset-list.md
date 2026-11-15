# Asset List

Rows for uploaded files, with a thumbnail, a name and reference, and action buttons.

## When to Use

* Use it to list files a plugin stores, with a way to copy or remove each.

## When Not to Use

* Use a [File Picker](file-picker.md) to choose files to upload.

## Usage

```html
<div class="jpk-asset-list">
    <div class="jpk-asset-item">
        <img class="jpk-asset-thumb" src="logo.png" alt="">
        <div class="jpk-asset-info">
            <div class="jpk-asset-name">logo.png</div>
            <div class="jpk-asset-ref">asset://logo</div>
        </div>
        <div class="jpk-asset-actions">
            <button type="button" class="jpk-asset-btn" title="Copy"><span class="material-icons">content_copy</span></button>
            <button type="button" class="jpk-asset-btn danger" title="Remove"><span class="material-icons">delete</span></button>
        </div>
    </div>
</div>
```

Classes: `jpk-asset-list`, `jpk-asset-item`, `jpk-asset-thumb`, `jpk-asset-info`, `jpk-asset-name`, `jpk-asset-ref`, `jpk-asset-actions`, `jpk-asset-btn`.

## States and Modifiers

* `danger` on a `jpk-asset-btn` turns the hover red with a light red icon.
* The thumbnail is contained on a dark checkerboard of fixed dark grays.

## Gotchas

* There is no JavaScript. Give icon buttons a `title` or `aria-label`.

## Used By

Custom Pages uses it.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/asset-list.html" title="Asset List example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "asset-list.html"
```
