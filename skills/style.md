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
* A plain modifier never takes a class Jellyfin's dashboard CSS styles on its own, such as `card`, `listItem`, or `hide`. Jellyfin's `.card` sets paint containment, which traps a fixed popup. Prefix such a modifier with the component, as `base-repeater-layout-card` is. `CssCollisionTests` pins the list.
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

| Token | Small | Medium | Large |
| :--- | :--- | :--- | :--- |
| `--base-size-*`, the height of a control | 24px | 32px | 40px |
| `--base-font-*`, its text | 12px | 14px | 16px |
| `--base-pad-*`, its side padding | 8px | 12px | 16px |
| `--base-icon-*`, an icon in it | 16px | 18px | 20px |
| `--base-line-*`, a line of its text | 16px | 20px | 24px |

The values live only in `design-tokens.css`. This table is for reading, and a rule never copies a number from it.

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
* **A checkbox takes the scale too.** Small is the plain box and text most settings use. Medium is a size up. Large is a tile that fills its row. A small or medium checkbox in a row of fields stands a field tall with `field`, or sits in a field's frame with `boxed`.
* **A larger picture is a multiple of the scale,** such as `calc(var(--base-size-large) * 6)` for a QR code, so it still lines up with the controls around it.

## Type

* **The page's font, always.** Base inherits Jellyfin's font family and never sets its own, except `--base-mono` for code, ids, paths, hex codes, and raw errors.
* **Text sizes come from the scale.** A control's text is its size's `--base-font-*`. Secondary lines, hints, captions, and tile labels are `--base-font-small`. Nothing writes an `em` or pixel text size.
* **Weight says rank, in two steps.** 600 marks a name or title the eye should land on, such as a row's title, a card's name, or a large checkbox's label. Everything else is the normal weight. A heading inside a component never goes heavier than 600.
* **Small labels over values are uppercase.** A table heading, a definition list's column label, and a subsection title are `--base-font-small`, uppercase, and dimmed, so they read as labels and never as values.
* **Numbers use even width digits** through `font-variant-numeric: tabular-nums`, so a column of numbers, a time, or a count does not jitter as it changes.
* **Long text ends in an ellipsis** with the full text in its tooltip, or wraps at a word. It is never cut mid-letter and never shrunk.

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

Color carries meaning in Base, so it is never decoration. Every color a reader sees comes from one of three places, in this order: Jellyfin's theme, the tokens in `src/css/design-tokens.css`, and the color core in `src/js/lib/color.ts`. A component never writes a raw color for something those cover.

### Where Color Comes From

1. **The theme.** Jellyfin's palette variables feed the three tokens that must follow the theme: `--jf-palette-primary-main` becomes `--base-accent`, `--jf-palette-background-paper` becomes `--base-surface`, and `--jf-palette-text-primary` becomes `--base-fg`. Each has a plain fallback for a page outside the dashboard.
2. **The tokens.** Everything else is a token: the borders, washes, status colors, tints, the text on a fill, and the shadows. A token is the only place a color value is written.
3. **The color core.** Any option that takes a color goes through the core, so every component accepts the same names and hex codes and draws them the same way.

### Tokens

| Token | Use |
| :--- | :--- |
| `--base-accent` | Interaction: links, focus rings, primary buttons, checked boxes, progress, the selection bar. Follows the theme's primary color |
| `--base-accent-hover` | A primary button under the pointer. The accent darkened by 18% |
| `--base-accent-wash` | A selected row or tile, and a large checkbox that is on. The accent at 12% |
| `--base-fg` | The theme's text color, for a wash or border on an element that fades its own text |
| `--base-surface` | Panels, cards, fields, popups, and every frame's background. Follows the theme's paper color |
| `--base-border` | Every border and divider. The text color at 30% |
| `--base-wash`, `--base-wash-strong` | Hover, and subtle fills such as a stripe or a track. The text color at 6% and 12% |
| `--base-success`, `--base-warning`, `--base-error`, `--base-error-hover` | Solid status fills, such as a destructive button |
| `--base-on-accent` | Text on the accent or a dark status fill. White in every theme |
| `--base-on-warning` | Text on a light status fill, such as orange, yellow, green, gray, or blue, where white falls below 3 to 1 |
| `--base-<color>-fg`, `--base-<color>-bg` | Each named color as text and marks, and as a tint at 20% behind them |
| `--base-custom`, `--base-custom-on` | A hex color, set on the element by the color core, with the text color that reads on it |
| `--base-shadow-float`, `--base-shadow-dialog` | The two shadows, black at an alpha |
| `--base-mono` | Not a color, but kept with them: the font for code, ids, paths, hex codes, and raw errors |

