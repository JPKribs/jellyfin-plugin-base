# Skeleton

A placeholder for content that is loading, as lines of text, a block, or a circle. The wrapper is marked busy and carries a hidden status label.

## When to Use

* Use it where a list or card will appear, so the page does not jump.

## When Not to Use

* Use a [Spinner](spinner.md) for a short wait with no known shape.

## Usage

```js
import { createSkeleton } from './configurationpage?name=myplugin_jpkribs_shared.js';

list.appendChild(createSkeleton({ lines: 4 }).element);
```

Classes: `jpk-skeleton`, `jpk-skeleton-line`, `jpk-skeleton-block`, `jpk-skeleton-circle`. The handle is `{ element, getValue, setValue, done, destroy }`.

Parts: `jpk-skeleton-small`, `jpk-skeleton-medium`, `jpk-skeleton-large`.

## States and Modifiers

* `type` is `lines` (default), `block`, or `circle`. `lines` is 3 by default, and the last of several lines is 60 percent wide.
* `size` is `small`, `medium`, or `large` for a block or a circle.
* The wrapper has `aria-busy`, and `label` ("Loading") is the hidden status text.
* With reduced motion asked for, the pulse stops.
* `done(content)` clears `aria-busy` and swaps in the loaded node, when given. `destroy` also clears `aria-busy`.

## Gotchas

* Call `done` or remove the skeleton when the content arrives.

## Used By

No plugin uses it today.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/skeleton.html" title="Skeleton example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "skeleton.html"
```
