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

Classes: `base-subtabs`, `base-subtab-list`, `base-subtab`, `base-subtab-panel`. The handle is `{ element, getValue, setValue, setItems, getPanel, destroy }`.

## States and Modifiers

* Left and Right move and select, wrapping and skipping a disabled tab. Home and End jump to the ends.
* Only the selected tab has `tabindex="0"`.
* `render` runs once, the first time a tab opens, and returns a node or an escaped HTML string, or fills the panel itself.
* A tab may carry plain `text` for its panel instead of a `render`.
* An id is read as a string everywhere, so 2 and '2' name the same tab.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createSubTabs`

<code>function createSubTabs(options?: SubTabsOptions): SubTabsHandle</code>

An in-page tab list with tab panels. Left and Right move between tabs, Home and End jump to the ends, and the focused tab is the selected one. A panel is built the first time its tab opens.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `tabs` | <code>SubTab[]</code> | array of { id, label, text, disabled } where text is plain text for the panel [optional] |
| `value` | <code>string &#124; number</code> | id of the tab to open first (default the first enabled tab) |
| `label` | <code>string</code> | aria-label of the tab list (default 'Sections') |
| `render` | <code>(tab: SubTab, panel: HTMLElement): Node &#124; string &#124; void</code> | function(tab, panel) called once, the first time the tab opens, that returns a node or an escaped HTML string for the panel or fills the panel itself [optional] |
| `onChange` | <code>(id: string, tab: SubTab): void</code> | function(id, tab) called when the selected tab changes [optional] |

| Handle member | Type |
| :--- | :--- |
| `getValue` | <code>(): string &#124; null</code> |
| `setValue` | <code>(id: string &#124; number): void</code> |
| `setItems` | <code>(next: SubTab[], value?: string &#124; number): void</code> |
| `getPanel` | <code>(id: string &#124; number): HTMLElement &#124; null</code> |
| `destroy` | <code>(): void</code> |

| Type | What it is |
| :--- | :--- |
| `SubTab` | One tab of a sub tab list. text is plain text for its panel. |

| Class | What it looks like |
| :--- | :--- |
| `base-subtabs` | In-page tab list over its panels, which scrolls sideways when the tabs do not fit |
| `base-subtab` | One tab, underlined in the accent when active |
| `base-subtab-panel` | Panel under the tabs, which takes focus without a ring unless a keyboard user lands on it |

<!-- reference:end -->

## Used By

No plugin uses it today. Remote Access builds its own tab strip in `remoteaccess_tabs.js`.

## Example

<iframe class="base-preview" src="../../../assets/previews/sub-tabs.html" title="Sub Tabs example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "sub-tabs.html"
```
