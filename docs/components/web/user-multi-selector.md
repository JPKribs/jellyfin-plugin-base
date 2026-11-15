# User Multi Selector

A checkbox list of users with optional avatars, admin pills, notes, and a Select all row. It is also on the bag as `shared.createUserMultiSelector`.

## When to Use

* Use it to choose which users a rule applies to.

## When Not to Use

* Use a [User Selector](user-selector.md) for one user.

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

Classes: `jpk-user-multi`, `jpk-user-multi-list`, `jpk-user-multi-option`, `jpk-user-multi-check`, `jpk-user-multi-avatar`, `jpk-user-multi-name`, `jpk-user-multi-admin`, `jpk-user-multi-note`, `jpk-user-multi-selectall`, `jpk-user-multi-disabled`, `jpk-user-multi-empty`. The handle is `{ element, ready, getValue, setValue, setDisabled, refresh, destroy }`.

## States and Modifiers

* `noteFor(user)` returns text for a pill on the row, such as a group name. The user is `{ id, name, isAdmin, imageTag }`.
* `disabledIds` marks users who cannot be selected. `setDisabled(ids)` swaps the set and re-renders from the last list.
* `showAvatars` shows an avatar when the user has an image. `emptyMessage` is "No users available." by default.
* Selection survives a filtered out user. Matching of ids ignores case and dashes.
* Select all skips disabled rows and shows an indeterminate state.
* The rows are native checkboxes, so there is no combobox or listbox role to add.

## Gotchas

* `getValue()` returns the checked users' ids as the page wrote them.

## Used By

Custom Pages, Scripts, User Management, and YouTube Audio use it.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/user-multi-selector.html" title="User Multi Selector example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "user-multi-selector.html"
```
