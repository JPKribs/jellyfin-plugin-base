# Check Grid

Checkboxes laid out in as many columns as fit.

## Decision

| When | Use |
| :--- | :--- |
| A longer set of independent options, such as artwork types | Check Grid |
| A short set | [Toggle Group](toggle-group.md) |

## Usage

```html
<div class="base-check-grid">
    <label class="emby-checkbox-label"><input type="checkbox" is="emby-checkbox"><span class="checkboxLabel">Poster</span></label>
    <label class="emby-checkbox-label"><input type="checkbox" is="emby-checkbox"><span class="checkboxLabel">Backdrop</span></label>
</div>
```

Class: `base-check-grid`.

## States and Modifiers

* The grid uses `repeat(auto-fill, minmax(10em, 1fr))`, so it falls to one or two columns at 375px.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

| Class | What it looks like |
| :--- | :--- |
| `base-check-grid` | Checkboxes laid out in as many columns as fit |

<!-- reference:end -->

## Example

<iframe class="base-preview" src="../../../assets/previews/check-grid.html" title="Check Grid example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "check-grid.html"
```
