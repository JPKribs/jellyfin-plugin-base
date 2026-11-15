# Balanced Rows

Groups of equal tiles wrap in rows of even size, so a wrapped row never holds a single tile. Four tiles that do not fit in one row become two rows of two, five become three and two, and seven become three, two, and two.

## When to Use

* Base balances its own groups: count cards, choice cards, the check grid, and a [List](list.md) in its grid layout. A page built with `createConfigPage` also balances every such group on it.
* Use `balanceRows` for a group of tiles a plugin builds itself, such as a row of stat cards.

## When Not to Use

* Never use it for text chips that size to their words, such as tags, pills, and breadcrumbs. They wrap like text.

## Usage

```js
import * as base from './configurationpage?name=myplugin_jpkribs_shared.js';

var balance = base.balanceRows(container, { minWidth: 160, maxColumns: 4 });
// later, on viewhide
balance.destroy();
```

`bindBalancedRows(view)` balances every count card group, choice group, and check grid under a page, and the ones added later. Both return `{ update, destroy }`.

## States and Modifiers

* `minWidth` is the least a tile takes, 160 by default, and sets how many tiles fit in a row. `maxColumns` caps a row.
* A group's CSS may set `--base-balance-min` and `--base-balance-max` instead, which win over the options, such as `style="--base-balance-max: 4"` in page markup.
* The rows stay within one tile of each other. When a row would hold one tile, the group uses fewer, fuller rows instead.
* Below two columns, as on a phone, each tile takes its own row.
* It lays out again when the group resizes or its tiles change. `update()` lays it out on demand.

## Gotchas

* The group becomes a grid with the `base-balanced` class, so a group's own `display` and column rules give way to it.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `bindBalancedRows`

<code>function bindBalancedRows(root: ParentNode): BalanceHandle</code>

Balances every group of tiles under a root, such as count cards, choice cards, and a check grid, so a wrapped row never holds a single tile. It also balances groups added later. createConfigPage runs it on every page.

| Class | What it looks like |
| :--- | :--- |
| `base-balanced` | Tiles in rows of even size, so no row holds a single tile, laid out by balanceRows |

<!-- reference:end -->

## Used By

No plugin uses it directly. Every count card group and choice group in a plugin gets it through Base.

## Example

<iframe class="base-preview" src="../../../assets/previews/balanced-rows.html" title="Balanced Rows example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "balanced-rows.html"
```
