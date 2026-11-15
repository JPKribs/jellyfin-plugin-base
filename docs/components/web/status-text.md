# Status Text

A small status line after a save or an error, colored by class rather than inline style.

## When to Use

* Use it beside a Save button to report the result in one sentence.

## When Not to Use

* Use a [Toast](toast.md) for a message that should float over the page.

## Usage

```html
<span id="serverListStatus" class="jpk-status-text" role="status"></span>
```

```js
shared.setStatus('serverListStatus', 'Server order saved.', false);
shared.setStatus('serverListStatus', 'Could not save.', true, { timeout: 0 });
```

Classes: `jpk-status-text`, `jpk-status-ok`, `jpk-status-bad`. `shared.saveConfigWith` calls `setStatus` for you.

## States and Modifiers

* `setStatus(elementIdOrEl, message, isError, opts)` sets the role, the text, and the ok or bad class. The message clears after `opts.timeout` ms, 5000 by default, and 0 keeps it.
* A newer message is not cleared by an older timer. An empty message clears the line and leaves the role alone.
* The helper sets `role="status"` once, and `role="alert"` while the message is an error, before it writes the text, so a screen reader announces it.

## Used By

Custom Pages, Live Channels, Remote Access, Requests, Scripts, Server Sync, User Management, and YouTube Audio use it.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/status-text.html" title="Status Text example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "status-text.html"
```
