# Toggle Group

A wrapping row of pills for choosing any number of options. The page owns the state. The kit styles `aria-pressed`, and nothing flips it.

## When to Use

* Use it for a short set of independent options, such as notification channels.

## When Not to Use

* Use a [Pill Group](pill-group.md) when exactly one is chosen, and a [Check Grid](check-grid.md) for a long set.

## Usage

```html
<div class="jpk-toggle-group">
    <button type="button" class="jpk-toggle" aria-pressed="true"><span class="material-icons">forum</span>Discord</button>
    <button type="button" class="jpk-toggle" aria-pressed="false">Email</button>
</div>
```

```js
view.querySelectorAll('.jpk-toggle').forEach(function (pill) {
    pill.addEventListener('click', function () {
        pill.setAttribute('aria-pressed', pill.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
    });
});
```

Classes: `jpk-toggle-group`, `jpk-toggle`.

## States and Modifiers

* A pressed pill has full opacity, an accent border, and an accent tint.
* The pills are native buttons, so Space and Enter work and `aria-pressed` is announced. They wrap at 375px.

## Used By

Requests uses it.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/toggle-group.html" title="Toggle Group example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "toggle-group.html"
```
