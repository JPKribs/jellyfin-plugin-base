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
| Component | One reusable piece, a CSS file, a TypeScript module, a template, or a C# helper | | Widget, control, module |
| Core | Shared code in `src/js/lib/` that a family of components is built on. It is not exported from the bundle and has no CSS file of its own | `src/js/lib/*.ts` | Engine, base class, mixin |
| Base component | A public component that other components are built on, such as the List or the Filtered List | | Parent, superclass |
| Variation | A thin component on a base component or a core that adds only its own options and look | | Fork, copy, subclass |
| Helper | A C# type in `src/` that a plugin calls | `src/*.cs` | Utility class, service |
| Kit | The CSS and JS components together. Used in code comments | | Framework, library |
| Bundle | The one minified CSS file and one JS file built from the component sources | `dist/jpkribs_shared.css`, `dist/jpkribs_shared.js` | Build, dist file |
| Source | The strict TypeScript and CSS the bundle is built from | `src/js/*.ts`, `src/js/lib/*.ts`, `src/css/*.css` | Raw files |
| Typings | The declaration file that describes the JS bundle for a plugin's editor | `dist/jpkribs_shared.d.ts` | Types file, definitions, d.ts |
| Golden copy | The committed JS bundle a build must match unless a change means to alter it | `JPKribs.Jellyfin.Base.Tests/golden/` | Snapshot, baseline |
| Template | An HTML file in `src/templates/` that a helper fills in | `src/templates/status.html` | View, page file |
| Inventory | A page that lists every public component with a short entry each | `docs/components/csharp/index.md`, `docs/components/web/index.md` | Catalog, index |
| Gallery | The static page that renders every CSS and JS component | `JPKribs.Jellyfin.Base.Tests/gallery/index.html` | Demo, storybook |
| Preview | A live example of one web component, built into a page that a docs page and the gallery frame | `docs/previews/<name>.html` | Demo, sample, sandbox |
| Reference | The part of a web component page that `scripts/build-docs.mjs` writes from the code | `reference:start`, `reference:end` | API table, member list |
| Fixture | A fixed input file that a test reads | `JPKribs.Jellyfin.Base.Tests/Fixtures/` | Sample, mock file |

## Naming

| Term | Meaning | In Code | Not |
| :--- | :--- | :--- | :--- |
| Prefix | The `base-` that starts every class and variable Base ships | `base-`, `--base-` | Namespace, scope |
| Modifier | A state class on a component, such as `.active` or `.collapsed` | | Variant, flag |
| Part | A piece inside a component, named `base-name-part` | `base-card-count` | Child, element |
| Jellyfin selector | A selector that styles Jellyfin's own markup and stays unprefixed | `sectionTitle`, `emby-*` | Override, hack |

## Styles

