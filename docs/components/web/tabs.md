# Tabs

`setTabs(key, index, tabs)` sets the dashboard tab bar for a page. Each tab is a native registered config page, `{ href, name }`.

## When to Use

* Use it inside `viewshow` when a page cannot use `createConfigPage`.
* Pass a function for `tabs` when the list changes at runtime, so the bar stays current.

## When Not to Use

* Never call it yourself on a page that uses `createConfigPage`. The lifecycle calls it for you.
* Never use it for an in-page tab list. See [Sub Tabs](sub-tabs.md).

## Usage

```js
import { setTabs } from './configurationpage?name=myplugin_jpkribs_shared.js';
view.addEventListener('viewshow', function () { setTabs('myplugin', 0, TABS); });
```

## States and Modifiers

* `tabs` is an array of `{ href, name }`, or a function that returns one and runs each time the dashboard shows the tabs.
* The call does nothing when `LibraryMenu` is not defined.

## Used By

Server Sync calls `LibraryMenu.setTabs` itself. The other plugins pass `tabs` to `createConfigPage`, which calls `setTabs`.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/tabs.html" title="Tabs example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "tabs.html"
```
