import { make, iconButton, listen, runAll, clear, nextId, toText, formatBytes } from './lib/dom.js';
import { makeBadge, badgeColor } from './lib/badge.js';
import { buildThumb, itemImageUrl, SHAPE_ICONS } from './lib/thumb.js';
import type { ThumbSource } from './lib/thumb.js';
import { createAvatar } from './avatar.js';
import type { ComponentHandle } from './types.js';

/** The shape of a media card's artwork. Posters are portrait, episodes are wide, albums are square, and people are round. */
export type MediaShape = 'portrait' | 'wide' | 'square' | 'round';

/** A badge on a media card, drawn as base-badge with its color modifier. */
export interface MediaCardBadge {
    label: string;
    color?: string;
}

/** The status on a media card, drawn as a base-badge in a status color. */
export interface MediaCardStatus {
    label: string;
    color?: string;
}

/** An icon button on a media card. onAction receives its value. */
export interface MediaCardAction {
    label: string;
    icon: string;
    value: string;
}

/** A user shown at the start of a media card's subtitle line, with a small avatar. */
export interface MediaCardUser {
    name: string;
    imageUrl?: string | null;
}

/** What createMediaCard takes, and what its getValue returns. image wins over imageUrl, and imageUrl wins over itemId. */
export interface MediaCardOptions {
    layout?: 'row' | 'card';
    shape?: MediaShape;
    image?: ThumbSource;
    imageUrl?: string | null;
    itemId?: string | null;
    imageType?: string;
    imageMaxHeight?: number;
    icon?: string;
    title?: string;
    titleSuffix?: string | null;
    subtitle?: string | null;
    user?: MediaCardUser | null;
    badges?: MediaCardBadge[];
    status?: MediaCardStatus | null;
    meta?: string | null;
    metaIsError?: boolean;
    detail?: string | null;
    error?: string | null;
    size?: number | string | null;
    actions?: MediaCardAction[];
    href?: string | null;
    onClick?(): void;
    onAction?(value: string): void;
}

/** What createMediaCard returns. setValue merges a partial set of options and draws the card again. */
export interface MediaCardHandle extends ComponentHandle {
    getValue(): MediaCardOptions;
    setValue(next: MediaCardOptions | null): void;
    destroy(): void;
}

var SHAPES: MediaShape[] = ['portrait', 'wide', 'square', 'round'];
// The width below which a row card stacks its status under its text, in pixels.
var COMPACT_WIDTH = 520;
var WIDE_TYPES: string[] = ['Episode', 'Video', 'TvChannel', 'Program', 'MusicVideo'];
var ROUND_TYPES: string[] = ['Person', 'User'];
var SQUARE_TYPES: string[] = ['MusicAlbum', 'Audio', 'Playlist'];

/**
 * Picks the artwork shape Jellyfin uses for an item type.
 *
 * @param itemType a Jellyfin item type, such as 'Movie' or 'Episode'
 * @returns 'wide' for Episode, Video, TvChannel, Program, and MusicVideo, 'round' for Person and User, 'square' for MusicAlbum, Audio, and Playlist, and 'portrait' for any other type.
 */
export function mediaShape(itemType: string | null | undefined): MediaShape {
    var type = String(itemType || '');
    if (WIDE_TYPES.indexOf(type) !== -1) return 'wide';
    if (ROUND_TYPES.indexOf(type) !== -1) return 'round';
    if (SQUARE_TYPES.indexOf(type) !== -1) return 'square';
    return 'portrait';
}

// Builds the image address from the item id, when ApiClient can.
function cardImageUrl(state: MediaCardOptions): string {
    return itemImageUrl(state.itemId, { type: state.imageType, maxHeight: state.imageMaxHeight || (state.layout === 'card' ? 400 : 128) });
}

/**
 * One media item with its artwork, as a list row with the artwork at the start or as a grid tile with the artwork on top. The artwork shows an icon until the image loads, and keeps it when there is no image or the image fails.
 *
 * @param options {
 *   layout         : 'row' for a list row or 'card' for a grid tile (default 'row')
 *   shape          : 'portrait', 'wide', 'square', or 'round' artwork (default 'portrait'). mediaShape(itemType) picks one
 *   image          : image address, or a function returning an address, a Blob, or a promise of one, shown when it arrives [optional]
 *   imageUrl       : image address, which may arrive later through setValue [optional]
 *   itemId         : item id that builds the address through ApiClient.getImageUrl when there is no imageUrl [optional]
 *   imageType      : the image type for itemId (default 'Primary')
 *   imageMaxHeight : maxHeight for itemId (default 128 for a row and 400 for a card)
 *   icon           : Material icon name of the placeholder (default chosen from the shape)
 *   title          : the item's name [optional]
 *   titleSuffix    : a secondary part after the title, such as an episode name [optional]
 *   subtitle       : the second line [optional]
 *   user           : { name, imageUrl } shown with a small avatar at the start of the second line [optional]
 *   badges         : [{ label, color }] drawn as base-badge [optional]
 *   status         : { label, color } drawn as a base-badge, or null [optional]
 *   meta           : a short line beside the status, such as a time or an error [optional]
 *   metaIsError    : true draws meta in the error color (default false)
 *   detail         : a line after the status, such as 'Pending, retry in 2m' [optional]
 *   error          : a line after the status in the error color, such as why it failed, with its full text as the tooltip [optional]
 *   size           : a size beside the status, as bytes, such as 1288490188 for 1.2 GB, or as text [optional]
 *   actions        : [{ label, icon, value }] drawn as icon buttons [optional]
 *   href           : address the whole card opens [optional]
 *   onClick        : function() called when the whole card is clicked or activated with Enter or Space [optional]
 *   onAction       : function(value) called when an action button is clicked [optional]
 * }
 * @returns { element, getValue, setValue, destroy }. setValue merges a partial set of options and draws the card again.
 */
