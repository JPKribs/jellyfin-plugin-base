# Section

An always open titled block, matched to the collapsible section but with no toggle.

## Decision

| When | Use |
| :--- | :--- |
| Content that must stay visible, such as a list beside collapsible forms | Section |
| Content the reader may fold away | [Collapsible Section](collapsible-section.md) |

## Usage

```html
<div class="base-section">
    <div class="base-section-title">Servers</div>
    <div class="base-section-content">
        <div id="serverList" class="base-card-list"></div>
    </div>
</div>
```

Classes: `base-section`, `base-section-title`, `base-section-content`.

## States and Modifiers

* The title is optional. A section may hold only `base-section-content`, with no title element.
* Inside a page or dialog the section takes the field gap as bottom margin.
* The title is capitalized by CSS, so a sentence case title changes.

## Gotchas

* There is no JavaScript and no ARIA. The title is a plain block, not a button.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

| Class | What it looks like |
| :--- | :--- |
| `base-section` | Section that is always open, with the collapsible section's frame, header, and body from collapsible-section.css, and no toggle or chevron |
| `base-section-title` | Static header row styled like a collapsible header, with no button, pointer, or chevron |

<!-- reference:end -->

## Example

<iframe class="base-preview" src="../../../assets/previews/section.html" title="Section example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "section.html"
```
