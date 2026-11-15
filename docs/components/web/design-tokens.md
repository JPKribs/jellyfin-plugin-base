# Design Tokens

All tokens are CSS custom properties on `:root`, defined in `src/css/tokens.css`. They are global, so body level surfaces such as dialogs resolve them. A component never writes a hex value for something a token covers.

## Theme Tokens

These follow the live Jellyfin web client theme and fall back to the dark theme value when the theme variable is missing.

| Token | Use |
| :--- | :--- |
| `--jpk-accent` | The theme accent, from `--jf-palette-primary-main`. Focus rings, selected states, primary buttons, links in dialogs, and progress |
| `--jpk-accent-hover` | The accent a little darker, for hover on accent buttons |
| `--jpk-border` | The standard 1px line color, a share of the text color. Field, card, and divider borders |
| `--jpk-surface` | The raised surface behind inputs, cards, rows, and dropdowns, from `--jf-palette-background-paper` |
| `--jpk-fg` | The theme text color. A wash on an element that fades its own text |
| `--jpk-on-accent` | Text on an accent or status fill. It is fixed white, since the fill never follows the theme text color |
| `--jpk-on-warning` | Text on a light status fill such as green, orange, yellow, gray, and blue, where white is too faint. It is a fixed dark gray |
| `--jpk-accent-wash` | A faint accent fill for a selected row |
| `--jpk-wash` | A faint wash of the text color, for a quiet button or a thumbnail backdrop |
| `--jpk-wash-strong` | The same wash at 12 percent, for a hover or a border on a `--jpk-wash` fill |

A token that uses `color-mix()` starts on a plain color and upgrades where the engine supports it.

## Status Colors

Fixed colors, the same in light and dark themes.

| Token | Use |
| :--- | :--- |
| `--jpk-success` | Success text, healthy dots, saved state |
| `--jpk-error` | Errors, destructive actions, invalid state |
| `--jpk-error-hover` | Hover on a destructive button |
| `--jpk-warning` | Caution, unsaved changes, a checking dot, a dirty row button |
| `--jpk-green-bg`, `--jpk-green-fg` | A green badge or card |
| `--jpk-red-bg`, `--jpk-red-fg` | A red badge or card |
| `--jpk-orange-bg`, `--jpk-orange-fg` | An orange badge or card |
| `--jpk-purple-bg`, `--jpk-purple-fg` | A purple badge or card |
| `--jpk-blue-bg`, `--jpk-blue-fg` | A blue badge or card |
| `--jpk-gray-bg`, `--jpk-gray-fg` | A gray badge or card |
| `--jpk-yellow-bg`, `--jpk-yellow-fg` | An extra tint for a badge or card |
| `--jpk-pink-bg`, `--jpk-pink-fg` | An extra tint for a badge or card |
| `--jpk-teal-bg`, `--jpk-teal-fg` | An extra tint for a badge or card |

The `-bg` token is a 20 percent tint and the `-fg` token is the solid color. Yellow, pink, and teal are extra tints for badges, cards, avatars, and timeline markers. They carry no status meaning.

## Status Color Meanings

A color means the same thing in every component and every plugin. Use "orange" for the warning color in class names, never "amber" or "warning". The callout class `jpk-warn` is the one exception, since it names a notice and not a color.

| Color | Means | Callout | Badge states |
| :--- | :--- | :--- | :--- |
| Green | Done, healthy, on | `jpk-success` | Active, Synced, Downloaded, Completed, Enabled |
| Red | Failed, blocked, destructive | `jpk-error` | Disabled, Errored, Error, Deleting, Pending-Deletion, Failed |
| Orange | Waiting, caution | `jpk-warn` | Expired, Queued, Paused |
| Purple | Working, held | None | Locked, Running, Downloading, Pending, Pending-Download |
| Blue | Information, role | `jpk-info` | Admin, Imported, Pending-Replacement |
| Gray | Inactive, muted | `jpk-neutral` | Ignored, Group, Skipped, Unknown |

Never use color alone. A badge always has a word, and a dot always has a `title`. See [Badge](badge.md) and [Status Dot](status-dot.md).

## Spacing and Typography

* `--jpk-field-gap` is `1.5em`, the single spacing token. Every field row, kit block, and section inside a config page or dialog takes it as its bottom margin, so the gap between fields is uniform. See [Form Fields](form-fields.md).
* `--jpk-mono` is the only font token, a mono stack for paths, ids, addresses, and code. The `jpk-mono` class applies it. See [Utility Classes](utility-classes.md).
* There are no other typography or spacing tokens. Text inherits the page font.

## Light and Dark

The kit has no theme switch of its own. Accent, surface, and text follow the web client's palette variables, and lines and washes are shares of the text color. Status swatches, the dialog backdrop, and the callout tints are fixed colors. The standalone [Status Page](status-page.md) is always dark. The toggle in the corner of the example below switches the preview between light and dark.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/design-tokens.html" title="Design Tokens example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "design-tokens.html"
```
