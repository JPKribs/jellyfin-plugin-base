# Section

An always open titled block, matched to the collapsible section but with no toggle.

## When to Use

* Use it for content that must stay visible, such as a list beside collapsible forms.

## When Not to Use

* Use a [Collapsible Section](collapsible-section.md) when the reader may fold the content away.

## Usage

```html
<div class="jpk-section">
    <div class="jpk-section-title">Servers</div>
    <div class="jpk-section-content">
        <div id="serverList" class="jpk-card-list"></div>
    </div>
</div>
```

Classes: `jpk-section`, `jpk-section-title`, `jpk-section-content`.

## States and Modifiers

* The title is optional. Server Sync's Servers page uses `jpk-section` and `jpk-section-content` with no title element.
* Inside a page or dialog the section takes the field gap as bottom margin.
* The title is capitalized by CSS, so a sentence case title changes.

## Gotchas

* There is no JavaScript and no ARIA. The title is a plain block, not a button.

## Used By

Artwork Generator, Requests, Scripts, Server Sync, and User Management use it.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/section.html" title="Section example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "section.html"
```
