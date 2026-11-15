# Config Page

`createConfigPage` wires what every config page repeats. It builds the shared bag, sets the dashboard tabs, runs `bind` once, runs `load` on every `viewshow`, and tears everything down on `viewhide`.

## Decision

| When | Use |
| :--- | :--- |
| The default export of every page controller | `createConfigPage`. |
| Keeping a page from leaking a timer or losing an edit | `addCleanup`, `createPoller`, and `guardUnsaved` on the handle `createConfigPage` returns. |
| A page that needs its own `viewshow` and `viewhide` handling | Its own handlers, with a direct call to `LibraryMenu.setTabs`. This is the only case to skip `createConfigPage`. |

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
* After `load`, `viewshow` runs `bindFieldAdornments` and `bindBalancedRows` on the view. The first adds the [Field Adornments](field-adornments.md) to every number, date, time, search, and revealable input and binds the [validation core](field-message.md#validation) on every field with a rule. The second balances count cards, choice cards, and check grids, as [Balanced Rows](balanced-rows.md) describes. Both watch the view, so a field or a tile added later is handled too, and both stop on `viewhide`.
* Validation needs no call. A field with `required`, `min`, `max`, `step`, `minlength`, `maxlength`, `pattern`, or a `number`, `url`, `email`, `time`, or `date` type shows its message under it when the reader changes it and leaves it.
* `viewbeforehide` asks `window.confirm(leaveMessage)` while something is unsaved. Declining cancels the event and sets the tabs again, because the dashboard has already moved the tab highlight.
* `beforeunload` shows the browser warning while something is unsaved.
* `viewhide` removes the listener, closes open editor dialogs, runs every cleanup, and then runs `onHide`.
* `tabs` may be a function that returns the array. It runs each time the tabs are shown. Tabs are set only when `tabs` and `tabsKey` are both given.
* An open editor dialog counts as unsaved when it is passed to `openEditorDialog` as `page`.

## Gotchas

* `bind` runs only once, so put event wiring there and data loading in `load`.
* An `isDirty` that throws counts as clean.
* Cleanup errors are swallowed, so a failing teardown never blocks the page from hiding.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createConfigPage`

<code>function createConfigPage(view: HTMLElement, opts: ConfigPageOptions): PageHandle</code>

Wires the config page lifecycle by building the shared bag, setting the tabs, running bind once, and running load on every viewshow. On viewhide it runs the registered cleanups and onHide.

<!-- reference:end -->

## Example

<iframe class="base-preview" src="../../../assets/previews/config-page.html" title="Config Page example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "config-page.html"
```
