# Deprecated

These names stay in the bundle so existing plugins keep working. Do not use them in new markup. No plugin uses any of them today.

| Name | Kind | Use instead |
| :--- | :--- | :--- |
| `jpk-button-primary` | Class | `jpk-button-submit`, which has the same rules. See [Button](button.md) |
| `jpk-empty-state`, `jpk-empty-state-card`, `jpk-empty-state-icon`, `jpk-empty-state-title`, `jpk-empty-state-subtitle`, `jpk-empty-state-button` | Classes | `shared.emptySection` or `jpk-empty-section`. See [Empty State](empty-state.md) |
| `jpk-edit-line-spacer` | Class | `margin-left: auto` on the first control to push. See [Bulk Edit Bar and Edit Row](bulk-edit.md) |
| `jpk-readonly` | Class | `jpk-mono`. See [Utility Classes](utility-classes.md) |
| `--jpk-info` | Token | `--jpk-blue-fg` |
| `--jpk-purple` | Token | `--jpk-purple-fg` |
| `--accent-color`, `--accent-hover`, `--border-subtle`, `--error-color`, `--success-color` | Scoped aliases | `--jpk-accent`, `--jpk-accent-hover`, `--jpk-border`, `--jpk-error`, `--jpk-success` |

## Button Primary

`jpk-button-primary` is a copy of `jpk-button-submit`. Write `jpk-button-submit`.

## Empty State Card

The `jpk-empty-state` card centers a 56px accent icon, a title, a subtitle, and a button inside `jpk-empty-state-card`. It has no JavaScript. Write `shared.emptySection` or `jpk-empty-section` instead.

## Edit Line Spacer

`jpk-edit-line-spacer` is a flexible gap that pushes later controls to the end of a line. Put `margin-left: auto` on the first control to push instead.

## Read Only Text

`jpk-readonly` is mono at 90 percent opacity, for read only values. Write `jpk-mono`.

## Unused Tokens

`--jpk-info` and `--jpk-purple` are defined, but no kit rule reads them. Use `--jpk-blue-fg` and `--jpk-purple-fg`.

## Scoped Aliases

These generic names could collide with the dashboard, so they exist only inside `.pluginConfigurationPage` and `.jpk-dialog`. No kit rule reads them. Use the `--jpk-` token each one equals. `--accent-color` equals `--jpk-accent`, `--accent-hover` equals `--jpk-accent-hover`, `--border-subtle` equals `--jpk-border`, `--error-color` equals `--jpk-error`, and `--success-color` equals `--jpk-success`.
