# Web Components

Every web component in the Base bundle has one page here. A page says what the component is for, when to use it and when not to, the markup or call that puts it on a page, and its gotchas. Each page ends with a live example and the code behind it.

Each page also holds a Reference generated from the TypeScript in `src/js` and the header comments in `src/css`, with every export, option, handle member, and class. The same TypeScript builds the typings that ship in the package, so an editor shows the same options as the page.

For the C# helpers, see [C# Components](../csharp/index.md).

## How the Bundle Is Built

* CSS lives under `src/css`, one file per component. The components are TypeScript modules under `src/js`, all re-exported from `src/js/index.ts`. The one template, `status.html`, lives in `src/templates`.
* `scripts/bundle.sh` writes the two shipped assets into `dist/`, which git ignores. `dist/jpkribs_shared.css` holds `design-tokens.css` first and then every other CSS file in alphabetical order, minified for Chrome 58, Safari 11, and Firefox 57. File order never matters, because every component targets its own selectors and custom properties resolve in any order. `dist/jpkribs_shared.js` is `src/js/index.ts` with its types stripped, bundled and minified for Chromium 87 as one ES module with the exported names kept. `dist/jpkribs_shared.d.ts` holds its typings.
* The gallery renders every component from the real `dist/` bundle with a stubbed `ApiClient`, `Dashboard`, and user list. The live examples on these pages use the same stubs.
* The package build packs the bundles and the typings as `assets/` and `src/templates/*.html` as `templates/`.

## How a Plugin Loads the Bundle

1. The package targets file embeds the assets into the plugin as `<RootNamespace>.Configuration.jpkribs_shared.css` and `.js`, and each template as `<RootNamespace>.Templates.<name>.html`. The plugin stays one DLL.
2. The plugin class extends `PluginBase` and yields `GetSharedPages("myplugin")` from `GetPages()`. That serves the assets as `myplugin_jpkribs_shared.css` and `myplugin_jpkribs_shared.js` through Jellyfin's `configurationpage?name=` route. Use your own prefix. See [Using Base](../../Usage.md).
3. A config page links the stylesheet and imports the module by a relative path, never `/web/...`, so a server hosted under a base URL still works. The page element needs the `pluginConfigurationPage` class, because the form rules and the token aliases are scoped to it.

```html
<div id="MyPluginPage" data-role="page" class="page type-interior pluginConfigurationPage withTabs"
     data-require="emby-input,emby-button,emby-select,emby-checkbox"
     data-controller="__plugin/myplugin_settings.js">
    <div data-role="content">
        <div class="content-primary">
            <div id="MyPluginContent"></div>
        </div>
    </div>
    <link rel="stylesheet" href="configurationpage?name=myplugin_jpkribs_shared.css">
</div>
```

```js
// myplugin_settings.js, the page controller
import { createConfigPage, createPaginatedTable, openDialog, confirmDialog }
    from './configurationpage?name=myplugin_jpkribs_shared.js';

export default function (view) {
    createConfigPage(view, {
        pluginId: '00000000-0000-0000-0000-000000000000',
        apiPrefix: 'MyPlugin',
        bind: function (shared, page) { /* wire events once */ },
        load: function (shared, page) { /* load data on every viewshow */ }
    });
}
```

A plugin may also wrap the bundle in its own module that imports the builders it needs, re-exports them, and adds its own helpers on top of `createShared`. Server Sync does this in `serversync_shared.js`.

