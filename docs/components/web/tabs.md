# Tabs

`setTabs(key, index, tabs)` sets the dashboard tab bar for a page. Each tab is a native registered config page, `{ href, name }`.

## When to Use

* Use it inside `viewshow` when a page cannot use `createConfigPage`.
* Pass a function for `tabs` when the list changes at runtime, so the bar stays current.

## When Not to Use

* Never call it yourself on a page that passes `tabs` and `tabsKey` to `createConfigPage`. The lifecycle calls it for you.
* Never use it for an in-page tab list. See [Sub Tabs](sub-tabs.md).

## Usage

```js
import { setTabs } from './configurationpage?name=myplugin_jpkribs_shared.js';
view.addEventListener('viewshow', function () { setTabs('myplugin', 0, TABS); });
```

## States and Modifiers

* `tabs` is an array of `{ href, name }`, or a function that returns one and runs each time the dashboard shows the tabs.
* The call does nothing when `LibraryMenu` is not defined.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `setTabs`

<code>function setTabs(key: string, index: number, tabs: Tabs): void</code>

Wires the dashboard tab bar for a config page. Call it inside viewshow with the active tab index.

<!-- reference:end -->

## Used By

Server Sync calls `LibraryMenu.setTabs` itself. The other plugins pass `tabs` to `createConfigPage`, which calls `setTabs`.

## Example

<iframe class="base-preview" src="../../../assets/previews/tabs.html" title="Tabs example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "tabs.html"
```
