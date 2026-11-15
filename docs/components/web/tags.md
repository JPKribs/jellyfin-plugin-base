# Tags

Removable chips that wrap. The chip select, the sortable card list, and the placeholder hint all use them.

## When to Use

* Use it to show a set of short values, with or without a remove control.

## When Not to Use

* Use a [Tag Input](tag-input.md) when the user types new tags.

## Usage

```html
<div class="jpk-tags">
    <span class="jpk-tag">Action<button type="button" class="jpk-tag-remove" aria-label="Remove Action">&times;</button></span>
    <span class="jpk-tag jpk-tag-pill">Drama<button type="button" class="jpk-tag-remove" aria-label="Remove Drama">&times;</button></span>
    <span class="jpk-tag jpk-tag-off">Discord (off)</span>
    <button type="button" class="jpk-tag jpk-tag-button">{title}</button>
</div>
```

Classes: `jpk-tags`, `jpk-tag`, `jpk-tag-remove`, `jpk-tag-pill`, `jpk-tag-off`, `jpk-tag-button`.

## States and Modifiers

* `jpk-tag-pill` goes with `jpk-tag`. It is a round chip filled with `--jpk-blue-fg`, with an 18px round remove button.
* `jpk-tag-off` goes with `jpk-tag`. It is half opacity and struck through, for something switched off.
* `jpk-tag-button` is a tag that is a button, as the [Placeholder Hint](placeholder-hint.md) uses.
* A `button` with `jpk-tag-remove` shows an accent focus ring on keyboard focus.

## Gotchas

* A `span` with `jpk-tag-remove` is not focusable. A chip that must be removable by keyboard uses `<button type="button" class="jpk-tag-remove" aria-label="Remove Name">`, as `createChipSelect` does.
* There is no JavaScript for this markup.

## Used By

Artwork Generator, Live Channels, Requests, and Scripts use it.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/tags.html" title="Tags example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "tags.html"
```
