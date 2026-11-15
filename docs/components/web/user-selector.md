# User Selector

A single user dropdown fed by `ApiClient.getUsers()`. It is also on the bag as `shared.createUserSelector`.

## When to Use

* Use it to pick one Jellyfin user, such as an approver.

## When Not to Use

* Use a [User Multi Selector](user-multi-selector.md) for several users.

## Usage

```js
var approver = shared.createUserSelector({
    adminFilter: 'exclude',
    value: config.ApproverId,
    onChange: function (id) { tracker.check(); }
});
container.appendChild(approver.element);
```

The handle is `{ element, ready, getValue, setValue, refresh, destroy }`. The markup is `div.jpk-selector.jpk-user-selector` around `select.jpk-selector-dropdown.jpk-user-select`.

## States and Modifiers

* `adminFilter` is `'all'` (default), `'exclude'` to hide administrators, or `'only'`.
* `value` is a user id. Matching ignores case and dashes.
* `includeEmptyOption` adds a none entry. `emptyLabel` (or `placeholder`) is its text, "None" by default.
* `showAdminBadge` appends " (admin)" to administrator names.
* `fetchUsers()` replaces the `ApiClient.getUsers()` source and may return an array or `{ Items }`.
* Users are sorted by name. A failed fetch gives an empty list rather than an error.
* It is a native select, so keyboard and ARIA are the browser's.

## Gotchas

* `jpk-user-selector` and `jpk-user-select` are hooks with no CSS rules.
* `destroy()` does nothing today, since there are no document listeners.
* `ready` resolves after the list renders.

## Used By

YouTube Audio uses it.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/user-selector.html" title="User Selector example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "user-selector.html"
```
