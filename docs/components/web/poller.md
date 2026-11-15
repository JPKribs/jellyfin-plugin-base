# Poller

`shared.createPoller(fn, intervalMs, opts)` builds a self-guarding interval. It never overlaps a slow async `fn`, and a thrown error never stops the loop.

## Decision

| When | Use |
| :--- | :--- |
| Refreshing a status line, a queue, or a progress readout while the page is open | Poller. |
| A repeating timer on a config page | Poller, never `setInterval`. An interval keeps running after the page hides. |
| Watching a scheduled task | [Task Progress Button](task-progress-button.md). |

## Usage

```js
var poller = page.createPoller(function () { return shared.apiRequest('Status').then(render); }, 5000);
poller.start();
```

Use `page.createPoller` so `stop` is registered for `viewhide`. Call `poller.stop()` yourself when you build one with `shared.createPoller`.

## States and Modifiers

* The handle is `{ start(immediate), stop, isRunning }`. `start()` ticks at once unless `immediate` is `false`, then ticks every `intervalMs` (default 3000).
* `start` and `stop` are idempotent.
* With `pauseWhenHidden: true` a tick is skipped while `document.hidden` is true, and one tick runs at once when the page becomes visible again.

## Gotchas

* Errors are swallowed, so a failing endpoint fails silently. Report the failure inside `fn`.

## Example

<iframe class="base-preview" src="../../../assets/previews/poller.html" title="Poller example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "poller.html"
```
