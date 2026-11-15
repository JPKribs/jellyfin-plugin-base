# Change Tracker

`shared.createChangeTracker(opts)` compares a serialized snapshot with the current state and drives the [Unsaved Indicator](unsaved-indicator.md). Passed to `page.guardUnsaved`, it also asks before the user leaves with unsaved edits.

## When to Use

* Use it on any page or dialog where a save is explicit.

## When Not to Use

* Skip it for a field that saves on change.

## Usage

```js
var tracker = shared.createChangeTracker({
    serialize: function () { return JSON.stringify(readForm()); },
    indicatorId: 'unsavedIndicator',
    savedText: 'Saved'
});
view.addEventListener('input', function () { tracker.check(); });
page.guardUnsaved(tracker, 'Leave without saving your settings?');
// after a load: tracker.markClean();   after a save: tracker.flashSaved();
```

## States and Modifiers

* `isDirty()` says whether the state differs from the snapshot.
* `check()` does the same and shows or hides the indicator. Call it after edits.
* `markClean()` takes a new snapshot and hides the indicator. Call it after a load.
* `flashSaved()` takes a new snapshot and pulses the indicator in the success color for 1.5 seconds. With `savedText`, the indicator shows that text for the pulse, then the original label returns.
* The options are `{ serialize, indicatorId, indicator, savedText }`. The indicator gets `role="status"` when it has no role.

## Gotchas

* `serialize()` must return a stable string of the tracked state. The snapshot is taken when the tracker is created.
* `flashSaved` without `savedText` pulses the indicator with its own label.

## Used By

Artwork Generator, Live Channels, Requests, and Scripts use it. Artwork Generator and Requests also pass it to `guardUnsaved`.

## Example

<iframe class="base-preview" src="../../../assets/previews/change-tracker.html" title="Change Tracker example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "change-tracker.html"
```
