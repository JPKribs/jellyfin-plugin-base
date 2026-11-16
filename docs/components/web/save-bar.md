# Save Bar

A Save button with a status line above it. The line says the page has unsaved changes, that it is saving, that the changes saved, or that the save failed, each with its state's icon and color. It is built on the [Status Text](status-text.md) line every message uses.

## Decision

| When | Use |
| :--- | :--- |
| The bottom of any form that saves with a button | Save Bar. |
| A field that saves on change | Nothing. The field saves itself. |

## Usage

```js
import { createSaveBar } from './configurationpage?name=myplugin_jpkribs_shared.js';

var bar = createSaveBar({ onSave: function () { return shared.saveConfig(readForm()); } });
view.querySelector('#saveHost').appendChild(bar.element);
view.addEventListener('input', function () { bar.setDirty(true); });
```

The handle is `{ element, button, status, getState, setState, setDirty, save, destroy }`.

## States and Modifiers

| State | Line | Look |
| :--- | :--- | :--- |
| `pending` | Unsaved changes. | Warning icon, orange |
| `saving` | Saving… | Info icon, blue. The button is disabled |
| `saved` | Changes saved. | Check icon, green. Fades after `savedMs`, 4000 ms by default |
| `failed` | Could not save. | Error icon, red, announced as an alert. Stays until the next change or save |

* Save runs `onSave`. A promise it returns decides saved or failed, and anything else counts as saved. When `onSave` throws or rejects with an Error, or with text, that message is the failed line, such as the server's reason, and `failedText` is the line otherwise.
* `setDirty(true)` shows the pending line, and `setDirty(false)` clears a pending or failed line.
* `setState(state, text)` shows any state, with its own text if given, and `''` shows nothing. `state` in the options sets the state to start in.
* `save()` runs Save from code and resolves `true` when it saved.
* Every line and the button label can be replaced: `saveText`, `pendingText`, `savingText`, `savedText`, `failedText`.
* `fill` makes the button span the width.
* With `form`, Save first checks every field in it through the [validation core](field-message.md#validation). While one is invalid it does not run `onSave`, shows every message, focuses the first invalid field, and shows the failed line "Fix the fields marked in red.", which `invalidText` replaces.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createSaveBar`

<code>function createSaveBar(options?: SaveBarOptions): SaveBarHandle</code>

A Save button with a status line above it, built on the status line every message uses. The line says the page has unsaved changes, that it is saving, that the changes saved, or that the save failed, each with its state's icon and color. Save runs onSave, shows Saving while a promise it returns is pending, then Changes Saved or Could Not Save. When onSave throws or rejects with an Error, or with text, that message is the failed line, such as the server's reason. The saved line fades after savedMs, and a failure stays until the next change or save. With form, Save first checks every field in it through the validation core, and refuses to save while one is invalid.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `form` | <code>ParentNode &#124; null</code> | the form, section, or page whose fields Save checks first [optional] |
| `invalidText` | <code>string</code> | the failed line while a field is invalid (default 'Fix the fields marked in red.') |
| `saveText` | <code>string</code> | the button's label (default 'Save') |
| `pendingText` | <code>string</code> | the line while changes are unsaved (default 'Unsaved changes.') |
| `savingText` | <code>string</code> | the line while saving (default 'Saving…') |
| `savedText` | <code>string</code> | the line after a save (default 'Changes saved.') |
| `failedText` | <code>string</code> | the line after a failed save, when onSave gives no message of its own (default 'Could not save.') |
| `savedMs` | <code>number</code> | how long the saved line stays (default 4000) |
| `fill` | <code>boolean</code> | true makes the button span the width (default false) |
| `state` | <code>SaveBarState</code> | the state to start in [optional] |
| `onSave` | <code>(): unknown</code> | function() run on Save, which may return a promise [optional] |

| Handle member | Type |
| :--- | :--- |
| `button` | <code>HTMLButtonElement</code> |
| `status` | <code>HTMLElement</code> |
| `getState` | <code>(): SaveBarState</code> |
| `setState` | <code>(state: SaveBarState, text?: string): void</code> |
| `setDirty` | <code>(dirty: boolean): void</code> |
| `save` | <code>(): Promise&lt;boolean&gt;</code> |
| `destroy` | <code>(): void</code> |

| Type | What it is |
| :--- | :--- |
| `SaveBarState` | The states a save bar shows above its button. '' shows nothing. |

| Class | What it looks like |
| :--- | :--- |
| `base-save-bar` | A Save button with its status line above it, the line in the state's color with its icon centered on the first line |

<!-- reference:end -->

## Example

<iframe class="base-preview" src="../../../assets/previews/save-bar.html" title="Save Bar example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "save-bar.html"
```
