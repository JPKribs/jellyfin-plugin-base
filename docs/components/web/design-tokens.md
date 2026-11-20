# Design Tokens

All tokens are CSS custom properties on `:root`, defined in `src/css/design-tokens.css`. They are global, so body level surfaces such as dialogs resolve them. A component never writes a hex value for something a token covers.

## Theme Tokens

These follow the live Jellyfin web client theme and fall back to the dark theme value when the theme variable is missing.

| Token | Use |
| :--- | :--- |
| `--base-accent` | The theme accent, from `--jf-palette-primary-main`. Focus rings, selected states, primary buttons, links in dialogs, and progress |
| `--base-accent-hover` | The accent a little darker, for hover on accent buttons |
| `--base-border` | The standard 1px line color, a share of the text color. Field, card, and divider borders |
| `--base-surface` | The raised surface behind inputs, cards, rows, and dropdowns, from `--jf-palette-background-paper` |
| `--base-fg` | The theme text color. A wash on an element that fades its own text |
| `--base-on-accent` | Text on an accent or status fill. It is fixed white, since the fill never follows the theme text color |
| `--base-on-warning` | Text on a light status fill such as green, orange, yellow, gray, and blue, where white is too faint. It is a fixed dark gray |
| `--base-accent-wash` | A faint accent fill for a selected row |
| `--base-wash` | A faint wash of the text color, for a quiet button or a thumbnail backdrop |
| `--base-wash-strong` | The same wash at 12 percent, for a hover or a border on a `--base-wash` fill |

A token that uses `color-mix()` starts on a plain color and upgrades where the engine supports it.

## Status Colors

Fixed colors, the same in light and dark themes.

| Token | Use |
| :--- | :--- |
| `--base-success` | Success text, healthy dots, saved state |
| `--base-error` | Errors, destructive actions, invalid state |
| `--base-error-hover` | Hover on a destructive button |
| `--base-warning` | Caution, unsaved changes, a checking dot, a dirty row button |
| `--base-green-bg`, `--base-green-fg` | A green badge or card |
| `--base-red-bg`, `--base-red-fg` | A red badge or card |
| `--base-orange-bg`, `--base-orange-fg` | An orange badge or card |
| `--base-purple-bg`, `--base-purple-fg` | A purple badge or card |
| `--base-blue-bg`, `--base-blue-fg` | A blue badge or card |
| `--base-gray-bg`, `--base-gray-fg` | A gray badge or card |
| `--base-yellow-bg`, `--base-yellow-fg` | An extra tint for a badge or card |
| `--base-pink-bg`, `--base-pink-fg` | An extra tint for a badge or card |
| `--base-teal-bg`, `--base-teal-fg` | An extra tint for a badge or card |

The `-bg` token is a 20 percent tint and the `-fg` token is the solid color. The `custom` class makes the same pair, `--base-custom-bg` and `--base-custom-fg`, from a hex code in `--base-custom`, which `applyColor` sets. Yellow, pink, and teal are extra tints for badges, cards, avatars, and timeline markers. They carry no status meaning.

## Discord Colors

Discord's dark theme, for the [Notify Preview](notify-preview.md)'s Discord post only, so it looks as Discord shows it in any Jellyfin theme. No other component reads them.

| Token | Use |
| :--- | :--- |
| `--base-discord-bg` | The message background |
| `--base-discord-embed` | An embed's background |
| `--base-discord-edge` | An embed's bar with no color, and a code border |
| `--base-discord-text` | The text |
| `--base-discord-strong` | Names, titles, and field names |
| `--base-discord-muted` | The time |
| `--base-discord-link` | A link and a linked title |
| `--base-discord-brand` | The avatar with no picture and the app tag |

## Status Color Meanings

A color means the same thing in every component and every plugin. Use "orange" for the warning color in class names, never "amber" or "warning". The callout class `base-warn` is the one exception, since it names a notice and not a color.

| Color | Means | Callout | Badge states |
| :--- | :--- | :--- | :--- |
| Green | Done, healthy, on | `base-success` | Active, Synced, Downloaded, Completed, Enabled |
| Red | Failed, blocked, destructive | `base-error` | Disabled, Errored, Error, Deleting, Pending-Deletion, Failed |
| Orange | Waiting, caution | `base-warn` | Expired, Queued, Paused |
| Purple | Working, held | None | Locked, Running, Downloading, Pending, Pending-Download |
| Blue | Information, role | `base-info` | Admin, Imported, Pending-Replacement |
| Gray | Inactive, muted | `base-neutral` | Ignored, Group, Skipped, Unknown |

Never use color alone. A badge always has a word, and a dot always has a `title`. See [Badge](badge.md) and [Status Dot](status-dot.md).

## Spacing and Typography

* There are two spacings. `--base-gap-wide` (16px) sits between components, such as one field row and the next, and under a title. `--base-gap-narrow` (8px) sits inside a component, such as a label and its field, a field and its hint, and the items or buttons in a group. Every gap and margin in the kit is one of them.
* The size scale is `--base-size-small`, `--base-size-medium`, and `--base-size-large` (24, 32, and 40px tall), with the matching `--base-font-*`, `--base-pad-*`, `--base-icon-*`, and `--base-line-*` line heights. Fields read it through `--base-field-height`, `--base-field-font`, and `--base-field-pad`, which default to medium.
* `--base-chevron-primary` (24px) and `--base-chevron-secondary` (18px) are the two chevron sizes.
* `--base-mono` is the only font token, a mono stack for paths, ids, addresses, and code. The `base-mono` class applies it. See [Utility Classes](utility-classes.md).
* `--base-radius-small`, `--base-radius-medium`, `--base-radius-large`, and `--base-radius-round` (4, 6, 8, and 999px) are the corner radii.
* `--base-shadow-float` and `--base-shadow-dialog` are the two shadows, and `--base-layer-float` (1000) and `--base-layer-dialog` (10000) are the two stacking layers.
* There are no other typography or spacing tokens. Text inherits the page font.

## Color Helpers

Every colored component takes a `color` option that is a status color name or a hex code. The bundle exports the helpers those components use, for a plugin's own colored markup.

```js
import { applyColor, colorClass, colorStyle } from './configurationpage?name=myplugin_jpkribs_shared.js';

applyColor(el, '#e91e63');
var html = '<span class="base-badge ' + colorClass(color, 'gray') + '"' + colorStyle(color) + '>Ready</span>';
```

* `COLOR_NAMES` lists the nine status color names.
* `applyColor(el, color, fallback)` swaps in the class for a color. For a hex code it adds `custom` and sets `--base-custom` and `--base-custom-on`.
* `colorClass(color, fallback)` returns that class, and `colorStyle(color)` returns the matching `style` attribute for markup built as text.
* `isHexColor(color)` says whether a value is a hex code, and `textOn(hex)` returns black or white text for a fill.
* `parseColor(text)` reads a hex code or `rgb()` text, `toHexColor(rgba, alpha)` writes one back, and `resolveColor(color, scope)` also reads a status color name through its token.
* `mixColors(parts, scope)` mixes `{ color, weight }` parts as paint does, so red and yellow make orange.

## Light and Dark

The kit has no theme switch of its own. Accent, surface, and text follow the web client's palette variables, and lines and washes are shares of the text color. Status swatches and the dialog backdrop are fixed colors, and the callout tints are mixed from the swatches. The standalone [Status Page](status-page.md) is always dark. The toggle in the corner of the example below switches the preview between light and dark.

## Example

<iframe class="base-preview" src="../../../assets/previews/design-tokens.html" title="Design Tokens example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "design-tokens.html"
```
