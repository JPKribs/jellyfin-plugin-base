# Panel

A bordered sub card on the surface color, for a group of fields or text inside a section or a dialog.

## When to Use

* Use it to group related fields or a short block of text.

## When Not to Use

* Use a [Record Card](record-card.md) for label and value rows.

## Usage

```html
<div class="base-panel">
    <div class="base-panel-header">Schedule</div>
    <div class="base-panel-body">
        <div class="inputContainer"><label for="txtStart">Starts on</label><input is="emby-input" type="date" id="txtStart" /></div>
    </div>
</div>
```

Classes: `base-panel`, `base-panel-header`, `base-panel-body`.

## States and Modifiers

* The header is optional, and a panel may hold only a body.
* The last block inside the body takes no bottom margin.
* Inside a page or dialog the panel takes the field gap as bottom margin.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

| Class | What it looks like |
| :--- | :--- |
| `base-panel` | Bordered sub card on the surface color, for a group inside a section or a dialog, the surface a record card shares |
| `base-panel-header` | Header strip of a panel with a divider under it |
| `base-panel-body` | Padded body of a panel, padded as a record card is |

<!-- reference:end -->

## Used By

No plugin uses it today.

## Example

<iframe class="base-preview" src="../../../assets/previews/panel.html" title="Panel example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "panel.html"
```
