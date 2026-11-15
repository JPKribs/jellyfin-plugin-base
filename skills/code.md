# Code

How to write, comment, and keep compatible the code in Base. It covers C#, JavaScript, CSS, HTML templates, and shell. [style.md](style.md#naming) is the authority for naming, and this guide is the authority for the comment formats.

## What Belongs Here

Base holds what two plugins could share unchanged.

* A helper has no plugin specific type in its signature, no plugin name in a string, and no assumption about one plugin's configuration.
* Read [README.md](../README.md) and the [component pages](documentation.md#the-component-pages) before you add anything. When a component almost fits, extend it.
* One component per file. A C# helper is one file in `src/`, a style is one file in `src/css/`, a module is one file in `src/js/` that `src/js/index.js` re-exports, and a template is one file in `src/templates/`.
* Never add a file to a folder with a numeric prefix. Ordering never matters.
* Never add a runtime dependency. The package has no assembly, so everything compiles into the plugin and can use only what a Jellyfin plugin already references.

## Compatibility

Every plugin compiles Base in, so each change is seen by every one of them. A plugin moves to a new Base version when its author chooses, and an older plugin keeps working against the version it references.

* **Add, do not change.** A new optional parameter, option, or overload is safe. Giving it a default that keeps the old behavior is what makes it safe.
* **Never remove or rename** a public type, member, JS export, `createShared` bag member, class, token, or template placeholder without asking first. See [stop and ask](../starthere.md#stop-and-ask).
* **A behavior change is an API change.** A changed return value, a new exception, a different default, or a different default label reaches every plugin.
* **A name that exists in Base must never exist in a plugin.** Base compiles into the plugin's assembly, so a plugin copy with the same name is ambiguous. A new public name should be unlikely to match a plugin's own type.
* **Keep the signatures of C# members binary and source compatible** where you can, since a plugin compiles against the source and a recompile is the only fix.
* **A class is a contract.** Do not rename a `jpk-` class, change what a modifier means, or change a token's value for a different look. A plugin page depends on them.
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

### JavaScript

Above each exported function, the name, then a summary, a one line gap, then one `Param:` line per parameter.

```js
// createShared
// Builds the per view helper bag used by a config page. Bind it once on viewshow.
//
// Param: view      | page element
// Param: pluginId  | string
// Param: apiPrefix | string [optional]
export function createShared(view, pluginId, apiPrefix) { ... }
```

* Document the exported function only. Never document the methods inside a returned helper.
* Existing sources add one `Returns` line after the `Param:` lines for a handle or value. Do the same when the return is not obvious.
* Use one `Param:` line per parameter, with `|` between the name and the type or meaning, and `[optional]` for an optional one.

### CSS

Two lines above each component selector. The first says what it looks like, and the second is one example.

```css
/* Rounded translucent card holding a count and a label */
/* Example: <div class="jpk-card blue"><span class="jpk-card-count">5</span></div> */
.jpk-card { ... }
```

### HTML Templates

A single line comment naming each object where it starts.

```html
<!-- card -->
<div class="jpk-card">
```

### Shell and YAML

* A shell script opens with a comment saying what it does and how to run it. Every script in `scripts/` and `tools/` does.
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
* Never throw from a helper whose contract is not to throw, such as `JpkHttp.SendAsync` on a network fault and `ActivityLogger.Log`.
* Log through `ILogger` with static message templates. Pass untrusted text through `FormatUtilities.SanitizeForLog`.

## JavaScript Conventions

* Every component is an ES module, and `src/js/index.js` re-exports it. esbuild bundles it to one ESM file.
* Follow the style of the file you edit. Today every module uses `var` and `function` expressions, with no arrow functions. Keep that so older engines load the bundle.
* A module exports named functions only. A plugin imports from the bundle by a relative path, `./configurationpage?name=<plugin>_jpkribs_shared.js`.
* Escape every value placed in HTML with `escapeHtml`. Class names that come from data go through `classNames`.
* Return a handle with a `destroy()` for anything that holds a listener, an observer, or a timer, so `viewhide` can stop it.
* Never touch a global a config page does not provide. `LibraryMenu`, `ApiClient`, and `Dashboard` are read only when present.

## CSS Conventions

See [style.md](style.md#component-conventions). In short, tokens for color, modifiers for state, one file per component, a plain fallback before `color-mix()`, and the two line comment above every component.

## Security

Several helpers guard security for every plugin. A change to one is a [stop and ask](../starthere.md#stop-and-ask) item.

* `SecretProtector` and `StableSecretProtection` keep credentials out of configuration files. Never write a secret in plain text, never return one to the browser except as `SecretProtector.KeptSentinel`, and keep the `enc:v1:` prefix and the key ring location stable, or existing secrets become unreadable.
* The browser half is `bindSecretField`, `readSecretField`, and `clearSecretField`. They post `SECRET_KEPT` for a field left untouched.
* `PathContainment.IsUnderAny` compares whole folder names, so `/media/a` is not under `/media/ab`. Keep it that way.
* `FileNameSanitizer` replaces the same set of characters on every OS.
* `PublicPage.ApplyHardeningHeaders` sets `no-referrer`, `no-store`, and `noindex`. A standalone page calls it.
* `StringUtilities.EscapeJsString` and `escapeHtml` neutralize breakout from a script block and from markup.
* `JpkHttp` returns a status and body, never throws on a network fault, and reads no more than `maxResponseBytes`. `JpkHttp` checks every URL by default with `SsrfGuard.PrivateNetworkAllowed` and then sends through Jellyfin's client, so proxies still work. A plugin that calls an address it did not choose passes `SsrfGuard.PublicOnly` for the strict mode, and `SsrfGuard.Disabled` is the opt out. `SsrfGuard` refuses unsafe schemes, user info, and loopback, private, link local (including the cloud metadata address), multicast, unspecified, and broadcast addresses. It classifies every address a name resolves to, checks again when the socket connects so a DNS rebind cannot slip past, and refuses a redirect to another host. Keep every range it refuses, and add a test with each change.
* `FormatUtilities.SanitizeForLog` strips control characters so caller text cannot forge a log line. Use it on any value from a request or a file.
* `DatabaseSchema` runs SQL with fixed text and an integer. Never put a caller's value into SQL text.
* Never put a secret or a user's data in a URL.
* `StatusPage` encodes its values, and its `content` argument is raw. Document that wherever you pass markup to it.

## Tests

Every change has a test. See [testing.md](testing.md) for each layer and how to write one.

## Checklist

* [ ] The component is shareable, with no plugin specific type or name.
* [ ] Nothing public was removed or renamed, or the change was approved.
* [ ] Defaults keep the old behavior, and a changed behavior was approved.
* [ ] Every public type, member, export, selector, and template object has its header in the [format above](#comments).
* [ ] Inline comments appear only above branches, and say why.
* [ ] No commented out code, TODO, or debug output.
* [ ] The code builds with no warning under a plugin's strict analyzers.
* [ ] The [security](#security) rules hold.
* [ ] Every changed file has tests that pass, per [testing.md](testing.md).
