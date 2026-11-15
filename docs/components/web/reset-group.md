# Reset Group

A stack of rows that pair a description with an action button, as for per table resets.

## When to Use

* Use it for a list of destructive actions, each with a sentence of explanation.

## When Not to Use

* Never use it for ordinary settings. Use [Form Fields](form-fields.md).

## Usage

```html
<h3 class="base-subsection-title">Reset Individual Tables</h3>
<div class="base-reset-group">
    <div class="base-reset-row">
        <div class="base-reset-info">
            <div>Content Sync</div>
            <div class="fieldDescription">Forgets content tracking.</div>
        </div>
        <button is="emby-button" type="button" class="raised base-button destructive small"><span>Reset</span></button>
    </div>
</div>
```

Classes: `base-reset-group`, `base-reset-row`, `base-reset-row-nuclear`, `base-reset-info`.

## States and Modifiers

* `base-reset-row-nuclear` gives the one dangerous row a red tint and no rule.
* The last row has no rule.

## Gotchas

* Pair each button with a [Confirm Dialog](confirm-dialog.md). The rows have no JavaScript.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

| Class | What it looks like |
| :--- | :--- |
| `base-reset-group` | Container for a stack of reset or action rows |
| `base-reset-row` | Row pairing an action description with its button |
| `base-reset-row-nuclear` | Row with a faint red tint for the most destructive action |
| `base-reset-info` | Column that holds the description beside an action button |

<!-- reference:end -->

## Used By

Server Sync and YouTube Audio use it.

## Example

<iframe class="base-preview" src="../../../assets/previews/reset-group.html" title="Reset Group example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "reset-group.html"
```
