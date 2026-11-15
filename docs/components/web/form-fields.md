# Form Fields

The kit restyles Jellyfin's own field containers, so every field on a config page or in a kit dialog has the same surface, border, focus ring, chevron, spacing, and left edge. You write Jellyfin markup and no kit class.

## When to Use

* Use it for every text input, number input, text area, select, and checkbox.

## When Not to Use

* Use a [Field and Field Row](field.md) for dense lines with several fields side by side.

## Usage

```html
<div class="inputContainer">
    <label for="txtServerName">Name</label>
    <input is="emby-input" type="text" id="txtServerName" placeholder="Default" />
    <div class="fieldDescription">Names the server in tables and logs.</div>
</div>

<div class="selectContainer">
    <label for="selMode">Mode</label>
    <select is="emby-select" id="selMode">
        <option value="Allow">Allowlist</option>
        <option value="Block">Blocklist</option>
    </select>
</div>

<div class="checkboxContainer checkboxContainer-withDescription">
    <label class="emby-checkbox-label">
        <input type="checkbox" is="emby-checkbox" id="chkEnabled" />
        <span class="checkboxLabel">Enabled</span>
    </label>
    <div class="fieldDescription checkboxFieldDescription">Keeps the settings and skips this server while off.</div>
</div>
```

Read and write them with the bag: `getValue(id, fallback)`, `setValue(id, value)`, `getIntValue(id, fallback)`, `getChecked(id)`, `setChecked(id, checked)`, `getEl(id)`, `setVisible(idOrEl, visible)`, `bindEvent(id, event, handler)`, `bindClick(id, handler)`. See [Shared Bag](shared-bag.md).

## States and Modifiers

* The rules apply only inside `.pluginConfigurationPage` and `.base-dialog`. A field outside both looks like stock Jellyfin.
* The three containers and the kit blocks that sit in a form, such as a [Record Selector](record-selector.md), a callout, a [Panel](panel.md), a [Copy Field](copy-field.md), a [String List](string-list.md), or a [Stepper](stepper.md), take one wide gap below them. The last block in a record card or a panel body takes none.
* Inside a field container the label, input, select, button, and any `base-` child lose their margins. A child with no kit class keeps its spacing.
* Text, number, password, search, url, email, date, and time inputs, textareas, and selects share one surface, border, radius, and accent focus border. They are full width.
* Every select hides its native arrow and paints one chevron. The arrow container that emby injects is hidden, so a select never shows two.
* `fieldDescription` sits on its own line under a checkbox.
* A checkbox or radio that Jellyfin does not upgrade, and every `base-check-row-input`, takes one Base look, an accent fill with a drawn check while on, a bar while partly checked, and a dot for a radio. An upgraded `emby-checkbox` keeps Jellyfin's own box.
* A number, date, or time field gets Base's own arrows or picker icon, and a field with a rule in its attributes is checked when it is left. A page built with `createConfigPage` gets both. See [Field Adornments](field-adornments.md) and [Validation](field-message.md#validation).

## Sizes

* Every single line field, a text box, number box, select, date, or picker input, is the same height, 32px, the medium size. A field with `small` or `large` takes 24 or 40px, and so does every field inside an element with `data-base-size="small"` or `"large"`. Components that build fields take a `size` option that sets it.
* A text area keeps its own height and takes the field's text size.

## Gotchas

* Input types other than the eight listed, such as tel, do not get the field look.
* The rules are forced, so a plugin override needs its own forced rule or a more specific selector.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

| Class | What it looks like |
| :--- | :--- |
| `base-record-card` | The last block in a record card or a panel body sits on the padding, with no gap below it |

<!-- reference:end -->

## Used By

Artwork Generator, Custom Pages, Live Channels, Remote Access, Requests, Scripts, Server Sync, User Management, and YouTube Audio use it.

## Example

<iframe class="base-preview" src="../../../assets/previews/form-fields.html" title="Form Fields example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "form-fields.html"
```
