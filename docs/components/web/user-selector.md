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

The handle is `{ element, ready, getValue, setValue, refresh, setSize, destroy }`. The markup is `div.base-selector.base-user-selector` around `select.base-selector-dropdown.base-user-select`.

## States and Modifiers

* `adminFilter` is `'all'` (default), `'exclude'` to hide administrators, or `'only'`.
* `value` is a user id. Matching ignores case and dashes.
* A none entry comes first, and `includeEmptyOption: false` leaves it out. `emptyLabel` is its text, "None" by default.
* Administrator names end in " (admin)", and `showAdminBadge: false` leaves it off.
* `fetchUsers()` replaces the `ApiClient.getUsers()` source and may return an array or `{ Items }`.
* Users are sorted by name. A failed fetch gives an empty list rather than an error.
* It is a native select, so keyboard and ARIA are the browser's.
* `size` is `small`, `medium` (default), or `large`, and sizes its fields on the [size scale](design-tokens.md). `setSize(size)` changes it later.

## Gotchas

* `base-user-selector` and `base-user-select` are hooks with no CSS rules.
* `destroy()` does nothing, since there are no document listeners.
* `ready` resolves after the list renders.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createUserSelector`

<code>function createUserSelector(options?: UserSelectorOptions): UserSelectorHandle</code>

Builds a single-user dropdown from the server's user list.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `value` | <code>string</code> | preselected user id [optional] |
| `includeEmptyOption` | <code>boolean</code> | add a none entry (default true) |
| `emptyLabel` | <code>string</code> | label for the none entry (default 'None') |
| `showAdminBadge` | <code>boolean</code> | append " (admin)" to administrator names (default true) |
| `size` | <code>'small' &#124; 'medium' &#124; 'large'</code> | 'small', 'medium', or 'large' for its fields (default 'medium') |
| `onChange` | <code>(userId: string): void</code> | function(userId) called on selection change [optional] |

| Handle member | Type |
| :--- | :--- |
| `ready` | <code>Promise&lt;SelectorUser[]&gt;</code> |
| `getValue` | <code>(): string</code> |
| `setValue` | <code>(id: string &#124; null): void</code> |
| `refresh` | <code>(): Promise&lt;SelectorUser[]&gt;</code> |
| `setSize` | <code>(size?: 'small' &#124; 'medium' &#124; 'large'): void</code> |
| `destroy` | <code>(): void</code> |

| Type | What it is |
| :--- | :--- |
| `SelectorUser` | A user after normalizeUser reads it, as the selectors draw it. |
| `RawUser` | A user record from ApiClient.getUsers() or a plugin DTO, in either PascalCase or camelCase. |
| `AdminFilter` | Keeps everyone, hides administrators, or keeps only administrators. |
| `UserSource` | The options both selectors read to load the user list. |

<!-- reference:end -->

## Used By

YouTube Audio uses it.

## Example

<iframe class="base-preview" src="../../../assets/previews/user-selector.html" title="User Selector example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "user-selector.html"
```
