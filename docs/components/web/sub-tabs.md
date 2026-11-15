# Sub Tabs

An in page tab list with tab panels. A panel is built the first time its tab opens.

## When to Use

* Use it to split one page into sections the reader switches between.

## When Not to Use

* Never use it for the dashboard tab bar. That is `setTabs`. See [Tabs](tabs.md).

## Usage

```js
import { createSubTabs } from './configurationpage?name=myplugin_jpkribs_shared.js';

var tabs = createSubTabs({
    tabs: [{ id: 'general', label: 'General' }, { id: 'logs', label: 'Logs' }],
    render: function (tab, panel) { return buildPanel(tab.id); }
});
container.appendChild(tabs.element);
```

Classes: `jpk-subtabs`, `jpk-subtab-list`, `jpk-subtab`, `jpk-subtab-panel`. The handle is `{ element, getValue, setValue, setItems, getPanel, destroy }`.

## States and Modifiers

* Left and Right move and select, wrapping and skipping a disabled tab. Home and End jump to the ends.
* Only the selected tab has `tabindex="0"`.
* `render` runs once, the first time a tab opens, and returns a node or an escaped HTML string, or fills the panel itself.
* A tab may carry plain `text` for its panel instead of a `render`.
* An id is read as a string everywhere, so 2 and '2' name the same tab.

## Used By

No plugin uses it today. Remote Access builds its own tab strip in `remoteaccess_tabs.js`.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/sub-tabs.html" title="Sub Tabs example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "sub-tabs.html"
```
