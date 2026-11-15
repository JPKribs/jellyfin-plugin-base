# Indent

A group of sub fields under a toggle, indented with a 2px left rule.

## When to Use

* Use it for fields that matter only while a checkbox is on.

## When Not to Use

* Never use it as a general container. It is a visual cue and does not reset the margins inside.

## Usage

```html
<div id="recyclingBinSettings" class="base-indent hidden">
    <div class="inputContainer"><label for="txtPath">Recycling bin path</label><input is="emby-input" type="text" id="txtPath" /></div>
</div>
```

```js
shared.bindReveal('chkEnableRecyclingBin', 'recyclingBinSettings');
```

Class: `base-indent`.

## States and Modifiers

* `bindReveal(checkboxId, targetId, invert)` shows or hides the target with the `hidden` class, binds once, and applies the current state on every call. Call it after loading the config.

## Gotchas

* Field containers inside keep their own gap.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

| Class | What it looks like |
| :--- | :--- |
| `base-indent` | Indented group with a thin rule under a toggle's checkbox, so its fields line up with the toggle's label |

<!-- reference:end -->

## Used By

Live Channels, Server Sync, and User Management use it.

## Example

<iframe class="base-preview" src="../../../assets/previews/indent.html" title="Indent example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "indent.html"
```
