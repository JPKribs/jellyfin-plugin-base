# ![Jellyfin Plugin Base](Assets/Logo.png)

Shared configuration UI assets and C# helpers used in my Jellyfin plugins, delivered as a NuGet package. The source and assets are compiled into the consuming plugin at build time, so each plugin stays a single DLL with nothing extra to ship.

## Components

CSS and JS are authored as per component sources under `src/` and bundled, minified, into `jpkribs_shared.css` and `jpkribs_shared.js` by `scripts/bundle.sh`; the consuming plugin embeds them under its own namespace.

### Styles and client helpers

* `setTabs` and `initCollapsibles`: tab bar wiring over the native Jellyfin pages and collapsible section toggling.
* `createShared(view, pluginId, apiPrefix)`: a per view helper bag — `escapeHtml`, `setStatus`, `getConfig`/`saveConfig`/`apiRequest`, `formatSize`/`formatDuration`/`formatDate`, `badge`, `statusBadge`, `emptySection`, `createSearchableComboBox`, `createDebouncedSearch`, `createUserSelector`/`createUserMultiSelector`, and `pollTaskProgress`.
* `createPaginatedTable(view, shared, options)`: the searchable, filterable, infinite scrolling table that reads the `PagedResult` shape.
* `createUserSelector(options)` and `createUserMultiSelector(options)` (also on the `createShared(...)` bag): a single-user dropdown and a checkbox list of users, both fed by `ApiClient.getUsers()`. An `adminFilter` of `'all'`/`'exclude'`/`'only'` drops or keeps administrators (e.g. `'exclude'` for an approved non-admin list). Each returns `{ element, ready, getValue, setValue, refresh, destroy }`.
* `jpk-field` and `jpk-field-row`: a compact label and control field plus a row that places several side by side, for dense multi field layouts.
* Inline-edit primitives (`jpk-bulk-edit-bar`/`jpk-bulk-edit-title`, `jpk-edit-row`, `jpk-edit-line`/`jpk-edit-line-spacer`, `jpk-edit-secondary`): a bulk-edit toolbar above a table plus table rows that expand into stacked lines of fields, for tag/metadata editors.
* `jpk-empty-section` (and `createShared(...).emptySection(text)`): a bordered, centered fallback box for an empty region.
* Form spacing system: one `--jpk-field-gap` token normalizes every config field row over the emby defaults, with flat collapsible sections that share the form left edge.

### C# helpers

* `PluginBase<TPlugin, TConfiguration>`: singleton accessor, lock guarded config read and mutate, and `GetSharedPages(prefix)` to register the shared assets under a per plugin name.
* `PluginScheduledTask`: scheduled task base with the configurable task defaults and an `EveryInterval` trigger helper.
* `PagedResult<T>`, `PagedQuery`, and `ToPagedResult`: the page and count contract the shared paginated table reads. `PagedResult` also exposes `Page`, `PageSize`, `TotalPages`, and `HasMore` (computed from the skip/take window) for page-based callers.
* `JpkHttp` and `HttpResult`: outbound HTTP over Jellyfin's default client that returns a status and body and never throws on network failure.
* `TemplateLoader`: loads and fills `{{KEY}}` placeholders in HTML templates embedded from `templates/`.
* `StatusPage`: renders the themed, self contained status card (logo, heading, message, optional spinner and button) from the `status` template. The template also exposes a raw `{{CONTENT}}` slot, so a plugin can render its own markup — a form or a multi state auth shell — inside the same card.
* `FaviconResolver`: resolves and caches the web client's favicon from disk so a plugin serving standalone pages can reuse the server's real icon. The status card links a relative `favicon.ico`, so a consumer that wants the tab icon exposes a sibling `favicon.ico` endpoint backed by this resolver.
* `SecretProtector`: encrypts plugin credentials at rest with ASP.NET Core Data Protection. Construct one per plugin with a stable, unique `purpose` (e.g. the plugin namespace) so keys are isolated; `Protect`/`Unprotect` tag values with an `enc:v1:` prefix and read pre-migration plaintext back unchanged. The `IDataProtectionProvider` is optional — when the host supplies none it degrades to a logged warning (plaintext) rather than failing to load. Defense in depth: the key lives in the Jellyfin data directory, so it guards leaked or synced config files and backups, not a fully compromised host.
* `CircuitBreaker`: trips open after a configurable number of consecutive failures for a named service and stays open for a cooldown, so a plugin can stop hammering an unreachable endpoint. `RecordSuccess`/`RecordFailure` drive it; `AllowOperation(out reason)` gates the next call.
* `RetryPolicy.ExecuteWithRetryAsync`: retries an operation with exponential backoff and jitter, but only for transient faults (timeouts, socket errors, 5xx/429, generic IO) — permanent errors throw immediately.
* `FileNameSanitizer`: turns an arbitrary string into a safe cross-platform file name (strips invalid/control chars, collapses runs, handles reserved names and length), with a `SanitizeTempFileName` helper for cache files.
* `HashUtilities`: 32-char lowercase SHA-256 fingerprints of a string or stream (content identity, not a security primitive).
* `FormatUtilities`: `FormatBytes` (human-readable sizes) and `TruncateForLog` for tidy log lines.
* `StreamUtilities.CopyWithSpeedLimitAsync`: copies a stream with an optional bytes-per-second cap (download throttling).
* `StringNormalizationUtility.NormalizeStringArray`: trims, whitespace-filters, and case-insensitively sorts a string list into a canonical form (or null when empty).

## Usage

Add the package:

```xml
<PackageReference Include="JPKribs.Jellyfin.Base" Version="2026.6.11" />
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
