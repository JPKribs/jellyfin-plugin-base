# Subsection Title

A small, muted, uppercase heading that groups fields inside a section or form.

## Decision

| When | Use |
| :--- | :--- |
| Splitting a long form into groups of fields | Subsection Title |
| A major area of the page | [Section Title](section-title.md) |

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

## Example

<iframe class="base-preview" src="../../../assets/previews/subsection-title.html" title="Subsection Title example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "subsection-title.html"
```
