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
* [ ] A change to `src/templates/` or `templates/plugin/` was checked against the plugins that consume it.
* [ ] A change to a security helper was approved, and its tests cover the hostile input.

## Words

* [ ] Every new or changed string passes the [style checklist](style.md#checklist).
* [ ] Every term matches [glossary.md](glossary.md). A new term was added there first.
* [ ] Names follow [style.md](style.md#naming).

## Components

* [ ] A new component exists only because no existing one fits.
* [ ] Colors are tokens and keep their [meaning](style.md#meaning).
* [ ] Every `color-mix()` has its plain fallback.
* [ ] The component works at 375px in the [gallery](testing.md#the-gallery), and has a gallery section.
* [ ] Focus, Escape, Enter, and Space behave, and nothing relies on color alone.

## Code

* [ ] Every public type, member, export, selector, and template object has its header in the [comment format](code.md#comments).
* [ ] Inline comments sit only above branches and say why.
* [ ] No commented out code, TODO, or debug output.
* [ ] The [security](code.md#security) rules hold.
* [ ] The C# builds with no warning under strict analyzers.

## Tests

* [ ] Every change has tests, per [testing.md](testing.md).
* [ ] A bug fix has a test that fails without it.
* [ ] `dotnet test`, `node --test`, `scripts/check-bundle.mjs`, and `scripts/check-types.sh` passed. CI runs all four.

## Docs

* [ ] The component's page under `docs/components/` was added or updated, and a web component's preview in `docs/previews/` too.
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
