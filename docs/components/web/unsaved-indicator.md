# Unsaved Indicator

A small dot and text that fades in to flag unsaved changes. Place it in a heading or label.

## Decision

| When | Use |
| :--- | :--- |
| A page with a [Change Tracker](change-tracker.md), which shows and hides it | Unsaved Indicator. |
| A field that saves on change | Nothing. The field saves itself. |

## Usage

```html
<h2>Settings <span class="base-unsaved" id="unsavedIndicator"><span class="base-unsaved-dot"></span>Unsaved changes</span></h2>
```

```js
var tracker = shared.createChangeTracker({ serialize: function () { return JSON.stringify(readForm()); }, indicatorId: 'unsavedIndicator' });
view.addEventListener('input', function () { tracker.check(); });
// after a save: tracker.flashSaved();
```

Classes: `base-unsaved`, `base-unsaved-dot`.

## States and Modifiers

* `base-unsaved` is hidden (`opacity: 0`, `visibility: hidden`) until it has `visible`.
* `save-success` turns it to the success color, for the flash after saving.
* It is hidden from screen readers while it does not apply. The tracker gives it `role="status"` when it has no role, so showing it is announced.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

| Class | What it looks like |
| :--- | :--- |
| `base-unsaved` | Inline indicator that fades in to flag unsaved changes |
| `base-unsaved-dot` | Small dot before the unsaved label in the current color |

<!-- reference:end -->

## Example

<iframe class="base-preview" src="../../../assets/previews/unsaved-indicator.html" title="Unsaved Indicator example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "unsaved-indicator.html"
```
