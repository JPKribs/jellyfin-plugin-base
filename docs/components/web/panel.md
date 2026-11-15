# Panel

A bordered sub card on the surface color, for a group of fields or text inside a section or a dialog.

## When to Use

* Use it to group related fields or a short block of text.

## When Not to Use

* Use a [Record Card](record-card.md) for label and value rows.

## Usage

```html
<div class="jpk-panel">
    <div class="jpk-panel-header">Schedule</div>
    <div class="jpk-panel-body">
        <div class="inputContainer"><label for="txtStart">Starts on</label><input is="emby-input" type="date" id="txtStart" /></div>
    </div>
</div>
```

Classes: `jpk-panel`, `jpk-panel-header`, `jpk-panel-body`.

## States and Modifiers

* The header is optional, and a panel may hold only a body.
* The last block inside the body takes no bottom margin.
* Inside a page or dialog the panel takes the field gap as bottom margin.

## Used By

No plugin uses it today.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/panel.html" title="Panel example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "panel.html"
```
