# User Multi Selector

A [Checkbox List](checkbox-list.md) whose items are the server's users. Each row shows the user's avatar, or the person icon, the name, an Admin badge, and an optional note, and ids match whatever their case or dashes. Everything else, the rows, search, Select all, disabled rows, the empty text, and the height, is the checkbox list's. It is also on the bag as `shared.createUserMultiSelector`.

## Decision

| When | Use |
| :--- | :--- |
| Choosing which users a rule applies to | User Multi Selector |
| One user | [User Selector](user-selector.md) |
| Items that are not users | [Checkbox List](checkbox-list.md) |

## Usage

```js
var allowed = shared.createUserMultiSelector({
    adminFilter: 'exclude',
    showSelectAll: true,
    value: config.AllowedUserIds,
    noteFor: function (u) { return groupOf(u.id); },
    onChange: function (ids) { tracker.check(); }
});
container.appendChild(allowed.element);
```

Classes: the checkbox list's, with `base-user-multi` added to its root. The handle is `{ element, ready, getValue, setValue, setDisabled, refresh, setHeight, destroy }`.

## States and Modifiers

* `noteFor(user)` returns text for a pill on the row, such as a group name. The user is `{ id, name, isAdmin, imageTag }`.
* `disabledIds` marks users who cannot be selected. `setDisabled(ids)` swaps the set and re-renders from the last list.
* `showAvatars: false` hides the avatars, which show the user's picture or the person icon by default. `showAdminBadge: false` hides the Admin badge, and `adminText` replaces its label.
* `adminFilter` is `all` (default), `exclude` to hide administrators, or `only` to keep only administrators. The users are sorted by name.
* `fetchUsers()` replaces `ApiClient.getUsers()` as the source, such as a plugin endpoint. It may return an array or `{ Items }`.
* `search: true` adds the search box, which is hidden by default. `emptyMessage` is "No users available." by default.
* Selection survives a filtered out user. Matching of ids ignores case and dashes.
* Select all skips disabled rows and shows an indeterminate state.
* The rows are native checkboxes, so there is no combobox or listbox role to add.
* The rows are a [List](list.md), so `height`, `maxHeight`, and `minHeight` take what a List takes, and `setHeight(height, maxHeight)` changes them later. By default the rows grow with the page.

## Gotchas

* `getValue()` returns the checked users' ids as the page wrote them.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createUserMultiSelector`

<code>function createUserMultiSelector(options?: UserMultiSelectorOptions): UserMultiSelectorHandle</code>

A checkbox list of the server's users, for picking many. It is a checkbox list whose items are the users, each row showing the user's avatar, name, an Admin badge, and an optional note, and whose ids match whatever their case or dashes.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `value` | <code>string[]</code> | array of preselected user ids [optional] |
| `disabledIds` | <code>string[]</code> | array of user ids to render non-selectable, such as users already assigned elsewhere [optional] |
| `noteFor` | <code>(user: SelectorUser): string &#124; null &#124; undefined</code> | function(user) returning a string for a pill on the row, such as a group name [optional] |
| `search` | <code>boolean</code> | show a search box (default false) |
| `placeholder` | <code>string</code> | search box placeholder (default 'Search') |
| `showSelectAll` | <code>boolean</code> | add a select all row (default false) |
| `selectAllText` | <code>string</code> | the label of the select all row (default 'Select all') |
| `showAvatars` | <code>boolean</code> | show each user's avatar, or the person icon when they have no picture (default true) |
| `showAdminBadge` | <code>boolean</code> | show an Admin badge on administrators (default true) |
| `adminText` | <code>string</code> | the Admin badge's text (default 'Admin') |
| `emptyMessage` | <code>string</code> | message shown when no users match (default 'No users available.') |
| `height` | <code>ListHeight</code> | the rows' height, 'auto', 'fill', a number of pixels, or a CSS length, as a List takes it (default 'auto') |
| `maxHeight` | <code>number &#124; string &#124; null</code> | the most the rows grow before they scroll [optional] |
| `minHeight` | <code>number &#124; string &#124; null</code> | the least a filling list takes [optional] |
| `size` | <code>'small' &#124; 'medium' &#124; 'large'</code> | 'small', 'medium', or 'large' for its fields (default 'medium') |
| `onChange` | <code>(ids: string[]): void</code> | function(idsArray) called whenever the selection changes [optional] |

| Handle member | Type |
| :--- | :--- |
| `ready` | <code>Promise&lt;SelectorUser[]&gt;</code> |
| `getValue` | <code>(): string[]</code> |
| `setValue` | <code>(ids: string[] &#124; null): void</code> |
| `setDisabled` | <code>(ids: string[] &#124; null): void</code> |
| `refresh` | <code>(): Promise&lt;SelectorUser[]&gt;</code> |
| `setHeight` | <code>(height: ListHeight, maxHeight?: number &#124; string &#124; null): void</code> |
| `destroy` | <code>(): void</code> |

<!-- reference:end -->

## Example

<iframe class="base-preview" src="../../../assets/previews/user-multi-selector.html" title="User Multi Selector example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "user-multi-selector.html"
```
