# Tags

Removable chips that wrap. The [Chip Select](chip-select.md), the [Tag Input](tag-input.md), and the [Placeholder Hint](placeholder-hint.md) draw them.

## When to Use

* Use it to show a set of short values, with or without a remove control.

## When Not to Use

* Use a [Tag Input](tag-input.md) when the user types new tags, and a [Chip Select](chip-select.md) when the user picks them from a list.
* Use a [Badge](badge.md) for a status.

## Usage

```html
<div class="base-tags">
    <span class="base-tag">Action<button type="button" class="base-tag-remove material-icons" aria-label="Remove Action">close</button></span>
    <span class="base-tag base-tag-pill">Drama<button type="button" class="base-tag-remove material-icons" aria-label="Remove Drama">close</button></span>
    <span class="base-tag base-tag-off">Discord (off)</span>
    <button type="button" class="base-tag base-tag-button">{title}</button>
</div>
```

Classes: `base-tags`, `base-tag`, `base-tag-remove`, `base-tag-pill`, `base-tag-off`, `base-tag-button`.

## States and Modifiers

* A tag is the small size of the [size scale](design-tokens.md). `medium` and `large` beside `base-tag` take the larger sizes.
* `base-tag-pill` goes with `base-tag`. It is a round chip filled with `--base-blue-fg`, with its remove button inset in a filled circle.
* `base-tag-off` goes with `base-tag`. It is half opacity and struck through, for something switched off.
* `base-tag-button` is a tag that is a button, as the [Placeholder Hint](placeholder-hint.md) uses.
* `base-tag-remove` turns red on hover. A `button` with it shows an accent focus ring on keyboard focus.

## Gotchas

* A `span` with `base-tag-remove` is not focusable. A chip that must be removable by keyboard uses `<button type="button" class="base-tag-remove" aria-label="Remove Name">`, as `createChipSelect` does.
* There is no JavaScript for this markup.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

| Class | What it looks like |
| :--- | :--- |
| `base-tags` | Row of removable tag chips that wraps |
| `base-tag` | Single rounded tag chip with a remove control |
| `base-tag.medium` | A tag at the medium or large size of the scale |
| `base-tag-remove` | Small x control at the end of a tag, a square the size of the tag's icon that turns red on hover. A button gets the same look as a span |
| `base-tag.base-tag-off` | Faded, struck through tag for something switched off, such as a turned off destination |
| `base-tag.base-tag-pill` | Round tag filled with the blue token, with dark text and its x inset in a filled circle a little smaller than the tag |

<!-- reference:end -->

## Used By

Artwork Generator, Live Channels, Requests, and Scripts use it.

## Example

<iframe class="base-preview" src="../../../assets/previews/tags.html" title="Tags example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "tags.html"
```
