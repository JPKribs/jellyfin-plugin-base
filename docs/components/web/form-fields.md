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

* The rules apply only inside `.pluginConfigurationPage` and `.jpk-dialog`. A field outside both looks like stock Jellyfin.
* The three containers and these kit blocks take `margin: 0 0 var(--jpk-field-gap) 0`: `jpk-selector`, `jpk-cards`, `jpk-card-list`, `jpk-choice-group`, the callouts, `jpk-record-card`, `jpk-asset-list`, `jpk-field-row`, `jpk-panel`, `jpk-static-table-scroll`, `jpk-pill-group`, `jpk-ordered-list`, `jpk-section`, and `jpk-collapsible-section`.
* Inside a field container the label, input, select, button, and any `jpk-` child lose their margins. A child with no kit class keeps its spacing.
* Text, number, password, search, url, email, and date inputs, textareas, and selects share one surface, border, radius, and accent focus border. They are full width.
* Every select hides its native arrow and paints one chevron. The arrow container that emby injects is hidden, so a select never shows two.
* `fieldDescription` sits on its own line under a checkbox.

## Gotchas

* Input types other than the seven listed, such as time and tel, do not get the field look. A date input draws its picker icon in the browser's own color.
* The rules are forced, so a plugin override needs its own forced rule or a more specific selector.

## Used By

Artwork Generator, Custom Pages, Live Channels, Remote Access, Requests, Scripts, Server Sync, User Management, and YouTube Audio use it.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/form-fields.html" title="Form Fields example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "form-fields.html"
```
