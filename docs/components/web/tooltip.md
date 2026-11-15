# Tooltip

A floating tooltip that shows when the pointer rests on, or keyboard focus reaches, any element under a root that has a `data-base-tip` attribute.

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
<button type="button" data-base-tip="Runs the task now." data-base-tip-placement="bottom">Run</button>
```

Classes: `base-tooltip`. The handle is `{ element, show, hide, destroy }`. `show(target)` shows the tip for one element.

## States and Modifiers

* The tip hides on leave, blur, Escape, an outside click, a scroll, and a resize, and flips below when there is no room above. `data-base-tip-placement="bottom"` places it below.
* `bindTooltips(root, { placement })` takes `top` (default) or `bottom` for every tip, and `data-base-tip-placement` overrides it for one element.
* The target gets `aria-describedby` while the tip shows.
* `setTooltip` gives a plain element `tabindex="0"`.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `setTooltip`

<code>function setTooltip&lt;T extends Element&gt;(target: T, text: string, placement?: TooltipPlacement &#124; string): T</code>

Gives an element tooltip text through the data-base-tip attribute that bindTooltips reads. A target that cannot take focus gets tabindex 0 so the tooltip also shows from the keyboard.

### `bindTooltips`

<code>function bindTooltips(root?: HTMLElement &#124; null, options?: TooltipOptions): TooltipHandle</code>

Shows a floating tooltip when the pointer rests on, or keyboard focus reaches, any element under root that has a data-base-tip attribute. Escape, a click outside, scrolling, a resize, and leaving the element hide it, and aria-describedby points at the tip while it shows.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `placement` | <code>TooltipPlacement &#124; string</code> |  |

| Handle member | Type |
| :--- | :--- |
| `show` | <code>(target: Element): void</code> |
| `hide` | <code>(): void</code> |
| `destroy` | <code>(): void</code> |

| Type | What it is |
| :--- | :--- |
| `TooltipPlacement` | The side of its target a tooltip prefers, before it flips to stay on screen. |

| Class | What it looks like |
| :--- | :--- |
| `base-tooltip` | Floating tooltip bubble on the base-float surface that bindTooltips positions beside its target, above a dialog and a toast |

<!-- reference:end -->

## Used By

No plugin uses it today.

## Example

<iframe class="base-preview" src="../../../assets/previews/tooltip.html" title="Tooltip example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "tooltip.html"
```
