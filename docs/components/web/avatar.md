# Avatar and User Chip

A round picture of a person or thing. It shows the image, and shows Jellyfin's person icon on a gray circle when there is no image or the image fails to load. A status color adds a dot with a name.

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

Classes: `base-avatar`, `base-avatar-small`, `base-avatar-medium`, `base-avatar-large`, `base-avatar-status`, `base-user-chip`. Both handles are `{ element, getValue, setValue, destroy }`.

Parts: `base-avatar-image`, `base-avatar-icon`, `base-user-chip-body`, `base-user-chip-name`, `base-user-chip-text`.

## States and Modifiers

* `size` is `small`, `medium` (default), or `large`. `src` is the image address. `image` wins over it, and is an address or a function that returns an address, a Blob, or a promise of one, with the `person` icon shown until it arrives.
* An [Avatar Stack](avatar-stack.md) overlaps several avatars with a +N bubble.
* With no `src`, or when the image fails, the avatar shows the `person` icon on a gray circle, as Jellyfin does for a user with no picture. It carries the `placeholder` modifier, and `color` tints the circle with a color name. `name` labels it for a screen reader.
* `status` is `green`, `red`, `orange`, `purple`, `blue`, or `gray` and adds a dot. `statusLabel` names the state and defaults to the meaning of the color, such as "Active" for green. The dot has a title and `aria-label`.
* `createUserChip` takes the avatar options and `text`, a line under the name. With `text`, the chip carries `two-line` and its avatar grows to span both lines.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createAvatar`

<code>function createAvatar(options?: AvatarOptions): AvatarHandle</code>

A round picture of a person or thing. It shows the image, and shows Jellyfin's person icon when there is no image or the image fails to load. A status color adds a dot with a name.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `src` | <code>string</code> | image address [optional] |
| `image` | <code>ThumbSource</code> | image address, or a function returning an address, a Blob, or a promise of one, which wins over src [optional] |
| `name` | <code>string</code> | the person's name, for the alt text, the title, and the label of an avatar with no picture [optional] |
| `size` | <code>'small' &#124; 'medium' &#124; 'large' &#124; string</code> | 'small', 'medium', or 'large' (default 'medium') |
| `color` | <code>string</code> | color name for the circle behind the person icon (default gray) |
| `status` | <code>'green' &#124; 'red' &#124; 'orange' &#124; 'purple' &#124; 'blue' &#124; 'gray' &#124; string</code> | 'green', 'red', 'orange', 'purple', 'blue', or 'gray' for a status dot [optional] |
| `statusLabel` | <code>string</code> | name of the state (default the color's meaning, such as 'Active' for green) |

| Handle member | Type |
| :--- | :--- |
| `getValue` | <code>(): AvatarOptions</code> |
| `setValue` | <code>(next: AvatarOptions): void</code> |
| `destroy` | <code>(): void</code> |

### `createUserChip`

<code>function createUserChip(options?: UserChipOptions): UserChipHandle</code>

A pill with an avatar, a name, and an optional second line, for showing who owns or did something.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `text` | <code>string</code> |  |

| Handle member | Type |
| :--- | :--- |
| `getValue` | <code>(): UserChipOptions</code> |
| `setValue` | <code>(next: UserChipOptions): void</code> |
| `destroy` | <code>(): void</code> |

| Class | What it looks like |
| :--- | :--- |
| `base-avatar` | Round picture, or the person icon on a gray circle, in three sizes, with an optional status dot |
| `base-avatar-icon` | The person icon an avatar shows with no picture, sized to its circle |
| `base-avatar-status` | Dot at the bottom right of an avatar, ringed in the surface color |
| `base-user-chip` | Pill with an avatar, a name, and an optional second line |
| `base-user-chip.two-line` | A chip with a second line, whose avatar grows to span both lines |

<!-- reference:end -->

## Used By

No plugin uses it today.

## Example

<iframe class="base-preview" src="../../../assets/previews/avatar.html" title="Avatar and User Chip example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "avatar.html"
```
