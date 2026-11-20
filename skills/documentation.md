# Documentation

How to write the README, the docs site, the component pages, and the live previews for Base. It applies to `README.md`, to every page under `docs/`, to `docs/previews/`, and to `mkdocs.yml`.

## The One Rule

Documentation describes the release it ships with. It reads as if this version were the only one that ever existed.

* Write what a component does. Never write what it used to do, what it no longer does, or what it now does.
* Write how a component works. Never write that a bug was fixed or a limit was lifted.
* History belongs in the generated release notes. See [Release Notes](#release-notes).

| Do not write | Write |
| :--- | :--- |
| The table now pages on scroll. | The table pages on scroll. |
| `LogAsync` was renamed to `LogAndWaitAsync`. | `LogAndWaitAsync` completes once the entry is stored. |
| Fixed a leak in the poller. | The page handle stops every poller on `viewhide`. |

"Now" and "no longer" are fine when they describe state rather than history. A version number belongs in docs only when the reader needs it to act.

## Where Content Lives

Each fact has one home. Link to it from everywhere else.

| Content | Home |
| :--- | :--- |
| What Base is, how to consume it, and a link to the docs site | `README.md` |
| The home page of the site | `docs/index.md` |
| Every public C# type, what it is for, and how to use it | `docs/components/csharp/` |
| Every CSS component, JS export, and template | `docs/components/web/` |
| A live example of a web component | `docs/previews/` |
| The members and signatures of a C# type | The XML docs in `src/*.cs` |
| How a release works and how a plugin raises Base | `docs/Releasing.md` |
| How a plugin uses Jellyfin strings and adds its own, and every translations diagnostic | `docs/Translations.md` |
| The rules for naming and documenting a component | `skills/style.md` and `skills/code.md` |
| How to work in the repository | `starthere.md` and `skills/` |
| What a component is for, in the code | The comment above it, in the format [code.md](code.md#comments) gives |
| What changed in a release | The generated notes on the GitHub release |

* `skills/` and `starthere.md` are not part of the site. A docs page never links to them, and never links to a source file, since the strict build refuses links outside `docs/`.
* A guide in `skills/` may link to a docs page by its relative path.
* Never describe a component in two places. Its component page holds the description, and the README links to it.

## The Component Pages

The **Components** section lists every public component, in two subsections, **Web** and **C#**. It is where a plugin author reads to find what Base offers.

**Adding or changing a public component updates its page, and for a web component its preview, in the same commit.** Check the README for any line that mentions the component, and update that too.

| Change | Update |
| :--- | :--- |
| A new or changed public C# type | The type's page under `docs/components/csharp/`, and its row in the index |
| A new or changed CSS component, modifier, or token | The component's page under `docs/components/web/` and its preview |
| A new or changed JS export, option, or handle member | The component's page under `docs/components/web/` and its preview |
| A new or changed template or placeholder | The template's page under `docs/components/web/` |
| A removed or renamed component | The page, the preview, and every mention of it |
| A change to how a plugin consumes Base | `docs/Usage.md`, `docs/Releasing.md`, and `docs/index.md` |

* Name the component exactly as the code does, in code format, then say what it is for in one or two sentences.
* Show one short, real example. Use generic names such as `myplugin`.
* Keep the pages short. Add a new component beside its relatives.
* Every public type in `src/*.cs` is listed in `docs/components/csharp/index.md` and has a section on one of its pages. Every web component has a page. A component with no page does not exist for a plugin author.

### C# Pages

A C# page is **usage only**. The XML docs in the source are the one place for members, parameters, and signatures, and an editor shows them as the plugin author types.

* Write what the type is for, when to use it and when not, a minimal real example, any wiring it needs, and its gotchas.
* Write no member tables and no signature lists.
* Put behavior that surprises a caller under **Gotchas**, as a bullet list. A real surprise belongs there, never in a separate "gaps" section.
* Pages are grouped by purpose, such as Plugin and Tasks or HTTP and Resilience. A type has a `##` heading with its bare name, with no generics, so its anchor is its lowercase name.
* `docs/components/csharp/index.md` holds what the package is, how a plugin consumes it, the table of every public type with one line and a link, and the wiring checklist.
* Check coverage after adding a type. Every public type in `src/*.cs` must be in the index table and have its own `##` heading on a page.

```bash
grep -hE '^\s*public\s+(static |sealed |abstract |readonly |partial )*(class|record|struct|enum)' src/*.cs | wc -l
```

### Web Pages

A web page has a **Usage** section, a generated **Reference**, and a live **Example**.

* `scripts/build-docs.mjs` writes each page's Reference between the `reference:start` and `reference:end` markers, from the code: every export and its signature, every option with its type and the description from the function's TSDoc, every handle member, every other type, and every CSS class and modifier with its header line. Never edit inside the markers. Edit the code and run the script.
* `scripts/build-docs.mjs` reads the export list from `dist/jpkribs_shared.meta.json`, which the bundle writes. Without it the script fails with "Run scripts/bundle.sh first", so bundle before you run it.
* `node scripts/build-docs.mjs --check` runs in the build, docs, and release workflows. It fails when a Reference is out of date, or when a component file has no page, a page has no preview, or a page is missing from the nav or the index.
* Every file in `src/js/*.ts` and `src/css/*.css` is a component, except `index`, `types`, `globals`, and `animations`, and the cores in `src/js/lib/`. A component's page is `docs/components/web/<name>.md` and its preview is `docs/previews/<name>.html`, both named after its source file.
* A variation's page says what it is built on and links to that page, and documents only what it adds. The base's page holds the shared behavior.
* Write an option's description, with its default, in the `name : what it is (default x)` line of the function's TSDoc, so the Reference picks it up.

Every web page has the same sections, in this order.

1. A title and one or two sentences on what the component is.
2. **Decision**, a table with two columns, When and Use. The situations this component is for come first, and their Use names the component or the exact option. The situations it is not for follow, and their Use links the component to use instead.
3. **Usage**, the minimal markup or call, and the classes.
4. **States and Modifiers** and **Gotchas**, only for what the example does not show.
5. **Reference**, generated, so leave it to the script.
6. **Example**, the live frame, and **Example Code**, the preview source.

A page describes only what this repository controls, as it is today. It never names the plugins that use a component, or how one plugin uses it, since that changes outside this repository and would go stale.

`docs/components/web/index.md` lists every page by group, with one row per page, and `mkdocs.yml` lists each page in the nav under **Web**, in the same group, such as **Page Lifecycle and Helpers** or **Layout and Sections**.

### Add a Web Component Page

1. Create `docs/components/web/<name>.md` with the sections above, and empty `reference:start` and `reference:end` markers.
2. Add its preview, per [Add a Preview](#add-a-preview).
3. Add the page to its group in the nav in `mkdocs.yml`, and a row to the same group in `docs/components/web/index.md`.
4. Run `bash scripts/bundle.sh`, then `node scripts/build-docs.mjs` to write the Reference, then `node scripts/build-docs.mjs --check`.

## Live Previews

A web page embeds a live example, the real bundle running in an isolated page, so the docs theme never touches it.

| Piece | Where | Does |
| :--- | :--- | :--- |
| Snippet | `docs/previews/<name>.html` | The markup and a module script that calls the real Base API. One per component. |
| Shell | `docs/previews/_shell.html` | Wraps every snippet. Loads the bundle, the Material Icons font, and the stubs, holds the light and dark toggle, and reports its height. |
| Stubs | `docs/previews/_stubs.js` | The Jellyfin globals (`Dashboard`, `ApiClient`) with mock users, rows, and library items. The gallery loads the same file, and frames the built previews of the newest components. |
| Build | `scripts/build-previews.mjs` | Writes the finished pages, a copy of the bundle, and a copy of the status template to `docs/assets/previews/`, which is not committed. |
| Frame script | `docs/assets/preview.js` | Sizes each frame from the height the preview posts, and sends it the docs color scheme. |
| Frame style | `docs/assets/preview.css` | Styles `iframe.base-preview`. |

`mkdocs.yml` lists the script and the style under `extra_javascript` and `extra_css`, and it excludes `previews/` from the site, so only the built pages ship. The `pymdownx.snippets` extension reads the snippets from `docs/previews/` for the **Example Code** blocks. It runs with `check_paths: true`, so an include of a snippet that does not exist fails the build.

### Embed a Preview

Put the frame on the page, after the usage. The path is relative to the built page, and a page in `docs/components/web/` is three folders below the site root.

```html
<iframe class="base-preview" src="../../../assets/previews/badge.html" title="Badge example" loading="lazy"></iframe>
```

### Add a Preview

1. Create `docs/previews/<component>.html`. Start it with `<!-- title: Name -->`, and with `<!-- min-height: 360 -->` when the content is an overlay or fixed and does not size the page.
2. Write the markup, then a module script that starts with `const base = await window.__baseReady;`. Call the real API, such as `base.createShared(document.getElementById('view'), 'preview-plugin', 'Preview')`. Never copy the component's markup by hand when the API builds it.
3. Run the bundle and the preview build, then the strict docs build, and look at the page in light and dark, at desktop, tablet, and phone width.

    ```bash
    bash scripts/bundle.sh && node scripts/build-previews.mjs && mkdocs build --strict
    ```

4. Embed the frame on the component's page, and show the same source under **Example Code** with a snippet include, so the code on the page is the code the frame runs.

    ````markdown
    ```html
    --8<-- "badge.html"
    ```
    ````

### The Theme

Base reads three Jellyfin palette variables, `--jf-palette-primary-main`, `--jf-palette-background-paper`, and `--jf-palette-text-primary`. The shell sets them under `html[data-theme="dark"]` and `html[data-theme="light"]`. The docs page sends its color scheme to the frame, and the toggle in the frame's corner overrides it. Add a variable to both blocks of the shell if a component starts reading another Jellyfin variable.

## Writing Style

### Sentences

* Use present tense and plain declarative sentences.
* Describe the component in the third person. "`createShared` returns the helper bag."
* Address the reader in the second person only in steps.
* State one fact per sentence. Aim for 20 words or fewer and split anything over 30.
* Use no contractions. Write "cannot", not "can't".
* Use no em dashes, en dashes as punctuation, or semicolons. Split the sentence, or join it with a comma and "and".
* Use colons only to introduce a list or a code block.
* Use parentheses rarely. Move the aside into its own sentence.
* End every sentence with a period.
* Write one paragraph per line. Never hard wrap prose.
* Use no marketing words such as "powerful", "seamless", "easily", or "simply".
* Use no "please" and no exclamation marks.
* Write examples with generic names. Use `myplugin`, `source-a`, and `viewer`, never a real server, person, or address.

### Headings

* Use Title Case for every heading. "## Dialogs and Focus".
* The page title is `#` and appears once per page.
* Name the thing, not the action, unless the section is a procedure.
* Never rename a heading without fixing its anchors. `mkdocs build --strict` fails on a broken anchor.

### Names

* Write a component, type, member, class, token, file, or route in code format.
* Write a default label exactly as the component shows it, in double quotes. "Saved, leave blank to keep".
* Use the words in [glossary.md](glossary.md). A page and the code use the same word for the same thing. When a name changes, search `docs/` and `README.md` for the old one and change it in the same commit.

## Site Structure

The site is MkDocs with the Material theme, built from `docs/` by `mkdocs.yml` at the repository root.

### Navigation

Keep the nav in this order.

1. **Overview** (`index.md`). What Base is, how a plugin consumes it, and where to start.
2. **Getting Started**. **Using Base**, `Usage.md`, then **Translations**, `Translations.md`.
3. **Components**. **Web**, with `components/web/index.md`, **Design Tokens**, and one page per component in groups by purpose, then **C#**, with `components/csharp/index.md` and its pages by purpose.
4. **Development**. `Releasing.md`.

* Name page files in lowercase with hyphens, such as `plugin-and-tasks.md`, under `docs/components/csharp/` or `docs/components/web/`. The older top level pages keep their names.
* A page that proves the tooling stays out of the nav through `not_in_nav`.
* Add every page to the nav in `mkdocs.yml`, or to `not_in_nav` on purpose.
* Put images, when a page needs one, in `docs/assets/`.

### Pages

A component page opens with one sentence on what it covers, then one `##` section per component.

````markdown
# Secrets and Keys

One sentence on what the page covers.

## SecretProtector

What it is for, and when to use it.

```csharp
// A minimal real example
```

**Gotchas**

* One surprise per bullet.
````

* Use a bullet list for steps and gotchas. Use a table only to compare things, never to list members or signatures.
* Table cells have no closing period. Keep them to one sentence.
* Give an admonition a short title, and use it only for something that can break a plugin.

    ```markdown
    !!! warning "Changes every plugin"
        One or two sentences.
    ```

### Links

* Link pages relatively with their `.md` name, such as `[Usage](Usage.md#add-the-package)`.
* Never link to a file outside `docs/`. Name the file in code format instead.
* Link to the repository on GitHub with a full address, only where a reader needs the source.

## README

The README is a short landing page. The docs site holds the detail.

It follows the shape of the plugin READMEs.

1. The icon at the top left, then one paragraph on what Base is and that its source and assets compile into each plugin.
2. **Documentation.** One sentence on what the site covers and a link to it.
3. **Package.** The `PackageReference` line.
4. **License.** One line that links `LICENSE`, the GNU General Public License v3.0, and says what it means for a plugin.
5. **Acknowledgements.** Where the Jellyfin strings come from, who wrote them, and the license they keep.

Use `##` for README headings, so the README has exactly these four, **Documentation**, **Package**, **License**, and **Acknowledgements**. Keep the README under 30 lines. Never list a component, a usage snippet, or release steps there. Usage lives in `docs/Usage.md` and releasing in `docs/Releasing.md`.

## Building the Docs

```bash
pip install mkdocs==1.6.1 mkdocs-material==9.7.7
```

Build the bundle and the previews first, since the web pages embed them.

```bash
bash scripts/bundle.sh && node scripts/build-previews.mjs
```

```bash
mkdocs serve -a 127.0.0.1:8765
```

```bash
mkdocs build --strict
```

Rerun `node scripts/build-previews.mjs` after a change to a snippet, the shell, or the bundle. Run the strict build before every docs commit. It refuses a broken link, a broken anchor, and a nav entry with no page.

## Publishing the Site

`.github/workflows/docs.yaml` builds and publishes the site itself. Its `build` job checks out, sets up Node 22, runs `scripts/bundle.sh`, `scripts/build-docs.mjs --check`, and `scripts/build-previews.mjs`, sets up Python, installs `mkdocs==1.6.1` and `mkdocs-material==9.7.7`, runs `mkdocs build --strict`, and uploads `site/`. Its `deploy` job publishes it to GitHub Pages.

| Trigger | When |
| :--- | :--- |
| Push | To `main`, when the push changes `docs/**`, `mkdocs.yml`, `scripts/build-previews.*`, `scripts/bundle.sh`, `package.json`, `package-lock.json`, `tsconfig.json`, `src/**`, `JPKribs.Jellyfin.Base.Tests/gallery/**`, or `.github/workflows/docs.yaml` |
| Manual | From the Actions tab, with **Run workflow** |

* A change to `README.md`, `skills/`, or `starthere.md` does not publish the site. A change to `src/` does, since the previews run the bundle.
* The workflow keeps one deploy at a time, in the `pages` group. It sets `cancel-in-progress: false`, so a newer run waits for the running one to finish instead of canceling it.
* The strict build is the same check you ran locally, so a docs change that passes locally passes there.
* Pushing to the publishing branch publishes the site, so it is a [stop and ask](../starthere.md#stop-and-ask) item, as is any change to the workflow.

## Release Notes

Base keeps no changelog file. The **Release** workflow creates the GitHub release with generated notes, and those notes are the only history. Docs and comments never carry it.

* Write each commit message so it reads well as a release note, since the generated notes list them.
* Use an imperative sentence in sentence case with no closing period. "Fix the plural helper for plugins' strict analyzers".
* Describe the behavior, not the files. Use no prefixes such as `fix:` or `feat:`.
* Add a body of plain paragraphs, wrapped at 72 characters, when the reason is not obvious.
* Commit docs with the change they describe.

## Checklist

* [ ] Nothing describes an earlier version, a removed component, or a fixed bug.
* [ ] The page for every added or changed public component is updated, and a web component's preview too.
* [ ] A C# page holds no member table and no signature list.
* [ ] Every public type in `src/*.cs` is in the C# index and has a section on a page.
* [ ] The README is still short and lists no component.
* [ ] Every heading is Title Case, and no anchor broke.
* [ ] No em dashes, en dashes as punctuation, semicolons, contractions, "please", or exclamation marks.
* [ ] Every name matches [glossary.md](glossary.md) and the code.
* [ ] No docs page links outside `docs/`.
* [ ] A new web component has its page, preview, nav entry, and index row, and `node scripts/build-docs.mjs --check` passes.
* [ ] The bundle, the previews, and `mkdocs build --strict` all ran, and the previews look right in light and dark.
