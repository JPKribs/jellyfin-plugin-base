# ![Jellyfin Plugin Base](Assets/Logo.png)

Shared configuration UI assets and C# helpers used in my Jellyfin plugins, delivered as a NuGet package. The source and assets are compiled into the consuming plugin at build time, so each plugin stays a single DLL with nothing extra to ship.

## Components

CSS and JS are authored as per component sources under `src/` and bundled, minified, into `jpkribs_shared.css` and `jpkribs_shared.js` by `scripts/bundle.sh`. The consuming plugin embeds them under its own namespace.

### Styles and client helpers

* `setTabs` and `initCollapsibles`: tab bar wiring over the native Jellyfin pages and collapsible section toggling.
* `createConfigPage(view, options)`: wires the config-page lifecycle every plugin repeats — builds the shared bag, sets the dashboard tabs, runs `bind()` once, runs `load()` on every `viewshow`, and runs registered cleanups (pollers, table observers) plus `onHide()` on `viewhide`. Import it and call it from the page module's default export; it returns a page handle with `shared`, `addCleanup(fn)`, `createPoller(fn, ms)` (whose teardown is auto-registered), and `guardUnsaved(trackerOrFn, message)`. While the guard reports unsaved changes, leaving the page asks first (and restores the tab highlight when the admin stays) and closing the browser tab warns. Pass `isDirty` in the options to set it up front.
* `createShared(view, pluginId, apiPrefix)`: a per view helper bag with `escapeHtml`, `setStatus`, `getConfig`/`saveConfig`/`apiRequest`, `saveConfigWith`, `formatSize`/`formatDuration`/`formatDate`, `badge`, `statusBadge`, `emptySection`, `renderCards`, `copyToClipboard`, `copyWithFeedback`, `fetchObjectUrl`, `getValue`/`setValue`/`getIntValue`, `bindSecretField`/`readSecretField`/`clearSecretField`, `debounce`, `downloadJson`/`pickJsonFile`, `createPoller`, `createChangeTracker`, `createSearchableComboBox`, `createDebouncedSearch`, `createUserSelector`/`createUserMultiSelector`, and `pollTaskProgress`. `badge` and `statusBadge` (and the table's status column) reduce their class argument to letters, digits, `_` and `-`, so a status read from data can never leave the class attribute. `setStatus` colors via classes (`jpk-status-ok`/`jpk-status-bad`) rather than inline styles and takes an options object (e.g. `{ timeout: 0 }` to persist). `saveConfigWith(mutator, statusId, messages)` collapses the get-config → mutate → save → report-status chain, re-reading the freshest config before saving.
* `createPaginatedTable(view, shared, options)`: the searchable, filterable, infinite scrolling table that reads the `PagedResult` shape. Exposes `reload()` (clears selection), `refresh()` (keeps it), and `destroy()` (disconnects the scroll observer and pending search timer — call on `viewhide`).
* `openDialog`/`confirmDialog`/`promptDialog`: modal behavior over the shipped `jpk-dialog`/`jpk-modal-*` markup — backdrop-click and Escape dismissal, focus trapping, and footer buttons. `confirmDialog(message, opts)` resolves to a boolean; `promptDialog(fields, opts)` resolves to a `{ name: value }` map or null.
* `bindDialog(elOrId, opts)`: the same behavior for a `jpk-dialog` already written into the page markup. It shows and hides the dialog by the `hidden` class, closes on backdrop click, Escape, or any `.jpk-dialog-close` inside it, traps focus while open, and restores focus on close. Returns `{ element, open, close(value), isOpen, destroy }`; `onClose(value)` reports how it closed.
* `bindSecretField`/`readSecretField`/`clearSecretField` (also on the bag, by id): the browser half of `SecretProtector`. A bound field with a stored secret stays empty with a "Saved, leave blank to keep" placeholder. `readSecretField` posts `SECRET_KEPT` while the field is untouched, the typed value when replaced, and `''` after `clearSecretField`.
* `debounce(fn, ms)`, `downloadJson(filename, value)`, and `pickJsonFile()`: a debouncer with `cancel()`, and the export and import halves of a configuration backup. `pickJsonFile` resolves to the parsed file, null when cancelled, and rejects on invalid JSON.
* `shared.copyWithFeedback(btn, text)` copies and briefly swaps the button's label to "Copied!" or "Copy failed". `shared.fetchObjectUrl(endpoint, params)` fetches an authenticated endpoint as a blob object URL, keeping the token in the header rather than an image URL.
* `createChipSelect(options)`: a typeahead multi-select — type to search, click a result to add it as a removable chip — backed by a static option list or an async `searchFn`, with arrow-key navigation. `single: true` keeps at most one selection (a searchable single-picker); `setOptions(list)` swaps the static list after construction (for choices that load async); `getItems()` returns the `{ value, label }` pairs so a caller keying an opaque id (e.g. a person id) can persist and later restore the friendly label without re-fetching, and `onChange(values, items)` hands back both. Built on the `jpk-tags` and `jpk-combo` styles. Returns `{ element, getValue, getItems, setValue, setOptions, clear, refresh, destroy }`.
* `createCheckboxList(options)`: a searchable list of checkbox rows for picking many arbitrary items (the generic sibling of `createUserMultiSelector`), with optional thumbnails, sublabels, note pills, a select-all row, and disabled rows. Fed by a static array or an async `fetchItems`. Returns `{ element, ready, getValue, setValue, setDisabled, refresh, destroy }`.
* `createSortableCardList(listEl, options)`: records as cards in priority order, each with a numbered head, a status dot, badges, up and down arrows, drag to reorder, and a body the open card shows. Hand it an `editor` element and it moves into whichever card is open, parking in a holder while the list re-renders so fields and bindings survive. The caller renders a card's text through `render(item, index)` and saves order in `onMove`. Returns `{ render, setItems, getSelected, setSelected, destroy }`. Built on the `jpk-card-list` and `jpk-card-item-*` styles.
* `createChoiceGroup(groupEl, options)`: radio cards, one `jpk-choice` label per option with a name and a sentence under it, for a mode or strategy setting that deserves a line of explanation. Keeps the `selected` class in step with the checked input and reports changes. Returns `{ get, set, destroy }`.
* `jpk-step-title` and `jpk-step-number`: a round number badge inside a collapsible title, for a form split into ordered steps.
* `BADGE_STATES`: the status names `badges.css` tints plus the raw color modifiers, so a plugin's status-code-to-badge mapping has one source of truth.
* `createUserSelector(options)` and `createUserMultiSelector(options)` (also on the `createShared(...)` bag): a single-user dropdown and a checkbox list of users, both fed by `ApiClient.getUsers()`. An `adminFilter` of `'all'`/`'exclude'`/`'only'` drops or keeps administrators (e.g. `'exclude'` for an approved non-admin list). Each returns `{ element, ready, getValue, setValue, refresh, destroy }`.
* `jpk-field` and `jpk-field-row`: a compact label and control field plus a row that places several side by side, for dense multi field layouts.
* Inline-edit primitives (`jpk-bulk-edit-bar`/`jpk-bulk-edit-title`, `jpk-edit-row`, `jpk-edit-line`/`jpk-edit-line-spacer`, `jpk-edit-secondary`): a bulk-edit toolbar above a table plus table rows that expand into stacked lines of fields, for tag/metadata editors.
* `jpk-empty-section` (and `createShared(...).emptySection(text)`): a bordered, centered fallback box for an empty region.
* Status callouts: `jpk-info` (blue), `jpk-success` (green), `jpk-warn` (amber), `jpk-error` (red), and `jpk-neutral` (gray) are soft inline notices that share one shape, plus `jpk-error-message` for a mono block of raw failure text.
* Form spacing and field system: one `--jpk-field-gap` token normalizes every config field row over the emby defaults, and text inputs, text areas, and selects share one dark surface, border, and chevron so every field matches. Collapsible sections stay flat and share the form left edge.
* `[hidden]` always hides, even on a component with its own `display` rule (a flex row or grid).

### C# helpers

* `PluginBase<TPlugin, TConfiguration>`: singleton accessor, lock guarded config read and mutate, and `GetSharedPages(prefix)` to register the shared assets under a per plugin name. `UpdateConfiguration` (the dashboard's save) takes the same lock and first calls `protected virtual OnConfigurationSaving(incoming, stored)`. Override the hook to validate, normalize, or resolve kept secrets; throwing rejects the save and keeps the stored configuration.
* `PluginScheduledTask`: scheduled task base with the configurable task defaults and the `EveryInterval(span)`, `Daily(timeOfDay)`, and `OnStartup()` trigger helpers.
* `PagedResult<T>`, `PagedQuery`, and `ToPagedResult`: the page and count contract the shared paginated table reads. `PagedResult` also exposes `Page`, `PageSize`, `TotalPages`, and `HasMore` (computed from the skip/take window) for page-based callers.
* `JpkHttp` and `HttpResult`: outbound HTTP over Jellyfin's default client that returns a status and body and never throws on network failure or timeout (status zero). Cancelling the caller's token still throws. A body larger than `maxResponseBytes` (default `JpkHttp.DefaultMaxResponseBytes`, 4 MiB) is not read. Basic auth credentials are sent as UTF-8.
* `TemplateLoader`: loads and fills `{{KEY}}` placeholders in HTML templates embedded from `templates/`.
* `StatusPage`: renders the themed, self contained status card (logo, heading, message, optional spinner and button) from the `status` template. Its `content` argument fills the template's raw `{{CONTENT}}` slot, so a plugin can render its own markup, a form or a multi state auth shell, inside the same card.
* `PublicPage`: `ApplyHardeningHeaders(response)` keeps a standalone page and any token in its URL out of referrers, caches, and search indexes. `Favicon(paths, response)` serves the `favicon.ico` the status card links, cached for a day, or a 404.
* `FaviconResolver`: resolves and caches the web client's favicon from disk so a plugin serving standalone pages can reuse the server's real icon. The status card links a relative `favicon.ico`, so a consumer that wants the tab icon exposes a sibling `favicon.ico` endpoint backed by this resolver.
* `SecretProtector`: encrypts plugin credentials at rest with ASP.NET Core Data Protection. Construct one per plugin with a stable, unique `purpose` (e.g. the plugin namespace) so keys are isolated. `Protect`/`Unprotect` tag values with an `enc:v1:` prefix and read pre-migration plaintext back unchanged. `ResolveIncoming(incoming, stored)` handles the config-page round-trip: a page shows a placeholder and posts back `SecretProtector.KeptSentinel` (mirrored by `SECRET_KEPT` on the JS side) when the admin leaves a secret field untouched, so the real secret never travels to the browser — kept means the stored value is preserved, any other value is re-encrypted, and empty clears it. The `IDataProtectionProvider` is optional. When the host supplies none it degrades to a logged warning (plaintext) rather than failing to load, and `IsAvailable` reports false.
* `StableSecretProtection.CreateProtector(paths, pluginName, logger)`: builds the `SecretProtector` with keys that survive the host moving (app update, desktop app versus service, Docker). Keys live in `<pluginName>.Keys` under the plugin configurations folder, the application name is pinned to `pluginName`, and the purpose is `<pluginName>.Secrets.v1`, which matches the copies the plugins carried, so existing secrets stay readable. Every protector built with the same name shares one key ring, so the plugin class and DI can each build one. Pass the plugin's assembly name and never change it.
* `services.AddPluginSecretProtector(pluginName)` and `services.AddActivityLogger()`: the DI registrations for the two. `ActivityLogger.Current` reaches the registered logger from outside DI, such as the plugin class. Defense in depth, not a vault: the key ring is stored unencrypted in `<pluginName>.Keys` beside the configuration it protects. It keeps a secret out of a config file that travels on its own (shared for support, pasted into an issue, copied without its folder), but anyone who can read the plugin configurations folder, or a backup that includes the key ring, can decrypt.
* `CircuitBreaker`: trips open after a configurable number of consecutive failures for a named service and stays open for a cooldown, so a plugin can stop hammering an unreachable endpoint. `RecordSuccess`/`RecordFailure` drive it. `AllowOperation(out reason)` gates the next call.
* `BackoffPolicy`: a stateless companion to `CircuitBreaker` for per-entity backoff persisted on the entity itself. The caller passes in the current `BackoffState` (a consecutive-failure count and an optional pause deadline) and stores the one returned by `RecordFailure`/`RecordSuccess`, so a paused record survives restarts. The pause escalates exponentially from a base delay, capped at a maximum, and only engages past a failure threshold.
* `ConcurrentTaskRunner.RunAsync`: runs a worker over a collection with a bounded degree of parallelism and reports 0-100 progress as items finish, wrapping the SemaphoreSlim-plus-Interlocked pattern a scheduled task otherwise reimplements. Pairs with `PluginScheduledTask`.
* `JsonFileStore<T>`: a thread-safe JSON file store for the runtime state a plugin keeps beside its configuration (usage counters, lockouts, cursors). `Load` tolerates a missing or corrupt file by returning a fresh value; `Save` is atomic and durable (a uniquely named temp file, flushed to disk, then renamed over the target); `Update(mutate)` does an atomic read-modify-write, and `UpdateIf(mutate)` saves only when the mutation returns true. Pass an optional `ILogger` to log a file it could not read.
* `ActivityLogger`: writes a plugin's events to Jellyfin's activity log where administrators already look. `Log` is fire and forget, `LogAndWaitAsync` completes once the entry is stored, and neither throws. (It is not named `LogAsync` because the analyzers would then flag every `Log` call in an async method as blocking.) Names and overviews are cut to the 512 characters the activity log keeps (`Trim` does the same for a caller). Namespace each entry `type` under the plugin.
* `DatabaseSchema`: versions a SQLite database a plugin owns. `Open(connection, currentVersion, minReaderVersion, create, migrate)` creates an empty database, migrates an older one, and stamps the version in `PRAGMA user_version` with the oldest version that can still read the file in a `SchemaInfo` table. A newer database this build can read is used untouched (`UsedNewer`). One it cannot read (`TooNew`) or a failed migration (`MigrationFailed`) writes nothing, and the caller closes the connection, calls `SetAside(path, reason, keep, logger)` to move the file and its journal aside as a timestamped backup, and opens a fresh one. Pass `transactional: true` to run the create or migrate and the stamp in one transaction, so a crash or a failed migration leaves the file as it was; only do so when the callbacks open no transaction of their own. Raise the minimum reader only when a migration changes or removes something older builds rely on. Written against `DbConnection`, so plugins without SQLite take on no dependency.
* `StringUtilities.EscapeJsString`: escapes a string for safe embedding inside a JavaScript string literal, neutralising quotes, line breaks, and the `</script>` / line-separator sequences that break out of an inline script block.
* `RetryPolicy.ExecuteWithRetryAsync`: retries an operation with exponential backoff and jitter, but only for transient faults (timeouts, socket errors, 5xx/429, generic IO). Permanent errors throw immediately.
* `FileNameSanitizer`: turns an arbitrary string into a safe cross-platform file name (replaces the same fixed set on every OS, both slashes and `:*?"<>|` plus control chars, collapses runs, handles reserved names and length), with a `SanitizeTempFileName` helper for cache files.
* `HashUtilities`: 32-char lowercase SHA-256 fingerprints of a string or stream (content identity, not a security primitive).
* `FormatUtilities`: `FormatBytes` (human-readable sizes) and `SanitizeForLog`, which strips control characters (so caller text cannot forge a log line) and truncates.
* `StreamUtilities.CopyWithSpeedLimitAsync`: copies a stream with an optional bytes-per-second cap (download throttling).
* `StringNormalizationUtility.NormalizeStringArray`: trims, whitespace-filters, and case-insensitively sorts a string list into a canonical form (or null when empty).

## Usage

Add the package:

```xml
<PackageReference Include="JPKribs.Jellyfin.Base" Version="2026.10.6" />
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
import { createShared, setTabs, initCollapsibles } from './configurationpage?name=myplugin_jpkribs_shared.js';
```

For a multi tab plugin, register one native page per tab and call `setTabs` on `viewshow`:

```js
var TABS = [
    { href: 'configurationpage?name=myplugin_overview', name: 'Overview' },
    { href: 'configurationpage?name=myplugin_settings', name: 'Settings' }
];
setTabs('myplugin', 0, TABS);
```

## Upgrading

Coming from 2026.10.6 or earlier:

* `ActivityLogger.LogAsync` is now `LogAndWaitAsync`.
* `FormatUtilities.TruncateForLog` is now `SanitizeForLog`, which also strips control characters and renders empty input as `[empty]`.
* Delete a plugin's own `StableSecretProtection` and `ActivityLoggerAccessor`. The base types share the name, so the old copies become ambiguous. Replace a hand-built key folder and purpose with `StableSecretProtection.CreateProtector(paths, "<assembly name>", logger)` or `AddPluginSecretProtector`, which derive the same values.
* Load the bundle by a relative path (`./configurationpage?name=..._jpkribs_shared.js`), not `/web/...`, so pages work on a server hosted under a base URL.

## Releasing

Versions are dates. Start the **Release** workflow from the Actions tab and leave the version blank: it tests, bundles, packs with today's date in America/Denver as `YYYY.M.D`, pushes to nuget.org, tags `vYYYY.M.D`, and creates the GitHub release with generated notes, all in one run. A second release on the same day becomes `YYYY.M.D.1`. The version is never written into the repository, and a version that already exists on nuget.org or as a tag is refused rather than skipped. A version that should not have shipped is hidden with the **Unlist Package Version** workflow. `scripts/pack.sh` makes a local package dated the same way for testing a consumer before release.
