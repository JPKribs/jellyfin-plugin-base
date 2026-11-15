# Section Title

The page heading with a full width underline. Jellyfin supplies the markup classes, so they are not prefixed.

## Decision

| When | Use |
| :--- | :--- |
| Each tab or major area of a config page | One Section Title |
| A title inside a dialog | `base-modal-title`, as on [Dialog](dialog.md) |

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

## Example

<iframe class="base-preview" src="../../../assets/previews/section-title.html" title="Section Title example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "section-title.html"
```
