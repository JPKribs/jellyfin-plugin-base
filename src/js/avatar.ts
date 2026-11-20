import { make, clear, has } from './lib/dom.js';
import { applyColor } from './lib/color.js';
import { onImageError, resolveThumbSource } from './lib/thumb.js';
import type { ThumbSource } from './lib/thumb.js';
import type { ComponentHandle } from './types.js';
import { baseText } from './lib/base-text.js';
import type { BASE_TEXT } from './lib/base-text.js';

/** What createAvatar takes, and what its getValue returns as drawn. */
export interface AvatarOptions {
    src?: string;
    image?: ThumbSource;
    name?: string;
    size?: 'small' | 'medium' | 'large' | string;
    color?: string;
    status?: 'green' | 'red' | 'orange' | 'purple' | 'blue' | 'gray' | string;
    statusLabel?: string;
}

/** What createAvatar returns. */
export interface AvatarHandle extends ComponentHandle {
    getValue(): AvatarOptions;
    setValue(next: AvatarOptions): void;
    destroy(): void;
}

/** What createUserChip takes. The createAvatar options with a second line of text. */
export interface UserChipOptions extends AvatarOptions {
    text?: string;
}

/** What createUserChip returns. */
export interface UserChipHandle extends ComponentHandle {
    getValue(): UserChipOptions;
    setValue(next: UserChipOptions): void;
    destroy(): void;
}

// BuiltAvatar
// The avatar element and its redraw function that buildAvatar returns.
interface BuiltAvatar {
    root: HTMLSpanElement;
    redraw(next: AvatarOptions): void;
    get(): AvatarOptions;
    release(): void;
}

var STATUS_LABELS: Record<string, keyof typeof BASE_TEXT> = { green: 'Base.Active', red: 'HeaderError', orange: 'Base.Waiting', purple: 'Base.Working', blue: 'ButtonInfo', gray: 'Off' };

// Builds the avatar element and the function that redraws it, for createAvatar and createUserChip.
function buildAvatar(spec: AvatarOptions, quiet?: boolean): BuiltAvatar {
    var root = make('span', 'base-avatar');
    var state: AvatarOptions = {};
    // A late image error from an earlier draw must not wipe what a newer draw put in.
    var drawn = 0;
    var release: () => void = function () { /* nothing to free yet */ };

    function redraw(next: AvatarOptions): void {
        var mine = ++drawn;
        release();
        state = {
            src: next.src || '',
            name: next.name || '',
            size: next.size === 'small' || next.size === 'large' ? next.size : 'medium',
            color: next.color || '',
            status: has(STATUS_LABELS, next.status) ? next.status! : '',
            statusLabel: next.statusLabel || ''
        };
        if (next.image) state.image = next.image;
        clear(root);
        root.removeAttribute('role');
        root.removeAttribute('aria-label');
        root.className = 'base-avatar base-avatar-' + state.size;
        applyColor(root, state.color);
        // With no picture, the person icon Jellyfin shows for a user without one.
        function showPlaceholder(): void {
            clear(root);
            root.classList.add('placeholder');
            if (state.name && !quiet) {
                root.setAttribute('role', 'img');
                root.setAttribute('aria-label', state.name);
            }
            root.appendChild(make('span', 'base-avatar-icon material-icons', { 'aria-hidden': 'true' }, 'person'));
            addDot();
        }
        function addDot(): void {
            if (!state.status) return;
            var label = state.statusLabel || baseText(STATUS_LABELS[state.status]);
            root.appendChild(make('span', 'base-avatar-status ' + state.status, { role: 'img', title: label, 'aria-label': label }));
        }
        function showImage(url: string): void {
            if (mine !== drawn) return;
            if (!url) { showPlaceholder(); return; }
            clear(root);
            root.classList.remove('placeholder');
            root.removeAttribute('role');
            root.removeAttribute('aria-label');
            var img = make('img', 'base-avatar-image', { src: url, alt: state.name });
            onImageError(img, function () { if (mine === drawn) showPlaceholder(); });
            root.appendChild(img);
            addDot();
        }
        // A function source shows the person icon until its picture arrives.
        if (typeof next.image === 'function') {
            showPlaceholder();
            release = resolveThumbSource(next.image, showImage);
        } else {
            showImage(next.image || state.src || '');
        }
        if (state.name) root.setAttribute('title', state.name);
        else root.removeAttribute('title');
    }

    redraw(spec);
    return { root: root, redraw: redraw, get: function () { return state; }, release: function () { drawn++; release(); } };
}

/**
 * A round picture of a person or thing. It shows the image, and shows Jellyfin's person icon when there is no image or the image fails to load. A status color adds a dot with a name.
 *
 * @param options {
 *   src         : image address [optional]
 *   image       : image address, or a function returning an address, a Blob, or a promise of one, which wins over src [optional]
 *   name        : the person's name, for the alt text, the title, and the label of an avatar with no picture [optional]
 *   size        : 'small', 'medium', or 'large' (default 'medium')
 *   color       : color name for the circle behind the person icon (default gray)
 *   status      : 'green', 'red', 'orange', 'purple', 'blue', or 'gray' for a status dot [optional]
 *   statusLabel : name of the state (default the color's meaning, such as 'Active' for green)
 * }
 * @returns { element, getValue, setValue, destroy }. getValue returns the options as drawn, and setValue takes the same shape.
 */
export function createAvatar(options?: AvatarOptions): AvatarHandle {
    var built = buildAvatar(options || {});
    return {
        element: built.root,
        getValue: function () { return Object.assign({}, built.get()); },
        setValue: function (next) { built.redraw(next || {}); },
        destroy: function () { built.release(); if (built.root.parentNode) built.root.parentNode.removeChild(built.root); }
    };
}

/**
 * A pill with an avatar, a name, and an optional second line, for showing who owns or did something.
 *
 * @param options the createAvatar options, and { text: second line under the name [optional] }
 * @returns { element, getValue, setValue, destroy }. getValue returns the options as drawn, with text, and setValue takes the same shape.
 */
export function createUserChip(options?: UserChipOptions): UserChipHandle {
    options = options || {};
    var root = make('span', 'base-user-chip');
    var built = buildAvatar(options, true);
    var body = make('span', 'base-user-chip-body');
    var nameEl = make('span', 'base-user-chip-name');
    var textEl = make('span', 'base-user-chip-text');
    body.appendChild(nameEl);
    body.appendChild(textEl);
    root.appendChild(built.root);
    root.appendChild(body);
    var text = '';

    function setValue(next: UserChipOptions): void {
        next = next || {};
        built.redraw(next);
        built.root.removeAttribute('title');
        text = next.text || '';
        nameEl.textContent = next.name || '';
        textEl.textContent = text;
        textEl.hidden = !text;
        // With a second line the avatar grows to span both lines.
        root.classList.toggle('two-line', !!text);
    }

    setValue(options);
    return {
        element: root,
        getValue: function () { return Object.assign({ text: text }, built.get()); },
        setValue: setValue,
        destroy: function () { built.release(); if (root.parentNode) root.parentNode.removeChild(root); }
    };
}
