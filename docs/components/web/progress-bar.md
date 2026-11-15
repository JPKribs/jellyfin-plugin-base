# Progress Bar

A thin bar in the theme accent over a faint track, such as a download in a row.

## When to Use

* Use it for a known percent that sits in a row or under a heading.

## When Not to Use

* Use a [Task Progress Button](task-progress-button.md) to show a scheduled task inside its button.

## Usage

```html
<div class="base-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="40">
    <div class="base-progress-bar" style="width: 40%"></div>
</div>
```

Classes: `base-progress`, `base-progress-bar`, and `base-btn-progress` for the bar along a button's bottom edge.

## States and Modifiers

* `base-progress-bar` has a 0.3s width transition. Set its width yourself.
* The track is a 15 percent wash of the text color.
* `base-btn-progress` on a `base-progress-bar` draws it thin along the bottom of a button with `base-btn-progress-host`, starting empty. The [Task Progress Button](task-progress-button.md) draws it.

## Gotchas

* There is no JavaScript. Add `role="progressbar"` with `aria-valuenow` when the value matters to assistive tech.
* `pollTaskProgress` builds its bar from it on a medium or large button, as `base-progress-bar base-btn-progress`. A small button gets a [Progress Ring](progress-ring.md) pie beside it instead.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

| Class | What it looks like |
| :--- | :--- |
| `base-progress` | Thin progress bar in the accent over a faint track, such as a download in a table row |
| `base-progress-bar` | Accent fill whose width is the progress |
| `base-progress-bar.base-btn-progress` | A progress bar along the bottom edge of a button, which the task progress button draws, thin and starting empty |

<!-- reference:end -->

## Used By

Requests uses it.

## Example

<iframe class="base-preview" src="../../../assets/previews/progress-bar.html" title="Progress Bar example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "progress-bar.html"
```
