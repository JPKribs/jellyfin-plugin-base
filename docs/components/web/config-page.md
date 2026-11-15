# Config Page

`createConfigPage` wires what every config page repeats. It builds the shared bag, sets the dashboard tabs, runs `bind` once, runs `load` on every `viewshow`, and tears everything down on `viewhide`.

## When to Use

* Use it from the default export of every page controller.
* Use `addCleanup`, `createPoller`, and `guardUnsaved` on the handle it returns, so a page never leaks a timer or loses an edit.

## When Not to Use

* Skip it only when a page needs its own `viewshow` and `viewhide` handling. Server Sync writes its own handlers and calls `LibraryMenu.setTabs` directly.

## Usage

```js
import { createConfigPage } from './configurationpage?name=myplugin_jpkribs_shared.js';

export default function (view) {
    var tracker = null;
    createConfigPage(view, {
        pluginId: '00000000-0000-0000-0000-000000000000',
        apiPrefix: 'MyPlugin',
        tabsKey: 'myplugin',
        tabIndex: 1,
        tabs: [
            { href: 'configurationpage?name=myplugin_overview', name: 'Overview' },
            { href: 'configurationpage?name=myplugin_settings', name: 'Settings' }
        ],
        bind: function (shared, page) {
            shared.initCollapsibles();
            tracker = shared.createChangeTracker({ serialize: readFormString, indicatorId: 'unsavedIndicator' });
            page.guardUnsaved(tracker, 'Leave without saving your settings?');
            page.createPoller(function () { return refreshStatus(shared); }, 3000).start();
        },
        load: function (shared, page) {
            shared.getConfig().then(function (config) { fillForm(config); tracker.markClean(); });
        },
        onHide: function (shared, page) { /* after the automatic cleanups */ }
    });
}
```

The page handle holds `view`, `shared`, `addCleanup(fn)`, `createPoller(fn, ms, opts)`, `guardUnsaved(trackerOrFn, message)`, `trackEditor(dialog)`, and `untrackEditor(dialog)`. The page link markup that loads the bundle is on [Web Components](index.md#how-a-plugin-loads-the-bundle).

## States and Modifiers

* `viewshow` applies the tabs, adds a `beforeunload` listener, runs `bind` the first time, then runs `load`.
* `viewbeforehide` asks `window.confirm(leaveMessage)` while something is unsaved. Declining cancels the event and sets the tabs again, because the dashboard has already moved the tab highlight.
* `beforeunload` shows the browser warning while something is unsaved.
* `viewhide` removes the listener, closes open editor dialogs, runs every cleanup, and then runs `onHide`.
* `tabs` may be a function that returns the array. It runs each time the tabs are shown. Tabs are set only when `tabs` and `tabsKey` are both given.
* An open editor dialog counts as unsaved when it is passed to `openEditorDialog` as `page`.

## Gotchas

* `bind` runs only once, so put event wiring there and data loading in `load`.
* An `isDirty` that throws counts as clean.
* Cleanup errors are swallowed, so a failing teardown never blocks the page from hiding.

## Used By

Artwork Generator, Custom Pages, Live Channels, Remote Access, Requests, Scripts, User Management, and YouTube Audio use it. Server Sync writes its own handlers.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/config-page.html" title="Config Page example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "config-page.html"
```
