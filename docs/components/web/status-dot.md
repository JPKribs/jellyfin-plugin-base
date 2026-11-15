# Status Dot

A small round dot in a status color, with a text name as its title and its accessible name.

## When to Use

* Use it for health or state in a row, such as reachable or not.

## When Not to Use

* Never use color alone. The dot always carries a name, and a badge shows the word on screen. See [Badge](badge.md).

## Usage

```js
import { createStatusDot } from './configurationpage?name=myplugin_jpkribs_shared.js';

cell.appendChild(createStatusDot({ color: 'green', label: 'Reachable' }).element);
```

Class: `jpk-dot`. The handle is `{ element, getValue, setValue, destroy }`.

## States and Modifiers

* `color` is `green`, `red`, `orange`, `purple`, `blue`, `gray` (default), `yellow`, `pink`, or `teal`.
* `label` defaults to the meaning of the color, such as "Active" for green.
* The dot has `role="img"`, and a title and `aria-label`.

## Used By

No plugin uses it today. Server Sync builds health dots for its servers.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/status-dot.html" title="Status Dot example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "status-dot.html"
```
