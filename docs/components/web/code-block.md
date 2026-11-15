# Code Block

A monospace code editor textarea, or a read only block for a preview.

## When to Use

* Use the textarea for JSON, templates, and scripts the user edits.

## When Not to Use

* Never use it for a short value. Use [Copy Field](copy-field.md) or the mono class from [Utility Classes](utility-classes.md).

## Usage

```html
<textarea class="base-code" id="txtTemplate"></textarea>
<pre class="base-code base-code-block">{ "event": "Approved" }</pre>
<pre class="base-code base-code-block base-code-invalid">{ not json }</pre>
```

Classes: `base-code`, `base-code-block`, `base-code-invalid`.

## States and Modifiers

* `base-code` is a full width mono textarea on the field surface in the theme text color, at least 240px tall, that keeps its lines unwrapped and resizes vertically.
* `base-code-block` goes with `base-code`. It is as tall as its text and wraps.
* `base-code-invalid` goes with `base-code` and turns the border to `--base-error`. Toggle it from your own validation.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

| Class | What it looks like |
| :--- | :--- |
| `base-code` | Full width monospace textarea for editing code |
| `base-code.base-code-block` | Read only block of code or JSON that wraps and is only as tall as its text |
| `base-code.base-code-invalid` | Code field or block with a red border for content that is not valid |

<!-- reference:end -->

## Used By

Custom Pages, Live Channels, Requests, and Scripts use it.

## Example

<iframe class="base-preview" src="../../../assets/previews/code-block.html" title="Code Block example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "code-block.html"
```
