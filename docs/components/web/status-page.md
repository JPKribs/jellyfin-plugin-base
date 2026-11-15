# Status Page

A standalone, themed card page that the C# `StatusPage.Render` renders. It has a logo, a heading, a message, an optional spinner, an optional button, and an optional raw content slot. It needs none of the dashboard assets and is not part of the CSS and JS bundle.

## Decision

| When | Use |
| :--- | :--- |
| Served pages such as a sign in prompt or a loading page | Status Page. |
| Anything inside a config page | Not the Status Page. It is a whole HTML page. |

## Usage

```csharp
var html = StatusPage.Render(
    heading: "Sign In Required",
    message: "Sign in to Jellyfin first.",
    buttonText: "Back to Jellyfin",
    buttonHref: "../web/");
```

The template is `src/templates/status.html`, embedded as `<RootNamespace>.Templates.status.html`. Each part sits under a comment that names it: `favicon`, `styles`, `card`, `logo`, `heading`, `message`, `spinner`, `button`, and `content`. See [Pages and Templates](../csharp/pages-and-templates.md) for the C# side.

* `{{TITLE}}`: the document title, HTML encoded. It defaults to the heading.
* `{{HEADING}}`: the `h1`, encoded.
* `{{MESSAGE}}`: the paragraph, encoded.
* `{{SPINNER}}`: `<div class="base-spinner" role="status" aria-label="Loading">`, or empty when `showSpinner` is off.
* `{{BUTTON}}`: an `a.base-btn`, or empty when `buttonText` or `buttonHref` is null or empty. The defaults are "Back to Jellyfin" and `../web/`.
* `{{CONTENT}}`: raw HTML that is not encoded. Pass only markup the plugin owns.

Classes, all defined in the template's own `<style>` block: `base-status-card`, `base-logo`, `base-spinner`, `base-btn`, `base-fields`, `base-hint`, `base-field-pair`, `base-submit`, `base-note`, and `hidden`.

## States and Modifiers

* The page is always dark, a `#101010` page with a `#1c1c1f` card and the Jellyfin blue accent. It is centered with a 420px maximum width and 24px page padding, so it fits 375px.
* `base-fields`, `base-hint`, `base-field-pair`, `base-submit`, and `base-note` are for a form a plugin supplies through `content`. `StatusPage.Render` does not produce them.
* The template carries its own copy of `hidden` and a `base-spin` animation.

## Gotchas

* It links a relative `favicon.ico` (serve one with `PublicPage.Favicon`) and the logo `../web/favicons/touchicon.png`.
* `CssCollisionTests` fails if any template class is also defined in the kit CSS, other than `hidden`, so the card is never restyled when both load on one page.

## Example

<iframe class="base-preview" src="../../../assets/previews/status-page.html" title="Status Page example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "status-page.html"
```
