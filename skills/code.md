# Code

How to write, comment, and keep compatible the code in Base. It covers C#, TypeScript, CSS, HTML templates, and shell. [style.md](style.md#naming) is the authority for naming, and this guide is the authority for the comment formats.

## What Belongs Here

Base holds what two plugins could share unchanged.

* A helper has no plugin specific type in its signature, no plugin name in a string, and no assumption about one plugin's configuration.
* Read [README.md](../README.md) and the [component pages](documentation.md#the-component-pages) before you add anything. When a component almost fits, extend it.
* One component per file, named after its docs page. A web component is `src/js/<name>.ts` and `src/css/<name>.css`, and its page is `docs/components/web/<name>.md`. A C# helper is one file in `src/`, and a template is one file in `src/templates/`. Code shared by components but not public goes in `src/js/lib/`.
* The sources are strict TypeScript. There is no `.js` source, and `tsconfig.json` includes only `src/js/**/*.ts`, so a `.js` file there is never type checked or bundled.
* Every value a component takes from the CSS scales comes from `src/css/design-tokens.css`: sizes, fonts, pads, icons, lines, fields, gaps, chevrons, radii, shadows, layers, and colors.
* Never add a file to a folder with a numeric prefix. Ordering never matters.
* Never add a runtime dependency. The package has no runtime assembly, so everything compiles into the plugin and can use only what a Jellyfin plugin already references. The translations task in `tasks/` runs only inside MSBuild while a plugin builds, and never reaches the plugin.

## The Component Model

Base is a set of base components and cores, with thin variations on top. A variation adds only its own options and look, and takes everything else from what it is built on. So a fix in the base reaches every variation, and two variations can never drift apart. See [style.md](style.md#composition) for the rules.

### The Trees

| Base or core | Built on it |
| :--- | :--- |
| List, `list.ts` | Filtered List, Record List, Tree View, and every other component that shows a list of items |
| Filtered List, `filtered-list.ts` | Data Table, Paginated Table, and Checkbox List, which User Multi Selector is built on |
| Data Table, `data-table.ts` | Compare Table and Matrix Grid, which inherit its hidden columns (`setColumnHidden`) and centered columns |
| Row editor core, `lib/row-editor.ts` | Repeater, which Key Value Editor and Rule Builder are built on, and String List, Ordered List, Sortable Card List, and Access Schedule |
| Field control core, `lib/field-control.ts` | The fields of the Repeater, the Rule Builder's value, the Matrix Grid's cells, the Mapping Table, and the Data Table's row editor |
| Data view core, `lib/data-view.ts` | The search, filters, sort, and paging of the Filtered List and every table on it |
| Checkbox core, `lib/check.ts` | Checkbox, whose `createCheckbox` is the public face and gives the field control core its toggle field, the Filtered List's row checks and select all, which the Checkbox List and tables inherit, the Filter Panel, the Tree View, the Inherit Field, and the Log Viewer |
| Selection core, `lib/selection.ts` | The picked ids of the Filtered List, the Checkbox List, and the Tree View |
| Popover core, `lib/popover.ts`, and `.base-float` | Overflow Menu, Filter Panel, Help Hint, Tooltip, the typeahead dropdown, and the chart tooltip |
| Typeahead core, `lib/typeahead.ts` | Combo Box, Chip Select, and Media Picker |
| Pressed group core, `lib/pressed-group.ts` | Pill Group, the Schedule Picker's days, the Inherit Field, the Date Range Picker's presets, the Filtered List's pills, the World Map's layers, and the Folder Picker and Preview Frame toggles |
| Dialog core, `lib/dialog.ts` | `createModalShell`, which `openDialog` and the Detail Drawer are built on, and `bindModalBehavior`, which Bound Dialog is built on. Confirm Dialog, with its typed confirm, Prompt Dialog, Editor Dialog, Filter Panel, Folder Picker, Preview Frame, and the QR Code, whose inline layout opens the code in a dialog, are built on `openDialog` |
| Message core, `lib/message.ts` | Field Message, Status Text, Banner, and Toast. Save Bar is built on the status line |
| Card core, `lib/card.ts` | Count Cards, Stat Card, and the Filtered List's filter cards |
| Chart core, `lib/chart.ts` | Bar Chart, Line Chart, Pie Chart, and Sparkline. A radial chart, such as the pie, sets `radial` for a square plot with no axes. QR Code draws with its `svgEl` |
| Clock core, `lib/clock.ts` | Relative Time, the only component that uses it. All of its live times share one timer |
| Thumb core, `lib/thumb.ts` | Avatar, Media Card, Media Picker, Chip Select, Checkbox List rows, Paginated Table, Tree View, Image Picker, and Preview Frame. A source may be an address or a function that returns an address, a Blob, or a promise of one |
| Validation core, `lib/validate.ts` | Every input. See [Validation](#validation) |
| Color core, `lib/color.ts` | Every component that takes a status name or a hex code |
| Badge core, `lib/badge.ts` | `makeBadge` and `badgeColor`, used by the shared bag, Checkbox List, Collapsible Section, Definition List, Detail Drawer, Matrix Grid, Media Card, and Sortable Card List |
| Chips core, `lib/chips.ts` | Chip Select, Tag Input, and Media Picker |
| Balance core, `lib/balance.ts` | Balanced Rows, List, Filtered List, Choice Group, and Count Cards |
| Canvas core, `lib/canvas.ts` | Image Picker and QR Code |
| File core, `lib/file.ts` | File Picker, QR Code, and the file intake core |
| File intake core, `lib/file-intake.ts` | File Picker and Image Picker |
| QR core, `lib/qr.ts` | QR Code |
| Users core, `lib/users.ts` | User Selector and User Multi Selector |
| Combo ARIA core, `lib/combo-aria.ts` | The typeahead core |
| Class names core, `lib/class-names.ts` | `classNames`, used by the shared bag, Paginated Table, and the badge core |
| World shapes, `lib/world-shapes.ts` | World Map |
| Base text core, `lib/base-text.ts` | Every component's default text, read from the page's current translations when it is built. See [style.md](style.md#default-labels) |
| Casing core, `lib/text-case.ts` | `titleCase`, `sentenceCase`, and the translations handle's `title` and `sentence`, by the rules of `TextCase` in C#, and the standalone page script's casing |
| Push core, `lib/push.ts` | Web Push, which adds the sentences, and the standalone page script, which `lib/page-script.ts` builds into `BasePageScript` with the state codes alone |
| DOM helpers, `lib/dom.ts` | Nearly every component and core. See [Shared Helpers](#shared-helpers) |

Three cores are public API. `src/js/index.ts` exports the color core, the validation core, and the world shapes, so a rename in them is a [stop and ask](../starthere.md#stop-and-ask) item like any other export.

### Add a Component

1. Find the closest base component or core in the trees above. When one almost fits, add an option or a modifier to it instead of a new component.
2. Write the variation in `src/js/<name>.ts`. Build it by calling the base, such as `createFilteredList` or `createRepeater`, and pass its options through. Never copy the base's markup, state, or handlers.
3. When a behavior is missing from the base, add it to the base as an option with a default that keeps the old behavior, so every variation can use it.
4. Put only the variation's own look in `src/css/<name>.css`. It reuses the base's classes and adds a modifier or a part.
5. Export it from `src/js/index.ts`, with `export type *` for its types, and add its page, preview, gallery section, and tests in the same change.

### Core CSS

A core in `src/js/lib/` has no CSS file of its own. Its shared look lives in the CSS file of the component that owns the concept, such as the card in `count-cards.css`, the chart frame in `bar-chart.css`, and the field group in `repeater.css`. A look that no one component owns, such as `.base-float`, `.base-icon-text`, and `.base-thumb`, lives in `utility-classes.css`. A variation never repeats a core's rule in its own file.

### Validation

Every input validates through the validation core, `lib/validate.ts`. Its rules come from the field's own attributes, `required`, `min`, `max`, `step`, `minlength`, `maxlength`, `pattern`, and its type, plus an optional `validate` function, and its message shows through the Field Message.

* `bindFieldAdornments` binds the core on every ruled field under a root, and on the ones added later. `createConfigPage` calls it on the page, so a plain config page field validates with no code.
* A component that builds its own inputs binds each with `bindValidation`, or builds them with the field control core, which does it.
* A form checks every field with `validateAll` before it saves, as the Save Bar and the Prompt Dialog do.
* A component never writes its own range check, required check, or error markup.

### Shared Helpers

A helper exists once, and two helpers never share a name with different output. Internal helpers live in `src/js/lib/`, and the public ones a plugin also calls live in `browser-helpers.ts`.

* Clock time, such as `1:30:00`, is `clockText` in `lib/dom.ts`. The Audio Player, the Relative Time countdown, and the bag's `formatDuration` all call it.
* Duration in units, such as `1h 30m`, is the Duration Field's `durationText`.
* Text matching is `matchesText`, ids are `idOf`, sizes are `formatBytes`, and focus after a remove is `focusAfterRemove`, all in `lib/dom.ts`. Debounce is `debounce` and plurals are `plural`, in `browser-helpers.ts`.

## Compatibility

Every plugin compiles Base in, so each change is seen by every one of them. A plugin moves to a new Base version when its author chooses, and an older plugin keeps working against the version it references.

* **Add, do not change.** A new optional parameter, option, or overload is safe. Giving it a default that keeps the old behavior is what makes it safe.
* **Never remove or rename** a public type, member, JS export, `createShared` bag member, class, token, or template placeholder without asking first. See [stop and ask](../starthere.md#stop-and-ask).
* **A behavior change is an API change.** A changed return value, a new exception, a different default, or a different default label reaches every plugin.
* **A name that exists in Base must never exist in a plugin.** Base compiles into the plugin's assembly, so a plugin copy with the same name is ambiguous. A new public name should be unlikely to match a plugin's own type. When a plain name could match one, start it with `Base`, as `BaseHttp` and `BaseTranslations` do. The same goes for an MSBuild property, item, or target in `build/`, such as `BaseLocalizationDirectory`. Base uses no `Jpk` prefix.
* **Keep the signatures of C# members binary and source compatible** where you can, since a plugin compiles against the source and a recompile is the only fix.
* **A class is a contract.** Do not rename a `base-` class, change what a modifier means, or change a token's value for a different look. A plugin page depends on them.
* **Older engines count.** CSS must still pass [the fallback tests](testing.md#css-tests), and JS stays in the style the existing files use.
* **A removal needs a path.** When a rename is approved, name the replacement in the commit, keep the old name for one release when that is possible, and tell the plugin authors the steps.
* **Check the consumers.** Before you call a change done, build a consuming plugin against a local pack. See [release.md](release.md#before-the-release).

## Comments

Each format below is the rule.

### The Rules

* Every public type, member, exported function, component selector, and template object gets a header comment.
* The summary is short, two sentences at most.
* Write no inline comments, with one exception. A branch whose reason is not obvious gets one short line above it, and it says why, not what.
* Never comment what the code already says.
* Never leave commented out code, TODO, FIXME, or HACK. Open an issue instead.
* Never describe history. "Used to", "now", and "was changed to" belong in commit messages.
* Use no em dashes, en dashes as punctuation, or semicolons in a new comment.

### C#

A standard XML doc on every public type and member.

```csharp
/// <summary>
/// Renders the themed status page from the status template.
/// </summary>
/// <param name="heading">The card heading.</param>
/// <returns>A complete HTML document.</returns>
public static string Render(string heading) { ... }
```

* Give every public member a `<summary>`, every `<param>`, and a `<returns>` when it returns a value.
* Write `true` and `false` as `<c>true</c>` and `<c>false</c>`.
* A constructor summary is "Initializes a new instance of the <see cref="Name"/> class."
* Skip tautologies. `<param name="item">The item.</param>` says nothing, so say what the item is for.
* Put one public type in each file, named after the type. A small record or enum used by one class may share its file.
* Use the `JPKribs.Jellyfin.Base` namespace for every public type, with a file scoped namespace.

### TypeScript

A TSDoc block above each export: a summary, then one `@param` per parameter and a `@returns` when the return is not obvious. The block ships in the typings, so a plugin's editor shows it.

```ts
/**
 * Builds the per view helper bag used by a config page. Bind it once on viewshow.
 *
 * @param view page element the helpers operate on
 * @param pluginId plugin GUID string
 * @param apiPrefix controller name for apiRequest [optional]
 */
export function createShared(view: HTMLElement, pluginId: string, apiPrefix?: string) { ... }
```

* Document every export, including each `Options` and `Handle` interface. Never document the methods inside a returned helper.
* A `@param` says what the value is for. The signature already gives its type.
* A one line summary with no tags fits on one line, as `/** Summary. */`.

### CSS

Two lines above each component selector. The first says what it looks like, and the second is one example.

```css
/* Rounded translucent card holding a count and a label */
/* Example: <div class="base-card blue"><span class="base-card-count">5</span></div> */
.base-card { ... }
```

### HTML Templates

A single line comment naming each object where it starts.

```html
<!-- card -->
<div class="base-card">
```

### Shell and YAML

* A shell script opens with a comment saying what it does and how to run it. Every script in `scripts/` does.
* A workflow opens with a comment saying what it is for.

## C# Conventions

The code is compiled into each plugin, and every plugin sets `Nullable`, `TreatWarningsAsErrors`, `AnalysisMode` of `AllEnabledByDefault`, and a `jellyfin.ruleset`. So a warning in Base is an error in a plugin. Base's own build sets the same in `Directory.Build.props`, with a copy of the plugins' `jellyfin.ruleset` beside it, so `dotnet build` and `dotnet test` catch the warning first. Neither file is packed. Keep the ruleset the same as the plugins'.

* Write code that builds with no warning under those settings. A warning that only a plugin sees still breaks that plugin.
* Target what the plugins target. The package and the tests use `net10.0`.
* Suppress a rule only at the narrowest scope, with a reason. `DatabaseSchema` and `PluginBase` show the form.
* Use `sealed` for a class that is not a base, and `static` for a class of helpers.
* Prefer `readonly record struct` and `sealed record` for small data.
* Name private fields `_camelCase`.
* End the name of an async method in `Async`, take a `CancellationToken`, and use `ConfigureAwait(false)` on every await. Name a fire and forget method without `Async`, since the analyzers flag it as blocking otherwise. `ActivityLogger.Log` and `LogAndWaitAsync` show the pair.
* Guard public arguments with `ArgumentNullException.ThrowIfNull` or `ArgumentException.ThrowIfNullOrEmpty`.
* Catch a specific exception, or filter with `when`. Let `OperationCanceledException` pass when the token was cancelled.
* Never throw from a helper whose contract is not to throw, such as `BaseHttp.SendAsync` on a network fault and `ActivityLogger.Log`.
* Log through `ILogger` with static message templates. Pass untrusted text through `FormatUtilities.SanitizeForLog`.

## TypeScript Conventions

* Every component is a TypeScript module. `src/js/index.ts` names each public export, so a component file can export helpers to other files without making them public. esbuild strips the types and bundles it to one ESM file for Chromium 87. Import a sibling by its `.js` name, such as `./lib/dom.js`.
* `tsc` type checks in strict mode in `scripts/bundle.sh`, before esbuild runs, and `npm run typecheck` runs it alone. A type error fails the build.
* Use only syntax that erases to plain JS: annotations, `as`, `!`, `interface`, `type`, and `import type`. No `enum`, `namespace`, or parameter properties.
* Give each component an exported `Options` interface for what it takes and a `Handle` interface for what it returns. Shared shapes live in `src/js/types.ts`, and the Jellyfin globals in `src/js/globals.d.ts`.
* Labels, items, and flags in an `Options` interface are plain data. A callback is for behavior only.
* Prefer a real type to `any`. Use `!` only where the code already relies on the value being present.
* Follow the style of the file you edit. Every module uses `var` and `function` expressions, with no arrow functions. Keep that so older engines load the bundle.
* A component that shows a list of items builds its container with `createList`, and passes `height`, `maxHeight`, and `minHeight` through. See [style.md](style.md#lists-and-tables).
* Never wrap a function expression in parentheses or an `as` cast. esbuild keeps the parentheses, so the bundle changes. Cast the receiver instead.
* A module exports named functions only. A plugin imports from the bundle by a relative path, `./configurationpage?name=<plugin>_jpkribs_shared.js`.
* Escape every value placed in HTML with `escapeHtml`. Class names that come from data go through `classNames`.
* A field a component builds validates through the [validation core](#validation), and a color it takes goes through the color core.
* Return a handle with a `destroy()` for anything that holds a listener, an observer, or a timer, so `viewhide` can stop it.
* Never touch a global a config page does not provide. `LibraryMenu`, `ApiClient`, and `Dashboard` are read only when present.

## CSS Conventions

See [style.md](style.md). In short, tokens for every size, space, rounding, shadow, layer, and color, modifiers for state, one file per component, a core's shared look in the file that owns it, a plain fallback before `color-mix()`, no `:has()` for a rule an older engine needs, and the two line comment above every component.

## Security

Several helpers guard security for every plugin. A change to one is a [stop and ask](../starthere.md#stop-and-ask) item.

* `SecretProtector` and `StableSecretProtection` keep credentials out of configuration files. Never write a secret in plain text, never return one to the browser except as `SecretProtector.KeptSentinel`, and keep the `enc:v1:` prefix and the key ring location stable, or existing secrets become unreadable.
* The browser half is `bindSecretField`, `readSecretField`, and `clearSecretField`. They post `SECRET_KEPT` for a field left untouched.
* `PathContainment.IsUnderAny` compares whole folder names, so `/media/a` is not under `/media/ab`. Keep it that way.
* `FileNameSanitizer` replaces the same set of characters on every OS.
* `PublicPage.ApplyHardeningHeaders` sets `no-referrer`, `no-store`, and `noindex`. A standalone page calls it.
* `StringUtilities.EscapeJsString` and `escapeHtml` neutralize breakout from a script block and from markup.
* `BaseHttp` returns a status and body, never throws on a network fault, and reads no more than `maxResponseBytes`. `BaseHttp` checks every URL by default with `SsrfGuard.PrivateNetworkAllowed` and then sends through Jellyfin's client, so proxies still work. A plugin that calls an address it did not choose passes `SsrfGuard.PublicOnly` for the strict mode, and `SsrfGuard.Disabled` is the opt out. `SsrfGuard` refuses unsafe schemes, user info, and loopback, private, link local (including the cloud metadata address), multicast, unspecified, and broadcast addresses. It classifies every address a name resolves to, checks again when the socket connects so a DNS rebind cannot slip past, and refuses a redirect to another host. Keep every range it refuses, and add a test with each change.
* `FormatUtilities.SanitizeForLog` strips control characters so caller text cannot forge a log line. Use it on any value from a request or a file.
* A client that sends a key or password to an address the user typed builds its handler as `new RedirectRefusingHandler(new SsrfGuard(allowPrivate, requireHttpsForPublic: true).CreateHandler(), advice)`. Plain http then reaches only loopback and private addresses, and a redirect fails with the address to use instead of carrying the key to another host.
* A download copies through `StreamUtilities.CopyWithIdleTimeoutAsync`, with `CopyThrottledAsync` inside it when a speed limit applies, so a server that stops sending fails the copy instead of hanging it. Wrap the body in `CappedReadStream` and the file in `ProgressReportingStream` when the size is known.
* A stored time is written with `UtcTime.Format` and read with `UtcTime.TryParse`, so every stored time is UTC text that sorts in time order.
* `DatabaseSchema` runs SQL with fixed text and an integer. Never put a caller's value into SQL text.
* Never put a secret or a user's data in a URL.
* `StatusPage` encodes its values, and its `content` argument is raw. Document that wherever you pass markup to it.

## Tests

Every change has a test. See [testing.md](testing.md) for each layer and how to write one.

## Checklist

* [ ] The component is shareable, with no plugin specific type or name.
* [ ] A new component is a thin variation on a base component or core, and copies none of its code or CSS.
* [ ] Every input validates through the validation core, and every helper it needs is the one in `lib/`.
* [ ] Nothing public was removed or renamed, or the change was approved.
* [ ] Defaults keep the old behavior, and a changed behavior was approved.
* [ ] Every public type, member, export, selector, and template object has its header in the [format above](#comments).
* [ ] Inline comments appear only above branches, and say why.
* [ ] No commented out code, TODO, or debug output.
* [ ] The code builds with no warning under a plugin's strict analyzers, and `tsc` passes in strict mode.
* [ ] The [security](#security) rules hold.
* [ ] Every changed file has tests that pass, per [testing.md](testing.md).