export function createMediaCard(options?: MediaCardOptions): MediaCardHandle {
    var state: MediaCardOptions = Object.assign({}, options || {});
    var cleanups: Array<() => void> = [];
    var drawCleanups: Array<() => void> = [];
    var titleId = nextId('media-card-title');

    var root = make('div', 'base-media-card');

    function clickable(): boolean {
        return !!(state.href || typeof state.onClick === 'function');
    }

    function activate(): void {
        if (typeof state.onClick === 'function') state.onClick();
        else if (state.href) window.location.href = state.href;
    }

    function drawThumb(shape: MediaShape, row: boolean): HTMLElement {
        var thumb = buildThumb({
            src: state.image || state.imageUrl || cardImageUrl(state),
            icon: state.icon || SHAPE_ICONS[shape],
            className: 'base-media-card-thumb ' + shape,
            imageClass: 'base-media-card-image',
            placeholderClass: 'base-media-card-placeholder',
            lazy: true
        });
        drawCleanups.push(thumb.destroy);
        if (!row) return thumb.element;
        // A row holds its artwork in one slot as wide as the widest shape, so every title in a list starts at the same place.
        var slot = make('span', 'base-media-card-slot');
        slot.appendChild(thumb.element);
        return slot;
    }

    // The second line: the user, then in a compact card the title's suffix, then the subtitle. CSS draws the dot before each part after the first.
    function buildSub(): HTMLElement | null {
        var episode = compactNow() && state.titleSuffix ? state.titleSuffix : '';
        if (!state.user && !state.subtitle && !episode) return null;
        var sub = make('div', 'base-media-card-sub');
        if (episode) sub.appendChild(make('span', 'base-media-card-episode', null, episode));
        if (state.user && state.user.name) {
            var who = make('span', 'base-media-card-user');
            var avatar = createAvatar({ src: state.user.imageUrl || '', name: state.user.name, size: 'small' });
            avatar.element.setAttribute('aria-hidden', 'true');
            who.appendChild(avatar.element);
            who.appendChild(make('span', 'base-media-card-user-name', null, state.user.name));
            sub.appendChild(who);
        }
        if (state.subtitle) sub.appendChild(make('span', 'base-media-card-subtitle', null, state.subtitle));
        return sub;
    }

    function compactNow(): boolean { return compact && state.layout !== 'card'; }

    function badgeElements(): HTMLElement[] {
        return (state.badges || []).filter(function (b) { return b && b.label; }).map(function (b) { return makeBadge(b.label, badgeColor(b.color, 'gray')); });
    }

    // A compact card's one chip row: the badges and the status, then the status's detail right after it, and the size.
    function buildChips(): HTMLElement | null {
        var chips = badgeElements();
        if (state.status && state.status.label) chips.push(makeBadge(state.status.label, badgeColor(state.status.color, 'gray'), null, 'base-media-card-status'));
        var detail = state.detail || (state.metaIsError ? '' : state.meta) || '';
        if (detail) chips.push(make('span', 'base-media-card-detail', null, detail));
        var size = sizeText();
        if (size) chips.push(make('span', 'base-media-card-size', null, size));
        if (!chips.length) return null;
        var row = make('div', 'base-media-card-chips');
        chips.forEach(function (chip) { row.appendChild(chip); });
        return row;
    }

    function buildSide(): HTMLElement | null {
        var size = sizeText();
        if (!(state.status && state.status.label) && !state.meta && !size && !state.detail && !state.error) return null;
        var side = make('div', 'base-media-card-side');
        // The first line holds the size, dimmed, then the badge, so the column stays as short as the artwork.
        if (size || (state.status && state.status.label)) {
            var top = make('div', 'base-media-card-side-line');
            if (size) top.appendChild(make('span', 'base-media-card-size', null, size));
            if (state.status && state.status.label) top.appendChild(makeBadge(state.status.label, badgeColor(state.status.color, 'gray'), null, 'base-media-card-status'));
            side.appendChild(top);
        }
        if (state.detail) side.appendChild(make('span', 'base-media-card-detail', null, state.detail));
        if (state.error) side.appendChild(make('span', 'base-media-card-error', { title: state.error }, state.error));
        if (state.meta) side.appendChild(make('span', 'base-media-card-meta' + (state.metaIsError ? ' error' : ''), null, state.meta));
        return side;
    }

    // The action buttons, pinned to the card's top right corner so the status and the lines never sit under them.
    function buildActions(): HTMLElement | null {
        var actions = state.actions || [];
        if (!actions.length) return null;
        var bar = make('div', 'base-media-card-actions');
        actions.forEach(function (action) {
            var btn = iconButton('base-row-btn base-media-card-action', action.icon || null, action.label);
            btn.setAttribute('data-value', action.value);
            drawCleanups.push(listen(btn, 'click', function () {
                if (typeof state.onAction === 'function') state.onAction(action.value);
            }));
            bar.appendChild(btn);
        });
        return bar;
    }

    function sizeText(): string {
        if (typeof state.size === 'number') return isFinite(state.size) && state.size >= 0 ? formatBytes(state.size) : '';
        return toText(state.size);
    }

    function render(): void {
        runAll(drawCleanups);
        clear(root);
        var shape: MediaShape = SHAPES.indexOf(state.shape as MediaShape) !== -1 ? state.shape as MediaShape : 'portrait';
        var layout = state.layout === 'card' ? 'tile' : 'row';
        root.className = 'base-media-card base-media-card-' + layout + (clickable() ? ' clickable' : '') + ((state.actions || []).length ? ' has-actions' : '') + (compact && layout === 'row' ? ' compact' : '');
        if (state.href) root.setAttribute('role', 'link');
        else if (clickable()) root.setAttribute('role', 'button');
        else root.removeAttribute('role');
        if (clickable()) {
            root.setAttribute('tabindex', '0');
            root.setAttribute('aria-labelledby', titleId);
        } else {
            root.removeAttribute('tabindex');
            root.removeAttribute('aria-labelledby');
        }

        root.appendChild(drawThumb(shape, layout === 'row'));

        // A compact card is one text column: the title, one second line, one chip row, and an error line when there is one.
        var small = compactNow();
        var info = make('div', 'base-media-card-info');
        var title = make('div', 'base-media-card-title', { id: titleId });
        title.appendChild(make('span', 'base-media-card-name', null, state.title || ''));
        if (state.titleSuffix && !small) title.appendChild(make('span', 'base-media-card-suffix', null, state.titleSuffix));
        info.appendChild(title);
        var sub = buildSub();
        if (sub) info.appendChild(sub);
        if (small) {
            var chips = buildChips();
            if (chips) info.appendChild(chips);
            var failure = state.error || (state.metaIsError ? state.meta : '') || '';
            if (failure) info.appendChild(make('div', 'base-media-card-error', { title: failure }, failure));
        } else {
            var badges = badgeElements();
            if (badges.length) {
                var row = make('div', 'base-media-card-badges');
                badges.forEach(function (b) { row.appendChild(b); });
                info.appendChild(row);
            }
        }
        root.appendChild(info);

        var side = small ? null : buildSide();
        if (side) root.appendChild(side);
        var bar = buildActions();
        if (bar) {
            root.style.setProperty('--base-media-card-actions', String((state.actions || []).length));
            root.appendChild(bar);
        } else {
            root.style.removeProperty('--base-media-card-actions');
        }
    }

    function fromAction(target: unknown): boolean {
        var el = target as Element | null;
        return !!(el && el.closest && el.closest('.base-media-card-action'));
    }

    // A row card narrower than its wide layout turns compact, chosen by its own width since older engines have no container queries.
    var compact = false;
    function measure(): void {
        var width = root.clientWidth || 0;
        var next = !!width && width < COMPACT_WIDTH;
        if (next === compact) return;
        compact = next;
        // The compact card draws its text as one column, so it draws again when the width crosses the line.
        if (state.layout !== 'card') render();
    }
    if (typeof ResizeObserver !== 'undefined') {
        var watch = new ResizeObserver(measure);
        watch.observe(root);
        cleanups.push(function () { watch.disconnect(); });
    }
    // A card placed right after it is built is measured once at once, since a page that is not painting yet delivers no resize.
    var first = setTimeout(measure, 0);
    cleanups.push(function () { clearTimeout(first); });

    cleanups.push(listen(root, 'click', function (e: MouseEvent) {
        if (!clickable() || fromAction(e.target)) return;
        activate();
    }));
    cleanups.push(listen(root, 'keydown', function (e: KeyboardEvent) {
        if (!clickable() || e.target !== root) return;
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        activate();
    }));

    render();

    return {
        element: root,
        getValue: function () { return Object.assign({}, state); },
        setValue: function (next) {
            state = Object.assign({}, state, next || {});
            render();
        },
        destroy: function () { runAll(drawCleanups); runAll(cleanups); }
    };
}
