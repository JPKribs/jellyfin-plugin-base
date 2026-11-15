# Utility Classes

Small classes for visibility, fonts, and text color.

## Decision

| When | Use |
| :--- | :--- |
| Showing and hiding a block | `hidden` or the `[hidden]` attribute. `shared.setVisible` toggles `hidden` for you. |
| Paths, ids, and addresses | `base-mono`. |
| The label of an icon only control | `base-sr-only`. |
| A state shown with `base-ok` or `base-bad` | The color paired with a word. Never the color as the only signal. |

## Usage

```html
<div class="hidden">Hidden</div>
<span class="base-mono">10.0.0.1</span>
<span class="base-ok">OK</span> <span class="base-bad">Failed</span>
<div class="base-url">URL: <a href="#">/pages/home</a></div>
<button type="button"><span class="material-icons" aria-hidden="true">delete</span><span class="base-sr-only">Remove the record</span></button>
```

Classes: `hidden`, `base-mono`, `base-ok`, `base-bad`, `base-url`, `base-sr-only`, `base-icon-text`, `base-thumb`, `base-float`.

## States and Modifiers

* `hidden` is `display: none`, forced. It is a Jellyfin class the kit also styles.
* The `[hidden]` attribute hides too, even on a component with its own `display` rule such as a flex row or a grid.
* `base-url` is mono at 85 percent opacity, with links in the accent color.
* `base-icon-text` sets an icon beside text that may wrap, with the icon centered on the first line. It is medium by default and takes `small` or `large`.
* `base-thumb` is an artwork frame that holds a `base-thumb-placeholder` icon under a `base-thumb-image`. The frame sets no size, so the component that uses it does. The image takes `hidden` when it fails to load, and `pending` while it loads.
* `base-float` is the surface every floating box shares, such as a menu, a tooltip, a dropdown, or a toast. The popover helper adds it to the box it places.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

| Class | What it looks like |
| :--- | :--- |
| `base-mono` | Applies the mono font stack |
| `base-ok` | Success colored text |
| `base-bad` | Error colored text |
| `base-url` | Monospace, dimmed line for showing a URL or path with an accent link |
| `base-sr-only` | Visually hidden text that screen readers still read, such as a label for an icon only control |
| `base-thumb` | An artwork frame that holds a placeholder icon under its image, shared by media cards, media picker rows, checkbox list rows, and the image picker, which each set the size |
| `base-thumb-placeholder` | The icon that fills the frame while there is no image, or until it loads |
| `base-thumb-image` | The image that covers the frame, hidden when it fails to load |
| `base-icon-text` | An icon beside text that may wrap, with the icon centered on the first line of text, medium unless small or large |
| `base-float` | The surface every floating box shares, a menu, a filter panel, a help bubble, a tooltip, a dropdown, or a toast, over the page. anchorPopover adds it to the box it places |

<!-- reference:end -->

## Example

<iframe class="base-preview" src="../../../assets/previews/utility-classes.html" title="Utility Classes example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "utility-classes.html"
```
