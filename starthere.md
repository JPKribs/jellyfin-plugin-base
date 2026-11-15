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
* **Prove it with a test.** A change is not done until a test shows that its inputs give the right output.
* **Describe the current state only.** Docs, labels, and comments say what Base does today. The generated release notes are the only place for what changed.

## How Plugins Consume Base

A plugin references the `JPKribs.Jellyfin.Base` package at one version. Nothing is added at runtime, since the package has no assembly.

| Piece | What happens | Where |
| :--- | :--- | :--- |
| C# helpers | `src/*.cs` is compiled into the plugin, so each plugin stays one DLL and builds them under its own analyzers | `build/JPKribs.Jellyfin.Base.targets` |
| CSS and JS | The bundles are embedded under the plugin's namespace and served as `jpkribs_shared.css` and `jpkribs_shared.js` | `build/JPKribs.Jellyfin.Base.targets` |
| Templates | `src/templates/*.html` is embedded for `TemplateLoader` and `StatusPage` | `build/JPKribs.Jellyfin.Base.targets` |
| Packaging script | `tools/build-plugin.sh` ships in the package and a plugin's `build.sh` runs the copy for its Base version | `build/JPKribs.Jellyfin.Base.props` |
| Plugin workflows | Callers pinned to a Base release run the reusable `plugin-*.yaml` workflows | `templates/plugin/` |

These scripts matter to a contributor.

* `scripts/bundle.sh` installs the pinned dev tools, type checks `src/js`, and builds `dist/jpkribs_shared.css`, `dist/jpkribs_shared.js`, and the typings `dist/jpkribs_shared.d.ts`.
* `scripts/check-bundle.mjs` and `scripts/check-types.sh` check the bundle against its golden copy and the typings against their test.
* `scripts/pack.sh` bundles and packs a local package, so a plugin can test unreleased work.
* `scripts/build-previews.mjs` builds the live preview pages for the docs site from `docs/previews/`. Run it after `scripts/bundle.sh`.
* `scripts/sync-plugins.sh` writes the files in `templates/plugin/` into plugin checkouts and points each at one Base release.

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
* **Templates.** A change to `src/templates/` or `templates/plugin/`, since plugins consume both.
* **Workflows and packaging.** A change to `.github/workflows/`, `scripts/`, `tools/`, `build/`, or the package settings in the csproj.
* **Releases and publishing.** Starting a release, publishing to NuGet, tagging, or pushing to the default branch. A push that changes `docs/`, `mkdocs.yml`, `src/`, or the gallery publishes the docs site too.
* **The rules.** Any case where following a guide would make the result worse.

Explain what you would change, why, and what it risks. Wait for an answer before you act.

## The Repository

| Path | What it holds |
| :--- | :--- |
| `src/*.cs` | The C# helpers, one per file, in the `JPKribs.Jellyfin.Base` namespace. |
| `src/css/` | One CSS file per component. |
| `src/js/` | TypeScript components, re-exported from `index.ts`, with shared types in `types.ts`. |
| `src/templates/` | The HTML templates, such as `status.html`. |
| `dist/` | The bundled CSS and JS, and the typings. Built by `scripts/bundle.sh` and not committed. |
| `build/` | The props and targets that wire the package into a plugin. |
| `tools/` | `build-plugin.sh`, the plugin packaging script that ships in the package. |
| `templates/plugin/` | The `build.sh` shim and the workflow callers that `scripts/sync-plugins.sh` writes into plugins. |
| `scripts/` | Bundle, pack, gallery, preview, and plugin sync scripts. |
| `.github/workflows/` | This repository's `build.yaml`, `release.yaml`, and `docs.yaml` (which bundles, builds the previews, and builds the site), and the reusable `plugin-*.yaml` workflows. |
| `JPKribs.Jellyfin.Base.Tests/` | The xUnit tests, the JS tests in `js/`, the gallery in `gallery/`, and `Fixtures/`. |
| `docs/` | The docs site pages, built with MkDocs. The home page, the usage page, and the Components section, `components/web/` and `components/csharp/`. |
| `docs/previews/` | The live preview snippets, the shared shell, and the Jellyfin stubs. Built into `docs/assets/previews/`, which is not committed. |
| `mkdocs.yml` | The docs site settings and nav. |
| `README.md` | A short landing page that links to the docs site. |
| `skills/` | The guides. |
| `nupkg/` | Local packs. Not committed. |
