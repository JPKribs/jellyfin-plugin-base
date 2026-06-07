# Migrating a plugin to JPKribs.Jellyfin.Base

How to move a plugin onto the shared base package. Done already: DDNS, CustomPages, YouTubeAudio. Remaining: ServerSync, UserManagement, Episode Poster Generator.

Base is published to nuget.org, so consumers need no `nuget.config`, no secrets, and the reusable build/test workflows just work.

## Pick a prefix

Choose one short, unique token per plugin (used for the shared asset names and the controller route). Examples: `ddns`, `custompages`, `youtubeaudio`. For the remaining plugins: `serversync`, `usermanagement`, `episodepostergenerator`.

## Steps

### 1. Reference the package
In the plugin csproj:
```xml
<PackageReference Include="JPKribs.Jellyfin.Base" Version="2026.6.13" />
```

### 2. Plugin.cs to PluginBase
- `class Plugin : BasePlugin<TConfig>, IHasWebPages` becomes `class Plugin : PluginBase<Plugin, TConfig>`.
- Delete the local `Instance`, `ConfigLock`, `MutateConfiguration`, `ReadConfiguration` (all inherited).
- Keep the logger param; `ArgumentNullException.ThrowIfNull(logger);` then log init.
- `using JPKribs.Jellyfin.Base;`, drop `using MediaBrowser.Common.Plugins;`.
- In `GetPages()`, yield the plugin's own pages, then the slim local CSS (if any), then:
```csharp
foreach (var page in GetSharedPages("PREFIX")) yield return page;
```

### 3. Shared JS
- If the local `*_shared.js` is only `getTabs` + `createShared`, replace it with a thin wrapper that imports the kit and adds plugin specifics:
```js
import { createShared as base } from '/web/configurationpage?name=PREFIX_jpkribs_shared.js';
export function getTabs() { return [ /* tabs */ ]; }
export function createShared(view) {
    var s = base(view, 'PLUGIN-GUID', 'ApiControllerName');
    // add plugin specific helpers here
    return s;
}
```
- The kit's `createShared` already provides escapeHtml, formatSize, formatDuration, getConfig, saveConfig, apiRequest, getEl, setVisible, setStatus, initCollapsibles, createDebouncedSearch, createSearchableComboBox, badge, emptySection, generateGuid.

### 4. HTML
- Every page must link BOTH stylesheets:
```html
<link rel="stylesheet" href="configurationpage?name=PREFIX_jpkribs_shared.css">
<link rel="stylesheet" href="configurationpage?name=plugin_shared.css">
```
- Map classes to the kit: `pt-*` to `jpk-table-*`, `pt-status-badge` to `jpk-table-status-badge`, `collapsible*` to `jpk-collapsible-*`, `button-submit/destructive/small` to `jpk-button-*`, `reset*` to `jpk-reset-*`, `*-edit-input` to `jpk-edit-input`, `*-status-text` to `jpk-status-text`, count cards to `jpk-cards`/`jpk-card`, empty box to `jpk-empty-section`, selector to `jpk-selector` + `jpk-icon-btn`.

### 5. CSS
- Slim the local `*_shared.css` to only genuinely plugin-specific components.
- Use base tokens (`var(--jpk-accent)`, `--jpk-error`, `--jpk-success`, `--jpk-warning`, `--jpk-border`, `--jpk-surface`, `--jpk-field-gap`); delete local `:root` tokens.

### 6. Build files and workflows
- csproj `EmbeddedResource` list and `build.sh` resource list: drop the deleted shared JS, keep the slim CSS.
- Workflows stay the reusable `jellyfin/jellyfin-meta-plugins` build/test; no nuget.config, no `PACKAGES_PAT`.

### 7. Build, deploy, verify
- `./build.sh Release --clean`, unzip into `~/.local/share/jellyfin/plugins/<Name>_<Version>/`.
- Restart Jellyfin, then HARD refresh the config page.

## Gotchas (learned the hard way)

- **Always add the base `<link>` to every page.** Missing it leaves `jpk-*` classes unstyled (white buttons, stacked fields). This was the YouTubeAudio bug.
- **Shared asset names must be prefixed per plugin.** `configurationpage` names are server wide; without a prefix all plugins collide and the server serves one plugin's CSS to all of them. `GetSharedPages("PREFIX")` + matching link/import names fixes it. This is why versions can now differ safely across plugins.
- **Browser caches `configurationpage` CSS hard.** After deploy, hard refresh or use DevTools "Disable cache". To prove server vs browser, curl `…/web/configurationpage?name=PREFIX_jpkribs_shared.css`.
- **`jpk-field-row` carries the form gap margin.** Inside a dense card or editor, zero it (`.your-card .jpk-field-row { margin: 0 !important }`) and let the parent `gap` handle spacing.
- **Table search/filter structure:** `jpk-table-search` goes on the `<input>` itself, `jpk-table-filter` on the `<select>`, plus a `<span class="material-icons jpk-table-filter-arrow">` in the wrapper. Not on wrapping divs.
- **Do not force dense, purpose-built UI onto generic components** if they fight; keep a small local layout (YouTubeAudio's import editor stayed on `yta-import-*`).
- **UI text:** no dashes, no parentheticals, no semicolons.

## Release loop

1. Change base, bump `<Version>`, push, release. `publish.yaml` pushes to nuget.org.
2. Wait for nuget.org indexing (up to ~1 hour).
3. Bump each consumer's `PackageReference`; their CI restores from nuget.org. Renovate can automate this.
