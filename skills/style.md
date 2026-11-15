# Style

How every Base component looks, behaves, and reads. It covers the CSS, the JS markup, the templates, and every default label a component ships. [code.md](code.md#comments) sets the comment formats. This guide sets the naming and the design rules.

Base is not an app. Each plugin builds its own pages from these components, so a rule here reaches every plugin. The [component pages](documentation.md#the-component-pages) document each component's options.

Every rule below is a rule, not a suggestion. Where a rule names a token, the value lives in `src/css/design-tokens.css` and nowhere else.

## Principles

1. **Build from Base.** A component is made from other Base components and cores. It never hand-rolls a search box, a list, a button, a badge, an empty state, a popup, or a color that Base already has.
2. **One concept, one core.** Near-duplicates are thin variations on one shared core, so they cannot drift. When two variations behave differently, pick the better behavior once, in the core.
3. **One scale for everything.** Every control takes its size, spacing, rounding, and type from the same scales, so anything placed beside anything else lines up.
4. **Nothing without information.** Every mark on screen tells the reader something they cannot already see. Legends that repeat a control, filler sentences, and decorative ramps are removed.
5. **Follow Jellyfin.** Use Jellyfin's own markup and theme variables, so a component looks like part of the dashboard in every theme.
6. **Older engines still work.** The desktop app and older TV webviews get a plain fallback, never broken rules.
7. **The same thing has the same name everywhere.** Classes, exports, labels, and docs use the [glossary](glossary.md).

## Naming

| Thing | Form | Example |
| :--- | :--- | :--- |
| CSS class | `base-` and the component's name, in kebab case | `base-list`, `base-button` |
| Part of a component | `base-name-part` | `base-card-count` |
| State, variant, or size | A plain modifier class | `.selected`, `.primary`, `.small` |
| CSS variable | `--base-name` | `--base-gap-wide` |
| JS export | camelCase | `createChoiceGroup` |
| C# type | PascalCase in `JPKribs.Jellyfin.Base` | `StatusPage` |

* Name a component after what it is, never after where one plugin uses it.
* Every class and variable Base ships starts with `base-`, with no exceptions. A selector that styles Jellyfin's own markup keeps Jellyfin's name: `sectionTitle`, `sectionTitleContainer`, `hidden`, `fieldDescription`, `material-icons`, `inputContainer`, `checkboxContainer`, `selectContainer`, and `emby-*`. Add to this list before you add one.
* One file per component, named after its docs page: `src/js/<name>.ts` and `src/css/<name>.css`. Shared cores go in `src/js/lib/` and have no CSS file of their own. Their shared CSS lives in the file of the component that owns the concept, or in `utility-classes.css` when no one component owns it, such as `base-float` and `base-icon-text`.
* `index.ts` lists every public export by name. A template lives in `src/templates`, one HTML file per template. A C# helper lives in `src/`, one file per helper.
* Never add a numeric prefix to a file. Order never matters, and the bundler emits `design-tokens.css` first.

## Composition

* **A component is assembled, not drawn.** Rows come from a List, search from the Search Field, filters from the Filter Panel or a select, state from the data view core, picked ids from the selection core, popups from the popover core, toggles from the pressed group core, checkboxes from the checkbox core, thumbnails from the thumb core, colors from the color core, and messages from the Field Message.
* **One component per job, shaped by its options.** A new look or arrangement of a job Base already does is an option on that component, never a new component beside it. A fixed panel is a collapsible section with `collapsible: false`. Side-by-side facts are a definition list with `layout: 'columns'`. A status card is a stat card with `detail` and `layout: 'label-top'`. Read-only grid cells are matrix grid column types.
* **A variation is an option or a modifier on the core,** never a copy. A user picker is a checkbox list with avatars. A numbered section is a collapsible section with a modifier. A pie is a progress ring with a modifier.
* **A shared look is one rule.** When two components need the same surface, row, hover, or popup look, they share one class or one selector list. Never a copy per component.
* **A helper exists once.** Text matching, id reading, size formatting, clock time, focus after a remove, debounce, and plurals each have one implementation, in `lib/` or, for the public ones, in `browser-helpers.ts`, and every component calls it. Two helpers never share a name with different output.
* **Pick the better behavior once.** When members of a family disagree, the core decides, and every member follows. A component never keeps its own variant of a shared behavior.
* **Linking is a helper, not a fork.** Two components that follow each other, such as a map and a table, are joined by a small link helper over their public handles. Neither one learns about the other.

## Sizes

Every control takes one size scale: small, medium, and large. The scale sets height, text size, padding, icon size, and line height together, through the `--base-size-*`, `--base-font-*`, `--base-pad-*`, `--base-icon-*`, and `--base-line-*` tokens. A field reads its medium values through `--base-field-height`, `--base-field-font`, and `--base-field-pad`.

* **Medium is the default and the reference.** A medium button, a text field, a select, a search box, a number box, a date box, a combo box, a color field, a boxed list row, and a table row are all the same height.
* **A size is a modifier.** `base-button small`, `base-badge medium`, `base-tag large`. Buttons, pills, and fields default to medium. Badges and tags default to small.
* **A field changes size with `small` or `large` on the field, or `data-base-size` on any ancestor.** Everything inside a sized component follows it.
* **Never write a height, padding, text size, or icon size as a number.** Take it from the scale, or from a calc of scale tokens.
* **Things on one line are one height.** A button beside a field takes the `field` modifier and matches the field at every size. Never put a small button beside a medium field.
* **A row is at least a field tall.** A boxed row of text uses `base-item-row`, so a list of entries lines up with the input that adds to it.
* **A row icon button is one fixed square** from the scale, built with `iconButton()`. Up and down arrows sit side by side.
* **A dismiss X sits in the top right corner.** On a card, row, banner, or toast, the remove or close button is pinned to the top right, inset by the component's own padding, level with the first line. Status and detail lines leave room for it and never run under it.
* **A glyph is sized to its text.** The remove mark on a tag, the icon in a button, and the dot in a pill scale with the size of the control they sit in.
* **A glyph inside a shape is inset.** An icon in a circle or square leaves a clear margin of the shape's color on every side, and is centered in it.
* **A picture grows with its text.** An avatar beside two lines of text spans both lines.

## Spacing and Shape

* **Two spacings, no others.** Between components and under a title is `--base-gap-wide`. Inside a component, such as a label to its field or the items of a group, is `--base-gap-narrow`. Only the space between lines of text inside one element may be smaller.
* **Rounding comes from four tokens.** `--base-radius-small` for fields, buttons, badges, and rows. `--base-radius-medium` for cards, panels, and popups. `--base-radius-large` for sections and dialogs. `--base-radius-round` for pills, dots, and chips.
* **Shadows and stacking come from tokens.** A floating box casts `--base-shadow-float` on `--base-layer-float`. A dialog casts `--base-shadow-dialog` on `--base-layer-dialog`.
* **A component inside another takes no page spacing.** The page's space under each component applies only at page level. Inside a list, a player, a section's content, or any composite, the parent's own gap sets the spacing, and a section's content ends on its own padding.
* **Every popup shares one surface,** with the same background, border, rounding, shadow, and layer, whether it is a menu, a dropdown, a tooltip, a help bubble, a filter panel, or a toast.
* **Every row shares one hover and one selection.** Hover is `--base-wash`. Selected is `--base-accent-wash` with a leading accent bar.
* **Groups of equal tiles wrap in balanced rows.** Rows stay within one tile of each other, and no row holds a single tile.

## Alignment

* **Text and icons share a center line.** An icon beside text that can wrap uses `base-icon-text`. The icon box is exactly one line tall, so the icon is centered on the first line, never on the block.
* **A heading lines up with its values.** A table's header and its rows share the same column tracks. A number column has a fixed track, so every row and the heading measure the same width.
* **Thumbnails in a row share one width.** Portrait, square, and round pictures are the same width, a portrait only taller, and a wide picture fills the slot. Each is centered on the row with its checkbox.
* **A row's checkbox sits at the row's own inset.** It starts where text starts in every other row, then the narrow gap, then the picture or text. The select-all box above the list lines up with the row boxes.
* **Pictures in a list share one slot.** Rows with thumbnails of different shapes reserve one slot the width of the widest shape and center each picture in it, so every title starts at the same place. A row's checkbox centers on that slot.
* **Secondary text lines up down a list.** When rows show a name and secondary text, every row shares the name column's width, so the secondary text starts at the same place in each row. On a narrow screen it wraps under the name instead.
* **Numbers align right, text aligns left.** Numbers use even width digits. A number column's heading ends exactly where its digits end, so its sort arrow sits on the side away from the aligned edge.
* **A control's edge matches the edge beside it.** Fields, buttons, rows, and headings in one column share a left edge and a right edge.
* **Nothing spills out of its frame.** When content cannot fit, the layout adapts first: a table turns compact and shows icon headings, and a diagram redraws as a stack. Only when no layout fits does the content scroll, inside its frame and as one piece, never the page.
* **A component picks its compact layout by its own width,** not the window's, so it fits wherever it is placed. A compact layout stacks into one text column beside a smaller picture and keeps related parts together, such as a status and its detail.
* **Separators belong to the part after them.** A dot or bar between parts of a line is drawn before the following part, so a part that wraps never leaves a separator hanging at the end of a line.
* **Category labels are never dropped.** Points along a line, such as hours, may thin out. Bars and other categories keep every label and shorten it with an ellipsis, with the full text as its tooltip.
* **Text is never shrunk to fit.** A picture that is too wide reflows at full size instead of scaling down until it cannot be read. Long labels end in an ellipsis and keep the full text in their tooltip.

## Fields

* **Use the right input type, and Base adorns it.** A number gets Base's up and down arrows in place of the browser's spinner. A date or time always shows its picker icon. A search box shows a search icon. Every one of these sits inside the box, at its trailing end.
* **Affordances that act on the value sit inside the box.** The search icon, picker icons, steppers, the reveal eye, and a fixed prefix such as `#` are part of the field. Actions that act on the whole field, such as Copy, sit outside it.
* **Text the reader never types is part of the box.** A required prefix or unit, such as `#` or `%`, is drawn in the field, dimmed, and is never typed.
* **One field look.** Text inputs, text areas, selects, and every Base field share one surface, border, rounding, focus ring, and chevron.
* **Every field validates through one core.** Rules come from the field's own attributes, such as `required`, `min`, `max`, `pattern`, and its type, plus an optional `validate` function. A component never writes its own range check.
* **An error sits under its field,** with its state icon, through the Field Message, with a red border and `aria-invalid` and `aria-describedby` wired. It shows when the field is left, and updates as the reader types once it is showing.
* **A form refuses to save while a field is invalid.** Save checks every field, shows every message, and moves focus to the first invalid one.
* **A secret shows one of three states.** Nothing stored shows the help text. A value that is stored but not in the page shows dots in secondary gray. A value the page knows, or one being typed, shows the browser's regular dots. Showing a secret is opt in, through an eye inside the box.
* **Demo markup uses the real field type.** A port is a number box, a date is a date box, so the gallery shows what a plugin gets.

## Buttons and Toggles

A button is `base-button` on Jellyfin's raised button, with at most one variant and one size.

| Variant | Use |
| :--- | :--- |
| `primary` | The main action, such as Save. Accent filled |
| `secondary` | A lower emphasis action, such as Cancel. Muted. A button with no variant looks like this |
| `destructive` | An action that destroys data. Red filled |

* **A custom color is a hex code** through `applyColor`, which picks black or white text for contrast.
* **`fill` spans the width** on a medium or large button. In a `base-button-row`, fill buttons share the width a wide space apart.
* **On and off are never subtle.** A toggle that is on is filled with its color and shows a check. One that is off is an outline, dimmed, with a small dot of its color. The reader can tell the state from across the room.
* **A yes or no value is a checkbox, never a field-sized button.** Every box is the shared Checkbox, built on the checkbox core: a small outlined box that fills with the accent and a check while on, with its text beside it. A row of fields that holds one stands it a field tall with the box centered on the fields' line. Nothing draws its own box.
* **Progress lives where it fits.** A medium or large button fills a bar along its bottom. A small button is too short, so a pie fills beside it.

## Lists and Tables

* **Every list is a List.** The List owns the frame, the height, and the empty and loading states, and the component renders each item. Never set a list's height or overflow in CSS.
* **Height is a choice:** grows with the page, a fixed height that scrolls inside, grows to a cap, or fills to the bottom of the window.
* **Empty and loading text come from the List,** in one shared style. A component never builds its own empty sentence.
* **A table sorts, filters, and selects through the data view and selection cores.** A sortable heading sorts ascending, then descending, then not at all, and carries `aria-sort`. Its arrow shows only while it is sorted.
* **A narrow table turns compact before it scrolls.** Number columns narrow and headings with an icon show the icon, with the label kept as the tooltip and the accessible name.

## Color

### Tokens

Components take their colors from `src/css/design-tokens.css`. A component never writes a raw color for something a token covers.

| Token | Use |
| :--- | :--- |
| `--base-accent`, `--base-accent-hover`, `--base-accent-wash` | Links, focus rings, primary buttons, progress, selection. Follows the theme's primary color |
| `--base-fg` | The theme's text color |
| `--base-surface` | Panel and field backgrounds. Follows the theme's paper color |
| `--base-border` | Every border and divider |
| `--base-wash`, `--base-wash-strong` | Hover and subtle fills, as a share of the text color |
| `--base-mono` | Code, ids, paths, hex codes, and raw errors |
| `--base-success`, `--base-warning`, `--base-error`, `--base-error-hover` | Solid status colors |
| `--base-on-accent`, `--base-on-warning` | Text on an accent or status fill, and on a light status fill |
| `--base-<color>-bg`, `--base-<color>-fg` | Tinted background and text for each status color |

* Lines and washes are a share of the text color, so light themes get dark ones. There is no per theme rule.
* A new color is a token first, then used.

### Meaning

A color means the same thing in every component and every plugin.

| Color | Means |
| :--- | :--- |
| Green | Done and healthy |
| Red | Failed, or about to lose data |
| Orange | Waiting, or needs attention soon |
| Purple | Working right now |
| Blue | Informational |
| Gray | Off or not applicable |

* Yellow, pink, and teal are extra tints with no status meaning.
* **Every place that takes a color takes a status name or a hex code.** Badges, buttons, cards, avatars, dots, rings, timelines, lanes, and map layers all go through the color core, so a custom color works everywhere.
* **A frame never wears a meaning color.** An outline that is not a status, such as the hub of a diagram, is neutral, so it is never mistaken for one of the colored lines around it.
* **Combined colors mix like paint.** When one mark stands for several colored things, such as a country with counts in several layers, its color mixes theirs by share, so red and yellow make orange. Keep such a picture to three colors so the mix can still be read.
* **Never use color alone.** A badge always has a word, a dot always has a label, and a mixed color always has a tooltip with the numbers.
* `badge.css` and `BADGE_STATES` map state names to colors from one list. Use "orange" for the warning color in class names, never "amber".

### Older Engines

The desktop app and older TV webviews have no `color-mix()`, no `:has()`, and the oldest have no `:is()`. [CssFallbackTests](testing.md#css-tests) enforce this.

* A `color-mix()` of `currentColor` follows a plain `rgba()` of the same property.
* A `color-mix()` of a variable goes in an `@supports (color: color-mix(in srgb, red, blue))` block after a plain rule.
* A token starts on a plain color and upgrades in the `@supports` block in `design-tokens.css`.
* Never use `:has()` for a rule an older engine needs. Set a class from the JS instead.
* White is written only in the tokens.

## Icons

Icons come from the Material Icons font that Jellyfin's dashboard loads, drawn through `icon()` in `src/js/lib/dom.ts`. Each meaning has one icon, and `icons.test.mjs` fails when a component uses another arrow or draws an icon from a text character.

| Meaning | Icon |
| :--- | :--- |
| Opens or closes a section, card, or panel. Points down while closed and turns up while open | `expand_more` |
| Opens a dropdown | `keyboard_arrow_down` |
| Moves an item, or steps a number, up or down | `keyboard_arrow_up`, `keyboard_arrow_down` |
| Opens a date picker | `calendar_today` |
| Opens a time picker | `schedule` |
| Searches | `search` |
| Shows or hides a secret | `visibility`, `visibility_off` |
| Separates the levels of a trail, and opens a record from its row | `chevron_right` |
| Marks a toggle that is on | `check` |
| Opens a row for editing | `edit` |
| A rising or falling trend, a sort direction, and the folder above | `arrow_upward`, `arrow_downward` |
| A route from one place to the next, turned down when the places stack | `arrow_forward` |
| Removes, clears, or closes | `close` |
| Shows a link as a QR code | `qr_code_2` |
| Reloads | `refresh` |
| A user with no picture | `person`, on the avatar's gray circle |
| A state in a message | `check_circle`, `error`, `warning`, `info` |

* A chevron takes one of two sizes, `--base-chevron-primary` or `--base-chevron-secondary`, never its own.
* Add a meaning here, and to `icons.test.mjs`, before a component uses a new icon for it.

## Messages and Status

* **A status line is an icon and a sentence** in its state's color, built as `base-icon-text`. Success, error, warning, and info each have their icon.
* **A message reports what happened** in one sentence that ends with a period, such as "Saved." or "Could not save."
* **A transient message is a live region.** A toast and a status line are `role="status"`, and only an error is `role="alert"`.
* **Progress that is neither success nor failure,** such as "Checking…", takes the info state, never the success state.

## Behavior

* **Options are plain data.** What a component shows and how it looks is a string, number, boolean, array, or object of those. A callback only reports a change or supplies behavior.
* **A handle is `{ element, getValue, setValue, destroy }`.** A handle with items adds `setItems`, and `destroy` removes every listener the component added.
* **A label that names a row is a template,** such as "Remove {value}".
* **A floating panel closes on Escape and on an outside click,** and Escape returns focus to the control that opened it. It never clips inside a scrolling parent, flips above near the bottom, and stays on screen.
* **A selection can be cleared the way it was made.** A second click on the selected row, country, or pill clears it.
* **Motion respects the user.** Skeletons stop pulsing and spinners slow under `prefers-reduced-motion: reduce`.
* **States are modifiers or attributes,** never a class per state. The `[hidden]` attribute always hides.
* **No inline style in what a component builds,** except a custom property a token reads, such as a custom color.
* **`!important` only where an `emby-*` rule must be beaten.**

## Layout

* Every component works at phone width. Check each new or changed component in the [gallery](testing.md#the-gallery) at desktop width, about 1280px, at tablet width, 768px, and at phone width, 375px.
* Never set a width in pixels on a field. Let it fill its container.
* Use Base's breakpoints, never a new one.
* A dialog on a touch screen never focuses a text field automatically.

## Accessibility

* A dialog has `role="dialog"` and `aria-modal="true"`, and is named by its title.
* A collapsible header carries `aria-expanded` and `aria-controls`.
* An icon only control has a `title` and an `aria-label`. An icon span has `aria-hidden="true"`.
* Anything that acts on a click also acts on Enter and Space, and shows an accent focus ring.
* A picture that can be clicked, such as a map country or a diagram pill, is a button with a name that includes its numbers.
* Escape closes the top dialog only. Focus moves into a dialog, stays inside it, and returns to the control that opened it.
* A destructive button never takes focus automatically.

## Writing

These rules apply to every string Base ships, including default labels, template text, C# strings, comments, and docs.

### The Rules

* **No em dashes or en dashes as punctuation.** Split the sentence, or join it with a comma and "and". An en dash in a numeric range is fine.
* **No semicolons.** Split the sentence.
* **Avoid colons.** Never end a label with one.
* **One sentence.** Two only when the second gives the fix or the consequence.
* **End every sentence with a period.** Labels, buttons, titles, and table cells are not sentences and take no period.
* **No "please", "successfully", "simply", or "just".**
* **No exclamation marks, and no ALL CAPS for emphasis.**
* **No "(s)".** Write the right plural for the count.
* **No contractions, and no "e.g." or "i.e.".** Write "cannot" and "such as".
* **American spelling.**

### Casing

| Text | Case | Example |
| :--- | :--- | :--- |
| Button, dialog title, badge, column header, activity name | Title Case | Last Sync |
| Message, description, placeholder sentence | Sentence case | Saved. |

Title Case capitalizes every word except short articles, conjunctions, and prepositions in the middle. Keep acronyms as written, such as "URL".

### Words to Use

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

* A default label is an option the caller can replace. A new default needs an option.
* A placeholder shows a valid example, never an instruction.
* A confirm names its action. Its title is the action, and its button repeats the verb, never "OK" or "Yes".
* Use the ellipsis character, never three dots, and only for work in progress.

## Templates

* A template is one self contained HTML file that works with no JavaScript from Base.
* A template's classes never collide with the kit CSS.
* Fill values through `{{KEY}}` placeholders and `TemplateLoader.Fill`, and encode every value in the helper that calls it.

## Checklist

Run every new or changed component through this list.

* [ ] It is built from Base components and cores, and copies none of them.
* [ ] It is new only because no existing component or variation fits.
* [ ] Its sizes, spacing, rounding, shadows, and colors are tokens.
* [ ] Placed beside a field, a button, or a row, it is the same height and lines up.
* [ ] Icons are centered on the first line of their text, and headings line up with their values.
* [ ] Nothing spills out of its frame at tablet or phone width, and no text is shrunk to fit.
* [ ] Every mark on screen carries information.
* [ ] It takes a status name or a hex code wherever it takes a color, and never relies on color alone.
* [ ] Every `color-mix()` has its fallback, and nothing an older engine needs uses `:has()`.
* [ ] Focus, Escape, Enter, and Space behave.
* [ ] Its strings follow [Writing](#writing), and every default label can be replaced.
* [ ] It looks right in the gallery at desktop, tablet, and phone width.
