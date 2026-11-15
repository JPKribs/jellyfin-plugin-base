# Status Text

A small status line after a save or an error, colored by class rather than inline style.

## When to Use

* Use it beside a Save button to report the result in one sentence.

## When Not to Use

* Use a [Toast](toast.md) for a message that should float over the page.

## Usage

```html
<span id="serverListStatus" class="base-status-text" role="status"></span>
```

```js
shared.setStatus('serverListStatus', 'Server order saved.', false);
shared.setStatus('serverListStatus', 'Could not save.', true, { timeout: 0 });
```

Classes: `base-status-text`, with the state class `success`, `error`, `warn`, or `info` and `base-icon-text`, and `base-status-ok` or `base-status-bad` beside it. `shared.saveConfigWith` calls `setStatus` for you.

## States and Modifiers

* `shared.setStatus(elementIdOrEl, message, isError, opts)` writes the message with the icon of its state beside it, as a [Field Message](field-message.md) shows it. `isError` picks `error`, else `success`.
* `opts.state` picks `success`, `error`, `warn`, or `info` over `isError`, such as `info` for a line like "Checking…". `warn` and `error` also take `base-status-bad`, and the others `base-status-ok`.
* The message clears after `opts.timeout` ms, 5000 by default, and 0 keeps it. A newer message is not cleared by an older timer. An empty message clears the line at once.
* Before it writes the text, it sets `role="alert"` for an error and `role="status"` for any other state, so a screen reader announces it.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

| Type | What it is |
| :--- | :--- |
| `StatusOptions` | What setStatus takes beyond the message. state picks the look over isError, such as 'info' for a line like Checking. |

| Class | What it looks like |
| :--- | :--- |
| `base-status-text` | Status line under a form, such as after a save or a check, built as base-icon-text with the icon of its state |
| `base-status-ok` | The older ok and bad classes setStatus also sets, in the success and error colors. Each state's own color is the shared message rule |

<!-- reference:end -->

## Used By

Custom Pages, Live Channels, Remote Access, Requests, Scripts, Server Sync, User Management, and YouTube Audio use it.

## Example

<iframe class="base-preview" src="../../../assets/previews/status-text.html" title="Status Text example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "status-text.html"
```
