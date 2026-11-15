# Field and Field Row

A compact label over control field, and a row that places several side by side.

## When to Use

* Use them for dense lines of several fields, such as host and port.

## When Not to Use

* Use the plain field containers on [Form Fields](form-fields.md) for one field per row.

## Usage

```html
<div class="base-field-row">
    <div class="base-field">
        <label for="txtHost">Host</label>
        <input is="emby-input" type="text" id="txtHost" />
    </div>
    <div class="base-field base-field-fixed">
        <label for="txtPort">Port</label>
        <input is="emby-input" type="number" id="txtPort" />
    </div>
</div>
```

Classes: `base-field`, `base-field-fixed`, `base-field-row`.

## States and Modifiers

* `base-field-fixed` keeps the natural width instead of growing.
* Fields wrap onto the next line once narrower than 10em, so a row stacks at 375px.
* A text box in a field takes a select's height, so mixed rows line up.
* `base-edit-line` lays out a line of fields. See [Bulk Edit Bar and Edit Row](bulk-edit.md).

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

| Class | What it looks like |
| :--- | :--- |
| `base-field` | A compact label and control field for dense, multiple-per-line layouts |
| `base-field-fixed` | A field that keeps its natural width instead of growing to fill the row |
| `base-field-row` | A row that places fields side by side and wraps on narrow widths |

<!-- reference:end -->

## Used By

Artwork Generator, Custom Pages, Requests, Server Sync, and YouTube Audio use it.

## Example

<iframe class="base-preview" src="../../../assets/previews/field.html" title="Field and Field Row example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "field.html"
```
