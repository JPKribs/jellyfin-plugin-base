# Filter Panel

A Filter button that counts the filters on and opens a panel of filter groups. Each group is a heading over checkboxes, or over radio choices when only one value may be picked.

## When to Use

* Use it above a list that narrows by several criteria at once, such as status, kind, and owner.

## When Not to Use

* Use the `filters` of a [Filtered List](filtered-list.md), [Data Table](data-table.md), or [Paginated Table](paginated-table.md) when a few filters fit in the list's own toolbar.
* Use a [Checkbox List](checkbox-list.md) for a long searchable list of picks, and a [Rule Builder](rule-builder.md) for a filter the reader writes.

## Usage

```js
import { createFilterPanel } from './configurationpage?name=myplugin_jpkribs_shared.js';

var filter = createFilterPanel({
    groups: [
        { name: 'status', label: 'Status', options: [{ value: 'active', label: 'Active' }, { value: 'paused', label: 'Paused' }] },
        { name: 'kind', label: 'Kind', single: true, options: [{ value: 'movie', label: 'Movies' }, { value: 'show', label: 'Shows' }] }
    ],
    value: { status: ['active'] },
    onChange: function (value) { reload(value.status, value.kind[0]); }
});
toolbar.appendChild(filter.element);
```

Classes: `base-filter-button`, `base-filter-count`, `base-filter-panel`, `base-filter-groups`, `base-filter-group`, `base-filter-actions`, `base-filter-dialog`. The handle is `{ element, getValue, setValue, setGroups, open, close, isOpen, destroy }`, where `element` is the button.

Parts: `base-filter-text`, `base-filter-title`, `base-filter-group-name`, `base-filter-option`, `base-filter-input`, `base-filter-clear`, `base-filter-done`. Each option row reuses `base-check-row` from the [Checkbox List](checkbox-list.md).

## States and Modifiers

* The value maps each group name to an array of picked values. `getValue` lists every group, with an empty array for a group with none. A value that names no group or option is dropped, and a `single` group keeps at most one.
* The badge shows the count of picked values and hides at zero. The button takes `active` while any filter is on, and its `aria-label` reads "Filter, 3 filters on".
* The defaults are "Filter" (`buttonText`), "Filters" (`title`), "Clear" (`clearText`), "Done" (`doneText`), "{value} filters on" (`countLabel`), and "{value} filter on" (`countOneLabel`).
* `applyOnChange` (default true) applies and reports each change at once. With false, changes apply on Done, and Escape, an outside click, or leaving the panel drops them.
* The panel is a popover under the button, or above it when there is no room. On a screen under 600px wide, or with `asDialog: true`, it opens as a [Dialog](dialog.md) with the Clear and Done buttons in its footer.
* Opening moves focus to the first box. Escape and an outside click close the panel and return focus to the button, and Tab out of the popover closes it.
* Clear unchecks every group. `setValue` and `setGroups` do not call `onChange`.
* `onChange` reports a fresh copy of every group, so a list that filters by group name can take it as it is, and an empty array means no filter for that group.

## Gotchas

* The popover is placed in the page right after the button, so the button needs a parent for the Tab order to follow it.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createFilterPanel`

<code>function createFilterPanel(options?: FilterPanelOptions): FilterPanelHandle</code>

A Filter button with a count of the filters on, which opens a panel of filter groups. The panel is a popover under the button, or a dialog on a screen under 600px wide or with asDialog.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `groups` | <code>FilterPanelGroup[]</code> | array of { name, label, single, options: [{ value, label }] } [optional] |
| `value` | <code>FilterPanelValue &#124; null</code> | object from group name to an array of picked values, where a single group holds at most one [optional] |
| `buttonText` | <code>string</code> | text of the button (default 'Filter') |
| `title` | <code>string</code> | heading of the panel (default 'Filters') |
| `clearText` | <code>string</code> | text of the button that unchecks every group (default 'Clear') |
| `doneText` | <code>string</code> | text of the button that closes the panel (default 'Done') |
| `countLabel` | <code>string</code> | end of the button's aria-label while filters are on, where {value} is the count (default '{value} filters on') |
| `countOneLabel` | <code>string</code> | the same while one filter is on (default '{value} filter on') |
| `applyOnChange` | <code>boolean</code> | apply each change at once, or with false only on Done (default true) |
| `asDialog` | <code>boolean</code> | always open as a dialog (default false) |
| `onChange` | <code>(value: FilterPanelValue): void</code> | function(value) called each time the picked values apply [optional] |

| Handle member | Type |
| :--- | :--- |
| `element` | <code>HTMLButtonElement</code> |
| `getValue` | <code>(): FilterPanelValue</code> |
| `setValue` | <code>(value: FilterPanelValue &#124; null): void</code> |
| `setGroups` | <code>(groups: FilterPanelGroup[] &#124; null): void</code> |
| `open` | <code>(): void</code> |
| `close` | <code>(): void</code> |
| `isOpen` | <code>(): boolean</code> |
| `destroy` | <code>(): void</code> |

| Type | What it is |
| :--- | :--- |
| `FilterPanelOption` | One choice in a filter group. |
| `FilterPanelGroup` | One group of a filter panel, shown as a heading over checkboxes, or over radio choices when single is true. |
| `FilterPanelValue` | The picked values of a filter panel, from group name to the values picked in it. |

| Class | What it looks like |
| :--- | :--- |
| `base-filter-button` | Filter button with a leading icon, its text, and a round accent badge counting the filters on |
| `base-filter-count` | Small round badge with the count of filters on, hidden while none is on |
| `base-filter-panel` | Floating panel of filter groups on the base-float surface, fixed to the viewport, placed by createFilterPanel under the button, or above it with no room |
| `base-filter-title` | Bold heading at the top of the floating panel |
| `base-filter-groups` | Scrolling stack of filter groups, in the floating panel or in the dialog body |
| `base-filter-group` | One group of checkbox rows, or radio rows with single, under its name |
| `base-filter-group-name` | Small dimmed name over a group's rows |
| `base-filter-option` | One option row, which shows an accent ring while its box has focus |
| `base-filter-actions` | Row of the Clear and Done buttons at the end of the floating panel |

<!-- reference:end -->

## Used By

No plugin uses it today.

## Example

<iframe class="base-preview" src="../../../assets/previews/filter-panel.html" title="Filter Panel example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "filter-panel.html"
```
