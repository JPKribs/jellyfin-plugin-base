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
| License | The GNU General Public License v3.0 the package ships under, as the plugins do | `LICENSE`, `GPL-3.0-only` | MIT, open source terms |
| Consumer | A plugin that references the package | | Client, host, dependent |
| Component | One reusable piece, a CSS file, a TypeScript module, a template, or a C# helper | | Widget, control, module |
| Core | Shared code in `src/js/lib/` that a family of components is built on, with no CSS file of its own. Most cores are internal. `index.ts` makes the color core, the validation core, and the world shapes public | `src/js/lib/*.ts` | Engine, base class, mixin |
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

## Translations

| Term | Meaning | In Code | Not |
| :--- | :--- | :--- | :--- |
| Translations | The strings a plugin shows, in every language, built in from its own strings and the Jellyfin strings it declares | `BaseTranslations`, `loadTranslations` | Localization, i18n, resources |
| Jellyfin string | A string from the web client or the server, which a plugin uses by declaring its key | `<JellyfinString Include="Favorites" />` | Web string, core string, built in string |
| Local string | A plugin's own string, in its `Localization` folder, for what Jellyfin has no string for | `Localization/en-us.json` | Custom string, override |
| Key | The name a string is looked up by | `TranslationKeys.MyRequests` | ID, token, label |
| Language | A language code, lower case with a hyphen, such as `pt-br` | `NormalizeLanguage`, `currentLanguage` | Locale, culture |
| Fallback language | US English, which holds every key and fills any string a language lacks | `en-us`, `FallbackLanguage` | Default language, base language |
| Snapshot | The copy of Jellyfin's strings the package carries, fetched at the tags in `jellyfin.json` | `dist/jellyfin/`, `jellyfin/` in the package | Cache, mirror |
| Text match | A local string whose US English is the same as a Jellyfin string's | `JPKT005`, `JPKT006`, `JellyfinTextMatch` | Duplicate, collision |
| Base's own strings | The words Base's components and helpers show, built into every plugin: Jellyfin strings Base declares and local strings whose keys start with `Base.` | `strings/`, `BASE_TEXT`, `baseText` | Built in labels, core strings |
| Current translations | The handle `loadTranslations` gave last, which components read their default text from | `currentTranslations` | Global strings, active locale |
| Title case, sentence case | English text with every main word capitalized, or only the first of each sentence | `TextCase`, `titleCase`, `sentenceCase` | Capitalization, proper case |
| Casing list | The words and phrases title case and sentence case keep as written, Base's defaults and the plugin's | `Localization/casing.json`, `TextCase.Exceptions` | Exceptions file, acronyms |
| Request language | The language a page asks the plugin's API to answer in | `X-Jellyfin-Plugin-Language`, `RequestLanguage` | Locale header |

## Naming

