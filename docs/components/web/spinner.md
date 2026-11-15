# Spinner

An inline spinner with a hidden status label. Its size is small, medium, or large.

## Decision

| When | Use |
| :--- | :--- |
| One request in flight, beside a button or inside a region | Spinner |
| Content that has a known shape | [Skeleton](skeleton.md) |
| A known percent | [Progress Ring](progress-ring.md) |

## Usage

```js
import { createSpinner } from './configurationpage?name=myplugin_jpkribs_shared.js';

status.appendChild(createSpinner({ size: 'small', label: 'Saving' }).element);
```

Classes: `base-loading`, `base-loading-small`, `base-loading-medium`, `base-loading-large`, `base-loading-ring`. The handle is `{ element, getValue, setValue, destroy }`, where `getValue()` returns the label and `setValue(label)` replaces it.

The one animation in the kit is the `base-spin` keyframes, a turn from 0 to 360 degrees. A plugin may use it for its own element.

```css
.my-spinner { animation: base-spin 0.8s linear infinite; }
```

## States and Modifiers

* `base-loading` is an inline wrapper with `role="status"`, and `label` ("Loading") is the text a screen reader reads.
* With reduced motion asked for, the ring turns slower and still turns.
* `base-table-reload-btn.spinning .material-icons` uses `base-spin` for the [Paginated Table](paginated-table.md) reload button.

## Gotchas

* The `base-spinner` class belongs to the status page template. See [Status Page](status-page.md).
* The ring is `base-loading-ring`. There is no spinner class in the bundled CSS other than these.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createSpinner`

<code>function createSpinner(options?: SpinnerOptions): SpinnerHandle</code>

An inline spinner with a hidden status label. Its size is small, medium, or large.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `size` | <code>'small' &#124; 'medium' &#124; 'large' &#124; string</code> | 'small', 'medium', or 'large' (default 'medium') |
| `label` | <code>string</code> | text a screen reader reads (default 'Loading') |

| Handle member | Type |
| :--- | :--- |
| `getValue` | <code>(): string</code> |
| `setValue` | <code>(label: string): void</code> |
| `destroy` | <code>(): void</code> |

| Class | What it looks like |
| :--- | :--- |
| `base-loading` | Inline spinner, a ring with one accent edge that turns, in three sizes |

<!-- reference:end -->

## Example

<iframe class="base-preview" src="../../../assets/previews/spinner.html" title="Spinner example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "spinner.html"
```
