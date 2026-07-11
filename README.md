# ![Jellyfin Plugin Base](Assets/Logo.png)

Shared configuration UI assets and C# helpers used in my Jellyfin plugins, delivered as a NuGet package. The source and assets are compiled into the consuming plugin at build time, so each plugin stays a single DLL with nothing extra to ship.

## Components

CSS and JS are authored as per component sources under `src/` and bundled, minified, into `jpkribs_shared.css` and `jpkribs_shared.js` by `scripts/bundle.sh`. The consuming plugin embeds them under its own namespace.

### Styles and client helpers

* `setTabs` and `initCollapsibles`: tab bar wiring over the native Jellyfin pages and collapsible section toggling.
* `createConfigPage(view, options)`: wires the config-page lifecycle every plugin repeats — builds the shared bag, sets the dashboard tabs, runs `bind()` once, runs `load()` on every `viewshow`, and runs registered cleanups (pollers, table observers) plus `onHide()` on `viewhide`. Import it and call it from the page module's default export; it returns a page handle with `shared`, `addCleanup(fn)`, and `createPoller(fn, ms)` (whose teardown is auto-registered).
* `createShared(view, pluginId, apiPrefix)`: a per view helper bag with `escapeHtml`, `setStatus`, `getConfig`/`saveConfig`/`apiRequest`, `saveConfigWith`, `formatSize`/`formatDuration`/`formatDate`, `badge`, `statusBadge`, `emptySection`, `renderCards`, `copyToClipboard`, `createPoller`, `createChangeTracker`, `createSearchableComboBox`, `createDebouncedSearch`, `createUserSelector`/`createUserMultiSelector`, and `pollTaskProgress`. `setStatus` colors via classes (`jpk-status-ok`/`jpk-status-bad`) rather than inline styles and takes an options object (e.g. `{ timeout: 0 }` to persist). `saveConfigWith(mutator, statusId, messages)` collapses the get-config → mutate → save → report-status chain, re-reading the freshest config before saving.
* `createPaginatedTable(view, shared, options)`: the searchable, filterable, infinite scrolling table that reads the `PagedResult` shape. Exposes `reload()` (clears selection), `refresh()` (keeps it), and `destroy()` (disconnects the scroll observer and pending search timer — call on `viewhide`).
* `openDialog`/`confirmDialog`/`promptDialog`: modal behavior over the shipped `jpk-dialog`/`jpk-modal-*` markup — backdrop-click and Escape dismissal, focus trapping, and footer buttons. `confirmDialog(message, opts)` resolves to a boolean; `promptDialog(fields, opts)` resolves to a `{ name: value }` map or null.
* `createChipSelect(options)`: a typeahead multi-select — type to search, click a result to add it as a removable chip — backed by a static option list or an async `searchFn`, with arrow-key navigation. `single: true` keeps at most one selection (a searchable single-picker); `setOptions(list)` swaps the static list after construction (for choices that load async); `getItems()` returns the `{ value, label }` pairs so a caller keying an opaque id (e.g. a person id) can persist and later restore the friendly label without re-fetching, and `onChange(values, items)` hands back both. Built on the `jpk-tags` and `jpk-combo` styles. Returns `{ element, getValue, getItems, setValue, setOptions, clear, refresh, destroy }`.
* `createCheckboxList(options)`: a searchable list of checkbox rows for picking many arbitrary items (the generic sibling of `createUserMultiSelector`), with optional thumbnails, sublabels, note pills, a select-all row, and disabled rows. Fed by a static array or an async `fetchItems`. Returns `{ element, ready, getValue, setValue, setDisabled, refresh, destroy }`.
* `BADGE_STATES`: the status names `badges.css` tints plus the raw color modifiers, so a plugin's status-code-to-badge mapping has one source of truth.
* `createUserSelector(options)` and `createUserMultiSelector(options)` (also on the `createShared(...)` bag): a single-user dropdown and a checkbox list of users, both fed by `ApiClient.getUsers()`. An `adminFilter` of `'all'`/`'exclude'`/`'only'` drops or keeps administrators (e.g. `'exclude'` for an approved non-admin list). Each returns `{ element, ready, getValue, setValue, refresh, destroy }`.
* `jpk-field` and `jpk-field-row`: a compact label and control field plus a row that places several side by side, for dense multi field layouts.
* Inline-edit primitives (`jpk-bulk-edit-bar`/`jpk-bulk-edit-title`, `jpk-edit-row`, `jpk-edit-line`/`jpk-edit-line-spacer`, `jpk-edit-secondary`): a bulk-edit toolbar above a table plus table rows that expand into stacked lines of fields, for tag/metadata editors.
* `jpk-empty-section` (and `createShared(...).emptySection(text)`): a bordered, centered fallback box for an empty region.
* Status callouts: `jpk-info` (blue), `jpk-success` (green), `jpk-warn` (amber), `jpk-error` (red), and `jpk-neutral` (gray) are soft inline notices that share one shape, plus `jpk-error-message` for a mono block of raw failure text.
* Form spacing and field system: one `--jpk-field-gap` token normalizes every config field row over the emby defaults, and text inputs, text areas, and selects share one dark surface, border, and chevron so every field matches. Collapsible sections stay flat and share the form left edge.

### C# helpers

