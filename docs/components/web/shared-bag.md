# Shared Bag

`createShared(view, pluginId, apiPrefix)` returns the per view helper bag. Create it once per page and reuse it. `createConfigPage` builds it. Helpers that take an id look the element up inside `view`.

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
* `createDebouncedSearch(endpoint, delay)` returns a `searchFn` for a [Combo Box](combo-box.md). It waits `delay` milliseconds (default 300), calls `apiRequest(endpoint + '?query=...')`, answers `[]` for a query under two characters or a failed call, and drops an answer that a newer query replaced.
* `formatSize` gives "0 B", then B to TB. `formatDuration` gives clock time, such as "1:30" or "1:30:00", and an empty string for zero. `formatRelativeTime` gives "Just now", "N minutes ago", and so on. `formatDate(value, { seconds })` uses the viewer's locale. `toDateInput` gives the local `yyyy-mm-dd` string for a date input. `getFileName` gives the last path segment, with either slash.

## Gotchas

* `setStatus`, `renderCards`, `createPoller`, `createChangeTracker`, `pollTaskProgress`, `createSearchableComboBox`, `createDebouncedSearch`, and the formatters live only on the bag. They have no top level export.
* Every other component is import only, such as `createPaginatedTable`, every dialog, `createChipSelect`, every editor, display, and loading component, `BADGE_STATES`, and `SECRET_KEPT`.
* `showAlert` and `toDateInput` are used by no plugin today.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createShared`

<code>function createShared(view: HTMLElement, pluginId: string, apiPrefix?: string): { pluginId: string; apiPrefix: string; getEl: (id: string) =&gt; any; setVisible: (id: string &#124; Element, visible: boolean) =&gt; void; setStatus: (elementId: string &#124; Element, message: string, isError?: boolean, opts?: { timeout?: number; state?: 'success' &#124; 'error' &#124; 'warn' &#124; 'info'; }) =&gt; void; bindEvent: (id: string, event: string, handler: (e: any) =&gt; void) =&gt; Element &#124; null; bindClick: (id: string, handler: (e: any) =&gt; void) =&gt; Element &#124; null; setChecked: (id: string, checked: boolean) =&gt; void; getChecked: (id: string) =&gt; boolean; setValue: (id: string, value: unknown) =&gt; void; getValue: (id: string, fallback?: string) =&gt; string; getIntValue: &lt;F extends number &#124; undefined = undefined&gt;(id: string, fallback?: F) =&gt; number &#124; F; bindSecretField: (id: string &#124; HTMLInputElement, hasStored: boolean, opts?: SecretFieldOptions) =&gt; void; clearSecretField: (id: string &#124; HTMLInputElement) =&gt; void; readSecretField: (id: string &#124; HTMLInputElement) =&gt; string; debounce: typeof debounce; downloadJson: typeof downloadJson; pickJsonFile: typeof pickJsonFile; bindReveal: (checkboxId: string, targetId: string &#124; Element, invert?: boolean) =&gt; void; initCollapsibles: () =&gt; void; escapeHtml: typeof escapeHtml; plural: typeof plural; errorText: typeof errorText; insertAtCursor: typeof insertAtCursor; placeholderHint: typeof placeholderHint; bindPlaceholders: typeof bindPlaceholders; badge: (cls: string, label: string) =&gt; string; statusBadge: (text: string, stateClass: string) =&gt; string; emptySection: (message: string, opts?: { inline?: boolean; }) =&gt; string; formatSize: (bytes: number) =&gt; string; formatDuration: (seconds: number) =&gt; string; formatRelativeTime: (date: Date &#124; number) =&gt; string; formatDate: (value: string &#124; number &#124; Date, opts?: { seconds?: boolean; }) =&gt; string; toDateInput: (value: string &#124; number &#124; Date) =&gt; string; getFileName: (path: string) =&gt; string; generateGuid: typeof generateGuid; getConfig: () =&gt; Promise&lt;any&gt;; saveConfig: (config: unknown) =&gt; Promise&lt;any&gt;; saveConfigWith: (mutator: (config: any) =&gt; any, statusId?: string, messages?: SaveMessages) =&gt; Promise&lt;any&gt;; renderCards: (containerId: string &#124; Element, cards: CardData[]) =&gt; void; copyToClipboard: (text: string) =&gt; Promise&lt;boolean&gt;; copyWithFeedback: (btn: HTMLElement &#124; null, text: string, opts?: CopyFeedbackOptions) =&gt; Promise&lt;boolean&gt;; fetchObjectUrl: (endpoint: string, params?: Record&lt;string, unknown&gt;) =&gt; Promise&lt;string&gt;; createPoller: (fn: () =&gt; unknown, intervalMs?: number, opts?: PollerOptions) =&gt; Poller; createChangeTracker: (opts?: ChangeTrackerOptions) =&gt; ChangeTracker; apiRequest: (endpoint: string, method?: string, data?: unknown) =&gt; Promise&lt;any&gt;; showAlert: (message: string) =&gt; void; createDebouncedSearch: (endpoint: string, delay?: number) =&gt; (query: string, callback: (results: any[]) =&gt; void) =&gt; void; createUserSelector: (options?: UserSelectorOptions) =&gt; UserSelectorHandle; createUserMultiSelector: (options?: UserMultiSelectorOptions) =&gt; UserMultiSelectorHandle; createSearchableComboBox: (options: ComboBoxOptions) =&gt; ComboBoxHandle; pollTaskProgress: (btn: HTMLButtonElement, taskKey: string, label: string, onComplete?: () =&gt; void) =&gt; TaskProgressHandle; }</code>

Builds the per view helper bag that a config page uses. Create it once on viewshow and reuse it.

<!-- reference:end -->

## Used By

Every plugin that uses `createConfigPage` gets one, and Requests and Server Sync call `createShared` directly. Scripts also calls `saveConfigWith`, and Custom Pages, Server Sync, and YouTube Audio call `formatSize`.

## Example

<iframe class="base-preview" src="../../../assets/previews/shared-bag.html" title="Shared Bag example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "shared-bag.html"
```
