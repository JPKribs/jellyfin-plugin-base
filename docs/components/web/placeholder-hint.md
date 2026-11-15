# Placeholder Hint

A "Placeholders" help toggle under a field that lists `{name}` buttons and inserts the pressed one at the cursor.

## When to Use

* Use it for template fields such as message formats.

## When Not to Use

* Use a [Help Hint](help-hint.md) to explain a field. It inserts nothing.

## Usage

```js
import { placeholderHint, bindPlaceholders } from './configurationpage?name=myplugin_jpkribs_shared.js';

container.innerHTML =
    '<div class="inputContainer">' +
        '<label for="txtTitleFormat">Title format</label>' +
        '<input is="emby-input" type="text" id="txtTitleFormat" />' +
        placeholderHint([['title', 'The item title'], ['year', 'The release year']]) +
    '</div>';
bindPlaceholders(container, function (field) { tracker.check(); });
```

Classes: `jpk-placeholder-hint`, `jpk-hint-button`, `jpk-placeholders`, `jpk-tag-button`. `insertAtCursor(field, text)` replaces the selection, puts the cursor after the text, focuses the field, and fires an `input` event. All three functions are also on the bag.

## States and Modifiers

* `placeholderHint(placeholders)` turns `[[name, description], ...]` into an HTML string. Names and descriptions are escaped.
* `bindPlaceholders(root, onInsert)` makes every hint in `root` work, once per root. A placeholder button inserts `{name}` into the first textarea or input of its `inputContainer`.
* Pressing a placeholder does not take focus from the field, so the insertion lands at the cursor.

## Gotchas

* Put the hint inside the same `inputContainer` as the field.

## Used By

Requests uses it.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/placeholder-hint.html" title="Placeholder Hint example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "placeholder-hint.html"
```
