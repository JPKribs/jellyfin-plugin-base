# Subsection Title

A small, muted, uppercase heading that groups fields inside a section or form.

## When to Use

* Use it to split a long form into groups of fields.

## When Not to Use

* Use a [Section Title](section-title.md) for a major area of the page.

## Usage

```html
<h3 class="jpk-subsection-title">Change Retries</h3>
```

Class: `jpk-subsection-title`.

## States and Modifiers

* It has no top margin when it is the first child.
* Its rule fades with the theme text color through `--jpk-fg`.

## Gotchas

* Use a real `h3` or `h4` so screen readers get the outline.

## Used By

Live Channels, Requests, Scripts, and Server Sync use it.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/subsection-title.html" title="Subsection Title example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "subsection-title.html"
```
