# Edit Input

A compact input on the surface color. The combo box, chip select, checkbox list search, and prompt dialog build with it.

## When to Use

* Use it for an input that sits inside a component or a table row.

## When Not to Use

* Use the field containers on [Form Fields](form-fields.md) for a labeled field on a page.

## Usage

```html
<input class="jpk-edit-input" value="name" aria-label="Name" />
```

Class: `jpk-edit-input`.

## States and Modifiers

* Inside a page or dialog the field look from [Form Fields](form-fields.md) has higher specificity, so an edit input matches the other fields there. Outside them it is the compact look.

## Used By

Requests, Scripts, User Management, and YouTube Audio use it.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/edit-input.html" title="Edit Input example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "edit-input.html"
```