* `PluginBase<TPlugin, TConfiguration>`: singleton accessor, lock guarded config read and mutate, and `GetSharedPages(prefix)` to register the shared assets under a per plugin name.
* `PluginScheduledTask`: scheduled task base with the configurable task defaults and an `EveryInterval` trigger helper.
* `PagedResult<T>`, `PagedQuery`, and `ToPagedResult`: the page and count contract the shared paginated table reads. `PagedResult` also exposes `Page`, `PageSize`, `TotalPages`, and `HasMore` (computed from the skip/take window) for page-based callers.
* `JpkHttp` and `HttpResult`: outbound HTTP over Jellyfin's default client that returns a status and body and never throws on network failure.
* `TemplateLoader`: loads and fills `{{KEY}}` placeholders in HTML templates embedded from `templates/`.
* `StatusPage`: renders the themed, self contained status card (logo, heading, message, optional spinner and button) from the `status` template. The template also exposes a raw `{{CONTENT}}` slot, so a plugin can render its own markup, a form or a multi state auth shell, inside the same card.
* `FaviconResolver`: resolves and caches the web client's favicon from disk so a plugin serving standalone pages can reuse the server's real icon. The status card links a relative `favicon.ico`, so a consumer that wants the tab icon exposes a sibling `favicon.ico` endpoint backed by this resolver.
* `SecretProtector`: encrypts plugin credentials at rest with ASP.NET Core Data Protection. Construct one per plugin with a stable, unique `purpose` (e.g. the plugin namespace) so keys are isolated. `Protect`/`Unprotect` tag values with an `enc:v1:` prefix and read pre-migration plaintext back unchanged. `ResolveIncoming(incoming, stored)` handles the config-page round-trip: a page shows a placeholder and posts back `SecretProtector.KeptSentinel` (mirrored by `SECRET_KEPT` on the JS side) when the admin leaves a secret field untouched, so the real secret never travels to the browser — kept means the stored value is preserved, any other value is re-encrypted, and empty clears it. The `IDataProtectionProvider` is optional. When the host supplies none it degrades to a logged warning (plaintext) rather than failing to load. Defense in depth: the key lives in the Jellyfin data directory, so it guards leaked or synced config files and backups, not a fully compromised host.
* `CircuitBreaker`: trips open after a configurable number of consecutive failures for a named service and stays open for a cooldown, so a plugin can stop hammering an unreachable endpoint. `RecordSuccess`/`RecordFailure` drive it. `AllowOperation(out reason)` gates the next call.
* `BackoffPolicy`: a stateless companion to `CircuitBreaker` for per-entity backoff persisted on the entity itself. The caller passes in the current `BackoffState` (a consecutive-failure count and an optional pause deadline) and stores the one returned by `RecordFailure`/`RecordSuccess`, so a paused record survives restarts. The pause escalates exponentially from a base delay, capped at a maximum, and only engages past a failure threshold.
* `ConcurrentTaskRunner.RunAsync`: runs a worker over a collection with a bounded degree of parallelism and reports 0-100 progress as items finish, wrapping the SemaphoreSlim-plus-Interlocked pattern a scheduled task otherwise reimplements. Pairs with `PluginScheduledTask`.
* `JsonFileStore<T>`: a thread-safe JSON file store for the runtime state a plugin keeps beside its configuration (usage counters, lockouts, cursors). `Load` tolerates a missing or corrupt file by returning a fresh value; `Save` is atomic (temp file then swap); `Update(mutate)` does an atomic read-modify-write.
* `ActivityLogger`: writes a plugin's events to Jellyfin's activity log where administrators already look. Entries are fire-and-forget and failures are swallowed. Namespace each entry `type` under the plugin.
* `StringUtilities.EscapeJsString`: escapes a string for safe embedding inside a JavaScript string literal, neutralising quotes, line breaks, and the `</script>` / line-separator sequences that break out of an inline script block.
* `RetryPolicy.ExecuteWithRetryAsync`: retries an operation with exponential backoff and jitter, but only for transient faults (timeouts, socket errors, 5xx/429, generic IO). Permanent errors throw immediately.
* `FileNameSanitizer`: turns an arbitrary string into a safe cross-platform file name (strips invalid/control chars, collapses runs, handles reserved names and length), with a `SanitizeTempFileName` helper for cache files.
* `HashUtilities`: 32-char lowercase SHA-256 fingerprints of a string or stream (content identity, not a security primitive).
* `FormatUtilities`: `FormatBytes` (human-readable sizes) and `TruncateForLog` for tidy log lines.
* `StreamUtilities.CopyWithSpeedLimitAsync`: copies a stream with an optional bytes-per-second cap (download throttling).
* `StringNormalizationUtility.NormalizeStringArray`: trims, whitespace-filters, and case-insensitively sorts a string list into a canonical form (or null when empty).

## Usage

Add the package:

```xml
<PackageReference Include="JPKribs.Jellyfin.Base" Version="2026.7.11" />
```

Extend the base and yield the shared pages:

```csharp
public class Plugin : PluginBase<Plugin, PluginConfiguration>
{
    public Plugin(IApplicationPaths paths, IXmlSerializer xml) : base(paths, xml) { }

    public override Guid Id => Guid.Parse("...");
    public override string Name => "My Plugin";

    public override IEnumerable<PluginPageInfo> GetPages()
    {
        yield return new PluginPageInfo { Name = "myplugin", EmbeddedResourcePath = "..." };
        foreach (var page in GetSharedPages("myplugin"))
        {
            yield return page;
        }
    }
}
```

Reference the assets from a config page:

```html
<link rel="stylesheet" href="configurationpage?name=myplugin_jpkribs_shared.css">
```

```js
import { createShared, setTabs, initCollapsibles } from '/web/configurationpage?name=myplugin_jpkribs_shared.js';
```

For a multi tab plugin, register one native page per tab and call `setTabs` on `viewshow`:

```js
var TABS = [
    { href: 'configurationpage?name=myplugin_overview', name: 'Overview' },
    { href: 'configurationpage?name=myplugin_settings', name: 'Settings' }
];
setTabs('myplugin', 0, TABS);
```