| Term | Meaning | In Code | Not |
| :--- | :--- | :--- | :--- |
| Token | A CSS custom property in `design-tokens.css` that holds a size, font, pad, icon, line, field, gap, chevron, radius, shadow, layer, or color value | `--base-accent`, `--base-gap-wide`, `--base-size-medium` | Variable, theme value |
| Size scale | The small, medium, and large steps every control takes its height, text, padding, icon, and line height from | `--base-size-*`, `--base-font-*`, `--base-pad-*`, `--base-icon-*`, `--base-line-*` | Density, zoom |
| Floating surface | The one background, border, rounding, shadow, and layer every popup shares | `base-float` | Popup style, card |
| Icon text | An icon beside text that may wrap, centered on the first line | `base-icon-text` | Icon row, icon label |
| Item row | A boxed row that looks like a field and is at least a field tall | `base-item-row` | Entry row, list item |
| Status color | One of green, red, orange, purple, blue, or gray, each with a background and a text token | `--base-green-bg`, `--base-green-fg` | Palette color, severity |
| Accent | The theme's primary color | `--base-accent` | Brand color, primary |
| Surface | The background of a panel or dialog | `--base-surface` | Panel color |
| Fallback | A plain rule kept for an engine that cannot read `color-mix()` or `:is()` | | Polyfill, hack |
| Callout | A soft inline notice in one status color | `base-info`, `base-success`, `base-warn`, `base-error`, `base-neutral` | Alert |
| Badge | A pill that holds a short status label | `base-badge` | Chip, label |
| Status card | A count over a label inside `base-cards`, tinted by color | `base-card` | Tile, counter |
| Status page | The themed standalone card page that `StatusPage` renders | `StatusPage`, `status.html` | Error page, landing page |
| Record card | A card of label and value rows for one item | `base-record-card` | Detail panel |
| Config page | A plugin settings page inside the Jellyfin dashboard | `pluginConfigurationPage` | Settings screen |
| Dialog | A modal over the page | `base-dialog`, `openDialog` | Modal, popup |
| Editor dialog | A dialog that edits one record with Remove, Cancel, and Done | `openEditorDialog` | Record dialog |
| Collapsible | A section whose header shows and hides its body, with an optional icon tile, subtitle, and aside in its header | `base-collapsible-section` | Accordion |
| Fixed panel | A collapsible section that never collapses: a framed panel with the same header slots | `createCollapsibleSection({ collapsible: false })` | Panel, card |
| Tab bar | The dashboard tabs that `setTabs` wires | `setTabs` | Nav, menu |
| Sub tabs | Tabs inside a page, with panels | `createSubTabs` | Tab bar, nav |
| Banner | A callout with a close button | `createBanner` | Alert, notice |
| Toast | A short message that appears for a moment and goes away | `createToaster` | Snackbar, notification |
| Tooltip | A short text shown on hover and focus | `bindTooltips`, `setTooltip` | Hover text, title |
| Help hint | A small icon beside a label that explains a field | `createHelpHint` | Info icon, question mark |
| Overflow menu | A button that opens a short list of actions | `createOverflowMenu` | Kebab menu, context menu |
| Filter panel | A Filter button with a count of the filters on that opens groups of checkboxes or radio choices | `createFilterPanel` | Facets, filter menu, filter dropdown |
| Popover | A small panel that floats beside the control that opened it and closes on Escape or an outside click | `anchorPopover`, `base-float` | Popup, flyout, dropdown panel |
| Balanced rows | Tiles that wrap in rows of even size, so no row holds a single tile | `balanceRows`, `bindBalancedRows`, `base-balanced` | Masonry, auto grid |
| List | The frame, height, and empty and loading states around any items, with each item's content from render | `createList`, `base-list` | Container, list view |
| Filtered list | The List with a search, filters, a sort, a summary line, selection, and actions. The base of the Data Table, the Paginated Table, and the Checkbox List | `createFilteredList` | Search list, grid |
| Data table | A Filtered List whose items are rows under a header of sortable columns | `createDataTable` | Grid, table view |
| Compare table | A Data Table of properties by columns of values, with the rows that differ marked, grouped by section rows, with note rows for why a value changed | `createCompareTable` | Diff table |
| Matrix grid | A Data Table of row labels by columns with a control in each cell: units, hidden columns, per-row cells, and read-only badge and static columns | `createMatrixGrid` | Permission grid, check matrix |
| Checkbox list | A Filtered List of checkbox rows for picking many items | `createCheckboxList` | Multi select, pick list |
| User selector | A select of the server's users for picking one | `createUserSelector` | User dropdown |
| User multi selector | A Checkbox List of the server's users for picking many | `createUserMultiSelector` | User picker, user list |
| Record list | A List of static rows, each a title, a secondary line, tags, and a chevron or an aside control | `createRecordList` | Settings list, nav list |
| Tree view | Nested rows that open and close, with optional checkboxes and children that load on open | `createTreeView` | Outline, hierarchy |
| Media card | One media item with its artwork, as a list row or a grid tile | `createMediaCard`, `base-media-card` | Poster card, item row |
| Media picker | A library search that picks media items | `createMediaPicker` | Item selector, title picker |
| Media shape | The artwork shape of an item type, portrait, wide, square, or round | `mediaShape` | Aspect, ratio |
| Stepper | The ordered steps of a flow with a current and completed state | `createStepper` | Wizard, progress steps |
| Pagination | A footer with page size, previous, next, and page numbers | `createPagination` | Pager |
| Spinner | A small spinning mark that shows work in progress | `createSpinner` | Loader |
| Skeleton | Gray placeholder shapes shown while content loads | `createSkeleton` | Shimmer, loading box |
| Timeline | A vertical list of events with time, title, and status | `createTimeline` | Activity feed, history list |
| Status dot | A small colored dot that shows a state | `createStatusDot` | Indicator light |
| Avatar | A round image, or the person icon when there is none, that stands for a user | `createAvatar`, `createUserChip` | Profile picture |
| Stat card | A number or a short text, a label, detail lines, and a trend, on the card core. `label-top` puts the label first for a status | `createStatCard` | Metric tile, status card |
| Count cards | A row of status cards drawn from data | `renderCards` | Counters, tiles |
| Bar chart | Bars per label and series on the chart core | `createBarChart` | Column chart, histogram |
| Line chart | A line per series through one point per label on the chart core | `createLineChart` | Trend chart, graph |
| Sparkline | A small line with no axes that shows the shape of a series | `createSparkline` | Mini chart, trend line |
| Usage meter | A progress bar of how much of something is used, with an "X of Y used" line | `createUsageMeter` | Quota bar, capacity bar |
| Relative time | A live time such as "3 minutes ago", on the clock core | `createRelativeTime` | Time ago, timestamp |
| Avatar stack | A row of overlapping avatars that folds the rest into a +N bubble | `createAvatarStack` | Face pile |
| QR code | A QR code of a short text with Copy Image and Download | `createQrCode` | Barcode |
| Audio player | A Play and Pause button, a seek slider, and the time | `createAudioPlayer` | Media player |
| Preview frame | A frame that shows an image made by an async render, on the thumb core | `createPreviewFrame` | Image preview, render box |
| World map | A map that shades each country by its counts in up to six layers | `createWorldMap` | Choropleth, globe |
| Map link | The helper that joins a World Map and a Data Table so each follows the other | `linkWorldMap` | Map sync |
| Flow diagram | A hub with lanes of pills joined to it by colored lines with arrows | `createFlowDiagram` | Network graph, topology |
| Progress ring | A circular progress mark | `createProgressRing` | Donut, radial |
| Copy field | A read-only value with a button that copies it | `createCopyField` | Clipboard input |
| String list | A list of strings to add, remove, and reorder | `createStringList` | Tag list |
| Key value editor | A Repeater of a key and a value to add and remove | `createKeyValueEditor` | Map editor, headers editor |
| Repeater | The base for any list of rows or cards of mixed fields, built on the row editor core | `createRepeater` | Form array, dynamic rows |
| Rule builder | A Repeater of field, operator, and value rows, matching all or any | `createRuleBuilder` | Query builder, condition editor |
| Ordered list | Rows the caller draws, each with up and down buttons | `createOrderedList` | Sortable list |
| Sortable card list | Numbered cards that reorder and open to one shared editor | `createSortableCardList` | Card stack |
| Tag input | A free form field that turns typed text into tags | `createTagInput` | Token field |
| Chip select | A search that picks many values shown as chips | `createChipSelect` | Multi combo |
| Combo box | A text input with a floating list of results for one value | `createSearchableComboBox` | Autocomplete, dropdown search |
| Search field | A search input with its icon inside and a clear button | `createSearchField` | Search box, filter box |
| Pill group | A row of pill buttons on the pressed group core | `createPillGroup` | Segmented control, button group |
| Choice group | Radio cards for one choice | `createChoiceGroup` | Radio tiles |
| Number unit field | A number box beside a unit select | `createNumberUnitField` | Size field |
| Slider field | A range input with a readout of its value | `createSliderField` | Range |
| Schedule picker | A time of day and optional day toggles | `createSchedulePicker` | Cron field |
| Time range field | A start and an end time box, checked through the validation core | `createTimeRangeField` | Time span, hours field |
| Duration field | Hours, minutes, and seconds boxes for one value in seconds | `createDurationField` | Timespan field |
| Date range picker | A from and a to date box under preset pills | `createDateRangePicker` | Date filter, period picker |
| Inherit field | Any field wrapped with an Inherit and Override choice | `createInheritField` | Default toggle, override field |
| Color picker | A swatch, a fixed #, and hex digits, with an optional opacity box | `createColorPicker` | Color input, swatch field |
| Access schedule | A list of weekly time windows, each a day and a start and end hour, in Jellyfin's AccessSchedule shape | `createAccessSchedule` | Time limits, parental schedule |
| Mapping table | A table that pairs each source with one target picked from a select | `createMappingTable` | Mapper, link table, pairing grid |
| File picker | A click or drop area that returns chosen files | `createFilePicker` | Uploader, dropzone |
| Folder picker | A server path field with a dialog that browses the server's folders | `createFolderPicker` | Directory browser, path chooser |
| Image picker | A frame that previews a chosen image and returns its data | `createImagePicker` | Image uploader, avatar upload |
| Definition list | Read-only label and value pairs, beside each other or in `columns`, with meta and note lines and an optional route arrow | `createDefinitionList` | Details list, info grid |
| Log viewer | A scrolling monospace output area | `createLogViewer` | Console, terminal |
| Field message | A message under a field that shows its state, on the message core | `createFieldMessage` | Validation text, error label |
| Status line | A line of an icon and a sentence in its state's color, on the message core | `setStatus`, `base-status-text` | Status label, message bar |
| Save bar | A Save button with a status line above it | `createSaveBar` | Action bar, footer |
| Confirm dialog | A dialog that asks before an action, with a button that repeats the verb | `confirmDialog` | Alert, yes no dialog |
| Typed confirm | A Confirm dialog that enables its button only once the reader types the asked text | `typeToConfirm`, `typedMatches` | Type to confirm |
| Prompt dialog | A small form in a dialog that resolves to its values, or null when cancelled | `promptDialog` | Input dialog |
| Detail drawer | A dialog that slides in from the right edge with a header, a body that scrolls, and an optional footer | `openDetailDrawer` | Side panel, sheet, flyout |
| Bound dialog | A dialog bound to markup already on the page | `bindDialog` | Static modal |
| Setup checklist | A setup page as numbered collapsible steps with a summary of how many are done | `createSetupChecklist` | Wizard, onboarding |

