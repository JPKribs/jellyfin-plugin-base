# Task Progress Button

`shared.pollTaskProgress(btn, taskKey, label, onComplete)` turns a button into a live progress display for a Jellyfin scheduled task.

## When to Use

* Use it on a button that starts a scheduled task and then waits for it.

## When Not to Use

* Never use it for a task the plugin runs itself. Use a [Poller](poller.md) and a [Progress Bar](progress-bar.md).

## Usage

```html
<button is="emby-button" type="button" id="btnSync" class="raised jpk-button-submit"><span>Sync</span></button>
```

```js
var handle = shared.pollTaskProgress(view.querySelector('#btnSync'), taskKey, 'Sync', function () { reloadStatus(); });
// on viewhide: handle.cancel();
```

Classes: `jpk-btn-progress-host`, `jpk-btn-progress`.

## States and Modifiers

* The button is disabled and shows "Label N%" in its first `span`. It is enabled again when the task finishes.
* The helper adds `jpk-btn-progress-host` to the button and appends a `jpk-btn-progress` element that grows with the percent. The element also keeps the `btn-progress` class.
* It uses the dashboard WebSocket (`ScheduledTasksInfoStart`) when the event bus is reachable, and polls `ApiClient.getScheduledTasks()` as a safety net, every second without the socket and every 5 seconds with it.
* It gives up after 30 minutes. The progress line is the on-accent color on a submit or destructive button, and the accent on a plain one.

## Gotchas

* The button needs a `span` for its label.
* `cancel` stops the polling, restores the label, and also runs `onComplete`.
* A plugin that still styles `.btn-progress` keeps working.

## Used By

Server Sync uses it.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/task-progress-button.html" title="Task Progress Button example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "task-progress-button.html"
```
