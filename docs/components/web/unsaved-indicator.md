# Unsaved Indicator

A small dot and text that fades in to flag unsaved changes. Place it in a heading or label.

## When to Use

* Use it with a [Change Tracker](change-tracker.md), which shows and hides it.

## When Not to Use

* Never show it for a field that saves on change.

## Usage

```html
<h2>Settings <span class="jpk-unsaved" id="unsavedIndicator"><span class="jpk-unsaved-dot"></span>Unsaved changes</span></h2>
```

```js
var tracker = shared.createChangeTracker({ serialize: function () { return JSON.stringify(readForm()); }, indicatorId: 'unsavedIndicator' });
view.addEventListener('input', function () { tracker.check(); });
// after a save: tracker.flashSaved();
```

Classes: `jpk-unsaved`, `jpk-unsaved-dot`.

## States and Modifiers

* `jpk-unsaved` is hidden (`opacity: 0`, `visibility: hidden`) until it has `visible`.
* `save-success` turns it to the success color, for the flash after saving.
* It is hidden from screen readers while it does not apply. The tracker gives it `role="status"` when it has no role, so showing it is announced.

## Used By

Artwork Generator, Requests, and Scripts use it.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/unsaved-indicator.html" title="Unsaved Indicator example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "unsaved-indicator.html"
```
