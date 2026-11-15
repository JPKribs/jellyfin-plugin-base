# Skeleton

A placeholder for content that is loading, as lines of text, a block, or a circle. The wrapper is marked busy and carries a hidden status label.

## Decision

| When | Use |
| :--- | :--- |
| A place where a list or card will appear, so the page does not jump | Skeleton |
| A short wait with no known shape | [Spinner](spinner.md) |

## Usage

```js
import { createSkeleton } from './configurationpage?name=myplugin_jpkribs_shared.js';

list.appendChild(createSkeleton({ lines: 4 }).element);
```

Classes: `base-skeleton`, `base-skeleton-line`, `base-skeleton-block`, `base-skeleton-circle`. The handle is `{ element, getValue, setValue, done, destroy }`.

Parts: `base-skeleton-small`, `base-skeleton-medium`, `base-skeleton-large`.

## States and Modifiers

* `type` is `lines` (default), `block`, or `circle`. `lines` is 3 by default, and the last of several lines is 60 percent wide.
* `size` is `small`, `medium`, or `large` for a block or a circle.
* The wrapper has `aria-busy`, and `label` ("Loading") is the hidden status text.
* With reduced motion asked for, the pulse stops.
* `done(content)` clears `aria-busy` and swaps in the loaded node, when given. `destroy` also clears `aria-busy`.

## Gotchas

* Call `done` or remove the skeleton when the content arrives.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createSkeleton`

<code>function createSkeleton(options?: SkeletonOptions): SkeletonHandle</code>

A placeholder for content that is loading, as lines of text, a block, or a circle. The wrapper is marked busy until done or destroy, and it carries a hidden label in a live region.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `type` | <code>'lines' &#124; 'block' &#124; 'circle' &#124; string</code> | 'lines', 'block', or 'circle' (default 'lines') |
| `lines` | <code>number</code> | number of lines for type lines (default 3) |
| `size` | <code>'small' &#124; 'medium' &#124; 'large' &#124; string</code> | 'small', 'medium', or 'large' for a block or a circle (default 'medium') |
| `label` | <code>string</code> | text a screen reader reads (default 'Loading') |

| Handle member | Type |
| :--- | :--- |
| `getValue` | <code>(): string</code> |
| `setValue` | <code>(next: string): void</code> |
| `done` | <code>(content?: Node &#124; null): void</code> |
| `destroy` | <code>(): void</code> |

| Class | What it looks like |
| :--- | :--- |
| `base-skeleton` | Placeholder for loading content, made of pulsing lines, a block, or a circle |
| `base-skeleton-line` | One line of text, with the last line shorter |
| `base-skeleton-block` | A block or a circle in three sizes |

<!-- reference:end -->

## Example

<iframe class="base-preview" src="../../../assets/previews/skeleton.html" title="Skeleton example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "skeleton.html"
```
