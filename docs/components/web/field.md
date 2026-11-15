# Field and Field Row

A compact label over control field, and a row that places several side by side.

## When to Use

* Use them for dense lines of several fields, such as host and port.

## When Not to Use

* Use the plain field containers on [Form Fields](form-fields.md) for one field per row.

## Usage

```html
<div class="jpk-field-row">
    <div class="jpk-field">
        <label for="txtHost">Host</label>
        <input is="emby-input" type="text" id="txtHost" />
    </div>
    <div class="jpk-field jpk-field-fixed">
        <label for="txtPort">Port</label>
        <input is="emby-input" type="number" id="txtPort" />
    </div>
</div>
```

Classes: `jpk-field`, `jpk-field-fixed`, `jpk-field-row`.

## States and Modifiers

* `jpk-field-fixed` keeps the natural width instead of growing.
* Fields wrap onto the next line once narrower than 10em, so a row stacks at 375px.
* A text box in a field takes a select's height, so mixed rows line up.
* `jpk-edit-line` lays out a line of fields. See [Bulk Edit Bar and Edit Row](bulk-edit.md).

## Used By

Artwork Generator, Custom Pages, and Requests use it.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/field.html" title="Field and Field Row example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "field.html"
```
