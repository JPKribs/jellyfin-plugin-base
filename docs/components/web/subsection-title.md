# Subsection Title

A small, muted, uppercase heading that groups fields inside a section or form.

## When to Use

* Use it to split a long form into groups of fields.

## When Not to Use

* Use a [Section Title](section-title.md) for a major area of the page.

## Usage

```html
<h3 class="base-subsection-title">Change Retries</h3>
```

Class: `base-subsection-title`.

## States and Modifiers

* It has no top margin when it is the first child.
* Its rule fades with the theme text color through `--base-fg`.

## Gotchas

* Use a real `h3` or `h4` so screen readers get the outline.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

| Class | What it looks like |
| :--- | :--- |
| `base-subsection-title` | Small muted uppercase header for a subsection grouped inside a section or form |

<!-- reference:end -->

## Used By

Live Channels, Requests, Scripts, and Server Sync use it.

## Example

<iframe class="base-preview" src="../../../assets/previews/subsection-title.html" title="Subsection Title example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "subsection-title.html"
```
