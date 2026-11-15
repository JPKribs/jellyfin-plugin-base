# Pill Group

A wrapping row of pills where exactly one is chosen, such as a frequency or a mode.

## Decision

| When | Use |
| :--- | :--- |
| A short list of exclusive choices | Pill Group |
| Choices where any number may be on | [Toggle Group](toggle-group.md) |
| Options that each need a sentence | [Choice Group](choice-group.md) |

## Usage

```html
<div class="base-pill-group" id="frequency" role="group" aria-label="Frequency">
    <button type="button" class="base-pill" data-value="daily" aria-pressed="false">Daily</button>
    <button type="button" class="base-pill" data-value="weekly" aria-pressed="true">Weekly</button>
</div>
```

```js
import { createPillGroup } from './configurationpage?name=myplugin_jpkribs_shared.js';

var frequency = createPillGroup(view.querySelector('#frequency'), { onChange: function (value) { tracker.check(); } });
frequency.set(config.Frequency);
```

Classes: `base-pill-group`, `base-pill`. The handle is `{ get, set, destroy }`.

## States and Modifiers

* `get()` returns the `data-value` of the chosen pill, or its text when it has none. It returns `null` when none is chosen.
* `set(value)` chooses a pill without calling `onChange`. An unknown value clears the choice.
* The chosen pill carries `aria-pressed="true"` and `selected` in step. Choosing it again does nothing, and a disabled pill cannot be chosen.
* The markup works with no JavaScript when the page sets `aria-pressed` itself.
* `small` and `large` on a pill take the small and large steps of the [size scale](design-tokens.md).

## Gotchas

* `createPillGroup` throws without a group element.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createPillGroup`

<code>function createPillGroup(groupEl: HTMLElement, options?: PillGroupOptions): PillGroupHandle</code>

Wires a base-pill-group of buttons as a single choice, keeping aria-pressed and the selected class on the chosen pill. It reports each change to onChange.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `onChange` | <code>(value: string &#124; null): void</code> |  |

| Handle member | Type |
| :--- | :--- |
| `get` | <code>(): string &#124; null</code> |
| `set` | <code>(value: string &#124; null): void</code> |
| `destroy` | <code>(): void</code> |

| Class | What it looks like |
| :--- | :--- |
| `base-pill-group` | A wrapping row of pills where exactly one is chosen, wired by createPillGroup. The toggle group shares the row |
| `base-pill` | One pill, outlined when off and filled with the accent and white text when aria-pressed is true or it has selected |
| `base-pill.small` | A pill at the small or large size of the scale |

<!-- reference:end -->

## Example

<iframe class="base-preview" src="../../../assets/previews/pill-group.html" title="Pill Group example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "pill-group.html"
```
