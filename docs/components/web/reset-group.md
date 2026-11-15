# Reset Group

A stack of rows that pair a description with an action button, as for per table resets.

## When to Use

* Use it for a list of destructive actions, each with a sentence of explanation.

## When Not to Use

* Never use it for ordinary settings. Use [Form Fields](form-fields.md).

## Usage

```html
<h3 class="jpk-subsection-title">Reset Individual Tables</h3>
<div class="jpk-reset-group">
    <div class="jpk-reset-row">
        <div class="jpk-reset-info">
            <div>Content Sync</div>
            <div class="fieldDescription">Forgets content tracking.</div>
        </div>
        <button is="emby-button" type="button" class="raised jpk-button-destructive jpk-button-small"><span>Reset</span></button>
    </div>
</div>
```

Classes: `jpk-reset-group`, `jpk-reset-row`, `jpk-reset-row-nuclear`, `jpk-reset-info`.

## States and Modifiers

* `jpk-reset-row-nuclear` gives the one dangerous row a red tint and no rule.
* The last row has no rule.

## Gotchas

* Pair each button with a [Confirm Dialog](confirm-dialog.md). The rows have no JavaScript.

## Used By

Server Sync and YouTube Audio use it.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/reset-group.html" title="Reset Group example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "reset-group.html"
```
