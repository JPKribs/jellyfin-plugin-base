# Tooltip

A floating tooltip that shows when the pointer rests on, or keyboard focus reaches, any element under a root that has a `data-jpk-tip` attribute.

## When to Use

* Use it to explain an icon only control or a short label.

## When Not to Use

* Never put essential information only in a tooltip. Use a [Help Hint](help-hint.md) or a `fieldDescription` for a field.

## Usage

```js
import { bindTooltips, setTooltip } from './configurationpage?name=myplugin_jpkribs_shared.js';

var tips = bindTooltips(view);
setTooltip(button, 'Runs the task now.');
```

```html
<button type="button" data-jpk-tip="Runs the task now." data-jpk-tip-placement="bottom">Run</button>
```

Classes: `jpk-tooltip`. The handle is `{ element, show, hide, destroy }`. `show(target)` shows the tip for one element.

## States and Modifiers

* The tip hides on leave, blur, Escape, and scroll, and flips below when there is no room above. `data-jpk-tip-placement="bottom"` places it below.
* `bindTooltips(root, { placement })` takes `top` (default) or `bottom` for every tip, and `data-jpk-tip-placement` overrides it for one element.
* The target gets `aria-describedby` while the tip shows.
* `setTooltip` gives a plain element `tabindex="0"`.

## Used By

No plugin uses it today. Remote Access and Server Sync use the `title` attribute for hover text today.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/tooltip.html" title="Tooltip example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "tooltip.html"
```
