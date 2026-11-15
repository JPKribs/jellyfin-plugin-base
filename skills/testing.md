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
| JavaScript | Component behavior against a stub DOM | `node --test` | Seconds |
| Gallery | Every component looks right in a real browser | `scripts/gallery.sh` | Minutes |
| Consumer build | A plugin still builds and works against a local pack | `scripts/pack.sh` | Minutes |

| A change to | Needs |
| :--- | :--- |
| A C# helper in `src/*.cs` | C# unit |
| A CSS file in `src/css/` | CSS rules, and the gallery |
| A JS module in `src/js/` | JavaScript, and the gallery |
| A template in `src/templates/` | C# unit, and CSS rules for class collisions |
| `build/`, `tools/`, `scripts/`, or the csproj | Consumer build |
| A public API change of any kind | Consumer build |

There is no Docker pool, no integration suite, and no matrix. Base has no running server, so a plugin's own tests cover the behavior inside a server.

## Layout

| Path | What it holds |
| :--- | :--- |
| `JPKribs.Jellyfin.Base.Tests/*.cs` | The xUnit tests. |
| `JPKribs.Jellyfin.Base.Tests/js/*.test.mjs` | The JS tests, with `fake-dom.mjs` as the stub DOM. |
| `JPKribs.Jellyfin.Base.Tests/gallery/index.html` | The gallery page. |
| `JPKribs.Jellyfin.Base.Tests/Fixtures/` | Copies of `jpkribs_shared.css` and `jpkribs_shared.js` that a test embeds under another root namespace. |

The test project compiles `src/*.cs` directly, under the same strict analyzer settings as a plugin (`Directory.Build.props`), with `0 Warning(s)` as the bar. Its own `.editorconfig` relaxes a few rules for the test files only, never for `src/*.cs`. It embeds `src/templates/*.html`, and embeds `src/css/*.css` under a `.Css.` resource name. It compiles the shipped source exactly as a plugin does, so a test sees what a plugin sees. The old `tests/` folder holds only build output and is not part of the repository.

## C# Tests

Tests use xUnit with plain `Assert`. NSubstitute is available for a Jellyfin interface such as `IActivityManager`. Prefer a small hand written fake or stub for anything else.

```bash
dotnet test JPKribs.Jellyfin.Base.Tests/JPKribs.Jellyfin.Base.Tests.csproj -c Release
```

```bash
dotnet test JPKribs.Jellyfin.Base.Tests/JPKribs.Jellyfin.Base.Tests.csproj -c Release --filter "FullyQualifiedName~CssFallbackTests"
```

CI runs the JavaScript tests and then the C# tests in `.github/workflows/build.yaml` and in the release workflow.

### Naming and Comments

* Put a new helper's tests in `<Subject>Tests.cs`. A file that groups related helpers keeps the tests that already live there.
* Name each method `Method_Scenario_Expectation`, such as `EscapeJsString_NeutralisesQuotesAndScriptBreakout`.
* Give the class a one sentence summary of what its subject must guarantee.
* A class that touches shared static state, such as `ActivityLogger.Current`, joins the `ActivityLogger.Current` collection so the tests do not run in parallel.

### Writing a Test

* Arrange, act, and assert, separated by blank lines.
* Assert one behavior per test. Several asserts are fine when they check one outcome.
* Use `[Theory]` with `[InlineData]` for one rule over several inputs.
* Test the edges. Null, empty, the largest value, a cancelled token, a timeout, and a faulting dependency.
* Do not sleep to wait. Pass in a delay or a clock when you can, such as the `FakeTimeProvider` in the tests, and keep any unavoidable wait short.
* A test never reaches the network. Use a stub `HttpMessageHandler`, as `JpkHttpTests` does. The one exception is a socket on the loopback address that the test opens itself, as `SsrfGuardTests` does.
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

JS tests run on node's own test runner with a stub DOM and no dependencies.

```bash
node --test JPKribs.Jellyfin.Base.Tests/js/*.test.mjs
```

```bash
node --test JPKribs.Jellyfin.Base.Tests/js/kit.test.mjs
```

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fake-dom.mjs';

var dom = installFakeDom();
var { generateGuid } = await import('../../src/js/core.js');

test('generateGuid gives 32 hex digits when compact', function () {
    assert.match(generateGuid({ compact: true }), /^[0-9a-f]{32}$/);
});
```

* Name each test as a sentence about the behavior.
* Call `installFakeDom()` in `beforeEach` so each test starts clean.
* Test logic and behavior, not layout. Move logic out of event handlers into exported functions so a test can call them.
* Extend `fake-dom.mjs` when a component needs a selector or element feature it lacks, and keep it dependency free.
* CI runs these tests on Node 22, so run them yourself before you call a change done.

## The Gallery

The gallery is a static page that loads the real bundle with the Jellyfin globals stubbed, so every component runs without a plugin.

```bash
scripts/gallery.sh
```

```bash
scripts/gallery.sh 9000
```

The script rebuilds the bundle, serves the repository root with Python on port 8080 by default, and opens `http://localhost:8080/JPKribs.Jellyfin.Base.Tests/gallery/index.html`. Stop it with Ctrl-C.

* Add a section to `gallery/index.html` for each new component, showing its states and modifiers.
* Look at every changed component at desktop width and at 375px.
* Look at it with a light and a dark Jellyfin palette when the change touches color. The page sets the palette variables for you to edit.
* Keep the gallery's own classes prefixed `g-` so they never touch the kit.

## Consumer Build

Unit tests cannot show that a plugin still builds. Before a public change is done, build a plugin against a local pack.

```bash
scripts/pack.sh 2026.11.14.1
```

Then restore the plugin with the local source and that version.

```bash
dotnet build -p:RestoreAdditionalProjectSources=<base>/nupkg
```

Raise the plugin's `JPKribs.Jellyfin.Base` reference to the local version first, and put it back afterward. The plugin's strict analyzers are the real check on Base's C#, so build one with `TreatWarningsAsErrors` on. Never commit a plugin against a local pack.

## Checklist

* [ ] Every changed file has tests, and a bug fix has a test that fails without it.
* [ ] Edges are covered, including null, empty, cancelled, and a faulting dependency.
* [ ] `dotnet test` passes.
* [ ] The JS tests pass.
* [ ] A new CSS rule keeps its fallback, and the CSS tests pass.
* [ ] Every changed component was seen in the gallery at 375px.
* [ ] A public change was built into a consuming plugin from a local pack.
