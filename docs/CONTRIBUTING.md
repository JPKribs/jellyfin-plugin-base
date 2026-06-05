# Contributing

How to add and document shared components in this package. Follow it exactly so every component reads the same way.

## Naming

Everything custom uses the `jpk` prefix.

* CSS classes: `jpk-` kebab case. A component is `jpk-name`, its parts are `jpk-name-part`, its states are plain modifiers like `.active` or `.collapsed`.
* CSS variables: `--jpk-name`.
* JavaScript exports: camelCase function names in the shared module.
* C# types: PascalCase in the `JPKribs.Jellyfin.Base` namespace.

The only exception is a selector that styles Jellyfin's own markup. Those must match Jellyfin's class name and stay unprefixed. The current set is `sectionTitle`, `sectionTitleContainer`, `hidden`, `fieldDescription`, `material-icons`, `inputContainer`, `checkboxContainer`, `selectContainer`, and `emby-*`.

## Layout

```
src/css/        one file per component, named after the component
src/js/         ES module components, re-exported from index.js
src/templates/  one html file per template
src/*.cs        one C# helper per file
```

Adding a component is just dropping a file in the right folder. The bundler emits `tokens.css` first then the rest, and esbuild bundles whatever `index.js` re-exports. Ordering never matters, so no numeric prefixes.

## How to document

### CSS

Above each component selector, add a line describing the format. Underneath, add a simple usage example for this element.

```css
/* Rounded translucent card holding a count and a label */
/* Example: <div class="jpk-card blue"><span class="jpk-card-count">5</span></div> */
.jpk-card { ... }
```

Line one describes what the style looks like. Line two is one example usage.

### JavaScript

Above each exported function, the name, then a summary (preferrably under 2 lines), a 1 line gap, then the parameters with one parameter per line.

```js
// createShared
// Builds the per view helper bag used by a config page. Bind it once on viewshow.
//
// Param: view      | page element
// Param: pluginId  | string
// Param: apiPrefix | string [optional]
export function createShared(view, pluginId, apiPrefix) { ... }
```

Do not document the methods returned inside a helper. Document the exported function only.

### HTML templates

A single line comment naming each object where it starts.

```html
<!-- card -->
<div class="jpk-card">
```

### C#

A standard XML doc on every public type and member. Please try to keep the summary as two sentences or less, followed by every `param` and a `returns` when the member returns a value.

```csharp
/// <summary>
/// Renders the themed status page from the status template.
/// </summary>
/// <param name="heading">The card heading.</param>
/// <returns>A complete HTML document.</returns>
public static string Render(string heading) { ... }
```
