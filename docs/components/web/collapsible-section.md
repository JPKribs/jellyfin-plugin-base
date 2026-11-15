# Collapsible Section

A section whose header toggles a body. The header is a native button. Its header can also hold an icon tile, a subtitle, and an aside, and with `collapsible: false` it is a fixed panel that is always open.

## When to Use

* Use it for optional or long groups of settings.
* Use `collapsible: false` for a framed panel with a rich header, such as one card per library mapping with its route and its mode.

## When Not to Use

* Use a [Section](section.md) for content that must stay visible.

## Usage

```html
<div class="base-collapsible-section">
    <button type="button" class="base-collapsible-header collapsed" aria-expanded="false" data-target="advancedBody">
        <span class="base-collapsible-title">Advanced</span>
        <span class="base-collapsible-icon"></span>
    </button>
    <div id="advancedBody" class="base-collapsible-content collapsed">
        <div class="inputContainer"><label for="txtName">Name</label><input is="emby-input" type="text" id="txtName" /></div>
        <div class="base-collapsible-actions">
            <button is="emby-button" type="button" class="raised base-button primary small"><span>Save</span></button>
        </div>
    </div>
</div>
```

```js
import { initCollapsibles } from './configurationpage?name=myplugin_jpkribs_shared.js';
initCollapsibles(view); // safe to call again after you add more sections
```

Or build one in code, with an optional badge in its header:

```js
import { createCollapsibleSection } from './configurationpage?name=myplugin_jpkribs_shared.js';

var section = createCollapsibleSection({
    title: 'Certificate',
    badge: { label: 'Expires Soon', color: 'orange' },
    content: '<p>The certificate expires in 9 days.</p>',
    collapsed: true
});
view.querySelector('#host').appendChild(section.element);
section.setBadge({ label: 'Renewed', color: 'green' });
```

The handle is `{ element, header, content, getValue, setValue, setTitle, setBadge, setSubtitle, setAside, destroy }`, where `getValue` is whether it is open.

A header with slots, as a fixed panel:

```js
var route = document.createElement('span');
route.textContent = 'Main Server Movies to Movies';
var mode = document.createElement('span');
mode.className = 'base-badge gray';
mode.textContent = 'Copy';

var card = createCollapsibleSection({
    title: 'Movies',
    icon: 'video_library',
    subtitle: route,
    aside: mode,
    collapsible: false,
    content: fieldsNode
});
card.setSubtitle('Main Server Shows to Shows');
```

The same panel written by hand. A fixed header is a `div`, and `initCollapsibles` leaves it alone:

```html
<div class="base-collapsible-section fixed base-panel">
    <div class="base-collapsible-header">
        <span class="base-collapsible-tile" aria-hidden="true"><span class="material-icons">video_library</span></span>
        <span class="base-collapsible-heading">
            <span class="base-collapsible-title" title="Movies">Movies</span>
            <span class="base-collapsible-subtitle">Main Server to This Server</span>
        </span>
        <span class="base-collapsible-aside"><span class="base-badge gray">Copy</span></span>
    </div>
    <div class="base-collapsible-content">Fields go here.</div>
</div>
```

A collapsible header with an aside written by hand. A button cannot hold a control, so the header button, the aside, and the chevron sit side by side in a `base-collapsible-bar`, and `initCollapsibles` makes a click on the bar outside the aside toggle it:

```html
<div class="base-collapsible-section">
    <div class="base-collapsible-bar">
        <button type="button" class="base-collapsible-header" data-target="relayBody">
            <span class="base-collapsible-heading"><span class="base-collapsible-title">Relay</span></span>
        </button>
        <span class="base-collapsible-aside"><button is="emby-button" type="button" class="raised base-button small"><span>Test</span></button></span>
        <span class="base-collapsible-icon"></span>
    </div>
    <div id="relayBody" class="base-collapsible-content">Fields go here.</div>
</div>
```

Also on the bag as `shared.initCollapsibles()`. Classes: `base-collapsible-section`, `base-collapsible-header`, `base-collapsible-title`, `base-collapsible-badge`, `base-collapsible-icon`, `base-collapsible-content`, `base-collapsible-actions`, `base-collapsible-tile`, `base-collapsible-heading`, `base-collapsible-subtitle`, `base-collapsible-aside`, `base-collapsible-bar`, and the `fixed`, `compact`, and `has-tile` modifiers.

