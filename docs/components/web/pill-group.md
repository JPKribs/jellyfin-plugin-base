# Pill Group

A wrapping row of pills where exactly one is chosen, such as a frequency or a mode.

## When to Use

* Use it for a short list of exclusive choices.

## When Not to Use

* Use a [Toggle Group](toggle-group.md) for any number, and a [Choice Group](choice-group.md) when each option needs a sentence.

## Usage

```html
<div class="jpk-pill-group" id="frequency" role="group" aria-label="Frequency">
    <button type="button" class="jpk-pill" data-value="daily" aria-pressed="false">Daily</button>
    <button type="button" class="jpk-pill" data-value="weekly" aria-pressed="true">Weekly</button>
</div>
```

```js
import { createPillGroup } from './configurationpage?name=myplugin_jpkribs_shared.js';

var frequency = createPillGroup(view.querySelector('#frequency'), { onChange: function (value) { tracker.check(); } });
frequency.set(config.Frequency);
```

Classes: `jpk-pill-group`, `jpk-pill`. The handle is `{ get, set, destroy }`.

## States and Modifiers

* `get()` returns the `data-value` of the chosen pill, or its text when it has none. It returns `null` when none is chosen.
* `set(value)` chooses a pill without calling `onChange`. An unknown value clears the choice.
* The chosen pill carries `aria-pressed="true"` and `selected` in step. Choosing it again does nothing, and a disabled pill cannot be chosen.
* The markup works with no JavaScript when the page sets `aria-pressed` itself.

## Gotchas

* `createPillGroup` throws without a group element.

## Used By

No plugin uses it today.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/pill-group.html" title="Pill Group example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "pill-group.html"
```
