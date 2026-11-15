// thumb.ts
// The artwork thumbnail that media cards, media picker rows, checkbox list rows, and the image picker share: a placeholder icon under an image, and the Jellyfin address of an item's artwork. None of them is exported from the bundle.

import { make, icon, listen, runAll } from './dom.js';

/** The shape of an item's artwork. Posters are portrait, episodes are wide, albums are square, and people are round. */
export type ThumbShape = 'portrait' | 'wide' | 'square' | 'round';

/** The placeholder icon for each artwork shape. */
export var SHAPE_ICONS: Record<ThumbShape, string> = { portrait: 'movie', wide: 'tv', square: 'album', round: 'person' };

/** What a thumb's image can come from: an address, or a function that returns an address or a Blob, or a promise of one. A Blob shows through an object URL that the thumb revokes when it moves on. */
export type ThumbSource = string | null | undefined | (() => string | Blob | null | undefined | PromiseLike<string | Blob | null | undefined>);

/** What buildThumb takes. className goes on the frame, imageClass on the image, placeholderClass on the placeholder, icon names the placeholder icon, lazy loads the image only when it nears the screen, whenVisible calls a function source only when the thumb nears the screen, and keepImage keeps the image element while empty. */
export interface ThumbOptions {
    src?: ThumbSource;
    icon?: string;
    className?: string;
    imageClass?: string;
    placeholderClass?: string;
    lazy?: boolean;
    whenVisible?: boolean;
    alt?: string;
    keepImage?: boolean;
}

/** What buildThumb returns. image is null while there is no address, unless keepImage is set. setSrc shows another image, or only the placeholder for an empty value. */
export interface ThumbHandle {
    element: HTMLElement;
    image: HTMLImageElement | null;
    placeholder: HTMLElement;
    setSrc(src: ThumbSource): void;
    destroy(): void;
}

/** What itemImageUrl takes. */
export interface ItemImageOptions {
    type?: string;
    maxHeight?: number;
}

/**
 * Calls fn once when an image fails to load, so a component can fall back to its placeholder.
 *
 * @param img the image to watch
 * @param fn function() called on the first error
 * @returns a function that stops watching.
 */
export function onImageError(img: HTMLImageElement, fn: () => void): () => void {
    var stop = listen(img, 'error', function () { stop(); fn(); });
    return stop;
}

/**
 * Reports whether an item may have artwork. An item whose ImageTags has no Primary tag has none, and one without ImageTags is tried.
 *
 * @param item a Jellyfin item, or null
 * @returns false only when ImageTags is given without a Primary tag.
 */
export function hasPrimaryImage(item: { ImageTags?: Record<string, string> | null } | null | undefined): boolean {
    return !item || !item.ImageTags || !!item.ImageTags.Primary;
}

/**
 * Builds the address of an item's artwork through ApiClient.getImageUrl.
 *
 * @param itemId the item id, or null
 * @param opts { type (default 'Primary'), maxHeight [optional] }
 * @returns the address, or '' without an id or without ApiClient.getImageUrl.
 */
export function itemImageUrl(itemId: string | null | undefined, opts?: ItemImageOptions): string {
    if (!itemId || typeof ApiClient === 'undefined' || !ApiClient) return '';
    var api = ApiClient;
    if (typeof api.getImageUrl !== 'function') return '';
    var query: Record<string, unknown> = { type: (opts && opts.type) || 'Primary' };
    if (opts && opts.maxHeight) query.maxHeight = opts.maxHeight;
    return api.getImageUrl(itemId, query) || '';
}

/**
 * Says whether a thumb source is set, an address or a function, so a caller can tell an empty source from one to load.
 *
 * @param src the source
 * @returns true for a non-empty address or a function.
 */
export function hasThumbSource(src: ThumbSource): boolean {
    return typeof src === 'function' || !!src;
}

/**
 * Turns a thumb source into an address and hands it to done: at once for an address, and when it arrives for a function. A Blob becomes an object URL.
 * The returned release stops an answer still on its way and revokes the object URL, so the thumb, the avatar, and the chips call it before the next source.
 *
 * @param src an address, or a function returning an address, a Blob, or a promise of one
 * @param done function(url) called once with the address, or '' when there is none or the function fails
 * @returns release, a function that cancels and frees the source.
 */
