# Style

How every Base component looks, behaves, and reads. It covers the CSS, the JS markup, the templates, and every default label a component ships. [code.md](code.md#comments) sets the comment formats. This guide sets the naming and the design rules.

Base is not an app. Each plugin builds its own pages from these components, so a rule here reaches every plugin. [README.md](../README.md) documents each component's options, and the [component pages](documentation.md#the-component-pages) list them.

## Principles

1. **One component per concept.** When Base has it, extend it. Never add a second version beside it.
2. **Short beats complete.** A default label is a few words. A message is one sentence.
3. **Follow Jellyfin.** Use Jellyfin's own markup and theme variables, so a component looks like part of the dashboard in every theme.
4. **Plain markup and plain classes.** A component is a class on ordinary elements. A plugin writes the markup and Base styles it.
5. **Older engines still work.** The desktop app and older TV webviews get a plain fallback, never broken rules.
6. **The same thing has the same name everywhere.** Classes, exports, labels, and docs use the [glossary](glossary.md).

## Naming

This section is the rule.

| Thing | Form | Example |
| :--- | :--- | :--- |
| CSS class | `jpk-` kebab case | `jpk-card` |
| Part of a component | `jpk-name-part` | `jpk-card-count` |
| State | A plain modifier class | `.active`, `.collapsed`, `.selected` |
| CSS variable | `--jpk-name` | `--jpk-field-gap` |
| JS export | camelCase | `createChoiceGroup` |
| C# type | PascalCase in `JPKribs.Jellyfin.Base` | `StatusPage` |

* Name a component after what it is, never after where one plugin uses it.
* A file in `src/css` carries the component's name, such as `card-list.css`. A file in `src/js` does the same.
* Never add a numeric prefix to a file. Order never matters.
* A selector that styles Jellyfin's own markup keeps Jellyfin's name and stays unprefixed. The current set is `sectionTitle`, `sectionTitleContainer`, `hidden`, `fieldDescription`, `material-icons`, `inputContainer`, `checkboxContainer`, `selectContainer`, and `emby-*`. Add to this list before you add one.
* The one exception for variables is the unprefixed token aliases listed under [Tokens](#tokens).
* Keep one file per component. CSS lives in `src/css`, one file per component. JS lives in `src/js` as ES modules re-exported from `index.js`. A template lives in `src/templates`, one HTML file per template. A C# helper lives in `src/`, one file per helper. Adding a component is dropping a file in the right folder, and the bundler emits `tokens.css` first.

## Writing

These rules apply to every string Base ships. That includes default labels in JS, template text, C# strings, comments, docs, and the README.

### The Rules

* **No em dashes or en dashes as punctuation.** Split the sentence, or join it with a comma and "and". An en dash in a numeric range is fine.
* **No semicolons.** Split the sentence.
* **Avoid colons.** Never end a label with one. In a sentence, rewrite it.
* **One sentence.** Two only when the second gives the fix or the consequence.
* **End every sentence with a period.** Labels, buttons, titles, and table cells are not sentences and take no period.
* **No "please", "successfully", "simply", or "just".**
* **No exclamation marks.**
* **No ALL CAPS for emphasis.**
* **No "(s)".** Write the right plural for the count.
* **No contractions.** Write "cannot", not "can't".
* **No "e.g." or "i.e.".** Write "such as".
* **American spelling.** Color, behavior, favorite, center.

### Casing

| Text | Case | Example |
| :--- | :--- | :--- |
| Button | Title Case, verb first | Remove |
| Dialog title | Title Case | Unsaved Changes |
| Badge and status | Title Case | Pending |
| Column header | Title Case | Last Sync |
| Activity name | Title Case | 12 Items Synced |
| Message, description, placeholder sentence | Sentence case | Saved. |

Title Case capitalizes every word except short articles, conjunctions, and prepositions in the middle, such as "a", "and", "of", "to", and "in". Keep acronyms as written, such as "URL" and "Mbps".

### Words to Use

A default label is a word every plugin inherits. Pick the word on the left every time.

| Use | Not | When |
| :--- | :--- | :--- |
| Remove | Delete | Takes an entry out of a list and nothing else is lost |
| Delete | Remove | Destroys data that cannot come back |
| Clear | Empty, Reset | Removes every entry in a list |
| Save | Apply, Update | Writes changes |
| Done | OK, Close | Closes an editor and keeps its changes |
| Cancel | Close, No | Closes without keeping changes |
| Select | Pick, Choose | Any instruction to make a choice |
| Could not | Failed to, Unable to | An error message |

### Default Labels

Base writes a label when the caller gives none. Keep each one short, and let the caller override it.

* A default is an option such as `confirmText`, `removeText`, `doneText`, `emptyMessage`, or `placeholder`. A new default label needs an option that replaces it.
* A placeholder shows a valid example, never an instruction. `bindSecretField` writes "Saved, leave blank to keep" and the string stays as it is.
* A confirm names its action. Its title is the action in Title Case, and its confirm button repeats the action verb, never "OK" or "Yes".
* A message reports what happened in one sentence that ends with a period, such as "Saved." or "Could not save."
* Use the ellipsis character, never three dots, and only for work in progress.
* Name a count with a correct plural. "1 item" and "3 items".

## Color

### Tokens

Components take their colors from the tokens in `src/css/tokens.css`. A component never writes a hex value for something a token covers.

| Token | Use |
| :--- | :--- |
| `--jpk-accent` | Links, focus rings, primary buttons, progress. Follows the theme's primary color |
| `--jpk-accent-hover` | Hover on accent elements |
| `--jpk-fg` | The theme's text color, for a wash on an element that fades its own text |
| `--jpk-surface` | Panel backgrounds. Follows the theme's paper color |
| `--jpk-border` | Every border and divider |
| `--jpk-field-gap` | Space between field rows |
| `--jpk-mono` | The font stack for code, ids, paths, and raw errors |
| `--jpk-success`, `--jpk-warning`, `--jpk-error`, `--jpk-info`, `--jpk-purple`, `--jpk-error-hover` | Solid status colors |
| `--jpk-<color>-bg`, `--jpk-<color>-fg` | Tinted background and text, for green, red, orange, purple, blue, gray, yellow, pink, and teal |

* The accent and surface come from Jellyfin's palette variables, `--jf-palette-primary-main` and `--jf-palette-background-paper`, and fall back to the dark theme.
* Lines and washes are a share of the text color, so light themes get dark ones. There is no per theme rule.
* `--accent-color`, `--accent-hover`, `--border-subtle`, `--error-color`, and `--success-color` are aliases. They are scoped to `.pluginConfigurationPage` and `.jpk-dialog` so they never leak into the dashboard. Never define a new unprefixed name on `:root`.
* A new token goes in `tokens.css`, with a plain fallback first when it uses `color-mix()`.

### Meaning

A color means the same thing in every component and every plugin.

| Color | Means | Examples |
| :--- | :--- | :--- |
| Green | Done and healthy | Active, Synced, Downloaded |
| Red | Failed, or about to lose data | Error, Errored, Deleting, Pending Deletion |
| Orange | Waiting, or needs attention soon | Queued, Expired |
| Purple | Working right now | Pending, Downloading, Locked |
| Blue | Informational | Admin, Imported, Pending Replacement |
| Gray | Off or not applicable | Ignored, Group |

* `badges.css` maps these state names to colors. `BADGE_STATES` in the JS lists the same names, so a plugin's mapping has one source. Keep the two lists in step when you add a state.
* Use "orange" for the warning color in class names, never "amber" or "warning". The callout class `jpk-warn` is the one exception, since it names a notice and not a color.
* Never use color alone. A badge always has a word, and a dot always has a `title`.
* Yellow, pink, and teal have `--jpk-yellow-*`, `--jpk-pink-*`, and `--jpk-teal-*` tokens in the same shape as the six status colors. They are extra tints for badges, cards, avatars, and timeline markers, and they carry no status meaning.

## Component Conventions

Read the file next to the one you change. These conventions hold across `src/css`.

* **One file per component**, with its own `@media` overrides in the same file.
* **States are modifiers.** `.active`, `.collapsed`, `.selected`, `.dirty`, and `.success` sit on the component. Never a separate class per state.
* **Colors are tokens.** A new color is a token first, then used.
* **The `[hidden]` attribute always hides.** A component that sets `display` still respects it.
* **Fields take their gap from `--jpk-field-gap`.** Never add margins between fields, and let a container's gap be the only spacing.
* **Use Jellyfin's own control markup** for form fields. Text inputs, text areas, and selects share one surface, border, and chevron through the field rules in `form.css`.
* **`!important` only where an `emby-*` rule must be beaten.** Buttons do this today. Do not spread it.
* **No inline `style` attributes in markup a component generates.** Add a class instead.
* **Keep selectors short.** A component targets its own classes, so file order never matters.

### Editors, Messages, and Loading

These rules hold for the editors, pickers, menus, notices, and loading components.

* **Options are plain data.** What a component shows and how it looks is a string, number, boolean, array, or object of those. A callback only reports a change or supplies behavior, such as `onChange`, `onSelect`, or `validate`.
* **A label that names a row is a template.** Write "Remove {value}" and let the caller replace the template, never a function that returns text.
* **A handle is `{ element, getValue, setValue, destroy }`.** A handle with items adds `setItems`, and `destroy` removes every listener the component added.
* **An error sits under its field.** Use `createFieldMessage` or `setFieldState` so `aria-invalid` and `aria-describedby` stay wired, and write the message as a sentence that ends with a period.
* **A transient message is a live region.** A toast is `role="status"`, and only an error is `role="alert"`.
* **Motion respects the user.** A skeleton stops pulsing and a spinner turns slower under `prefers-reduced-motion: reduce`.
* **A floating panel closes on Escape and on an outside click**, and Escape returns focus to the control that opened it.
* **No inline style in what a component builds.** Set a state through a class or an attribute, such as `stroke-dasharray` on the progress ring arc.

### Older Engines

The desktop app and older TV webviews have no `color-mix()`, and the oldest have no `:is()`. [CssFallbackTests](testing.md#css-tests) enforce this.

* A `color-mix()` of `currentColor` follows a plain `rgba()` of the same property.
* A `color-mix()` of a variable goes in an `@supports (color: color-mix(in srgb, red, blue))` block after a plain rule.
* A token starts on a plain color and upgrades in the `@supports` block in `tokens.css`.
* Form rules list `.pluginConfigurationPage` and `.jpk-dialog` as plain selectors, never with `:is()`.
* A rule with `:has()` never carries a selector an older engine needs.
* The bundle targets `chrome58,safari11,firefox57`. Write CSS that target accepts.

## Layout

* Use Base's breakpoints. 768px for tablet and 600px for phone are the common ones. 700px is for dialogs only.
* Every component works at 375px wide. Nothing scrolls sideways except a table.
* Check each new or changed component in the [gallery](testing.md#the-gallery) at 375px.
* Never set a width in pixels on a field. Let it fill its container.
* A dialog on a touch screen (`pointer: coarse`) never focuses a text field automatically.

## Accessibility

* A dialog has `role="dialog"` and `aria-modal="true"`, and is named by its title or first heading.
* A collapsible header carries `aria-expanded` and `aria-controls`.
* An icon only control has a `title` and an `aria-label`. An icon span has `aria-hidden="true"`.
* A row that opens on click also opens with Enter and Space, and shows an accent focus ring.
* Escape closes the dialog on top and only that one. Focus moves into a dialog, stays inside it, and returns to the control that opened it.
* A destructive button never takes focus automatically.
* Never rely on color alone.

## Templates

* A template is one self contained HTML file, with a one line comment naming each object where it starts.
* A template's classes never collide with the kit CSS. `CssCollisionTests` fails when `status.html` shares a class with `src/css`, other than `hidden`.
* Fill values through `{{KEY}}` placeholders and `TemplateLoader.Fill`. It fills in one pass and does not encode, so the helper that calls it encodes every value, as `StatusPage` does. `{{CONTENT}}` is the raw slot a plugin fills with its own markup.
* A template works with no JavaScript from Base.

## Checklist

Run every new or changed component and string through this list.

* [ ] The name follows [Naming](#naming) and the [glossary](glossary.md).
* [ ] The component is new only because no existing one fits.
* [ ] Colors are tokens and mean what [Meaning](#meaning) says.
* [ ] States are modifiers, and `[hidden]` still hides.
* [ ] Every `color-mix()` has its fallback.
* [ ] The component works at 375px in the gallery.
* [ ] Focus, Escape, Enter, and Space behave, and nothing relies on color alone.
* [ ] No em dashes, en dashes as punctuation, semicolons, contractions, "please", or exclamation marks.
* [ ] Sentences end with a period. Labels, buttons, and titles do not.
* [ ] Every default label can be replaced by the caller.
* [ ] The inventory entry and the README match the component.
