# Button

Buttons are Jellyfin's `emby-button` with the `raised` class and kit modifiers.

## When to Use

* Use `jpk-button-submit` for the main action, `jpk-button-destructive` for an action that loses data, and `jpk-secondary` for the rest.

## When Not to Use

* Never write `jpk-button-primary`. See [Deprecated](deprecated.md).

## Usage

```html
<button is="emby-button" type="button" class="raised jpk-button-submit"><span>Save</span></button>
<button is="emby-button" type="button" class="raised jpk-button-destructive jpk-button-small"><span>Remove</span></button>
<button is="emby-button" type="button" class="raised jpk-secondary"><span>Cancel</span></button>
<button is="emby-button" type="button" class="raised jpk-icon-btn jpk-button-submit">
    <span class="material-icons" aria-hidden="true">add</span><span>Add Server</span>
</button>
```

Classes: `jpk-button-submit`, `jpk-button-destructive`, `jpk-button-small`, `jpk-secondary`, `jpk-icon-btn`.

## States and Modifiers

* Every rule is forced, so these win over the emby defaults.
* `jpk-icon-btn` is an inline flex with an 18px icon. Combine it with a color class.
* In a dialog footer, `openDialog` builds `raised jpk-modal-button` buttons and adds your class, `jpk-secondary` by default.
* A `jpk-btn-progress` line inside a submit or destructive button takes a translucent `--jpk-on-accent`, so it stays visible on the fill.

## Gotchas

* A `jpk-button-destructive` button in a dialog is never focused automatically.

## Used By

Custom Pages, Live Channels, Remote Access, Requests, Scripts, Server Sync, User Management, and YouTube Audio use it.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/button.html" title="Button example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "button.html"
```
