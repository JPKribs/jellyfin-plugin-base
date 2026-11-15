# Collapsible Section

A section whose header toggles a body. The header is a native button.

## When to Use

* Use it for optional or long groups of settings.

## When Not to Use

* Use a [Section](section.md) for content that must stay visible.

## Usage

```html
<div class="jpk-collapsible-section">
    <button type="button" class="jpk-collapsible-header collapsed" aria-expanded="false" data-target="advancedBody">
        <span class="jpk-collapsible-title">Advanced</span>
        <span class="jpk-collapsible-icon">&#9660;</span>
    </button>
    <div id="advancedBody" class="jpk-collapsible-content collapsed">
        <div class="inputContainer"><label for="txtName">Name</label><input is="emby-input" type="text" id="txtName" /></div>
        <div class="jpk-collapsible-actions">
            <button is="emby-button" type="button" class="raised jpk-button-submit jpk-button-small"><span>Save</span></button>
        </div>
    </div>
</div>
```

```js
import { initCollapsibles } from './configurationpage?name=myplugin_jpkribs_shared.js';
initCollapsibles(view); // safe to call again after you add more sections
```

Also on the bag as `shared.initCollapsibles()`. Classes: `jpk-collapsible-section`, `jpk-collapsible-header`, `jpk-collapsible-title`, `jpk-collapsible-icon`, `jpk-collapsible-content`, `jpk-collapsible-actions`.

## States and Modifiers

* Start collapsed by putting `collapsed` on both the header and the content.
* `initCollapsibles` binds each header once, sets `aria-controls` from `data-target`, and keeps `aria-expanded` in step.
* The icon is replaced by the web client's `expand_more` Material icon, whatever glyph the markup holds.
* Enter and Space toggle it because the header is a button. The state is not stored.
* `jpk-collapsible-actions` is a footer row inside a body, with a rule above it.

## Gotchas

* Use `type="button"`, or the header submits a surrounding form.
* The content is found inside the `view` you pass, so a section in a body level dialog is not found by a page level call.
* The title is capitalized by CSS, so a sentence case title changes. A [Step](step.md) resets it.

## Used By

Artwork Generator, Live Channels, Remote Access, Requests, Scripts, Server Sync, User Management, and YouTube Audio use it.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/collapsible-section.html" title="Collapsible Section example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "collapsible-section.html"
```