## Cores

| Term | Meaning | In Code | Not |
| :--- | :--- | :--- | :--- |
| Data view | The search, filters, sort, and paging over items, local or from the server, that the Filtered List and every table share | `createDataView`, `lib/data-view.ts` | Data source, store, model |
| Checkbox | One checkbox in Base's look with its text beside it, a field tall when it sits in a row of fields | `createCheckbox` | Check box, tick box |
| Checkbox core | The one checkbox and radio input Base draws, and the row label that holds one beside its text | `makeCheck`, `makeCheckRow`, `lib/check.ts` | Check helper |
| Selection core | The picked ids behind a list with checkboxes, and the binding of its row checkboxes | `createSelection`, `bindChecks`, `lib/selection.ts` | Selection model |
| Validation core | The one check every input goes through, with rules from its attributes and an optional `validate` function | `bindValidation`, `validateAll`, `lib/validate.ts` | Validator, form check |
| Field adornments | The arrows, picker icons, and search icon Base draws inside number, date, time, and search fields, bound with the validation core | `adornField`, `bindFieldAdornments` | Field decorations, spinners |
| Field control core | One control built from a field spec, and a group of them with labels and messages, for the Repeater, the Rule Builder, the Matrix Grid, the Mapping Table, and the Data Table's row editor | `buildControl`, `createFieldGroup`, `lib/field-control.ts` | Field factory |
| Row editor core | The move buttons and a keyed set of rows with Add and Remove that every row editor shares | `createRowSet`, `moveButtons`, `lib/row-editor.ts` | List editor |
| Popover core | The placement, closing, and Escape handling of every floating panel | `anchorPopover`, `lib/popover.ts` | Dropdown helper |
| Typeahead core | A text input with a floating list of results that the Combo Box, the Chip Select, and the Media Picker share | `bindTypeahead`, `lib/typeahead.ts` | Autocomplete helper |
| Pressed group core | A group of on and off buttons, single or many, that may clear on a second click | `bindPressedGroup`, `lib/pressed-group.ts` | Toggle group helper |
| Dialog core | The modal shell, focus, stacking, scroll lock, and button row every dialog shares | `createModalShell`, `lib/dialog.ts` | Modal base |
| Message core | The state icons and the dismiss button every message shares | `MESSAGE_ICONS`, `dismissButton`, `lib/message.ts` | Alert helper |
| Card core | The count over a label, tinted by a color, that count cards, the Stat Card, and filter cards share | `buildCard`, `lib/card.ts` | Tile helper |
| Chart core | The frame, scale, axes, legend, tooltip, and hidden table of numbers every chart shares | `buildChart`, `lib/chart.ts` | Chart engine |
| Clock core | The one shared ticking clock every live time on a page runs on | `watchClock`, `lib/clock.ts` | Timer, ticker |
| Thumb core | The artwork thumbnail with a placeholder icon, from an item, an address, or an async source | `buildThumb`, `lib/thumb.ts` | Image helper |
| Color core | The status names and hex codes every colored component takes | `applyColor`, `lib/color.ts` | Palette helper |
| Clock time | A number of seconds written as a clock, such as 1:30:00 | `clockText`, the bag's `formatDuration` | Timestamp, time string |
| Duration text | A number of seconds written in units, such as 1h 30m | `durationText` | Clock time |

## Client Helpers

| Term | Meaning | In Code | Not |
| :--- | :--- | :--- | :--- |
| Page handle | What `createConfigPage` returns, holding `shared`, `addCleanup`, `createPoller`, and `guardUnsaved` | `createConfigPage` | Page object, controller |
| Shared bag | The per view set of helpers that `createShared` returns | `createShared` | Utils, helper object |
| Poller | A repeating call that stops when the page hides | `createPoller` | Timer, interval |
| Cleanup | A function the page handle runs when the page hides | `addCleanup` | Teardown, destructor |
| Change tracker | A record of the saved state that reports unsaved edits | `createChangeTracker` | Dirty checker |
| Unsaved guard | The ask on leaving a page or closing the tab with unsaved edits | `guardUnsaved` | Leave warning |
| Paginated table | A Filtered List of rows that pages through a `PagedResult` from the server | `createPaginatedTable` | Grid |
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
