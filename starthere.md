# Start Here

Read this file before you change anything in this repository. It applies to people and to AI assistants alike.

This repository is JPKribs.Jellyfin.Base, the NuGet package of shared C# helpers and CSS, JS, and HTML assets that every JPKribs Jellyfin plugin compiles in. [README.md](README.md) is the short landing page, the docs site lists what Base ships, with live previews of the web components, and the guides in [skills](skills/) hold the rules for naming and documenting a component.

## The Guides

Each guide in [skills](skills/) covers one kind of work. Read the guide that matches the task before you start it.

| Guide | Read it before you |
| :--- | :--- |
| [skills/glossary.md](skills/glossary.md) | Name anything, in a component, a default label, the docs, or code. |
| [skills/style.md](skills/style.md) | Build or change a component, a token, or any text a component ships. |
| [skills/code.md](skills/code.md) | Write or change code or comments in any language, or change the public API. |
| [skills/testing.md](skills/testing.md) | Write or run tests, or review a component in the gallery. |
| [skills/profiling.md](skills/profiling.md) | Find or fix slow C#, or change code on a hot path. Profile only for a reported symptom, a hot path change, or a number that grew. |
| [skills/documentation.md](skills/documentation.md) | Write or change the README, the docs site, a component page, or a preview. |
| [skills/review.md](skills/review.md) | Call any change done. |
| [skills/release.md](skills/release.md) | Cut a release. |

A task that touches several areas needs every matching guide. A new component, for example, needs the glossary, style, code, testing, documentation, and review guides.

## Ground Rules

