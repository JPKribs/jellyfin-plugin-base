# Glossary

The agreed name for every concept in Base. Components, default labels, docs, and code use these words and no others.

* Use the **Term** in docs, comments, and default labels.
* The **In Code** column names the type, member, or file that holds it, when the code name differs.
* Never use a word from the **Not** column for the concept.
* Add a term here before it appears anywhere else. Rename it here first when it changes, then everywhere in the same commit.
* [style.md](style.md#naming) sets the naming for classes, variables, exports, and types. This file sets the words.

## The Package

| Term | Meaning | In Code | Not |
| :--- | :--- | :--- | :--- |
| Base | This repository and its package | `JPKribs.Jellyfin.Base` | Shared library, common, core |
| Package | The NuGet package that ships Base | `JPKribs.Jellyfin.Base.csproj` | Library, DLL |
| Consumer | A plugin that references the package | | Client, host, dependent |
| Component | One reusable piece, a CSS file, a JS module, a template, or a C# helper | | Widget, control, module |
| Helper | A C# type in `src/` that a plugin calls | `src/*.cs` | Utility class, service |
| Kit | The CSS and JS components together. Used in code comments | | Framework, library |
| Bundle | The one minified CSS file and one JS file built from the component sources | `dist/jpkribs_shared.css`, `dist/jpkribs_shared.js` | Build, dist file |
| Template | An HTML file in `src/templates/` that a helper fills in | `src/templates/status.html` | View, page file |
| Plugin template | The files `scripts/sync-plugins.sh` writes into each plugin | `templates/plugin/` | Boilerplate, scaffold |
| Inventory | A page that lists every public component with a short entry each | `docs/components/csharp/index.md`, `docs/components/web/index.md` | Catalog, index |
| Gallery | The static page that renders every CSS and JS component | `JPKribs.Jellyfin.Base.Tests/gallery/index.html` | Demo, storybook |
| Fixture | A fixed input file that a test reads | `JPKribs.Jellyfin.Base.Tests/Fixtures/` | Sample, mock file |

## Naming

| Term | Meaning | In Code | Not |
| :--- | :--- | :--- | :--- |
| Prefix | The `jpk` that starts every custom class, variable, and export | `jpk-`, `--jpk-` | Namespace, scope |
| Modifier | A state class on a component, such as `.active` or `.collapsed` | | Variant, flag |
| Part | A piece inside a component, named `jpk-name-part` | `jpk-card-count` | Child, element |
| Jellyfin selector | A selector that styles Jellyfin's own markup and stays unprefixed | `sectionTitle`, `emby-*` | Override, hack |

## Styles

| Term | Meaning | In Code | Not |
| :--- | :--- | :--- | :--- |
| Token | A CSS custom property that holds a color, a gap, or a font | `--jpk-accent`, `--jpk-field-gap` | Variable, theme value |
| Status color | One of green, red, orange, purple, blue, or gray, each with a background and a text token | `--jpk-green-bg`, `--jpk-green-fg` | Palette color, severity |
| Accent | The theme's primary color | `--jpk-accent` | Brand color, primary |
| Surface | The background of a panel or dialog | `--jpk-surface` | Panel color |
| Alias | A short token name scoped to the config page and kit dialogs | `--accent-color`, `--border-subtle` | Shortcut |
| Fallback | A plain rule kept for an engine that cannot read `color-mix()` or `:is()` | | Polyfill, hack |
| Callout | A soft inline notice in one status color | `jpk-info`, `jpk-success`, `jpk-warn`, `jpk-error`, `jpk-neutral` | Alert |
| Badge | A pill that holds a short status label | `jpk-badge` | Chip, label |
| Status card | A count over a label inside `jpk-cards`, tinted by color | `jpk-card` | Tile, counter |
| Status page | The themed standalone card page that `StatusPage` renders | `StatusPage`, `status.html` | Error page, landing page |
| Record card | A card of label and value rows for one item | `jpk-record-card` | Detail panel |
| Config page | A plugin settings page inside the Jellyfin dashboard | `pluginConfigurationPage` | Settings screen |
| Dialog | A modal over the page | `jpk-dialog`, `openDialog` | Modal, popup |
| Editor dialog | A dialog that edits one record with Remove, Cancel, and Done | `openEditorDialog` | Record dialog |
| Collapsible | A section whose header shows and hides its body | `jpk-collapsible-section` | Accordion |
| Tab bar | The dashboard tabs that `setTabs` wires | `setTabs` | Nav, menu |
| Sub-tabs | Tabs inside a page, with panels | `createSubTabs` | Tab bar, nav |
| Banner | A callout with a close button | `createBanner` | Alert, notice |
| Toast | A short message that appears for a moment and goes away | `createToaster` | Snackbar, notification |
| Tooltip | A short text shown on hover and focus | `bindTooltips`, `setTooltip` | Hover text, title |
| Help hint | A small icon beside a label that explains a field | `createHelpHint` | Info icon, question mark |
| Overflow menu | A button that opens a short list of actions | `createOverflowMenu` | Kebab menu, context menu |
| Stepper | The ordered steps of a flow with a current and completed state | `createStepper` | Wizard, progress steps |
| Pagination | A footer with page size, previous, next, and page numbers | `createPagination` | Pager |
| Spinner | A small spinning mark that shows work in progress | `createSpinner` | Loader |
| Skeleton | Gray placeholder shapes shown while content loads | `createSkeleton` | Shimmer, loading box |
| Timeline | A vertical list of events with time, title, and status | `createTimeline` | Activity feed, history list |
| Status dot | A small colored dot that shows a state | `createStatusDot` | Indicator light |
| Avatar | A round image or initials that stands for a user | `createAvatar`, `createUserChip` | Profile picture |
| Stat card | A number, a label, and a trend | `createStatCard` | Metric tile |
| Progress ring | A circular progress mark | `createProgressRing` | Donut, radial |
| Copy field | A read-only value with a button that copies it | `createCopyField` | Clipboard input |
| String list | A list of strings to add, remove, and reorder | `createStringList` | Tag list |
| Key-value editor | Rows of a key and a value to add and remove | `createKeyValueEditor` | Map editor, headers editor |
| File picker | A click or drop area that returns chosen files | `createFilePicker` | Uploader, dropzone |
| Definition list | Read-only label and value pairs | `createDefinitionList` | Details list |
| Log viewer | A scrolling monospace output area | `createLogViewer` | Console, terminal |
| Field message | A message under a field that shows its state | `createFieldMessage` | Validation text, error label |

## Client Helpers

| Term | Meaning | In Code | Not |
| :--- | :--- | :--- | :--- |
| Page handle | What `createConfigPage` returns, holding `shared`, `addCleanup`, `createPoller`, and `guardUnsaved` | `createConfigPage` | Page object, controller |
| Shared bag | The per view set of helpers that `createShared` returns | `createShared` | Utils, helper object |
| Poller | A repeating call that stops when the page hides | `createPoller` | Timer, interval |
| Cleanup | A function the page handle runs when the page hides | `addCleanup` | Teardown, destructor |
| Change tracker | A record of the saved state that reports unsaved edits | `createChangeTracker` | Dirty checker |
| Unsaved guard | The ask on leaving a page or closing the tab with unsaved edits | `guardUnsaved` | Leave warning |
| Paginated table | The searchable, filtered, infinite scrolling table over a `PagedResult` | `createPaginatedTable` | Grid, data table |
| Kept sentinel | The value a page posts back to say a stored secret is unchanged | `SecretProtector.KeptSentinel`, `SECRET_KEPT` | Placeholder, mask |
| Secret field | An input bound to a stored secret that never shows it | `bindSecretField` | Password field |
| Escape | Making a value safe to place in HTML or in a JS string | `escapeHtml`, `StringUtilities.EscapeJsString` | Sanitize, encode |

## C# Helpers

| Term | Meaning | In Code | Not |
| :--- | :--- | :--- | :--- |
| Plugin base | The base class that holds the singleton and the locked configuration | `PluginBase<TPlugin, TConfiguration>` | Plugin class |
| Shared pages | The embedded bundle pages a plugin registers under its own name | `GetSharedPages` | Assets |
| Secret protector | Encrypts credentials at rest with Data Protection | `SecretProtector` | Vault, encryptor |
| Public page | A standalone page a plugin serves outside the dashboard | `PublicPage`, `StatusPage` | Landing page |
| Circuit breaker | Stops calls to a service after repeated failures, for a cooldown | `CircuitBreaker` | Throttle |
| Backoff | A pause that grows with each failure of one record | `BackoffPolicy`, `BackoffState` | Delay, cooldown |
| Retry | Repeating an operation after a transient fault | `RetryPolicy` | Reattempt |
| Activity outcome | One kind of result that `ActivitySummary` counts | `ActivityOutcome` | Event type |
| Activity summary | One activity log entry for many events | `ActivitySummary` | Batch log |
| Paged result | A page of items with a total count | `PagedResult<T>` | Page, list result |
| Schema version | The version a helper stamps into a SQLite file | `DatabaseSchema` | Migration number |
| Minimum reader | The oldest version that can still read the file | `DatabaseSchema` | Compat version |

## Delivery

| Term | Meaning | In Code | Not |
| :--- | :--- | :--- | :--- |
| Release | One dated version of the package | `vYYYY.M.D` tag | Build, drop |
| Dated version | A version of the form `YYYY.M.D`, then `YYYY.M.D.N` for a later release that day | | Semver, build number |
| Local pack | A package made on a machine for testing, with the `scripts/pack.sh` version | `nupkg/` | Snapshot, nightly |
| Caller | A plugin's workflow file that runs a reusable workflow | `templates/plugin/.github/workflows/` | Wrapper |
| Reusable workflow | A `plugin-*.yaml` workflow that plugins call | `.github/workflows/plugin-*.yaml` | Shared action |
| Shim | A plugin's `build.sh`, which runs the packaging script that ships in the package | `templates/plugin/build.sh` | Wrapper |
| Plugin sync | Writing the plugin template into plugin checkouts | `scripts/sync-plugins.sh` | Deploy, push |
