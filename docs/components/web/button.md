# Button

Buttons are Jellyfin's `emby-button` with the `raised` class and the `base-button` class, with a variant and a size beside it.

## When to Use

* Use `base-button primary` for the main action, `base-button destructive` for an action that destroys data, and `base-button secondary` for the rest.

## When Not to Use

* Use a [Row Button](row-button.md) for an icon action inside a table or list row.
* Use a [Pill Group](pill-group.md) or a [Toggle Group](toggle-group.md) for a set of choices.

## Usage

```html
<button is="emby-button" type="button" class="raised base-button primary"><span>Save</span></button>
<button is="emby-button" type="button" class="raised base-button destructive small"><span>Delete</span></button>
<button is="emby-button" type="button" class="raised base-button secondary"><span>Cancel</span></button>
<button is="emby-button" type="button" class="raised base-button primary">
    <span class="material-icons" aria-hidden="true">add</span><span>Add Server</span>
</button>
```

Classes: `base-button` with `primary`, `secondary`, `destructive`, or `custom`, and `small`, `large`, `fill`, or `field`. `base-button-row` holds a row of them.

## States and Modifiers

* `base-button` is an inline flex, 32px tall with an 18px icon. `small` and `large` take the 24px and 40px steps of the [size scale](design-tokens.md), with their icon sizes.
* A `base-button` with no variant is muted, as `secondary` is.
* `custom` fills the button with `--base-custom` and writes its text in `--base-custom-on`, the on accent color by default.
* `fill` spans the width it has, unless the button is `small`. In a `base-button-row` the `fill` buttons share the width evenly.
* `aria-pressed="true"` fills any `base-button` with the accent, and `aria-pressed="false"` outlines and dims it, so a button can turn on and off.
* `field` takes the field's height, padding, and text size, so a button on the same line as a field lines up at any size.
* Every size and color rule is forced, so these win over the emby defaults.
* In a dialog footer, `openDialog` builds `raised base-modal-button` buttons and adds your class, `base-button secondary` by default.
* A `base-btn-progress` bar inside a `primary` or `destructive` button takes a translucent `--base-on-accent`, so it stays visible on the fill. A `small` button draws no bar. See [Task Progress Button](task-progress-button.md).

## Gotchas

* A `base-button destructive` button in a dialog is never focused automatically.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

| Class | What it looks like |
| :--- | :--- |
| `base-button` | A button on Jellyfin's raised button, medium unless small or large, muted like secondary unless it names a variant, with any icon beside its label |
| `base-button.primary` | The accent filled button for the main action |
| `base-button.secondary` | The muted button for a lower emphasis action |
| `base-button.destructive` | The red filled button for an action that destroys data |
| `base-button.custom` | A button filled with a custom color from a hex code, with black or white text, whichever reads better |
| `base-button.fill` | A medium or large button that spans the width it has. A small button keeps its own width |
| `base-button-row` | A row of buttons a wide space apart, where fill buttons share the width evenly |
| `base-button.field` | A button on the same line as a field, which takes the field's height, padding, and text size, so the two line up at any size |

<!-- reference:end -->

## Used By

Artwork Generator, Custom Pages, Live Channels, Remote Access, Requests, Scripts, Server Sync, User Management, and YouTube Audio use it.

## Example

<iframe class="base-preview" src="../../../assets/previews/button.html" title="Button example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "button.html"
```