### The Named Colors

`COLOR_NAMES` holds the nine colors every colored component takes by name. Each has an `-fg` token for text and marks and a `-bg` token that tints the space behind them.

| Name | Text and marks | Means |
| :--- | :--- | :--- |
| `green` | `#5cb85c` | Done and healthy |
| `red` | `#d9534f` | Failed, off on purpose, or about to lose data |
| `orange` | `#f0ad4e` | Waiting, or needs attention soon |
| `purple` | `#9b59b6` | Working right now, or held |
| `blue` | `#3498db` | Informational, or a role |
| `gray` | `#999` | Ignored, skipped, unknown, or not applicable |
| `yellow` | `#e0c84e` | No status meaning. A tint for categories |
| `pink` | `#e85d9a` | No status meaning. A tint for categories |
| `teal` | `#26a69a` | No status meaning. A tint for categories |

* **A state name maps to its color in one place.** `BADGE_STATES` in `badge.ts` pairs every state a badge shows, such as Synced, Queued, or Running, with its color. A component that shows a state reads the map and never picks a color for a state itself.
* **Write "orange" for the warning color,** never "amber", in classes, options, and docs.
* **A new named color is a token pair first,** then a name in `COLOR_NAMES`, then a row here.

### Custom Colors

Every option that takes a color takes a named color or a hex code, with three, four, six, or eight digits. Anything else falls back to the component's default.

* **`colorClass(color, fallback)`** gives the class: the name for a named color, `custom` for a hex code, and the fallback otherwise.
* **`applyColor(element, color, fallback)`** swaps the element's color class and, for a hex code, sets `--base-custom` and `--base-custom-on`. Every component's `.custom` rule reads those two.
* **`colorStyle(color)`** gives the same two properties as a `style` attribute, for markup built as text.
* **`textOn(hex)`** picks black or white text for a fill by its luminance, so text on a custom fill always passes 4.5 to 1.
* **A custom tint is the hex at 20%,** through `color-mix()`, and falls back to gray's tint in an older engine.
* **`parseColor`, `toHexColor`, and `resolveColor`** read any color, write it back as a hex code, and resolve a named color to its value on the page. The Color Picker and the paint mix are built on them.

### Choosing a Color

* **The accent means "you can act here" or "you chose this."** It marks interaction and selection, never a status. A status never takes the accent.
* **A status color means a state,** and nothing else. A category that is not a state takes yellow, pink, teal, or a hex code.
* **Tint at rest, fill for emphasis.** A badge, pill, or tag is its `-bg` tint with `-fg` text. A button or a large mark that must stand out is a solid fill with `--base-on-accent` or `--base-on-warning` text. A status line is the `-fg` color on the page's own background.
* **Text keeps 4.5 to 1, and marks keep 3 to 1,** against what they sit on. Light fills take dark text through `--base-on-warning` or `textOn`.
* **Dimming has two steps,** and never uses a gray hex. Secondary and helper text, small labels over values, and a toggle, tab, or pill that is off sit at 0.7 opacity. A disabled control, or a field that shows an inherited value, sits at 0.5. Icons, dot separators, and hover marks may recede on their own terms. A dimmed element that draws a border or wash uses `--base-fg`, since its `currentColor` is already faded.
* **An invalid field takes the red border,** and its message takes the red text and the error icon.
* **A frame never wears a meaning color.** An outline that is not a status, such as a diagram's hub, is neutral, so it is never read as one of the colored lines around it.
* **Never use color alone.** A badge has a word, a dot has a label or a tooltip, a lane has a name, and a mixed color has a tooltip with its numbers.

### Default Palettes

A component that draws several colored things with no colors given takes them in a fixed order, kept as a named list in its code and given on its docs page. Every one of them can be replaced through its options.

