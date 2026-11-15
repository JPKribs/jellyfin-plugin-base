# Toggle Group

A wrapping row of pills for choosing any number of options. The page owns the state. The kit styles `aria-pressed`, and nothing flips it.

## Decision

| When | Use |
| :--- | :--- |
| A short set of independent options, such as notification channels | Toggle Group |
| A set where exactly one is chosen | [Pill Group](pill-group.md) |
| A long set | [Check Grid](check-grid.md) |

## Usage

```html
<div class="base-toggle-group">
    <button type="button" class="base-toggle" aria-pressed="true"><span class="material-icons">forum</span>Discord</button>
    <button type="button" class="base-toggle" aria-pressed="false">Email</button>
</div>
```

```js
view.querySelectorAll('.base-toggle').forEach(function (pill) {
    pill.addEventListener('click', function () {
        pill.setAttribute('aria-pressed', pill.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
    });
});
```

Classes: `base-toggle-group`, `base-toggle`.

## States and Modifiers

* A pressed pill has full opacity, an accent border, and an accent tint.
* The pills are native buttons, so Space and Enter work and `aria-pressed` is announced. They wrap at 375px.
* A toggle takes the same hover, focus ring, and disabled look as a [Pill Group](pill-group.md) pill, and the group shares its row.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

| Class | What it looks like |
| :--- | :--- |
| `base-toggle` | A wrapping row of on and off pills, for choosing any number, in the base-toggle-group row the pill group shares. One pill: dim when off, accent tinted when its aria-pressed is true |

<!-- reference:end -->

## Example

<iframe class="base-preview" src="../../../assets/previews/toggle-group.html" title="Toggle Group example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "toggle-group.html"
```
