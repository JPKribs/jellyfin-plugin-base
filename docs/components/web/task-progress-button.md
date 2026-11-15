# Task Progress Button

`shared.pollTaskProgress(btn, taskKey, label, onComplete)` turns a button into a live progress display for a Jellyfin scheduled task.

## Decision

| When | Use |
| :--- | :--- |
| A button that starts a scheduled task and then waits for it | Task Progress Button |
| A task the plugin runs itself | A [Poller](poller.md) and a [Progress Bar](progress-bar.md) |

## Usage

```html
<button is="emby-button" type="button" id="btnSync" class="raised base-button primary"><span>Sync</span></button>
```

```js
var handle = shared.pollTaskProgress(view.querySelector('#btnSync'), taskKey, 'Sync', function () { reloadStatus(); });
// on viewhide: handle.cancel();
```

Classes: `base-btn-progress-host`, `base-btn-progress`.

## States and Modifiers

* The button is disabled and shows "Label N%" in its first `span`. It is enabled again when the task finishes.
* The helper adds `base-btn-progress-host` to the button and appends a [Progress Bar](progress-bar.md) fill, `base-progress-bar base-btn-progress`, that grows with the percent along the bottom edge. The element also keeps the `btn-progress` class, and a `.btn-progress` element already in the button takes the same classes.
* A `small` button never draws the bar. A [Progress Ring](progress-ring.md) pie, `base-btn-progress-pie`, fills beside it instead.
* It uses the dashboard WebSocket (`ScheduledTasksInfoStart`) when the event bus is reachable, and polls `ApiClient.getScheduledTasks()` as a safety net, every second without the socket and every 5 seconds with it.
* It gives up after 30 minutes. The progress line is the on-accent color on a submit or destructive button, and the accent on a plain one.

## Gotchas

* The button needs a `span` for its label.
* `cancel` stops the polling, restores the label, and also runs `onComplete`.
* A plugin that still styles `.btn-progress` keeps working.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

| Class | What it looks like |
| :--- | :--- |
| `base-btn-progress-host` | Button that clips and anchors a progress bar along its bottom edge |
| `base-button.primary` | Progress fill on an accent or red button, in the text color of that fill so it stays visible |
| `base-button.small` | A small button never draws the bar, since it is too short, and shows a pie beside it instead |

<!-- reference:end -->

## Example

<iframe class="base-preview" src="../../../assets/previews/task-progress-button.html" title="Task Progress Button example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "task-progress-button.html"
```
