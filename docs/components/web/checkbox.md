# Checkbox

One checkbox in Base's look, with its text beside it. The box fills with the accent and shows a check while it is on, and shows a bar while it is partly on. Every box Base draws is built on the same checkbox core, so a checkbox here matches the boxes in the [Checkbox List](checkbox-list.md), the [Filtered List](filtered-list.md), the [Filter Panel](filter-panel.md), and the [Tree View](tree-view.md).

## When to Use

* Use it for any yes or no setting you build in script.
* Use the small size, the default, for almost every setting.
* Use `medium` where the checkbox sits beside medium buttons or larger text.
* Use `large` for a few headline settings on their own row, each with a `description`. A large checkbox is a tile that fills the room its row has, and tiles in one row share it and wrap.
* Use `field: true` when a small or medium box sits in a row of text boxes and selects, so its box lines up with them.
* Use `boxed: true` when it should look like one of those fields too: the box and its text sit in a frame drawn like a text box, the same height, border, and corners.

## When Not to Use

* Never use it for a list of choices. Use the [Checkbox List](checkbox-list.md).
* Never use it for one choice of several. Use a select, the [Pill Group](pill-group.md), or the [Choice Group](choice-group.md).
* A checkbox written in a page's own markup already takes this look. Build one in script only when you need its handle.

## Usage

```js
import { createCheckbox } from './configurationpage?name=myplugin_jpkribs_shared.js';

var box = createCheckbox({
    label: 'Sync watched state',
    checked: config.SyncWatched,
    onChange: function (checked) { config.SyncWatched = checked; }
});
view.querySelector('#watchedHost').appendChild(box.element);
```

The handle is `{ element, input, getValue, setValue, setIndeterminate, setDisabled, setLabel, setDescription, destroy }`.

```js
var tile = createCheckbox({
    size: 'large',
    label: 'Sync watched state',
    description: 'Played and resume points follow you between servers.',
    checked: true
});
```

## Sizes

The sizes follow the button scale, so a checkbox lines up with a button of its size.

| Size | Look |
| :--- | :--- |
| `small` (default) | The plain box and text, the small button's height |
| `medium` | A larger box and text, the medium button's height |
| `large` | A bordered tile with a bold label and a dimmed description, filling the room its row has. While on, it is outlined and washed in the accent |

## States and Modifiers

| State | Look |
| :--- | :--- |
| Off | An outlined box |
| On | Filled with the accent, with a check |
| Partly on | Filled with the accent, with a bar. `setIndeterminate(true)` shows it, and a click clears it |
| Disabled | Dimmed, and takes no clicks |
| `field` | Stands a small or medium box a field tall, with the box centered on the line of the fields beside it |
| `boxed` | Frames a small or medium box and its text like a text box, a field tall, so it matches the fields beside it edge for edge. The frame turns the accent on hover |

## Behavior

* A click on the box or its text turns it on or off, and so does Space while it has focus. `onChange` reports the new state.
* `setValue` changes it from code without calling `onChange`.
* With no `label`, `ariaLabel` names the box for screen readers and is its tooltip.
* The Repeater, Matrix Grid, and Mapping Table draw their `toggle` fields with it.

## Reference

<!-- reference:start -->

### `createCheckbox`

<code>function createCheckbox(options?: CheckboxOptions): CheckboxHandle</code>

One checkbox in Base's own look, with its text beside it, built on the checkbox core every Base box shares. The box fills with the accent and a drawn check while on, and shows a bar while partly on. A click anywhere on its text toggles it. It comes in three sizes on the same scale as buttons: small, the plain box and text most pages use; medium, a size up; and large, a bordered tile that fills the room its row has, outlined and washed in the accent while on. With field, a small or medium box stands a field tall with the box centered, so it lines up beside text boxes and selects in a row. With boxed, it sits in a frame drawn like a text box, the same height, border, and corners, so it matches the fields beside it edge for edge. With no label, ariaLabel names it.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `label` | <code>string</code> | the text beside the box [optional] |
| `description` | <code>string</code> | a dimmed line under the label [optional] |
| `size` | <code>CheckboxSize</code> | 'small', 'medium', or 'large' (default 'small') |
| `ariaLabel` | <code>string</code> | the box's name when it has no label [optional] |
| `checked` | <code>boolean</code> | whether it starts on (default false) |
| `indeterminate` | <code>boolean</code> | whether it starts partly on (default false) |
| `disabled` | <code>boolean</code> | whether it starts disabled (default false) |
| `field` | <code>boolean</code> | true stands a small or medium box a field tall, to sit in a row of fields (default false) |
| `boxed` | <code>boolean</code> | true frames a small or medium box and its text like a text box, a field tall (default false) |
| `id` | <code>string</code> | the input's id [optional] |
| `name` | <code>string</code> | the input's name [optional] |
| `value` | <code>string</code> | the input's value [optional] |
| `className` | <code>string</code> | extra classes for the row [optional] |
| `onChange` | <code>(checked: boolean): void</code> | function(checked) after the reader turns it on or off [optional] |

| Handle member | Type |
| :--- | :--- |
| `input` | <code>HTMLInputElement</code> |
| `getValue` | <code>(): boolean</code> |
| `setValue` | <code>(checked: boolean): void</code> |
| `setIndeterminate` | <code>(on: boolean): void</code> |
| `setDisabled` | <code>(disabled: boolean): void</code> |
| `setLabel` | <code>(text: string): void</code> |
| `setDescription` | <code>(text: string): void</code> |
| `destroy` | <code>(): void</code> |

| Type | What it is |
| :--- | :--- |
| `CheckboxSize` | The three checkbox sizes. small is the plain box most pages use, and large is a tile that fills its row. |

| Class | What it looks like |
| :--- | :--- |
| `base-check-row.base-checkbox` | One checkbox with its text beside it, the box and text centered on one line, with no row padding or hover wash. Small is the plain box most pages use |
| `base-check-row.base-checkbox.medium` | A medium checkbox, a size up: the medium button's height, the large box, and the large text |
| `base-check-row.base-checkbox.field` | A checkbox a field tall, so it lines up with the text boxes and selects beside it |
| `base-check-row.base-checkbox.disabled` | A disabled checkbox, dimmed and taking no clicks |

<!-- reference:end -->
