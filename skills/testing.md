# Testing

How to test Base, from a single helper to a component in a browser. A change is done when the tests for every layer it touches pass.

## The Rule

Every change has a test, and every test proves that given inputs produce the expected output. A bug fix starts with a test that fails without the fix. Base serves every plugin, so a test is also the record of what a plugin may rely on.

## Layers

Test each behavior at the lowest layer that can prove it. Go up a layer only for what the lower one cannot reach.

| Layer | Proves | Runs | Time |
| :--- | :--- | :--- | :--- |
| C# unit | One helper gives the right output for each input | `dotnet test` | Seconds |
| CSS rules | The shipped CSS keeps its invariants, such as older engine fallbacks and no class collisions | `dotnet test` | Seconds |
| Type check | The TypeScript sources type check in strict mode | `npm run typecheck`, and first in `scripts/bundle.sh` | Seconds |
| JavaScript | Component behavior against a stub DOM | `npm test` | Seconds |
| Golden bundle | The shipped JS bundle is the one expected | `scripts/check-bundle.mjs` | Seconds |
| Typings | The shipped typings accept good calls and reject bad ones | `scripts/check-types.sh` | Seconds |
| Docs | Every page's Reference matches the code, and every component has a page and preview | `scripts/build-docs.mjs --check` | Seconds |
| Docs site | The previews build, and the site builds with no broken link or warning | `scripts/build-previews.mjs`, then `mkdocs build --strict`, both run by `docs.yaml` | Seconds |
| Gallery | Every component looks right in a real browser at desktop, tablet, and phone width | `scripts/gallery.sh` | Minutes |
| Consumer build | A plugin still builds and works against a local pack | `scripts/pack.sh` | Minutes |

| A change to | Needs |
| :--- | :--- |
| A C# helper in `src/*.cs` | C# unit |
| A CSS file in `src/css/` | CSS rules, the docs check, since the Reference lists its classes, and the gallery |
| A module in `src/js/` or `src/js/lib/` | The type check, JavaScript, the golden bundle, the typings, the docs, and the gallery. A change to a core also needs the tests of every component built on it |
| A template in `src/templates/` | C# unit, and CSS rules for class collisions |
| A page in `docs/`, a preview in `docs/previews/`, or `mkdocs.yml` | The docs check and the docs site |
| `build/`, `scripts/`, or the csproj | Consumer build |
| A public API change of any kind | Consumer build |

There is no Docker pool, no integration suite, and no matrix. Base has no running server, so a plugin's own tests cover the behavior inside a server.

## The CI Order

`.github/workflows/build.yaml` and `release.yaml` run the same checks in the same order. A change runs them the same way before a push.

1. `scripts/bundle.sh`, which installs the pinned tools and type checks first.
2. `scripts/check-bundle.mjs`, `scripts/check-types.sh`, and `scripts/build-docs.mjs --check`.
3. The JavaScript tests.
4. The C# tests.

`docs.yaml` runs its own order. It bundles, runs `scripts/build-docs.mjs --check`, builds the previews, and runs `mkdocs build --strict`.

## Layout