export function resolveThumbSource(src: ThumbSource, done: (url: string) => void): () => void {
    var live = true;
    var objectUrl = '';

    function take(answer: unknown): void {
        if (!live) return;
        if (answer && typeof answer === 'object' && typeof Blob !== 'undefined' && answer instanceof Blob) {
            if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') { done(''); return; }
            objectUrl = URL.createObjectURL(answer);
            done(objectUrl);
            return;
        }
        done(typeof answer === 'string' ? answer : '');
    }

    if (typeof src !== 'function') {
        done(src || '');
    } else {
        var answer: unknown;
        try { answer = src(); } catch (e) { answer = ''; }
        if (answer && typeof (answer as PromiseLike<unknown>).then === 'function') {
            (answer as PromiseLike<unknown>).then(take, function () { take(''); });
        } else {
            take(answer);
        }
    }

    return function () {
        live = false;
        if (objectUrl && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(objectUrl);
        objectUrl = '';
    };
}

/**
 * Builds a frame that holds a placeholder icon under an image. The image exists only while there is an address, unless keepImage is set. It stays invisible until it loads and hides when it fails, so the browser's broken image mark never shows over the placeholder.
 * Without keepImage the placeholder stays under the image until it loads. With keepImage, as the image picker uses, the placeholder hides as soon as there is an address. A function source shows the placeholder until its address or Blob arrives, and a later setSrc wins over an answer still on its way.
 *
 * @param opts { src: an address, or a function returning an address, a Blob, or a promise of one [optional], icon (default 'image'), className, imageClass, placeholderClass [optional], lazy (default false), whenVisible (default false), alt (default ''), keepImage (default false) }
 * @returns { element, image, placeholder, setSrc, destroy }.
 */
export function buildThumb(opts: ThumbOptions): ThumbHandle {
    var stopImage: Array<() => void> = [];
    var release: () => void = function () { /* nothing to free yet */ };
    var watcher: IntersectionObserver | null = null;
    var frame = make('span', 'base-thumb' + (opts.className ? ' ' + opts.className : ''));
    var placeholder = make('span', 'base-thumb-placeholder' + (opts.placeholderClass ? ' ' + opts.placeholderClass : ''), { 'aria-hidden': 'true' });
    placeholder.appendChild(icon(opts.icon || 'image'));
    frame.appendChild(placeholder);
    var handle: ThumbHandle = { element: frame, image: null, placeholder: placeholder, setSrc: setSrc, destroy: destroy };

    function buildImage(): HTMLImageElement {
        var image = make('img', 'base-thumb-image' + (opts.imageClass ? ' ' + opts.imageClass : ''), { alt: opts.alt || '' });
        if (opts.lazy) {
            image.setAttribute('loading', 'lazy');
            image.setAttribute('decoding', 'async');
        }
        frame.appendChild(image);
        return image;
    }

    function show(src: string | null | undefined): void {
        runAll(stopImage);
        placeholder.hidden = !!(src && opts.keepImage);
        if (!src) {
            if (opts.keepImage) {
                handle.image!.hidden = true;
                handle.image!.classList.remove('pending');
                handle.image!.removeAttribute('src');
            } else if (handle.image) {
                frame.removeChild(handle.image);
                handle.image = null;
            }
            return;
        }
        var image = handle.image || (handle.image = buildImage());
        image.hidden = false;
        // The image stays invisible until it loads, so a failed one never paints the browser's broken image mark.
        image.classList.add('pending');
        stopImage.push(listen(image, 'load', function () {
            image.classList.remove('pending');
            if (!image.hidden) placeholder.hidden = true;
        }));
        stopImage.push(onImageError(image, function () {
            image.hidden = true;
            image.classList.remove('pending');
            placeholder.hidden = false;
        }));
        image.setAttribute('src', src);
    }

    function unwatch(): void {
        if (watcher) { watcher.disconnect(); watcher = null; }
    }

    function setSrc(src: ThumbSource): void {
        release();
        unwatch();
        // A function source shows the placeholder until its address arrives.
        if (typeof src === 'function') show(null);
        // A loader that fetches waits until its row nears the screen, so a long page asks only for what is seen.
        if (typeof src === 'function' && opts.whenVisible && typeof IntersectionObserver !== 'undefined') {
            watcher = new IntersectionObserver(function (entries) {
                if (!entries.some(function (e) { return e.isIntersecting; })) return;
                unwatch();
                release = resolveThumbSource(src, show);
            }, { rootMargin: '200px' });
            watcher.observe(frame);
            return;
        }
        release = resolveThumbSource(src, show);
    }

    function destroy(): void {
        unwatch();
        release();
        runAll(stopImage);
    }

    if (opts.keepImage) handle.image = buildImage();
    setSrc(opts.src);
    return handle;
}
