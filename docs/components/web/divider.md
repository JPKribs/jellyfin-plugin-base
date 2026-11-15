# Divider

A horizontal rule with an optional label in the middle, with `role="separator"`.

## When to Use

* Use it to split two alternatives, such as "Or", or two parts of a form.

## When Not to Use

* Use a [Subsection Title](subsection-title.md) to name a group of fields.

## Usage

```js
import { createDivider } from './configurationpage?name=myplugin_jpkribs_shared.js';

container.appendChild(createDivider({ label: 'Or' }).element);
```

Class: `jpk-divider`. The handle is `{ element, getValue, setValue, destroy }`, and `getValue()` returns the label.

## States and Modifiers

* With no label it draws one line. `jpk-divider-plain` is that line.

## Used By

No plugin uses it today.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/divider.html" title="Divider example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "divider.html"
```
