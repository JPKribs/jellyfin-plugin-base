# Shared Bag

`createShared(view, pluginId, apiPrefix)` returns the per view helper bag. Create it once per page and reuse it. `createConfigPage` does this for you. Helpers that take an id look the element up inside `view`.

## When to Use

* Use it for ids, values, config calls, formatting, and the few components that live on the bag.

## When Not to Use

* Never create a second bag for the same view. One per page is enough.

## Usage

```js
shared.saveConfigWith(function (config) { config.Enabled = shared.getChecked('chkEnabled'); },
    'saveStatus', { success: 'Settings saved.', error: 'Could not save the settings.' });
```

The members, by purpose.

* **Elements.** `getEl`, `setVisible`, `bindEvent`, `bindClick`, `bindReveal`, `initCollapsibles`.
* **Values.** `getValue`, `setValue`, `getIntValue`, `getChecked`, `setChecked`.
* **Secrets.** `bindSecretField`, `clearSecretField`, `readSecretField`.
* **Status and feedback.** `setStatus`, `showAlert`, `badge`, `statusBadge`, `emptySection`, `renderCards`.
* **Config and API.** `getConfig`, `saveConfig`, `saveConfigWith`, `apiRequest`, `fetchObjectUrl`.
* **Formatting.** `formatSize`, `formatDuration`, `formatRelativeTime`, `formatDate`, `toDateInput`, `getFileName`.
* **Utilities.** `escapeHtml`, `plural`, `errorText`, `debounce`, `downloadJson`, `pickJsonFile`, `generateGuid`, `copyToClipboard`, `copyWithFeedback`. See [Browser Helpers](browser-helpers.md).
* **Behavior helpers.** `createPoller`, `createChangeTracker`, `pollTaskProgress`.
* **Placeholders.** `insertAtCursor`, `placeholderHint`, `bindPlaceholders`.
* **Selectors.** `createUserSelector`, `createUserMultiSelector`, `createSearchableComboBox`, `createDebouncedSearch`.

The state is `pluginId` and `apiPrefix`.

## States and Modifiers

* `setVisible(idOrEl, visible)` toggles the `hidden` class.
* `bindReveal(checkboxId, targetId, invert)` shows or hides the target from a checkbox, binds once, and applies the current state on every call. Call it after loading the config.
* `setValue` turns null into an empty value.
* `getConfig` calls `ApiClient.getPluginConfiguration(pluginId)`, and `saveConfig` calls `ApiClient.updatePluginConfiguration`.
* `saveConfigWith(mutator, statusId, messages)` re-reads the freshest config, applies `mutator(config)` (in place or by returning a replacement), saves, and reports on the status element. The messages default to "Saved." and "Save failed.". It returns the save promise and rethrows a failure.
* `apiRequest(endpoint, method, data)` calls `ApiClient.getUrl(apiPrefix + '/' + endpoint)` and `ApiClient.fetch` with JSON. An empty response resolves to `null`. Other errors reject with what `ApiClient` gave, which `errorText` reads.
* `formatSize` gives "0 B", then B to TB. `formatDuration` gives "m:ss" or "h:mm:ss". `formatRelativeTime` gives "Just now", "N minutes ago", and so on. `formatDate(value, { seconds })` uses the viewer's locale. `toDateInput` gives the local `yyyy-mm-dd` string for a date input. `getFileName` gives the last path segment, with either slash.

## Gotchas

* Import only: `setTabs`, `createConfigPage`, `createShared`, `createPaginatedTable`, every dialog, `createChipSelect`, `createCheckboxList`, `createSortableCardList`, `createChoiceGroup`, `createOrderedList`, `createPillGroup`, every editor, display, and loading component, `BADGE_STATES`, and `SECRET_KEPT`. They are not on the bag.
* `createSearchableComboBox` has no top level export. It lives only on the bag.
* `showAlert` and `toDateInput` are used by no plugin today.

## Used By

Every plugin that uses `createConfigPage` gets one. Scripts also calls `saveConfigWith`, and Custom Pages, Server Sync, and YouTube Audio call `formatSize`.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/shared-bag.html" title="Shared Bag example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "shared-bag.html"
```