## States and Modifiers

* Start collapsed by putting `collapsed` on both the header and the content.
* `initCollapsibles` binds each header once, sets `aria-controls` from `data-target`, and keeps `aria-expanded` in step.
* The icon is replaced by the web client's `expand_more` Material icon, whatever glyph the markup holds.
* A click opens or closes the content to match the header, so the two never drift apart.
* `base-collapsible-icon` turns with `aria-expanded` on any control that holds it, so the [Sortable Card List](sortable-card-list.md) head shares the same chevron.
* Enter and Space toggle it because the header is a button. The state is not stored.
* A built section calls `onToggle(open)` when its header opens or closes it, and `className` adds classes to the section.
* `base-collapsible-actions` is a footer row inside a body, with a rule above it. Its buttons and any `base-status-text` sit centered on one line. `flush` drops the rule and the space above it, for a row that follows its fields directly.
* A header can show a badge or a status dot between its title and its chevron. `setCollapsibleBadge(header, { label, color, dot })` adds or replaces it on any header, built or bound, and `null` removes it. `color` is a status color name, a hex code, or a [Badge](badge.md) state name, and `dot: true` draws a [Status Dot](status-dot.md) named by `label`. In markup, put `base-collapsible-badge` on a `base-badge` before the icon.
* `icon` draws a Material icon in a rounded tile before the title, the size of a large avatar, on the accent wash. `iconColor` is a status color name or a hex code.
* `subtitle` is a dimmed line under the title, as text that ends in an ellipsis with its tooltip, or a node such as a From and To route. `setSubtitle` replaces it, and `null` removes it.
* `aside` is a node at the right of the header, such as a badge, a button, or a toggle, centered on the header's line. `setAside` replaces it, and `null` empties it. A collapsible header with an aside sits in a `base-collapsible-bar` with the chevron beside it, so a control in the aside never sits inside the header button, and a click on the aside never toggles the section.
* With any slot the title sits in `base-collapsible-heading` and ends in an ellipsis with its full text in its tooltip. A section with no slot keeps the plain markup above.
* A section with an aside narrower than 480 pixels, by its own width, takes `compact` and puts the aside on its own line under the title, so the title is never squeezed. Hand written markup can add `compact` itself.
* `collapsible: false` draws a fixed panel: the section takes `fixed` and `base-panel`, so it is framed on the panel surface, the header is a `div` with no chevron, it is always open, `setValue` does nothing, and `onToggle` never runs. `base-panel` on a collapsible section, through `className`, frames it the same way.
* `numbered` on each section of a run numbers their titles 1, 2, 3 in order, for a form split into ordered steps. The number comes from a CSS counter, so markup holds no numbers, and a numbered title keeps the case it is written in. Sections that share a parent count as one run.

## Gotchas

* Use `type="button"`, or the header submits a surrounding form.
* The content is found inside the `view` you pass, so a section in a body level dialog is not found by a page level call.
* The title is capitalized by CSS, so a sentence case title changes. A `numbered` title keeps its case.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `initCollapsibles`

<code>function initCollapsibles(view: ParentNode): void</code>

Binds every collapsible header in the view so a click toggles its target, once per header. The arrow becomes the web client expand_more icon, and the header gets aria-controls and aria-expanded.

### `setCollapsibleBadge`

