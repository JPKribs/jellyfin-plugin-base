# Utility Classes

Small classes for visibility, fonts, and text color.

## When to Use

* Use `hidden` or the `[hidden]` attribute to show and hide a block. `shared.setVisible` toggles `hidden` for you.
* Use `jpk-mono` for paths, ids, and addresses.
* Use `jpk-sr-only` for the label of an icon only control.

## When Not to Use

* Never use `jpk-ok` and `jpk-bad` as the only signal. Pair the color with a word.

## Usage

```html
<div class="hidden">Hidden</div>
<span class="jpk-mono">10.0.0.1</span>
<span class="jpk-ok">OK</span> <span class="jpk-bad">Failed</span>
<div class="jpk-url">URL: <a href="#">/pages/home</a></div>
<button type="button"><span class="material-icons" aria-hidden="true">delete</span><span class="jpk-sr-only">Remove the record</span></button>
```

Classes: `hidden`, `jpk-mono`, `jpk-ok`, `jpk-bad`, `jpk-url`, `jpk-sr-only`.

## States and Modifiers

* `hidden` is `display: none`, forced. It is a Jellyfin class the kit also styles.
* The `[hidden]` attribute hides too, even on a component with its own `display` rule such as a flex row or a grid.
* `jpk-url` is mono at 85 percent opacity, with links in the accent color.

## Used By

Remote Access uses `jpk-ok`. Remote Access and Requests use `jpk-bad`. Custom Pages, Requests, and YouTube Audio use `jpk-url`. No plugin uses `jpk-sr-only` yet.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/utility-classes.html" title="Utility Classes example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "utility-classes.html"
```
