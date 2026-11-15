# Status Page

A standalone, themed card page that the C# `StatusPage.Render` renders. It has a logo, a heading, a message, an optional spinner, an optional button, and an optional raw content slot. It needs none of the dashboard assets and is not part of the CSS and JS bundle.

## When to Use

* Use it for served pages such as "sign in required" or "loading".

## When Not to Use

* Never use it inside a config page. It is a whole HTML page.

## Usage

```csharp
var html = StatusPage.Render(
    heading: "Sign in required",
    message: "Sign in to Jellyfin first.",
    buttonText: "Back to Jellyfin",
    buttonHref: "../web/");
```

The template is `src/templates/status.html`, embedded as `<RootNamespace>.Templates.status.html`. It has one object marker comment, `card`. See [Pages and Templates](../csharp/pages-and-templates.md) for the C# side.

* `{{TITLE}}`: the document title, HTML encoded. It defaults to the heading.
* `{{HEADING}}`: the `h1`, encoded.
* `{{MESSAGE}}`: the paragraph, encoded.
* `{{SPINNER}}`: `<div class="jpk-spinner" role="status" aria-label="Loading">`, or empty when `showSpinner` is off.
* `{{BUTTON}}`: an `a.jpk-btn`, or empty. The defaults are "Back to Jellyfin" and `../web/`.
* `{{CONTENT}}`: raw HTML that is not encoded. Pass only markup the plugin owns.

Classes, all defined in the template's own `<style>` block: `jpk-status-card`, `jpk-logo`, `jpk-spinner`, `jpk-btn`, `jpk-fields`, `jpk-hint`, `jpk-field-pair`, `jpk-submit`, `jpk-note`, and `hidden`.

## States and Modifiers

* The page is always dark, a `#101010` page with a `#1c1c1f` card and the Jellyfin blue accent. It is centered with a 420px maximum width and 24px page padding, so it fits 375px.
* `jpk-fields`, `jpk-hint`, `jpk-field-pair`, `jpk-submit`, and `jpk-note` are for a form a plugin supplies through `content`. `StatusPage.Render` does not produce them.
* The template carries its own copy of `hidden` and a `jpk-spin` animation.

## Gotchas

* It links a relative `favicon.ico` (serve one with `PublicPage.Favicon`) and the logo `../web/favicons/touchicon.png`.
* `CssCollisionTests` fails if any template class is also defined in the kit CSS, other than `hidden`, so the card is never restyled when both load on one page.

## Used By

Custom Pages, User Management, and YouTube Audio use it.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/status-page.html" title="Status Page example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "status-page.html"
```