| Path | What it holds |
| :--- | :--- |
| `JPKribs.Jellyfin.Base.Tests/*.cs` | The xUnit tests. |
| `JPKribs.Jellyfin.Base.Tests/js/*.test.mjs` | The JS tests, mostly one file per component or core, plus the cross-cutting files, with `fake-dom.mjs` as the stub DOM. |
| `JPKribs.Jellyfin.Base.Tests/js/register.mjs`, `ts-loader.mjs` | The loader that lets a test import the TypeScript sources. |
| `JPKribs.Jellyfin.Base.Tests/golden/` | The golden copy of the JS bundle and its summary. |
| `JPKribs.Jellyfin.Base.Tests/types/` | The typings test and its `tsconfig.json`. |
| `JPKribs.Jellyfin.Base.Tests/gallery/index.html` | The gallery page. |
| `JPKribs.Jellyfin.Base.Tests/gallery/ui-audit.js` | The layout audit that runs in the gallery page. See [The Layout Audit](#the-layout-audit). |
| `JPKribs.Jellyfin.Base.Tests/Fixtures/` | Copies of `jpkribs_shared.css` and `jpkribs_shared.js` that a test embeds under another root namespace, the translations the C# tests embed, and `casing-cases.json`, the casing cases both the C# and the JS tests run. |

The test project compiles `src/*.cs` directly, under the same strict analyzer settings as a plugin (`Directory.Build.props`), with `0 Warning(s)` as the bar. Its own `.editorconfig` relaxes a few rules for the test files only, never for `src/*.cs`. It embeds `src/templates/*.html`, and embeds `src/css/*.css` under a `.Css.` resource name. It compiles the shipped source exactly as a plugin does, so a test sees what a plugin sees.

## C# Tests

Tests use xUnit with plain `Assert`. NSubstitute is available for a Jellyfin interface such as `IActivityManager`. Prefer a small hand written fake or stub for anything else.

```bash
dotnet test JPKribs.Jellyfin.Base.Tests/JPKribs.Jellyfin.Base.Tests.csproj -c Release
```

```bash
dotnet test JPKribs.Jellyfin.Base.Tests/JPKribs.Jellyfin.Base.Tests.csproj -c Release --filter "FullyQualifiedName~CssFallbackTests"
```

### Naming and Comments

* Put a new helper's tests in `<Subject>Tests.cs`. A file that groups related helpers keeps the tests that already live there.
* A rule that C# and a page share, such as casing, keeps its cases in one fixture both suites read, so the two can never give different results. Add a case to `Fixtures/casing-cases.json`, never to one suite alone.
* Name each method `Method_Scenario_Expectation`, such as `EscapeJsString_NeutralisesQuotesAndScriptBreakout`.
* Give the class a one sentence summary of what its subject must guarantee.
* A class that touches shared static state, such as `ActivityLogger.Current`, joins the `ActivityLogger.Current` collection so the tests do not run in parallel.

### Writing a Test

* Arrange, act, and assert, separated by blank lines.
* Assert one behavior per test. Several asserts are fine when they check one outcome.
* Use `[Theory]` with `[InlineData]` for one rule over several inputs.
* Test the edges. Null, empty, the largest value, a cancelled token, a timeout, and a faulting dependency.
* Do not sleep to wait. Pass in a delay or a clock when you can, such as the `FakeTimeProvider` in the tests, and keep any unavoidable wait short.
* A test never reaches the network. Use a stub `HttpMessageHandler`, as `BaseHttpTests` does. The one exception is a socket on the loopback address that the test opens itself, as `SsrfGuardTests` does.
* A test that writes files uses a unique folder under `Path.GetTempPath()` and deletes it in `Dispose`.
* `DatabaseSchema` tests run against a real SQLite file through `Microsoft.Data.Sqlite`.
* A test for a security helper covers the hostile input, such as a quote that closes a string, a folder that shares a prefix, or a control character in a log value.

## CSS Tests

The CSS has no browser test, so rules that a plugin depends on are pinned in C#.

| File | Pins |
| :--- | :--- |
| `CssFallbackTests.cs` | Every `color-mix()` has a plain fallback, a mix of a variable sits in an `@supports` block, and the form rules avoid `:is()`. |
| `CssCollisionTests.cs` | No class is defined by both `status.html` and the kit CSS, other than `hidden`. |
| `SelectChevronTests.cs` | A dropdown shows exactly one chevron. |
| `CssRules.cs` | The small CSS reader the tests share. Extend it when a new test needs more of the syntax. |

* A new CSS invariant gets a test in the same style, in a `Css*Tests.cs` file.
* A bug that shipped in the CSS gets a test that pins the invariant, with a summary that says what broke.

## JavaScript Tests

JS tests run on node's own test runner with a stub DOM and no dependencies. `register.mjs` loads `ts-loader.mjs`, which maps a `.js` import to its `.ts` source and strips the types with node's own `stripTypeScriptTypes`, so a test imports `src/js/<name>.js` and gets the TypeScript source. Every source is TypeScript.

```bash
node --import ./JPKribs.Jellyfin.Base.Tests/js/register.mjs --test JPKribs.Jellyfin.Base.Tests/js/*.test.mjs
```

`npm test` runs the same, and `npm run typecheck` runs the type check alone.

```bash
node --import ./JPKribs.Jellyfin.Base.Tests/js/register.mjs --test JPKribs.Jellyfin.Base.Tests/js/kit.test.mjs
```

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fake-dom.mjs';

var dom = installFakeDom();
var { generateGuid } = await import('../../src/js/browser-helpers.js');

test('generateGuid gives 32 hex digits when compact', function () {
    assert.match(generateGuid({ compact: true }), /^[0-9a-f]{32}$/);
});
```

* Put a component's tests in `<name>.test.mjs`, named after its source file. A core's tests go where the core already has them. See [Where Core Tests Live](#where-core-tests-live).
* Name each test as a sentence about the behavior.
* Call `installFakeDom()` in `beforeEach` so each test starts clean.
* Test logic and behavior, not layout. Move logic out of event handlers into exported functions so a test can call them.
* A variation's tests cover only what it adds. The base's or core's own tests cover the shared behavior, and a fix to it gets its test there.
* A field a component builds has a test that an invalid value shows its message through the validation core and that `validateAll` refuses it.
* Extend `fake-dom.mjs` when a component needs a selector or element feature it lacks, and keep it dependency free.
* CI runs these tests on Node 22, so run them yourself before you call a change done.

### Where Core Tests Live

| Core | Tests |
| :--- | :--- |
| Data view, popover, row editor, selection, thumb, typeahead, validation | Their own file, such as `validate.test.mjs` and `selection.test.mjs` |
| Badge core | `badge.test.mjs`, with the Badge |
| Checkbox core, card, message, pressed group | `shared-bases.test.mjs`, which tests the shared bases a family inherits, along with the List's keyed redraw |
| The Filtered List features every list variation inherits | `filtered-list-parity.test.mjs` |
| Chart, clock, QR, balance | The file of the component that owns them, `bar-chart.test.mjs`, `relative-time.test.mjs`, `qr-code.test.mjs`, and `balanced-rows.test.mjs` |
| Dialog core | `kit.test.mjs` for focus and the Tab trap, `dialog-escape.test.mjs` for names and Escape, and `dialog-size.test.mjs` for the sizes |
| Popover placement | `popup.test.mjs`, beside `popover.test.mjs` |
| Combo ARIA | `missing.test.mjs` |

A core with no tests of its own yet, such as the field control, file, or users core, is covered through the components built on it. A new test for one goes in a file named after the core.

### Cross-Cutting Tests

These files test one concern across many components. Add to the one that matches a change, as well as to the component's own file.

| File | Covers | Add to it when |
| :--- | :--- | :--- |
| `a11y.test.mjs` | Avatar names, status contrast and cues, and the persistent live regions | A change touches a label for assistive tech, a status color, or a live region |
| `edge.test.mjs` | Ids, replacement text, odd input, and limits across the components | A component takes odd input or has a limit |
| `race.test.mjs` | A slow search answer never overwrites a newer one or reopens a closed dropdown | A component waits on an async answer |
| `labels.test.mjs` | The default labels a caller can replace | A component adds or changes a default label |
| `missing.test.mjs` | Helpers that had no tests | A helper with no home file gets its first test |
| `kit.test.mjs` | Dialog focus, the Tab trap, and Escape across Dialog, Bound Dialog, and Editor Dialog, and the bundle entry | A change touches focus or Escape in a dialog |
| `core.test.mjs` | The config page, the shared bag, and the browser helpers | A change touches one of those |
| `display.test.mjs` | Breadcrumbs, Stepper, Banner, Divider, Avatar, User Chip, Stat Card, Progress Ring, Timeline, and Status Dot | A change touches one of those display components |
| `fields.test.mjs` | Number Unit Field, Slider Field, and Schedule Picker | A change touches one of those fields |
| `icons.test.mjs` | Each arrow comes from the one icon its meaning takes, per the Icons table in [style.md](style.md#icons) | A component draws a new icon |
| `spacing.test.mjs` | Every gap and margin in the kit CSS is one of the two spacing tokens, per [Spacing and Shape](style.md#spacing-and-shape) | It fails, which means a CSS change broke the rule |

## The Golden Bundle

`JPKribs.Jellyfin.Base.Tests/golden/` holds the JS bundle plugins receive, with its exports and each component's bytes. It is built with the original names, since the minifier picks short names from the source's character counts. CI fails when the build differs from it.

```bash
node scripts/check-bundle.mjs
```

* It builds on its own, and also checks the exports of `dist/` when `scripts/bundle.sh` has run. On a difference it prints the changed exports, components, and a formatted diff.
* A change meant to alter the bundle updates the copy in the same commit, with `node scripts/check-bundle.mjs --update`.
* A change meant to keep behavior, such as adding types, must leave the bundle byte for byte the same.

## The Typings

`scripts/build-types.mjs` writes `dist/jpkribs_shared.d.ts` from the sources, with only the values the bundle exports. `JPKribs.Jellyfin.Base.Tests/types/typings.test.ts` imports it by a `configurationpage` path, as a plugin page does, and calls every export.

```bash
scripts/check-types.sh
```

* Call each new export once in `typings.test.ts` the way a plugin would.
* Add a line marked `@ts-expect-error` for each call a plugin must not be able to make, such as a missing required option.

## The Gallery

The gallery is a static page that loads the real bundle with the Jellyfin globals stubbed, so every component runs without a plugin. It shows every component. One module script in `gallery/index.html` builds every section. It loads `docs/previews/_stubs.js` for the stubs and the sample data, and calls `base.bindFieldAdornments` on the page at the end.

The newest components embed their docs preview from `docs/assets/previews/` in a frame instead. The `pages` array in `index.html` lists them, and each frame sizes itself from the `base-preview-height` message its preview posts. Build the previews too, or those sections stay empty.

```bash
scripts/gallery.sh
```

```bash
scripts/gallery.sh 9000
```

```bash
node scripts/build-previews.mjs
```

The script rebuilds the bundle, serves the repository root with Python on port 8080 by default, and opens `http://localhost:8080/JPKribs.Jellyfin.Base.Tests/gallery/index.html`. Stop it with Ctrl-C. It does not build the previews, so run `node scripts/build-previews.mjs` after it has bundled.

* Add a section to `gallery/index.html` for each new component, showing its states and modifiers, or add it to the `pages` array of components whose preview the gallery frames.
* Look at every changed component, and every component built on a changed core, at desktop width, about 1280px, at tablet width, 768px, and at phone width, 375px.
* At each width nothing spills out of its frame, overlaps, or sits out of line. Fields, buttons, and rows on one line share a height, headings line up with their values, and icons sit on the first line of their text.
* The gallery page itself has a fixed dark background. Light and dark exist only in the framed previews, which the gallery loads with `?theme=dark` and which each have the theme toggle from `docs/previews/_shell.html`. Check both themes there, or on the docs site, when the change touches color.
* Keep the gallery's own classes prefixed `g-` so they never touch the kit.

### The Layout Audit

`gallery/ui-audit.js` scans the gallery for layout problems. With the gallery served, paste it into the browser console on the gallery page, or fetch it and evaluate it there. It returns a list of `[section, problem, detail]` rows for these problems.

* The page scrolls sideways.
* A control sits outside its section.
* Two controls overlap.
* Controls on one line have different heights.
* Two controls touch, with a gap under 4px.
* Text is cut off without an ellipsis.

It scans each framed preview too. Run it at 1280px, 768px, and 375px wide. A `ResizeObserver` does not run in a background tab, so the framed previews keep a stale height there. Bring the tab forward, or take a screenshot, before you run it. A clean gallery returns an empty list.

## Consumer Build

Unit tests cannot show that a plugin still builds. Before a public change is done, build a plugin against a local pack.

```bash
scripts/pack.sh
```

It prints the version it packed, such as `12.4.1-dev.20261120153000`. Set the plugin's reference to that version, then restore it with the local source.

```bash
dotnet build -p:RestoreAdditionalProjectSources=<base>/nupkg
```

Raise the plugin's `JPKribs.Jellyfin.Base` reference to the local version first, and put it back afterward. The plugin's strict analyzers are the real check on Base's C#, so build one with `TreatWarningsAsErrors` on. Never commit a plugin against a local pack.

## Checklist

* [ ] Every changed file has tests, and a bug fix has a test that fails without it.
* [ ] Edges are covered, including null, empty, cancelled, and a faulting dependency.
* [ ] `dotnet test` passes.
* [ ] The type check, the JS tests, the golden bundle, the typings check, and the docs check pass.
* [ ] A new CSS rule keeps its fallback, and the CSS tests pass.
* [ ] Every changed component was seen in the gallery at desktop, tablet, and phone width, with nothing spilling out, overlapping, or misaligned, and the layout audit returned an empty list at each width.
* [ ] A docs change passes `mkdocs build --strict` after the previews are built.
* [ ] Every field a change adds validates through the core, with a test.
* [ ] A public change was built into a consuming plugin from a local pack.