| Term | Meaning | In Code | Not |
| :--- | :--- | :--- | :--- |
| Prefix | The `base-` that starts every class and variable Base ships, and the `Base` that starts a C# type, MSBuild property, item, or target whose plain name could match a plugin's | `base-`, `--base-`, `BaseHttp`, `BaseTranslations` | Namespace, scope, `Jpk` |
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
| Named color | One of the nine colors every colored component takes by name, green, red, orange, purple, blue, gray, yellow, pink, and teal, each with a text token and a tint token | `COLOR_NAMES`, `--base-green-fg`, `--base-green-bg` | Palette color, swatch |
| Status color | One of the six named colors with a status meaning, green, red, orange, purple, blue, or gray | `--base-green-bg`, `--base-green-fg` | Severity |
| Category color | Yellow, pink, or teal, the three named colors with no status meaning, a tint for categories | `--base-yellow-fg`, `--base-pink-fg`, `--base-teal-fg` | Status color, accent |
| Custom color | A hex code given in place of a named color, set on the element by the color core with the text color that reads on it | `--base-custom`, `--base-custom-on`, `.custom` | Raw color, inline color |
| Accent | The theme's primary color | `--base-accent` | Brand color, primary |
| Surface | The background of a panel or dialog | `--base-surface` | Panel color |
| Fallback | A plain rule kept for an engine that cannot read `color-mix()` or `:is()` | | Polyfill, hack |
| Callout | A soft inline notice in one status color | `base-info`, `base-success`, `base-warn`, `base-error`, `base-neutral` | Alert |
| Badge | A pill that holds a short status label | `base-badge` | Chip, label |
| Badge states | The one map from every state a badge shows to its color, which a plugin maps its own statuses onto | `BADGE_STATES` | Status map, state colors |
| Status card | A count over a label inside `base-cards`, tinted by color | `base-card` | Tile, counter |
| Status page | The themed standalone card page that `StatusPage` renders | `StatusPage`, `status.html` | Error page, landing page |
| Record card | A card of label and value rows for one item | `base-record-card` | Detail panel |
| Asset list | Rows for uploaded files, each with a thumbnail, a name and reference, and action buttons | `base-asset-list`, `base-asset-item` | File list, upload list |
| Bulk edit bar | A bordered toolbar above a table for editing many rows at once | `base-bulk-edit-bar` | Batch bar, mass edit |
| Edit row | A table row that expands into stacked lines of fields | `base-edit-row`, `base-edit-line` | Inline form, expand row |
| Button | Jellyfin's raised `emby-button` in Base's look, with a variant and a size | `base-button`, `base-button-row` | Btn, action link |
| Row button | A low emphasis icon button for table and list rows | `base-row-btn` | Icon button, row link |
| Task progress button | A button that turns into a live progress display for a Jellyfin scheduled task | `shared.pollTaskProgress`, `base-btn-progress-host` | Progress button, task button |
| Check grid | Checkboxes laid out in as many columns as fit | `base-check-grid` | Checkbox grid, check columns |
| Code block | A monospace code editor textarea, or a read only block for a preview | `base-code` | Code editor, pre block |
| Edit input | A compact input on the surface color, at the field height, that the Combo Box, the Chip Select, and the dialog text boxes build with | `base-edit-input` | Inline input, small input |
| Form fields | Jellyfin's own field containers, restyled so every field on a config page or in a dialog shares one surface, border, focus ring, chevron, and left edge, with no kit class | `.pluginConfigurationPage`, `.base-dialog` | Form theme, field skin |
| Field | A compact label over its control | `base-field` | Form item, input group |
| Field row | Several fields side by side on one line | `base-field-row` | Form row, inline fields |
| Indent | A group of sub fields under a toggle, indented with a left rule | `base-indent` | Nested group, sub form |
| Panel | A bordered sub card on the surface color, for a group of fields or text inside a section or a dialog | `base-panel` | Box, well |
| Section | An always open titled block, the Collapsible with no toggle | `base-section` | Box, group |
| Section title | The page heading with a full width underline, in Jellyfin's own unprefixed classes | `sectionTitleContainer` | Page header, banner |
| Subsection title | A small, muted, uppercase heading that groups fields inside a section or form | `base-subsection-title` | Caption, label |
| Static table | A plain bordered table for a few fixed rows, such as a summary | `base-static-table` | Simple table, plain grid |
| Empty state | A boxed message, a compact message, or a small dimmed line for a region with nothing in it | `base-empty`, `base-empty-section`, `base-empty-inline` | No data, blank slate |
| Progress bar | A thin accent bar over a faint track, such as a download in a row | `base-progress`, `base-progress-bar` | Loading bar |
| Record selector | A stacked dropdown with an action row under it, for picking one record and acting on it. The User Selector is built on it | `base-selector` | Record picker, record dropdown |
| Reset group | A stack of rows that each pair a description with an action button, such as per table resets | `base-reset-group`, `base-reset-row` | Danger zone, reset list |
| Tags | Removable chips that wrap, drawn by the Chip Select, the Tag Input, and the Placeholder Hint | `base-tags`, `base-tag` | Tokens, labels |
| Toggle group | A wrapping row of pills for choosing any number of options, whose pressed state the page owns | `base-toggle` | Checkbox pills, filter chips |
| Unsaved indicator | A small dot and text that fades in to flag unsaved changes, in a heading or a label | `base-unsaved` | Dirty flag, change marker |
| Utility classes | Small classes for visibility, fonts, and text color | `base-sr-only`, `base-mono`, `base-ok`, `base-bad` | Helper classes, utilities |
| Config page | A plugin settings page inside the Jellyfin dashboard | `pluginConfigurationPage` | Settings screen |
| Dialog | A modal over the page | `base-dialog`, `openDialog` | Modal, popup |
| Editor dialog | A dialog that edits one record with Remove, Cancel, and Done | `openEditorDialog` | Record dialog |
| Collapsible | A section whose header shows and hides its body, with an optional icon tile, subtitle, and aside in its header. `initCollapsibles` binds the ones already in a page's markup | `base-collapsible-section`, `createCollapsibleSection`, `initCollapsibles` | Accordion |
| Collapsible badge | The badge or status dot in a Collapsible's header, between its title and its chevron, set or removed after it is built | `setCollapsibleBadge` | Header tag, header chip |
| Fixed panel | A Collapsible that never collapses, a framed block with the same header slots | `createCollapsibleSection({ collapsible: false })` | Card, locked section |
| Tab bar | The dashboard tabs that `setTabs` wires | `setTabs` | Nav, menu |
| Breadcrumbs | A trail of places that ends at the current one | `createBreadcrumbs` | Path bar, trail nav |
| Divider | A horizontal rule with an optional label in the middle | `createDivider` | Separator, hr |
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
| Matrix grid | A Data Table of row labels by columns with a control in each cell, with units, hidden columns, per-row cells, and read-only badge and static columns | `createMatrixGrid` | Permission grid, check matrix |
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
| Pie chart | Shares of a whole as slices of a pie or a donut, with a legend of values and percents, on the chart core | `createPieChart` | Donut chart, ring chart |
| Sparkline | A small line with no axes that shows the shape of a series | `createSparkline` | Mini chart, trend line |
| Usage meter | A progress bar of how much of something is used, with an "X of Y used" line | `createUsageMeter` | Quota bar, capacity bar |
| Relative time | A live time such as "3 minutes ago", on the clock core | `createRelativeTime` | Time ago, timestamp |
| Relative time cell | A render function for a Data Table column or a Filtered List that draws a live Relative Time from each row | `renderRelative` | Time column, ago column |
| Avatar stack | A row of overlapping avatars that folds the rest into a +N bubble | `createAvatarStack` | Face pile |
| QR code | A QR code of a short text with Copy Image and Download | `createQrCode` | Barcode |
| Inline QR code | A QR Code drawn as a Copy Field, with a QR button that opens the full code in a dialog | `createQrCode({ layout: 'inline' })` | QR link, QR popup |
| Audio player | A Play and Pause button, a seek slider, and the time | `createAudioPlayer` | Media player |
| Preview frame | A frame that shows an image made by an async render, on the thumb core | `createPreviewFrame` | Image preview, render box |
| World map | A map that shades each country by its counts in up to six layers | `createWorldMap` | Choropleth, globe |
| World shapes | The country outlines the World Map draws, by ISO 3166 alpha-2 code, and every code including countries too small to draw | `WORLD`, `WORLD_VIEWBOX`, `COUNTRY_CODES` | Geo data, map data |
| Map link | The helper that joins a World Map and a Data Table so each follows the other | `linkWorldMap` | Map sync |
| Flow diagram | A hub with lanes of pills joined to it by colored lines with arrows | `createFlowDiagram` | Network graph, topology |
| Progress ring | A circular progress mark | `createProgressRing` | Donut, radial |
| Copy field | A read-only value with a button that copies it | `createCopyField` | Clipboard input |
| String list | A list of strings to add, remove, and reorder | `createStringList` | Tag list |
| Key value editor | A Repeater of a key and a value to add and remove | `createKeyValueEditor` | Map editor, headers editor |
| Repeater | The base for any list of rows or cards of mixed fields, built on the row editor core | `createRepeater` | Form array, dynamic rows |
| Rule builder | A Repeater of field, operator, and value rows, matching all or any | `createRuleBuilder` | Query builder, condition editor |
| Rule operators | The operators the Rule Builder offers for each value type | `RULE_OPERATORS` | Comparators, conditions |
| Ordered list | Rows the caller draws, each with up and down buttons | `createOrderedList` | Sortable list |
| Sortable card list | Numbered cards that reorder and open to one shared editor | `createSortableCardList` | Card stack |
| Tag input | A free form field that turns typed text into tags | `createTagInput` | Token field |
| Placeholder hint | A Placeholders toggle under a field that lists `{name}` buttons and inserts the pressed one at the cursor | `placeholderHint`, `bindPlaceholders`, `insertAtCursor` | Token picker, variable list |
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
| Date range presets | The preset pills the Date Range Picker shows by default | `DATE_RANGE_PRESETS` | Quick ranges, shortcuts |
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
| Status line | A line of an icon and a sentence in its state's color, on the message core | `base-status-text` | Status label, message bar |
| Status text | The component that writes a status line into an element after a save or an error, colored by class. The shared bag's `setStatus` calls it | `setStatus`, `status-text.ts` | Status message, flash text |
| Save bar | A Save button with a status line above it | `createSaveBar` | Action bar, footer |
| Confirm dialog | A dialog that asks before an action, with a button that repeats the verb | `confirmDialog` | Alert, yes no dialog |
| Typed confirm | A Confirm dialog that enables its button only once the reader types the asked text | `typeToConfirm`, `typedMatches` | Type to confirm |
| Prompt dialog | A small form in a dialog that resolves to its values, or null when cancelled | `promptDialog` | Input dialog |
| Detail drawer | A dialog that slides in from the right edge with a header, a body that scrolls, and an optional footer | `openDetailDrawer` | Side panel, sheet, flyout |
| Drawer opener | A function that opens a Detail Drawer for an item, and swaps in the next item's content while the drawer stays open, for a list's `onOpen` | `detailDrawerOpener` | Drawer factory, open handler |
| Bound dialog | A dialog bound to markup already on the page | `bindDialog` | Static modal |
| Setup checklist | A setup page as numbered collapsible steps with a summary of how many are done | `createSetupChecklist` | Wizard, onboarding |

