# Check Grid

Checkboxes laid out in as many columns as fit.

## When to Use

* Use it for a longer set of independent options, such as artwork types.

## When Not to Use

* Use a [Toggle Group](toggle-group.md) for a short set.

## Usage

```html
<div class="jpk-check-grid">
    <label class="emby-checkbox-label"><input type="checkbox" is="emby-checkbox"><span class="checkboxLabel">Poster</span></label>
    <label class="emby-checkbox-label"><input type="checkbox" is="emby-checkbox"><span class="checkboxLabel">Backdrop</span></label>
</div>
```

Class: `jpk-check-grid`.

## States and Modifiers

* The grid uses `repeat(auto-fill, minmax(10em, 1fr))`, so it falls to one or two columns at 375px.

## Used By

Requests uses it.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/check-grid.html" title="Check Grid example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "check-grid.html"
```
