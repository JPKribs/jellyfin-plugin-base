# Choice Group

Radio cards. One `jpk-choice` label per option, with a name and a sentence of explanation.

## When to Use

* Use it for a mode or strategy where each option needs a line of help.

## When Not to Use

* Use a [Pill Group](pill-group.md) when the names explain themselves.

## Usage

```html
<div class="jpk-choice-group" id="modeChoices" role="radiogroup" aria-label="Direction">
    <label class="jpk-choice">
        <input type="radio" name="serverMode" value="Pull" />
        <span class="jpk-choice-name">Pull</span>
        <span class="jpk-choice-text">Read from this server on a schedule.</span>
    </label>
    <label class="jpk-choice">
        <input type="radio" name="serverMode" value="Push" />
        <span class="jpk-choice-name">Push</span>
        <span class="jpk-choice-text">Send changes made here as they happen.</span>
    </label>
</div>
```

```js
import { createChoiceGroup } from './configurationpage?name=myplugin_jpkribs_shared.js';

var mode = createChoiceGroup(view.querySelector('#modeChoices'), { onChange: function (value) { reflectMode(value); } });
mode.set('Pull');
```

Classes: `jpk-choice-group`, `jpk-choice`, `jpk-choice-name`, `jpk-choice-text`. The handle is `{ get, set, destroy }`.

## States and Modifiers

* `get()` returns the checked value or `null`. `set(value)` checks the matching input.
* The `selected` class follows the checked input, and runs once on creation. A checked input gets the same look through `:has(input:checked)`, in its own rule so an engine without `:has()` keeps `.selected`.
* The radio input is visually hidden but stays in the tab order and keeps the native arrow keys within its group.
* The cards are three equal columns, and one column at 768px and below.

## Gotchas

* `set` does not call `onChange`.
* Use one `name` for all radios of a group, and give the group `role="radiogroup"` and a label.
* `createChoiceGroup` throws without an element.

## Used By

Scripts, Server Sync, and YouTube Audio use it.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/choice-group.html" title="Choice Group example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "choice-group.html"
```
