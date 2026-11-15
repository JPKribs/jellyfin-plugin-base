# Placeholder Hint

A "Placeholders" help toggle under a field that lists `{name}` buttons and inserts the pressed one at the cursor, or copies it.

## Decision

| When | Use |
| :--- | :--- |
| Template fields such as message formats | Placeholder Hint |
| Explaining a field | A [Help Hint](help-hint.md), which inserts nothing |

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

Classes: `base-placeholder-hint`, `base-hint-button`, `base-placeholders`, `base-tag-button`. `insertAtCursor(field, text)` replaces the selection, puts the cursor after the text, focuses the field, and fires an `input` event. All three functions are also on the bag.

## States and Modifiers

* `placeholderHint(placeholders, options)` turns `[[name, description], ...]` into an HTML string. Names and descriptions are escaped.
* `open` and `close` set the delimiters, `{` and `}` by default, so `{ open: '{{', close: '}}' }` draws and inserts `{{name}}` for a template language that uses them.
* `mode: 'copy'` copies the pressed token to the clipboard instead of inserting it, for a field that is not beside the hint. The token turns green for a moment and a hidden live region says `copiedText`, "Copied {value}." by default. A hint in copy mode works outside an `inputContainer`.
* `label` replaces the toggle's "Placeholders".
* The Placeholders toggle is a text button with no chevron. It starts `collapsed` with `aria-expanded="false"` and `aria-controls` on its list. Its icon and text are secondary gray while the list is hidden and the accent while it shows, with the accent on hover and the accent focus ring.
* `bindPlaceholders(root, onInsert)` makes every hint in `root` work, once per root. A placeholder button inserts its token into the first textarea or input of its `inputContainer`, and `onInsert(field)` follows each insert.
* Pressing a placeholder does not take focus from the field, so the insertion lands at the cursor.

## Gotchas

* Put the hint inside the same `inputContainer` as the field.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `insertAtCursor`

<code>function insertAtCursor(field: PlaceholderField &#124; null, text: string): void</code>

Puts text into an input or text area at the cursor, replacing any selection, and leaves the cursor after it.

### `placeholderHint`

<code>function placeholderHint(placeholders?: Placeholder[] &#124; null, options?: PlaceholderHintOptions &#124; null): string</code>

Returns a field's Placeholders hint and the hidden list it shows. Put it after the field, in the same inputContainer. The hint is a collapsed toggle with aria-expanded and aria-controls on its list, accent while the list shows and gray while it is hidden.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `open` | <code>string</code> | the opening delimiter (default '{') |
| `close` | <code>string</code> | the closing delimiter (default '}') |
| `mode` | <code>'insert' &#124; 'copy'</code> | 'insert' puts the token in the field at the cursor, and 'copy' copies it instead (default 'insert') |
| `label` | <code>string</code> | the toggle's label (default 'Placeholders') |
| `copiedText` | <code>string</code> | the message after a copy, where {value} is the token (default 'Copied {value}.') |

### `bindPlaceholders`

<code>function bindPlaceholders(root: HTMLElement &#124; null, onInsert?: (field: PlaceholderField) =&gt; void): void</code>

Makes every hint inside root work: Placeholders shows or hides the list, and a placeholder goes into the field in the same inputContainer at the cursor, or onto the clipboard for a hint in copy mode. Binds once per root.

| Type | What it is |
| :--- | :--- |
| `Placeholder` | One placeholder as [name, description], where name is used as {name}. |
| `PlaceholderField` | A field a placeholder goes into. |

| Class | What it looks like |
| :--- | :--- |
| `base-placeholder-hint` | A field's Placeholders hint, under the field where Jellyfin puts a field's help |
| `base-hint-button` | The hint's toggle, a text button built as small base-icon-text whose color shows its state: secondary gray while its list is hidden, accent while it shows and on hover |
| `base-placeholders` | List of placeholder tags that a hint shows |
| `base-tag-button` | A tag that is a button, such as a placeholder to put in |
| `base-tag-button.copied` | A placeholder just copied in a hint in copy mode, green for a moment as a copy that worked |

<!-- reference:end -->

## Example

<iframe class="base-preview" src="../../../assets/previews/placeholder-hint.html" title="Placeholder Hint example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "placeholder-hint.html"
```