<code>function setCollapsibleBadge(header: Element, badge: CollapsibleBadge &#124; null &#124; undefined): void</code>

Shows a badge, or a status dot, in a collapsible header between its title and its chevron, replacing any it already shows. Null removes it.

### `createCollapsibleSection`

<code>function createCollapsibleSection(options?: CollapsibleSectionOptions): CollapsibleSectionHandle</code>

Builds a collapsible section, the same markup initCollapsibles binds, with an optional badge in its header. The header also takes a Material icon in a rounded tile, a dimmed subtitle under the title, and an aside on the right, such as a badge, a button, or a toggle. With collapsible false it is a fixed panel, always open, whose header is a plain heading.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `title` | <code>string</code> | the header title [optional] |
| `badge` | <code>CollapsibleBadge &#124; null</code> | { label, color, dot } shown in the header, as setCollapsibleBadge takes it [optional] |
| `content` | <code>string &#124; Node</code> | HTML or a node for the body [optional] |
| `collapsed` | <code>boolean</code> | true starts it closed (default false) |
| `numbered` | <code>boolean</code> | true numbers it within a run of numbered sections (default false) |
| `className` | <code>string</code> | classes added to the section [optional] |
| `icon` | <code>string</code> | a Material icon shown in a rounded tile before the title [optional] |
| `iconColor` | <code>string</code> | the tile's status color name or hex code (default the accent) [optional] |
| `subtitle` | <code>string &#124; Node &#124; null</code> | a dimmed line under the title, as text or a node such as a route [optional] |
| `aside` | <code>Node &#124; null</code> | a node at the right of the header, such as a badge, a button, or a toggle, that goes under the title when the section is narrow [optional] |
| `collapsible` | <code>boolean</code> | false draws a fixed panel, framed, always open, with no chevron and a header that is not a button (default true) |
| `onToggle` | <code>(open: boolean): void</code> | function(open) called when the header opens or closes it [optional] |

| Handle member | Type |
| :--- | :--- |
| `element` | <code>HTMLDivElement</code> |
| `header` | <code>HTMLButtonElement</code> |
| `content` | <code>HTMLDivElement</code> |
| `getValue` | <code>(): boolean</code> |
| `setValue` | <code>(open: boolean): void</code> |
| `setTitle` | <code>(text: string): void</code> |
| `setBadge` | <code>(badge: CollapsibleBadge &#124; null): void</code> |
| `setSubtitle` | <code>(subtitle: string &#124; Node &#124; null): void</code> |
| `setAside` | <code>(aside: Node &#124; null): void</code> |
| `destroy` | <code>(): void</code> |

| Type | What it is |
| :--- | :--- |
| `CollapsibleBadge` | A badge or status dot in a collapsible header. color is a status color name, a hex code, or a badge state name, and dot draws a dot named by label. |

| Class | What it looks like |
| :--- | :--- |
| `base-collapsible-section` | Flat collapsible section so its fields align with the rest of the form |
| `base-collapsible-header` | Clickable header row that toggles the section, flush with the form left edge |
| `base-collapsible-title` | Capitalized header title that takes the free width |
| `base-collapsible-badge` | A badge or status dot in the header, between the title and the chevron, that keeps its own size |
| `base-collapsible-icon` | The expand_more chevron, down while collapsed and turned up while open, as Jellyfin's expanders turn. Any control with aria-expanded that holds it turns it too, such as a card head |
| `base-collapsible-content` | Section body, flush left, hidden when collapsed |
| `base-collapsible-actions` | Footer action row inside a section, with a divider above, its buttons and status text centered on one line |
| `base-collapsible-actions.flush` | A footer action row with no divider or space above it, for a row that follows its fields directly |
| `base-collapsible-section.numbered` | A section in a numbered run, whose title starts with a round number counted from the sections before it |
| `base-collapsible-tile` | A Material icon in a rounded tile before the title, the size of an avatar, in the accent or a status color or hex code |
| `base-collapsible-heading` | The title and its subtitle stacked in the free width, the title ending in an ellipsis with the full text in its tooltip |
| `base-collapsible-subtitle` | A dimmed line under the title, as text that ends in an ellipsis or a node such as a route |
| `base-collapsible-aside` | A node at the right of the header, such as a badge, a button, or a toggle, centered on the header's line |
| `base-collapsible-bar` | The row of a collapsible header that has an aside: the header button, the aside beside it, and the chevron, since a button cannot hold a control |
| `base-collapsible-section.compact` | A narrow section, chosen by its own width, puts its aside on a line of its own under the title |
| `base-collapsible-section.fixed` | A fixed panel, always open, whose header is a plain heading with no chevron |
| `base-collapsible-section.base-panel` | A section on the panel surface, its header and body inset by the panel's padding, collapsible or fixed |

<!-- reference:end -->

## Used By

Artwork Generator, Live Channels, Remote Access, Requests, Scripts, Server Sync, User Management, and YouTube Audio use it.

## Example

<iframe class="base-preview" src="../../../assets/previews/collapsible-section.html" title="Collapsible Section example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "collapsible-section.html"
```