## Cores

| Term | Meaning | In Code | Not |
| :--- | :--- | :--- | :--- |
| Data view | The search, filters, sort, and paging over items, local or from the server, that the Filtered List and every table share | `createDataView`, `lib/data-view.ts` | Data source, store, model |
| Checkbox | One checkbox in Base's look with its text beside it, a field tall when it sits in a row of fields | `createCheckbox` | Check box, tick box |
| Boxed checkbox | A small or medium Checkbox framed like a text box, a field tall | `createCheckbox({ boxed: true })` | Checkbox field, framed check |
| Checkbox core | The one checkbox and radio input Base draws, and the row label that holds one beside its text | `makeCheck`, `makeCheckRow`, `lib/check.ts` | Check helper |
| Selection core | The picked ids behind a list with checkboxes, and the binding of its row checkboxes | `createSelection`, `bindChecks`, `lib/selection.ts` | Selection model |
| Validation core | The one check every input goes through, with rules from its attributes and an optional `validate` function. Public through `index.ts` | `bindValidation`, `validateAll`, `validateValue`, `lib/validate.ts` | Validator, form check |
| Validation messages | The default message for each rule, which a caller can replace | `VALIDATION_MESSAGES` | Error strings |
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
| Color core | The named colors and hex codes every colored component takes. Public through `index.ts` | `COLOR_NAMES`, `applyColor`, `lib/color.ts` | Palette helper |
| Badge core | The one badge every component draws, and the color a badge takes from a name, a hex code, or a state | `makeBadge`, `badgeColor`, `lib/badge.ts` | Label helper |
| Chips core | The removable chips of a picker and the Backspace that removes the last one | `renderChips`, `bindBackspaceRemove`, `lib/chips.ts` | Tag helper |
| Balance core | The row sizes that keep tiles in balanced rows | `balanceRows`, `rowSizes`, `lib/balance.ts` | Grid helper |
| Canvas core | Fitting an image in a box, turning a canvas into a Blob, and copying an image | `fitBox`, `canvasBlob`, `copyImage`, `lib/canvas.ts` | Image helper |
| File core | File sizes, the accept check, and saving a Blob as a file | `sizeText`, `accepts`, `downloadBlob`, `lib/file.ts` | Download helper |
| File intake core | The click and drop input that reads chosen files and checks each against its rules | `bindFileInput`, `checkFile`, `lib/file-intake.ts` | Upload helper |
| QR core | The encoder that turns a short text into a grid of QR modules | `encodeQr`, `QR_MAX_BYTES`, `lib/qr.ts` | QR library |
| Users core | Loading the server's users, their avatar addresses, and the key that matches ids that differ only by case or dashes | `loadUsers`, `avatarUrl`, `idKey`, `lib/users.ts` | User service |
| Combo ARIA core | The combobox roles and states that tie a text input to its floating list | `bindComboAria`, `lib/combo-aria.ts` | ARIA helper |
| Class names | A value from data reduced to safe class names, so it can never leave the class attribute | `classNames`, `lib/class-names.ts` | Class sanitizer |
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
| Browser helpers | The small functions a plugin would otherwise rewrite, each also on the shared bag | `browser-helpers.ts` | Utils, misc |
| GUID | A random version 4 GUID, with or without dashes | `generateGuid` | UUID, random id |
| Error text | The reason a failed request gave, or a fallback | `errorText` | Error string, message |
| JSON export | Saving a value as a pretty printed JSON file | `downloadJson` | Backup, dump |
| JSON import | Opening a file picker and reading the chosen JSON file | `pickJsonFile` | Upload, restore |
| Copy | Putting text on the clipboard, with a fallback for HTTP dashboards | `copyToClipboard` | Clip, yank |
| Debounce | Running a function once calls pause, with the latest arguments | `debounce` | Throttle, delay |
| Plural | A count with its word, singular only for exactly 1 | `plural` | Pluralize, count label |

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

