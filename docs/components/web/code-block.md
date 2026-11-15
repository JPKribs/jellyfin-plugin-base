# Code Block

A monospace code editor textarea, or a read only block for a preview.

## When to Use

* Use the textarea for JSON, templates, and scripts the user edits.

## When Not to Use

* Never use it for a short value. Use [Copy Field](copy-field.md) or the mono class from [Utility Classes](utility-classes.md).

## Usage

```html
<textarea class="jpk-code" id="txtTemplate"></textarea>
<pre class="jpk-code jpk-code-block">{ "event": "Approved" }</pre>
<pre class="jpk-code jpk-code-block jpk-code-invalid">{ not json }</pre>
```

Classes: `jpk-code`, `jpk-code-block`, `jpk-code-invalid`.

## States and Modifiers

* `jpk-code-block` goes with `jpk-code`. It is as tall as its text and wraps.
* `jpk-code-invalid` goes with `jpk-code` and turns the border to `--jpk-error`. Toggle it from your own validation.

## Gotchas

* The text color is a fixed `#e8e8e8`, not the theme color.

## Used By

Custom Pages, Live Channels, Requests, and Scripts use it.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/code-block.html" title="Code Block example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "code-block.html"
```
