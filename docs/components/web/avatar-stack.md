# Avatar Stack

A row of overlapping [Avatars](avatar.md), such as who watched an item. Past `max`, the rest fold into a +N bubble whose tooltip names them.

## Decision

| When | Use |
| :--- | :--- |
| Several people in the space of one, in a row or a card | Avatar Stack |
| One person with a name beside them | [User Chip](avatar.md) |

## Usage

```js
import { createAvatarStack } from './configurationpage?name=myplugin_jpkribs_shared.js';

var stack = createAvatarStack({ users: [{ name: 'Ada', src: adaUrl }, { name: 'Bob' }], max: 4, label: 'Watched by' });
view.querySelector('#watchers').appendChild(stack.element);
```

Classes: `base-avatar-stack` with a `small`, `medium`, or `large` modifier, and `base-avatar-more` on the bubble. The handle is `{ element, getValue, setValue, destroy }`, where `getValue()` returns the users and `setValue(users)` draws new ones.

## States and Modifiers

* Each user takes the avatar options, such as `src`, `image`, `name`, and `color`. A `status` is not drawn in a stack.
* The stack hides itself when it has no users.
* `max` is 4 by default. With more users, the stack shows `max` minus one avatars and a bubble, such as "+3", so it never grows past `max` places. `moreText` replaces "+{value}".
* `size` is `small` (default), `medium`, or `large`.
* The stack is one image to a screen reader, named by `label` and every name in it. The names also sit in its title. The bubble's tooltip names the users it stands for, through [Tooltip](tooltip.md) when the page binds it.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createAvatarStack`

<code>function createAvatarStack(options?: AvatarStackOptions): AvatarStackHandle</code>

A row of overlapping avatars, such as who watched an item, built from createAvatar. Past max, the rest fold into a +N bubble whose tooltip names them. The stack is one image to a screen reader, named by every name in it.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `users` | <code>AvatarOptions[]</code> | [{ src, image, name, color }] as createAvatar takes [optional] |
| `max` | <code>number</code> | how many avatars show before the +N bubble (default 4) |
| `size` | <code>'small' &#124; 'medium' &#124; 'large'</code> | 'small', 'medium', or 'large' (default 'small') |
| `moreText` | <code>string</code> | the bubble's text, where {value} is how many more (default '+{value}') |
| `label` | <code>string</code> | the start of the accessible name, before the names, such as 'Watched by' [optional] |

| Handle member | Type |
| :--- | :--- |
| `getValue` | <code>(): AvatarOptions[]</code> |
| `setValue` | <code>(users: AvatarOptions[] &#124; null): void</code> |
| `destroy` | <code>(): void</code> |

| Class | What it looks like |
| :--- | :--- |
| `base-avatar-stack` | A row of overlapping avatars, each ringed in the surface color, ending in a +N bubble when there are more |
| `base-avatar-more` | The +N bubble that stands for the avatars past max, with their names in its tooltip |

<!-- reference:end -->

## Example

<iframe class="base-preview" src="../../../assets/previews/avatar-stack.html" title="Avatar Stack example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "avatar-stack.html"
```
