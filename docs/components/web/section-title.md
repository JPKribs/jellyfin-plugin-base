# Section Title

The page heading with a full width underline. Jellyfin supplies the markup classes, so they are not prefixed.

## When to Use

* Use one per tab or major area of a config page.

## When Not to Use

* Never use it inside a dialog. Use `base-modal-title` there. See [Dialog](dialog.md).

## Usage

```html
<div class="sectionTitleContainer flex align-items-center">
    <h1 class="sectionTitle">Servers</h1>
</div>
```

Classes: `sectionTitleContainer`, `sectionTitle`.

## States and Modifiers

* The container takes the wide gap above it, also when it is the first child. The heading fills the row and takes a rule under it, with the wide gap below.
* The heading is a normal heading element. Use `h1` for the page title and `h2` for later ones.

## Gotchas

* The underline needs the container to be a flex row (`flex align-items-center` from Jellyfin), or the heading does not fill it.

## Used By

Artwork Generator, Custom Pages, Live Channels, Remote Access, Requests, Scripts, Server Sync, User Management, and YouTube Audio use it.

## Example

<iframe class="base-preview" src="../../../assets/previews/section-title.html" title="Section Title example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "section-title.html"
```