| Component | Default order |
| :--- | :--- |
| Chart series and pie slices, `SERIES_COLORS` | blue, green, orange, purple, red, teal, pink, yellow, so neighbors never share a color |
| World Map layers, `DEFAULT_COLORS` | blue, yellow, red, the paint primaries, then green, orange, and purple, the secondaries, so a mix stays readable |
| Flow Diagram lanes and status dots | gray, unless a lane or item names a color |
| Setup Checklist steps | done green, needs attention orange, to do gray, optional blue |
| QR Code | dots in the text color, eyes in the accent |
| Progress bar, ring, and pie | the accent |

### Mixing Colors

* **One mark for several colored things mixes them like paint.** `mixColors` mixes by each part's share, as paint does, so red and yellow make orange and yellow and blue make green, then restores the brightness a paint mix loses. The World Map colors a country this way.
* **Keep a mix readable.** A mark mixes at most the layers that are on. Six layers are allowed, but three or fewer on at once read best, which is why the map's default order puts the primaries first.
* **A wash or tint mixes with transparency,** through `color-mix()` with its fallback, never by stacking two translucent layers.

### Light and Dark Themes

Base has no rule per theme. A component written with the tokens is right in both.

* **Lines and washes follow the text color.** Borders and washes are shares of the text color, so a light theme gets dark ones with no extra rule.
* **Fills do not follow the theme.** The accent and the status fills look the same in both, so the text on them is fixed too: white through `--base-on-accent`, or near black through `--base-on-warning`.
* **Shadows are black at an alpha** in both themes.
* **Never write a white or black wash.** An `rgba(255, 255, 255, …)` or `rgba(0, 0, 0, …)` fill reads in one theme and disappears in the other. Take `--base-wash` or `--base-wash-strong`.
* **Check both themes.** Every preview and the gallery have a theme switch. Look at a new or changed component in both.

### Older Engines

The desktop app and older TV webviews have no `color-mix()`, no `:has()`, and the oldest have no `:is()`. [CssFallbackTests](testing.md#css-tests) enforce this.

* A `color-mix()` of `currentColor` follows a plain `rgba()` of the same property.
* A `color-mix()` of a variable goes in an `@supports (color: color-mix(in srgb, red, blue))` block after a plain rule.
* A token starts on a plain color and upgrades in the `@supports` block in `design-tokens.css`, since a token holding `color-mix()` fails where it is used, not where it is parsed.
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
* **Two window breakpoints, never a new one.** `max-width: 768px` is tablet and below, and `max-width: 600px` is a phone, where a filter panel opens as a dialog and wide grids stack. A new rule uses one of these two.
* **A component's own layout follows its own width,** measured with a ResizeObserver, not the window. It turns compact when its contents no longer fit side by side, worked out from what it holds, such as a repeater's fields or a table's number columns, or at 480px for a two-part layout such as a QR code beside its buttons.
* **A ResizeObserver does not run in a background tab.** A component also measures once on the next tick after it is built, so it starts in the right layout.
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

Every string Base ships is in sentence case, as Jellyfin's are. A button, a dialog title, a badge, a column header, and an activity name read "Last sync", and a message reads "Saved.". Keep acronyms and names as written, such as "URL" and "Jellyfin". A Jellyfin string Base uses keeps Jellyfin's words, written in sentence case in English with `"case": "sentence"` in `strings/jellyfin.json` where Jellyfin's are in title case.

`TextCase` and `titleCase` and `sentenceCase` hold the rules. Headings in the docs and the guides stay in Title Case, per [documentation.md](documentation.md#headings).

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
* A default label is one of Base's own strings, read with `baseText(key)` when the component is built, never a literal. Use a Jellyfin string where Jellyfin has the words, and add its key to `BASE_TEXT` in `src/js/lib/base-text.ts` and to `strings/jellyfin.json`. Otherwise add a `Base.` key to `BASE_TEXT` and `strings/en-us.json`. The tests check the two agree.
* Text Base's C# writes for a person, such as a refusal, is written with `BaseTranslations.Text(key, english)`, with the same key in `strings/en-us.json`.
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
* [ ] It takes a named color or a hex code wherever it takes a color, through the color core, and never relies on color alone.
* [ ] It uses the accent only for interaction and selection, and status colors only for states.
* [ ] It looks right in the light and dark themes, with no white or black washes.
* [ ] Every `color-mix()` has its fallback, and nothing an older engine needs uses `:has()`.
* [ ] Focus, Escape, Enter, and Space behave.
* [ ] Its strings follow [Writing](#writing), and every default label can be replaced.
* [ ] It looks right in the gallery at desktop, tablet, and phone width.