## Notifications

| Term | Meaning | In Code | Not |
| :--- | :--- | :--- | :--- |
| Notifier | The helper that sends a message to each destination in its own format, and previews it | `BaseNotifier` | Sender, dispatcher |
| Message | One update, written once for every channel, with placeholders filled for each | `NotifyMessage` | Notification object, payload |
| Update | What happened that a plugin tells people about, in docs and default text | `{updateTitle}`, `{updateMessage}` | Event, alert |
| Destination | One place messages go, kept in the plugin's configuration | `NotifyDestination` | Target, sink, connection |
| Channel | The kind of place a destination is, Discord, webhook, Jellyfin, or web push | `NotifyChannel` | Provider, transport |
| Recipient | A Jellyfin user the Jellyfin and web push channels reach | `NotifyMessage.Recipients` | Target user, subscriber |
| Held message | A Jellyfin message kept until one of its recipient's devices is online | `NotifyHeldMessage`, `INotifyHeldStore` | Queued message, pending message |
| Notify preview | What a destination would get, built by the code that sends it, and drawn on a page | `NotifyPreview`, `createNotifyPreview` | Mockup, sample |
| Web push | A browser notification sent through the browser's push service, by RFC 8030, 8291, and 8292 | `WebPushEncryption`, `subscribeWebPush` | Push notification, browser alert |
| VAPID keys | The server's key pair that signs every web push | `WebPushKeys` | Push keys, server keys |
| Subscription | One browser signed up for a user's web push | `WebPushSubscription`, `IWebPushStore` | Registration, device token |
| Worker script | The service worker script that shows a web push | `WebPushWorker` | Push handler |
| Standalone page script | The script a page that loads no bundle takes its web push and casing helpers from, as the global `BasePage` | `BasePageScript`, `lib/page-script.ts` | Mini bundle, lite script |

## Delivery

| Term | Meaning | In Code | Not |
| :--- | :--- | :--- | :--- |
| Release | One version of the package | `v12.4.0` tag | Build, drop |
| Version | `<jellyfin>.<X>`, the Jellyfin version Base targets and a count of the releases for it from 0 | `12.4.0`, `jellyfin.json` | Dated version, semver, build number |
| Jellyfin version | The major and minor Jellyfin release Base targets, and the first two parts of every version | `"jellyfin": "12.4"` in `jellyfin.json` | ABI, server version |
| Local pack | A package made on a machine for testing, with the `scripts/pack.sh` version | `nupkg/` | Snapshot, nightly |
