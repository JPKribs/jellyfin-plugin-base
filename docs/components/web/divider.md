# Divider

A horizontal rule with an optional label in the middle, with `role="separator"`.

## Decision

| When | Use |
| :--- | :--- |
| Splitting two alternatives, such as "Or", or two parts of a form | Divider |
| Naming a group of fields | [Subsection Title](subsection-title.md) |

## Usage

```js
import { createDivider } from './configurationpage?name=myplugin_jpkribs_shared.js';

container.appendChild(createDivider({ label: 'Or' }).element);
```

Class: `base-divider`, with the part `base-divider-label`. The handle is `{ element, getValue, setValue, destroy }`, and `getValue()` returns the label and `setValue(label)` replaces it.

## States and Modifiers

* With no label it draws one line. `base-divider-plain` is that line.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createDivider`

<code>function createDivider(options?: DividerOptions): DividerHandle</code>

A horizontal rule with an optional label in the middle, with role separator.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `label` | <code>string</code> |  |

| Handle member | Type |
| :--- | :--- |
| `getValue` | <code>(): string</code> |
| `setValue` | <code>(label: string): void</code> |
| `destroy` | <code>(): void</code> |

| Class | What it looks like |
| :--- | :--- |
| `base-divider` | Horizontal rule with an optional centered label |

<!-- reference:end -->

## Example

<iframe class="base-preview" src="../../../assets/previews/divider.html" title="Divider example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "divider.html"
```
