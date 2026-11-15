# Progress Bar

A thin bar in the theme accent over a faint track, such as a download in a row.

## When to Use

* Use it for a known percent that sits in a row or under a heading.

## When Not to Use

* Use a [Task Progress Button](task-progress-button.md) to show a scheduled task inside its button.

## Usage

```html
<div class="jpk-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="40">
    <div class="jpk-progress-bar" style="width: 40%"></div>
</div>
```

Classes: `jpk-progress`, `jpk-progress-bar`.

## States and Modifiers

* `jpk-progress-bar` has a 0.3s width transition. Set its width yourself.
* The track is a 15 percent wash of the text color.

## Gotchas

* There is no JavaScript. Add `role="progressbar"` with `aria-valuenow` when the value matters to assistive tech.
* `pollTaskProgress` does not use it.

## Used By

Requests uses it.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/progress-bar.html" title="Progress Bar example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "progress-bar.html"
```
