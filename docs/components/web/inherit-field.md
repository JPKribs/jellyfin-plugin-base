# Inherit Field

Wraps any field with an Inherit state. While it inherits, the field shows the inherited value, dimmed and disabled, and the toggle reads "Inherit (value)". Override turns the field back on with its own value. The toggle is two pills on the pressed group core, or a checkbox.

## Decision

| When | Use |
| :--- | :--- |
| A setting that falls back to a parent's value unless the reader overrides it, such as a per library value over a global one | Inherit Field |
| A setting with no parent value | The field alone |

## Usage

```js
import { createInheritField } from './configurationpage?name=myplugin_jpkribs_shared.js';

var language = createInheritField({
    field: view.querySelector('#libraryLanguage'),
    inheritedValue: config.Language,
    value: { inherit: library.Language === null, value: library.Language }
});
// On save: library.Language = language.getValue().inherit ? null : language.getValue().value;
```

Classes: `base-inherit`, `base-inherit-field`, `base-inherit-toggle`, and `inheriting` while it inherits. The handle is `{ element, getValue, setValue, setInherited, destroy }`, and `getValue()` returns `{ inherit, value }`, where `value` is the field's own value even while it inherits.

## States and Modifiers

* `field` is a select, text, number, or checkbox input, or a Base field handle `{ element, getValue, setValue }`. The field is moved into the wrapper where it stood.
* `value` is `{ inherit, value }` to start with, inheriting by default. The field's own value is kept while it inherits and restored on Override.
* The inherited value reads as a select's option text, On or Off for a checkbox, else the value. `inheritedText` replaces it, and `setInherited(value, text)` changes it.
* `toggle: 'checkbox'` shows an Override checkbox in place of the pills. `inheritText` ("Inherit ({value})"), `overrideText` ("Override"), `onText` ("On"), and `offText` ("Off") replace the defaults. `label` is the aria-label of the toggle group.
* A field that inherits is disabled, so the validation core skips it.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createInheritField`

<code>function createInheritField&lt;V = unknown&gt;(options: InheritFieldOptions&lt;V&gt;): InheritFieldHandle&lt;V&gt;</code>

Wraps any field with an Inherit state. While it inherits, the field shows the inherited value, dimmed and disabled, and the toggle reads 'Inherit (value)'. The Override choice turns the field back on with its own value, which is kept while it inherits. The toggle is two pills on the pressed group, or a checkbox.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `field` (required) | <code>HTMLInputElement &#124; HTMLSelectElement &#124; HTMLTextAreaElement &#124; InheritableHandle&lt;V&gt;</code> | the select, text, number, or checkbox input, or a Base field handle { element, getValue, setValue } [required] |
| `inheritedValue` | <code>V</code> | the value shown while inheriting [optional] |
| `inheritedText` | <code>string</code> | how the inherited value reads in the toggle (default the chosen option's text for a select, onText or offText for a checkbox, else the value) |
| `value` | <code>Partial&lt;InheritValue&lt;V&gt;&gt; &#124; null</code> | { inherit, value } to start with (default inheriting, with the field's own value) |
| `toggle` | <code>'pressed' &#124; 'checkbox'</code> | 'pressed' for Inherit and Override pills, or 'checkbox' for an Override checkbox (default 'pressed') |
| `inheritText` | <code>string</code> | the Inherit pill, with {value} as the inherited text (default 'Inherit ({value})') |
| `overrideText` | <code>string</code> | the Override pill or checkbox label (default 'Override') |
| `onText` | <code>string</code> | how a checked checkbox reads (default 'On') |
| `offText` | <code>string</code> | how a cleared checkbox reads (default 'Off') |
| `label` | <code>string</code> | aria-label of the toggle group [optional] |
| `onChange` | <code>(value: InheritValue&lt;V&gt;): void</code> | function({ inherit, value }) after each change [optional] |

| Handle member | Type |
| :--- | :--- |
| `getValue` | <code>(): InheritValue&lt;V&gt;</code> |
| `setValue` | <code>(next?: Partial&lt;InheritValue&lt;V&gt;&gt; &#124; null): void</code> |
| `setInherited` | <code>(value: V, text?: string): void</code> |
| `destroy` | <code>(): void</code> |

| Type | What it is |
| :--- | :--- |
| `InheritValue` | What an inherit field reports: whether it inherits, and its own value, kept while it inherits. |
| `InheritableHandle` | A Base field handle an inherit field can wrap, such as a Number Unit Field or a Color Picker. |

| Class | What it looks like |
| :--- | :--- |
| `base-inherit` | A field with an Inherit and Override toggle beside it, which wraps under the field where the line is too narrow |
| `base-inherit.check` | A checkbox field: its box and text a field tall and centered, on one line with the Override toggle beside it |
| `base-inherit.inheriting` | The field while it inherits, dimmed and disabled with the inherited value in it |

<!-- reference:end -->

## Example

<iframe class="base-preview" src="../../../assets/previews/inherit-field.html" title="Inherit Field example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "inherit-field.html"
```
