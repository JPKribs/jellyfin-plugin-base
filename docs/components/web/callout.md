# Callout

A soft inline notice. Pick the class by meaning.

## When to Use

* Use it for a hint, a result, or a problem that belongs beside the content it explains.

## When Not to Use

* Use a [Banner](banner.md) when the user can dismiss it, and a [Toast](toast.md) for a message that appears after an action.

## Usage

```html
<div class="jpk-info">Password is your API key.</div>
<div class="jpk-success">Connected.</div>
<div class="jpk-warn">The last run failed.</div>
<div class="jpk-error">The server could not be reached.</div>
<div class="jpk-neutral">Sync is off, so nothing here applies.</div>
<div class="jpk-error-message">Request failed with status 502</div>
```

Classes: `jpk-info`, `jpk-success`, `jpk-warn`, `jpk-error`, `jpk-neutral`, `jpk-error-message`.

## States and Modifiers

* The five callouts share one shape. Each is a 12 percent tint with a 40 percent border in blue, green, orange, red, or gray. The tints are fixed colors.
* `jpk-error-message` is a mono block for raw failure text, in the red swatch colors.
* Toggle a callout with the `hidden` class, as Server Sync does.

## Gotchas

* There is no icon and no JavaScript.
* The kit adds no ARIA. Put `role="status"` or `role="alert"` on a message that appears after an action.

## Used By

Custom Pages, Remote Access, Scripts, Server Sync, and User Management use it.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/callout.html" title="Callout example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "callout.html"
```
