# Avatar and User Chip

A round picture of a person or thing. It shows the image, and shows initials from the name when there is no image or the image fails to load. A status color adds a dot with a name.

## When to Use

* Use `createAvatar` in a row or table. Use `createUserChip` where a name and a line of text sit beside it.

## When Not to Use

* Never use it for a user list with checkboxes. See [User Multi Selector](user-multi-selector.md).

## Usage

```js
import { createAvatar, createUserChip } from './configurationpage?name=myplugin_jpkribs_shared.js';

row.appendChild(createAvatar({ name: 'Ada Lovelace', status: 'green' }).element);
row.appendChild(createUserChip({ name: 'Ada Lovelace', text: 'Administrator' }).element);
```

Classes: `jpk-avatar`, `jpk-avatar-small`, `jpk-avatar-large`, `jpk-avatar-status`, `jpk-user-chip`. Both handles are `{ element, getValue, setValue, destroy }`.

Parts: `jpk-avatar-image`, `jpk-user-chip-body`, `jpk-user-chip-name`, `jpk-user-chip-text`.

## States and Modifiers

* `size` is `small`, `medium` (default), or `large`. `src` is the image address.
* The initials come from `name`, and the color is chosen from it, so a person looks the same everywhere. `color` overrides it with a status color name.
* `status` is `green`, `red`, `orange`, `purple`, `blue`, or `gray` and adds a dot. `statusLabel` names the state and defaults to the meaning of the color, such as "Active" for green. The dot has a title and `aria-label`.
* `createUserChip` takes the avatar options and `text`, a line under the name.

## Used By

No plugin uses it today. Server Sync (queue avatars), Live Channels, and User Management show user images by hand.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/avatar.html" title="Avatar and User Chip example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "avatar.html"
```