On a page built with `createConfigPage`, every field that carries a rule in its attributes is validated with no call, and number, date, time, and search fields get their adornments. See [Config Page](config-page.md) and [Field Message](field-message.md#validation).

In the examples on these pages, `view` is the page element and `shared` is the helper bag from `createShared` or `createConfigPage`. See [Config Page](config-page.md) and [Shared Bag](shared-bag.md).

## How Components Build on Each Other

Several components are built from a smaller one and inherit its look and behavior, such as the height, the empty state, and the focus handling. Each page still lists the options its own builder takes.

| Base | Built on it |
| :--- | :--- |
| [List](list.md) | The frame, height, scrolling, and empty and loading states of every list and table below |
| [Filtered List](filtered-list.md) | Adds search, filters, sort, a summary line, and selection to the List. [Data Table](data-table.md), [Paginated Table](paginated-table.md), and [Checkbox List](checkbox-list.md) are built on it |
| [Checkbox List](checkbox-list.md) | [User Multi Selector](user-multi-selector.md) |
| [Checkbox](checkbox.md) | The box of every Base checkbox: the Repeater's and Matrix Grid's toggle fields, the Filtered List's row checks and select all, the Filter Panel, the Tree View, the Inherit Field, and the Log Viewer |
| [Repeater](repeater.md) | [Key Value Editor](key-value-editor.md) and [Rule Builder](rule-builder.md) |
| [Dialog](dialog.md) | [Confirm Dialog](confirm-dialog.md), [Prompt Dialog](prompt-dialog.md), [Editor Dialog](editor-dialog.md), [Bound Dialog](bound-dialog.md), and [Detail Drawer](detail-drawer.md) |
| [Field Message](field-message.md) | The error line and the validation of every Base field and editor |
| [Field Adornments](field-adornments.md) | The arrows and picker icons of the [Number Unit Field](number-unit-field.md), [Color Picker](color-picker.md), [Duration Field](duration-field.md), [Time Range Field](time-range-field.md), and [Date Range Picker](date-range-picker.md) |

## Naming Rules

* Everything custom uses the `base` prefix. CSS classes are `base-` kebab case. A component is `base-name`, a part is `base-name-part`, and a state is a plain modifier such as `selected`, `collapsed`, `active`, `dragging`, `disabled`, `hidden`, `ok`, `bad`, or a color name.
* CSS variables are `--base-name`. JS exports are camelCase. C# types are PascalCase.
* The only unprefixed selectors are Jellyfin's own classes that the kit restyles: `sectionTitle`, `sectionTitleContainer`, `hidden`, `fieldDescription`, `material-icons`, `inputContainer`, `checkboxContainer`, `selectContainer`, and `emby-*`.
* Where Jellyfin supplies the element (`emby-button`, `emby-input`, `emby-select`, `emby-checkbox`), the kit adds `base-` classes beside the emby ones, as in `class="raised base-button primary"`.

## Jellyfin Palette Variables

Base reads three variables that the Jellyfin web client sets from the active theme. Each token that reads one falls back to the dark theme value when the variable is missing.

* `--jf-palette-primary-main` gives `--base-accent`, with the fallback `#00a4dc`.
* `--jf-palette-background-paper` gives `--base-surface`, with the fallback `#181818`.
* `--jf-palette-text-primary` gives `--base-fg`, with the fallback `#fff`.

Lines and washes are shares of the text color, so a light theme gets dark ones and a dark theme gets light ones. See [Design Tokens](design-tokens.md).

## Older Engines

The CSS is written to survive the desktop app's Qt WebEngine and older TV webviews. A theme derived color is written twice, a plain `rgba()` first and then a `color-mix()` upgrade. A color mixed from a variable sits in an `@supports (color: color-mix(...))` block after a plain rule. The form rules list `.pluginConfigurationPage` and `.base-dialog` as plain selectors, never with `:is()`, and a `:has()` rule never shares a selector list with anything an older engine needs. The visible result on such an engine is the dark theme look.

## Component Index

### Foundations

| Component | What it is |
| :--- | :--- |
| [Design Tokens](design-tokens.md) | The colors, spacings, sizes, radii, and color helpers every component reads |

### Page Lifecycle and Helpers

| Component | What it is |
| :--- | :--- |
| [Config Page](config-page.md) | Wires the lifecycle of a plugin settings page |
| [Tabs](tabs.md) | Sets the dashboard tab bar for a page |
| [Poller](poller.md) | A repeating call that stops when the page hides |
| [Change Tracker](change-tracker.md) | Tracks unsaved edits and drives the unsaved guard |
| [Task Progress Button](task-progress-button.md) | Shows a Jellyfin scheduled task running inside a button |
| [Shared Bag](shared-bag.md) | The per view helper object |
| [Browser Helpers](browser-helpers.md) | Escaping, plurals, debounce, GUIDs, and JSON files |
| [Utility Classes](utility-classes.md) | Hidden, mono, ok and bad text, and screen reader text |

### Layout and Sections

| Component | What it is |
| :--- | :--- |
| [Section Title](section-title.md) | Page heading with a full width rule |
| [Section](section.md) | An always open titled block |
| [Panel](panel.md) | A bordered sub card with an optional header |
| [Subsection Title](subsection-title.md) | Small uppercase group heading |
| [Collapsible Section](collapsible-section.md) | A header that folds a body, with an icon, subtitle, and aside, or a fixed panel |
| [Indent](indent.md) | A left ruled group under a toggle |
| [Reset Group](reset-group.md) | Rows that pair a description with an action |
| [Sub Tabs](sub-tabs.md) | An in page tab list with panels |
| [Breadcrumbs](breadcrumbs.md) | A trail of places |
| [Stepper](stepper.md) | Numbered steps for a flow |
| [Setup Checklist](setup-checklist.md) | Numbered setup steps with state badges and a progress bar |

### Forms and Inputs

| Component | What it is |
| :--- | :--- |
| [Form Fields](form-fields.md) | Uniform inputs, selects, and checkboxes |
| [Field and Field Row](field.md) | Compact label and control, side by side |
| [Edit Input](edit-input.md) | A compact text input inside a component |
| [Button](button.md) | Primary, secondary, destructive, and custom buttons in three sizes |
| [Row Button](row-button.md) | A quiet icon button for rows |
| [Toggle Group](toggle-group.md) | A row of on and off pills |
| [Pill Group](pill-group.md) | Pills where exactly one is chosen |
| [Check Grid](check-grid.md) | Checkboxes in automatic columns |
| [Code Block](code-block.md) | A monospace editor or preview |
| [Secret Field](secret-field.md) | A write only credential input |
| [Placeholder Hint](placeholder-hint.md) | A help toggle that inserts tokens into a field |
| [Record Selector](record-selector.md) | A dropdown with an action row |

### Selection

| Component | What it is |
| :--- | :--- |
| [Chip Select](chip-select.md) | A typeahead picker with removable chips |
| [Media Picker](media-picker.md) | A library search that picks items with artwork |
| [Tags](tags.md) | Removable chips that wrap |
| [Combo Box](combo-box.md) | A text input with a results dropdown |
| [Checkbox](checkbox.md) | One checkbox in Base's look with its text beside it |
| [Checkbox List](checkbox-list.md) | A searchable list of checkbox rows |
| [Filter Panel](filter-panel.md) | A Filter button with a count that opens groups of filter choices |
| [User Selector](user-selector.md) | A single user dropdown |
| [User Multi Selector](user-multi-selector.md) | A checkbox list of users |
| [Choice Group](choice-group.md) | Radio cards with a sentence each, in balanced rows |
| [Field Adornments](field-adornments.md) | Arrows on a number, a picker icon on a date or time, a search icon, and a reveal eye |

### Lists and Tables

| Component | What it is |
| :--- | :--- |
| [Paginated Table](paginated-table.md) | A searchable, filterable table that pages through rows, with thumbnails from an address or a loader |
| [Record List](record-list.md) | Rows of a title, a secondary line, and tags that open |
| [Tree View](tree-view.md) | Nested rows that open, load lazily, and check |
| [Compare Table](compare-table.md) | Values side by side with the changed rows marked, in sections with notes |
| [Matrix Grid](matrix-grid.md) | Row labels by columns with a control, a unit, or a read-only badge in each cell |
| [Filtered List](filtered-list.md) | A List with search, filters as selects, pills, or count cards, a sort, and a summary line |
| [Data Table](data-table.md) | A sortable, filterable table of local or server rows, with a selectable row |
| [World Map](world-map.md) | Countries shaded by counts, with layer toggles and a selection a table can follow |
| [Sortable Card List](sortable-card-list.md) | Ordered record cards with an editor |
| [Ordered List](ordered-list.md) | Rows with up and down buttons |
| [Record Card](record-card.md) | Label and value rows for one record |
| [Balanced Rows](balanced-rows.md) | Tiles that wrap in even rows, never one alone |
| [List](list.md) | Any items in rows, a grid, or plain, at a fixed, filling, or growing height |
| [Media Card](media-card.md) | One media item with its artwork, as a row or a tile |
| [Asset List](asset-list.md) | Rows of uploaded files |
| [Static Table](static-table.md) | A plain bordered table |
| [Bulk Edit Bar and Edit Row](bulk-edit.md) | Inline editing blocks |
| [Pagination](pagination.md) | A footer for a list read a page at a time |

### Feedback and Status

| Component | What it is |
| :--- | :--- |
| [Badge](badge.md) | A colored status pill |
| [Count Cards](count-cards.md) | A row of large counts over labels |
| [Callout](callout.md) | A soft inline notice |
| [Status Text](status-text.md) | A status line with the icon of its state |
| [Save Bar](save-bar.md) | A Save button with a line above it for unsaved, saving, saved, and failed |
| [Unsaved Indicator](unsaved-indicator.md) | A fading dirty flag |
| [Empty State](empty-state.md) | Placeholders for empty regions |
| [Status Page](status-page.md) | A standalone themed card page |
| [Toast](toast.md) | Stacked transient messages |
| [Banner](banner.md) | A callout with a Dismiss button |
| [Status Dot](status-dot.md) | A round status color with a name |

### Dialogs and Menus

| Component | What it is |
| :--- | :--- |
| [Detail Drawer](detail-drawer.md) | A panel from the right edge with the details of a row |
| [Dialog](dialog.md) | A modal with a title, a body, and buttons |
| [Confirm Dialog](confirm-dialog.md) | A yes or no question that resolves to a boolean |
| [Prompt Dialog](prompt-dialog.md) | A small form that resolves to a map of values |
| [Editor Dialog](editor-dialog.md) | The record editor a config page builds |
| [Bound Dialog](bound-dialog.md) | Behavior for a dialog already in the page |
| [Overflow Menu](overflow-menu.md) | A button that opens a menu of actions |
| [Tooltip](tooltip.md) | A hover and focus bubble for any element |
| [Help Hint](help-hint.md) | A help icon with a bubble |

### Editors

| Component | What it is |
| :--- | :--- |
| [Repeater](repeater.md) | Rows or cards of mixed fields with Add, Remove, and reorder, the base of the Key Value Editor and Rule Builder |
| [Rule Builder](rule-builder.md) | Field, operator, and value rules that match all or any |
| [String List](string-list.md) | An editor for a list of strings |
| [Time Range Field](time-range-field.md) | A start and an end time with clock icons |
| [Duration Field](duration-field.md) | Hours, minutes, and seconds boxes for a length of time |
| [Date Range Picker](date-range-picker.md) | Preset pills over a from and a to date |
| [Inherit Field](inherit-field.md) | A field that inherits a parent value until it is overridden |
| [Key Value Editor](key-value-editor.md) | Rows of key and value inputs |
| [Tag Input](tag-input.md) | A free form tag field |
| [File Picker](file-picker.md) | A drop zone that is also a button |
| [Folder Picker](folder-picker.md) | A server path field with a browse dialog |
| [Image Picker](image-picker.md) | An image chooser with a preview frame |
| [Number Unit Field](number-unit-field.md) | A number beside a unit select |
| [Slider Field](slider-field.md) | A range input with a readout |
| [Color Picker](color-picker.md) | A color field, RGB by default, with an opacity box for RGBA or ARGB |
| [Schedule Picker](schedule-picker.md) | A time of day and days of the week |
| [Access Schedule](access-schedule.md) | Weekly time windows in Jellyfin's AccessSchedule shape |
| [Mapping Table](mapping-table.md) | Pairs each source with a target from a select |
| [Search Field](search-field.md) | A search input with a clear button |
| [Copy Field](copy-field.md) | A read only value with a copy button |
| [Field Message](field-message.md) | A message under a field with ARIA wiring |

### Data Display

| Component | What it is |
| :--- | :--- |
| [Bar Chart](bar-chart.md) | Grouped bars of a few amounts |
| [Line Chart](line-chart.md) | A value over time |
| [Sparkline](sparkline.md) | A small line beside a number |
| [Usage Meter](usage-meter.md) | Used out of a total, with warning colors and parts |
| [Relative Time](relative-time.md) | A live "3 minutes ago" or a countdown |
| [Avatar Stack](avatar-stack.md) | Overlapping avatars with a +N count |
| [QR Code](qr-code.md) | A link as a QR code, with Copy Image and Download |
| [Audio Player](audio-player.md) | Play, seek, and time, one player at a time |
| [Preview Frame](preview-frame.md) | An image rendered on demand, with backgrounds and zoom |
| [Definition List](definition-list.md) | Read only label and value pairs, in rows or columns |
| [Log Viewer](log-viewer.md) | Scrolling mono output with a toolbar |
| [Stat Card](stat-card.md) | A count or text status card with details and a trend |
| [Avatar and User Chip](avatar.md) | A round picture or the person icon, and a pill |
| [Timeline](timeline.md) | A vertical list of events |
| [Flow Diagram](flow-diagram.md) | A hub with lanes of pills joined by arrows |
| [Divider](divider.md) | A rule with an optional label |

### Loading

| Component | What it is |
| :--- | :--- |
| [Spinner](spinner.md) | An inline loading spinner |
| [Skeleton](skeleton.md) | A placeholder for loading content |
| [Progress Ring](progress-ring.md) | Circular progress with the percent inside |
| [Progress Bar](progress-bar.md) | A thin accent bar |