* **Base serves every plugin.** Each plugin compiles it in, so a change is a change to all of them. Ask what an existing plugin would see before you edit anything public. See [Compatibility](skills/code.md#compatibility).
* **One word per concept.** Use the term in the glossary, everywhere, and follow the naming in [skills/style.md](skills/style.md#naming).
* **Keep it short.** Every label, comment, and doc line is as brief as it can be while staying clear.
* **Build on what exists.** A new component is a thin variation on a base component or a core, and every input validates through the validation core. See [The Component Model](skills/code.md#the-component-model).
* **One scale, tokens only.** Every size, space, rounding, shadow, layer, and color comes from `src/css/design-tokens.css`, so anything placed beside anything else lines up.
* **Prove it with a test.** A change is not done until a test shows that its inputs give the right output.
* **See it at three widths.** A change to a component is checked in the gallery at desktop, about 1280px, tablet, 768px, and phone, 375px, with nothing spilling out, overlapping, or misaligned.
* **Describe the current state only.** Docs, labels, and comments say what Base does today. The generated release notes are the only place for what changed.

## How Plugins Consume Base

A plugin references the `JPKribs.Jellyfin.Base` package at one version. Nothing is added at runtime, since the package has no assembly.

| Piece | What happens | Where |
| :--- | :--- | :--- |
| C# helpers | `src/*.cs` is compiled into the plugin, so each plugin stays one DLL and builds them under its own analyzers | `build/JPKribs.Jellyfin.Base.targets` |
| CSS and JS | The bundles are embedded as `<RootNamespace>.Configuration.jpkribs_shared.css` and `.js`, and `GetSharedPages("myplugin")` in `src/PluginBase.cs` serves them as `myplugin_jpkribs_shared.css` and `myplugin_jpkribs_shared.js` | `build/JPKribs.Jellyfin.Base.targets` |
| Templates | `src/templates/*.html` is embedded for `TemplateLoader` and `StatusPage` | `build/JPKribs.Jellyfin.Base.targets` |
| Typings | `jpkribs_shared.d.ts` is copied to the plugin's `obj/` for its editor, and never reaches the assembly | `build/JPKribs.Jellyfin.Base.targets` |

These commands matter to a contributor. The CI column says which workflow runs each one. `build.yaml` runs its rows in the order shown, and `release.yaml` runs the same checks and tests in the same order before it packs. `docs.yaml` runs the bundle, the docs check, the previews, and the strict site build, in that order. Run the same commands locally before a push.

| Command | CI | What it does |
| :--- | :--- | :--- |
| `npm run bundle` | build, docs | Runs `scripts/bundle.sh`. It installs the pinned dev tools, type checks `src/js` in strict mode, and builds `dist/jpkribs_shared.css`, `dist/jpkribs_shared.js`, and the typings `dist/jpkribs_shared.d.ts` through `scripts/build-types.mjs`. |
| `node scripts/check-bundle.mjs` | build | Checks the JS bundle against its golden copy. `--update` writes a meant change to the copy. `npm run check-bundle` runs the same. |
| `bash scripts/check-types.sh` | build | Checks the typings against their test. |
| `node scripts/build-docs.mjs --check` | build, docs | Fails when a web component page's Reference is stale, or a component has no page, preview, nav entry, or index row. Without `--check` it writes each Reference from the code. |
| `node --import ./JPKribs.Jellyfin.Base.Tests/js/register.mjs --test JPKribs.Jellyfin.Base.Tests/js/*.test.mjs` | build | Runs the JS tests. `npm test` runs the same. |
| `dotnet test JPKribs.Jellyfin.Base.Tests/JPKribs.Jellyfin.Base.Tests.csproj -c Release` | build | Runs the C# tests, including the CSS tests. |
| `dotnet pack JPKribs.Jellyfin.Base.csproj -c Release -o nupkg` | build | Packs the package. |
| `node scripts/build-previews.mjs` | docs | Builds the live preview pages from `docs/previews/`, for the docs site and the gallery. Run it after the bundle. |
| `mkdocs build --strict` | docs | Builds the docs site and fails on any warning, such as a broken link. Run it after the previews. |
| `npm run typecheck` | Local only | Type checks `src/js` without the bundle. The bundle runs the same check. |
| `scripts/gallery.sh` | Local only | Bundles and serves the gallery on port 8080, or the port given as its argument. |
| `scripts/pack.sh` | Local only | Bundles and packs a local package, so a plugin can test unreleased work. |

## Verify Before Done

Work is done when it has been checked, not when it has been written.

* Run every check the change needs, and read its output. A check that did not run has not passed.
* Read the whole diff before reporting, using [skills/review.md](skills/review.md).
* Check every new string against the style checklist and the glossary.
* Check every claim in a doc against the code.
* Report what was checked, what was not, and why. Never call work done while a check fails.

## Stop and Ask

Stop and ask before any of these, even when the task seems to call for it.

* **The public API.** Removing or renaming a public C# type or member, a JS export, a `createShared` bag member, or a template placeholder, since every plugin compiles Base in.
* **The styles.** Renaming a CSS class, removing one, or changing a token, since plugin pages depend on them.
* **Security helpers.** Any behavior change to `SecretProtector`, `StableSecretProtection`, `PathContainment`, `JpkHttp`, `PublicPage`, `StringUtilities.EscapeJsString`, or `escapeHtml`.
* **Templates.** A change to `src/templates/`, since plugins consume it.
* **Workflows and packaging.** A change to `.github/workflows/`, `scripts/`, `build/`, or the package settings in the csproj.
* **Releases and publishing.** Starting a release, publishing to NuGet, tagging, or pushing to the default branch. A push to `main` that changes `docs/`, `mkdocs.yml`, `src/`, the gallery, `package.json`, `package-lock.json`, `tsconfig.json`, `scripts/bundle.sh`, or `scripts/build-previews.mjs` publishes the docs site too.
* **The rules.** Any case where following a guide would make the result worse.

Explain what you would change, why, and what it risks. Wait for an answer before you act.

## The Repository

| Path | What it holds |
| :--- | :--- |
| `src/*.cs` | The C# helpers, one per file, in the `JPKribs.Jellyfin.Base` namespace. |
| `src/css/` | One CSS file per component, named after its docs page, with every token in `design-tokens.css`. |
| `src/js/` | Strict TypeScript, one file per component named after its docs page, re-exported from `index.ts`, with shared types in `types.ts`. There is no `.js` source. |
| `src/js/lib/` | The cores and internal helpers that components are built on. Most are internal. `index.ts` makes the color core, the validation core, and the world shapes public, and exports the types `ChartSeries` from `chart.ts` and `ThumbSource` from `thumb.ts`. |
| `src/templates/` | The HTML templates, such as `status.html`. |
| `dist/` | The bundled CSS and JS, and the typings. Built by `scripts/bundle.sh` and not committed. |
| `build/` | The targets that wire the package into a plugin. |
| `scripts/` | Bundle, pack, gallery, preview, docs, and check scripts. |
| `.github/workflows/` | `build.yaml`, which bundles, checks, tests, and packs every push and pull request to `main` that changes more than Markdown, `release.yaml`, which runs the same checks and tests before it packs and publishes, and `docs.yaml`, which bundles, checks the docs, builds the previews, and publishes the site. |
| `JPKribs.Jellyfin.Base.Tests/` | The xUnit tests, the JS tests in `js/`, the gallery in `gallery/`, the golden bundle in `golden/`, the typings test in `types/`, and `Fixtures/`. |
| `docs/` | The docs site pages, built with MkDocs. The home page, the usage page, the releasing page, and the Components section, with one page per web component in `components/web/` and the C# pages in `components/csharp/`. |
| `docs/previews/` | The live preview snippets, the shared shell, and the Jellyfin stubs. Built into `docs/assets/previews/`, which is not committed. |
| `mkdocs.yml` | The docs site settings and nav. |
| `README.md` | A short landing page that links to the docs site. |
| `LICENSE` | The Zero-Clause BSD license. The csproj and `package.json` both name it as `0BSD`. |
| `package.json` | The pinned dev tools, esbuild and TypeScript, and the `bundle`, `typecheck`, `check-bundle`, and `test` scripts. Nothing in it ships at runtime. |
| `tsconfig.json` | The type check settings. Strict, with `erasableSyntaxOnly`, and it includes only `src/js/**/*.ts`. |
| `Directory.Build.props` | The analyzer settings every plugin uses, applied to Base's own build so a warning in `src/*.cs` fails here first. Not packed. |
| `jellyfin.ruleset` | The code analysis rules that `Directory.Build.props` points to. Not packed. |
| `global.json` | The pinned .NET SDK. |
| `skills/` | The guides. |
| `nupkg/` | Local packs. Not committed. |
