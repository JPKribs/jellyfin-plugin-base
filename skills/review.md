# Review

The check to run on your own changes before you call them done. People and AI assistants run it the same way.

## How to Review

1. Read the whole diff, every hunk, as a reviewer who did not write it.

    ```bash
    git diff
    ```

    ```bash
    git status
    ```

2. Go through each section below. Fix what fails, then read the diff again.
3. Run the checks. Read their output. A check you did not run has not passed.
4. Report what you found in the form under [Reporting](#reporting).

## Scope

* [ ] Every change serves the task. Nothing unrelated was reformatted, renamed, or moved.
* [ ] No new files exist that the task did not need, including scratch files and logs.
* [ ] Nothing is left half done, such as a helper with no test or a component with no page.
* [ ] Nothing on the [stop and ask](../starthere.md#stop-and-ask) list changed without approval.

## Compatibility

* [ ] No public C# type or member, JS export, `createShared` member, CSS class, token, or template placeholder was removed or renamed.
* [ ] Every new parameter, option, and overload has a default that keeps the old behavior.
* [ ] No default label, default value, or return changed without approval.
* [ ] No new public name collides with a type a plugin might own.
* [ ] A consuming plugin builds against a local pack with no warning, per [testing.md](testing.md#consumer-build).
* [ ] The CSS and JS bundles and the typings rebuild with `scripts/bundle.sh`, and a plugin page that loads them still works.
* [ ] A change to the bundle that was not meant to change it leaves the golden copy matching.
* [ ] A change to `src/templates/` was checked against the plugins that consume it.
* [ ] A change to a security helper was approved, and its tests cover the hostile input.

## Words

* [ ] Every new or changed string passes the [style checklist](style.md#checklist).
* [ ] Every term matches [glossary.md](glossary.md). A new term was added there first.
* [ ] Names follow [style.md](style.md#naming).

## Components

Each item matches a rule in [style.md](style.md) or [code.md](code.md#the-component-model).

* [ ] A new component exists only because no existing component, option, or modifier fits.
* [ ] It is a thin variation on a base component or core, per [the trees](code.md#the-trees). It calls the base, and copies none of its markup, state, handlers, or CSS.
* [ ] A behavior two variations need was added to the base or core once, with a default that keeps the old behavior.
* [ ] A core's shared CSS sits in the file of the component that owns it, or in `utility-classes.css`, never repeated in a variation.
* [ ] Every helper it needs is the one in `lib/` or `browser-helpers.ts`, such as `clockText` for clock time and `durationText` for a duration in units.
* [ ] Every size, space, rounding, shadow, layer, and color is a token from `design-tokens.css`. No height, padding, text size, or icon size is a raw number.
* [ ] It takes one size from the scale. Placed beside a field, a button, or a row, it is the same height and shares its edges.
* [ ] Icons sit on the first line of their text through `base-icon-text`, headings line up with their values, and numbers align right.
* [ ] Nothing spills out of its frame, overlaps, or sits out of line. A narrow layout adapts by the component's own width before anything scrolls, and no text is shrunk to fit.
* [ ] It was checked in the [gallery](testing.md#the-gallery) at desktop, about 1280px, tablet, 768px, and phone, 375px, and every component built on a changed core was checked too.
* [ ] It has a gallery section, or its preview is framed in the gallery.
* [ ] Every input validates through the [validation core](code.md#validation), with its message through the Field Message, and a form refuses to save while a field is invalid.
* [ ] Colors are status names or hex codes through the color core, and keep their [meaning](style.md#meaning). Nothing relies on color alone.
* [ ] Every `color-mix()` has its plain fallback, and no rule an older engine needs uses `:has()`.
* [ ] Every mark on screen carries information.
* [ ] Focus, Escape, Enter, and Space behave, and every icon only control has a name.

## Code

* [ ] Every public type, member, export, selector, and template object has its header in the [comment format](code.md#comments).
* [ ] Inline comments sit only above branches and say why.
* [ ] No commented out code, TODO, or debug output.
* [ ] The [security](code.md#security) rules hold.
* [ ] The C# builds with no warning under strict analyzers.
* [ ] The TypeScript passes `tsc` in strict mode, uses only syntax that erases to plain JS, and follows the `var` and `function` style of the file.
* [ ] Every new export is named in `src/js/index.ts`, with its `Options` and `Handle` interfaces documented.

## Tests

* [ ] Every change has tests, per [testing.md](testing.md).
* [ ] A bug fix has a test that fails without it.
* [ ] A variation's tests cover what it adds, and a change to a core ran the tests of every component built on it.
* [ ] `npm run bundle`, `node scripts/check-bundle.mjs`, `bash scripts/check-types.sh`, `node scripts/build-docs.mjs --check`, the JS tests, and `dotnet test` passed. CI runs all six, in that order.
* [ ] A bundle change that was meant was written to the golden copy with `node scripts/check-bundle.mjs --update`, in the same change.

## Docs

* [ ] The component's page under `docs/components/` was added or updated, and a web component's preview in `docs/previews/` too.
* [ ] A new web component has its page, named after its source file, its Reference written by `node scripts/build-docs.mjs`, its entry in the nav in `mkdocs.yml`, and its row in `docs/components/web/index.md`.
* [ ] A C# page is usage only, with no member table and no signature list, and the index lists every public type.
* [ ] `README.md` stays a short landing page and lists no component.
* [ ] Every doc describes the current release only.
* [ ] `bash scripts/bundle.sh`, `node scripts/build-previews.mjs`, and `mkdocs build --strict` pass when `docs/`, `mkdocs.yml`, or a preview changed.

## Reporting

Report in this order.

1. **What changed.** One line per change, with the files.
2. **What was checked.** Each command that ran and its result. Quote the failure when one failed.
3. **What was not checked.** Anything left unverified, and why, such as a consumer plugin that was not built.
4. **What needs a decision.** Anything on the stop and ask list, or any rule this change could not follow.

Never report a check as passed without running it. Never call work done while a check fails.
