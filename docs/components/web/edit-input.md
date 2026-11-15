# Edit Input

A compact input on the surface color, at the field height. The [Combo Box](combo-box.md), the [Chip Select](chip-select.md), and the text boxes of the [Confirm Dialog](confirm-dialog.md) and the [Prompt Dialog](prompt-dialog.md) build with it.

## Decision

| When | Use |
| :--- | :--- |
| An input that sits inside a component or a table row | Edit Input |
| A labeled field on a page | The field containers on [Form Fields](form-fields.md) |

## Usage

```html
<input class="base-edit-input" value="name" aria-label="Name" />
```

Class: `base-edit-input`.

## States and Modifiers

* Inside a page or dialog the field look from [Form Fields](form-fields.md) has higher specificity, so an edit input matches the other fields there. Outside them it is the compact look.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

| Class | What it looks like |
| :--- | :--- |
| `base-edit-input` | Input on the same surface and at the same height as the page fields, for inline and combo use outside a form |

<!-- reference:end -->

## Example

<iframe class="base-preview" src="../../../assets/previews/edit-input.html" title="Edit Input example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "edit-input.html"
```
