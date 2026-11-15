import { make, clear, fill } from './lib/dom.js';
import { createAvatar } from './avatar.js';
import type { AvatarOptions, AvatarHandle } from './avatar.js';
import { setTooltip } from './tooltip.js';
import type { ComponentHandle } from './types.js';

/** What createAvatarStack takes. users are avatar options, and max is how many show before a +N bubble. */
export interface AvatarStackOptions {
    users?: AvatarOptions[];
    max?: number;
    size?: 'small' | 'medium' | 'large';
    moreText?: string;
    label?: string;
}

/** What createAvatarStack returns. getValue returns the users, and setValue draws new ones. */
export interface AvatarStackHandle extends ComponentHandle {
    getValue(): AvatarOptions[];
    setValue(users: AvatarOptions[] | null): void;
    destroy(): void;
}

/**
 * A row of overlapping avatars, such as who watched an item, built from createAvatar. Past max, the rest fold into a +N bubble whose tooltip names them.
 * The stack is one image to a screen reader, named by every name in it.
 *
 * @param options {
 *   users    : [{ src, image, name, color }] as createAvatar takes [optional]
 *   max      : how many avatars show before the +N bubble (default 4)
 *   size     : 'small', 'medium', or 'large' (default 'small')
 *   moreText : the bubble's text, where {value} is how many more (default '+{value}')
 *   label    : the start of the accessible name, before the names, such as 'Watched by' [optional]
 * }
 * @returns { element, getValue, setValue, destroy }.
 */
export function createAvatarStack(options?: AvatarStackOptions): AvatarStackHandle {
    var opts = options || {};
    var users: AvatarOptions[] = [];
    var avatars: AvatarHandle[] = [];
    var size = opts.size === 'medium' || opts.size === 'large' ? opts.size : 'small';
    var root = make('div', 'base-avatar-stack ' + size, { role: 'img' });

    function draw(): void {
        avatars.forEach(function (a) { a.destroy(); });
        avatars = [];
        clear(root);
        var max = typeof opts.max === 'number' && opts.max > 0 ? Math.floor(opts.max) : 4;
        // The bubble takes the last place, so a stack of max plus one shows max minus one avatars and +2.
        var shown = users.length > max ? Math.max(1, max - 1) : users.length;
        users.slice(0, shown).forEach(function (u) {
            var avatar = createAvatar(Object.assign({}, u, { size: size, status: undefined }));
            avatar.element.setAttribute('aria-hidden', 'true');
            avatar.element.removeAttribute('role');
            avatar.element.removeAttribute('aria-label');
            avatars.push(avatar);
            root.appendChild(avatar.element);
        });
        var rest = users.slice(shown);
        if (rest.length) {
            var more = make('span', 'base-avatar base-avatar-' + size + ' base-avatar-more', { 'aria-hidden': 'true' }, fill(opts.moreText || '+{value}', rest.length));
            setTooltip(more, rest.map(function (u) { return u.name || ''; }).filter(Boolean).join(', '));
            more.removeAttribute('tabindex');
            root.appendChild(more);
        }
        var names = users.map(function (u) { return u.name || ''; }).filter(Boolean).join(', ');
        root.setAttribute('aria-label', (opts.label ? opts.label + ' ' : '') + names);
        root.setAttribute('title', names);
        root.hidden = !users.length;
    }

    function setValue(next: AvatarOptions[] | null): void {
        users = (next || []).filter(Boolean).slice();
        draw();
    }

    setValue(opts.users || []);
    return {
        element: root,
        getValue: function () { return users.slice(); },
        setValue: setValue,
        destroy: function () { avatars.forEach(function (a) { a.destroy(); }); avatars = []; }
    };
}
