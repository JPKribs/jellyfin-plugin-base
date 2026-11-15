# Definition List

A read only list of label and value pairs. The label sits beside its value and stacks above it on a narrow screen.

## When to Use

* Use it to show the details of one thing, such as a version and an id.

## When Not to Use

* Use a [Record Card](record-card.md) when the rows need the card surface.

## Usage

```js
import { createDefinitionList } from './configurationpage?name=myplugin_jpkribs_shared.js';

container.appendChild(createDefinitionList({
    items: [{ label: 'Version', value: '1.2.0' }, { label: 'Id', value: id, mono: true }]
}).element);
```

Classes: `jpk-defs`, `jpk-defs-row`, `jpk-defs-missing`. The handle is `{ element, getValue, setValue, setItems, destroy }`.

Parts: `jpk-defs-label`, `jpk-defs-value`.

## States and Modifiers

* An item is `{ label, value, mono }`. `mono` shows the value in the mono font.
* A missing value shows `emptyText`, "None" by default, dimmed with `jpk-defs-missing`.
* The list is a `dl`. A row is one column at 600px and below.

## Used By

No plugin uses it today.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/definition-list.html" title="Definition List example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "definition-list.html"
```
