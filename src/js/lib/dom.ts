// dom.ts
// Small DOM helpers the web components share. None of them is exported from the bundle.

/** An anchor's rectangle, as getBoundingClientRect gives it. */
export interface Rect { top: number; left: number; right: number; bottom: number; }

/** A width and a height in pixels. */
export interface Size { width: number; height: number; }

/** How placeBox lines a box up with its anchor. */
export interface PlaceOptions { align?: 'start' | 'end' | 'center'; prefer?: 'below' | 'above'; gap?: number; margin?: number; }

/** Where placeBox puts a box, and the side it chose. */
export interface Placement { top: number; left: number; placement: 'below' | 'above'; }

var idCount = 0;

/**
 * Returns a page unique id with the given part in it, for aria-describedby and aria-controls wiring.
 * Internal to the web components.
 */
export function nextId(part: string): string {
    return 'base-' + part + '-' + (++idCount);
}

/**
 * Builds an element with a class, optional attributes, and optional text.
 * Internal to the web components.
 */
export function make<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string | null, attrs?: Record<string, unknown> | null, text?: unknown): HTMLElementTagNameMap[K] {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (attrs) Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k] as string); });
    if (text !== undefined && text !== null) el.textContent = text as string;
    return el;
}

/**
 * Builds a Material icon span that a screen reader skips.
 * Internal to the web components.
 */
export function icon(name: string): HTMLSpanElement {
    return make('span', 'material-icons', { 'aria-hidden': 'true' }, name);
}

/**
 * Builds a type=button button with a title, an aria-label, and an optional icon.
 * Internal to the web components.
 */
export function iconButton(className: string, iconName: string | null, label: string): HTMLButtonElement {
    var btn = make('button', className, { type: 'button', title: label, 'aria-label': label });
    if (iconName) btn.appendChild(icon(iconName));
    return btn;
}

/**
 * Removes every child of an element.
 * Internal to the web components.
 */
export function clear(el: Element): void {
    el.innerHTML = '';
}

/**
 * Adds a listener and returns the function that removes it, so a handle's destroy can undo every one.
 * Internal to the web components.
 */
export function listen(target: EventTarget, type: string, fn: (e: any) => void, capture?: boolean): () => void {
    target.addEventListener(type, fn, !!capture);
    return function () { target.removeEventListener(type, fn, !!capture); };
}

/**
 * Runs every function in a list once, for a destroy that undoes its listeners.
 * Internal to the web components.
 */
export function runAll(list: Array<() => void>): void {
    list.splice(0).forEach(function (fn) { fn(); });
}

/**
 * Puts a value into a label template that holds {value}, so a caller's label stays plain data.
 * Internal to the web components.
 */
export function fill(template: unknown, value: unknown): string {
    var text = toText(value);
    return String(template).replace(/\{value\}/g, function () { return text; });
}

/**
 * Puts several values into a label template, where each {key} takes values[key] and a token with no value stays as written.
 * Internal to the web components.
 */
export function fillAll(template: unknown, values: Record<string, unknown>): string {
    return String(template).replace(/\{(\w+)\}/g, function (token: string, key: string) {
        return has(values, key) ? toText(values[key]) : token;
    });
}

/**
 * Turns a value into text for textContent or a field's value, with null and undefined as ''. It does not escape.
 * Internal to the web components.
 */
export function toText(value: unknown): string {
    return value === undefined || value === null ? '' : String(value);
}

/**
 * Finds where a floating box goes beside an anchor. It opens below the anchor, or above with prefer 'above', flips to the other side when the preferred one has no room, and clamps the box inside the viewport.
 * @param anchor { top, left, right, bottom } the anchor's rectangle
 * @param size { width, height } the box
 * @param view { width, height } the viewport
 * @param opts { align: 'start', 'end', or 'center' (default 'center'), prefer: 'below' or 'above' (default 'below'), gap (default 8), margin (default 8) } [optional]
 * @returns { top, left, placement }, where placement is 'below' or 'above'.
 * Internal to the web components.
 */
export function placeBox(anchor: Rect, size: Size, view: Size, opts?: PlaceOptions): Placement {
    opts = opts || {};
    var gap = opts.gap === undefined ? 8 : opts.gap;
    var margin = opts.margin === undefined ? 8 : opts.margin;
    var roomBelow = view.height - margin - (anchor.bottom + gap);
    var roomAbove = anchor.top - gap - margin;
    var fitsBelow = size.height <= roomBelow;
    var fitsAbove = size.height <= roomAbove;
    var below: boolean;
    if (fitsBelow && fitsAbove) below = opts.prefer !== 'above';
    else if (fitsBelow || fitsAbove) below = fitsBelow;
    else below = roomBelow >= roomAbove;
    var top = below ? anchor.bottom + gap : anchor.top - gap - size.height;
    top = Math.max(margin, Math.min(top, Math.max(margin, view.height - size.height - margin)));
    var left: number;
    if (opts.align === 'start') left = anchor.left;
    else if (opts.align === 'end') left = anchor.right - size.width;
    else left = anchor.left + (anchor.right - anchor.left) / 2 - size.width / 2;
    left = Math.max(margin, Math.min(left, view.width - size.width - margin));
    return { top: top, left: left, placement: below ? 'below' : 'above' };
}

/**
 * Reads the viewport size, with a fallback where the window has none.
 * Internal to the web components.
 */
export function viewport(): Size {
    return {
        width: typeof window.innerWidth === 'number' ? window.innerWidth : 1024,
        height: typeof window.innerHeight === 'number' ? window.innerHeight : 768
    };
}

/**
 * Tells whether a lookup table holds a key of its own, so a name such as constructor or __proto__ never finds an inherited member.
 * Internal to the web components.
 */
export function has(table: object, key: PropertyKey | null | undefined): boolean {
    return Object.prototype.hasOwnProperty.call(table, key as PropertyKey);
}

/**
 * Marks an element while it holds state that Escape closes, such as an open popup, so a dialog around it leaves that Escape to the component.
 * Internal to the web components.
 */
export function claimEscape(el: Element, on: boolean): void {
    if (on) el.setAttribute('data-base-escape', 'true');
    else el.removeAttribute('data-base-escape');
}

/**
 * Adds a token to a space separated attribute such as aria-describedby, once.
 * Internal to the web components.
 */
export function addToken(el: Element, attr: string, token: string): void {
    var list = (el.getAttribute(attr) || '').split(/\s+/).filter(Boolean);
    if (list.indexOf(token) === -1) list.push(token);
    el.setAttribute(attr, list.join(' '));
}

/**
 * Removes a token from a space separated attribute, and the attribute when it empties.
 * Internal to the web components.
 */
export function removeToken(el: Element, attr: string, token: string): void {
    var list = (el.getAttribute(attr) || '').split(/\s+/).filter(function (t) { return t && t !== token; });
    if (list.length) el.setAttribute(attr, list.join(' '));
    else el.removeAttribute(attr);
}

/** A field size on Base's size scale. Medium is the default and needs no marker. */
export type FieldSize = 'small' | 'medium' | 'large';

/**
 * Sets data-base-size on an element so the fields inside it take the small or large step of the size scale. Medium, an unknown value, or nothing removes it.
 * Internal to the web components.
 */
export function applyFieldSize(el: HTMLElement, size: FieldSize | string | null | undefined): void {
    if (size === 'small' || size === 'large') el.setAttribute('data-base-size', size);
    else el.removeAttribute('data-base-size');
}

/**
 * Moves focus after a remove: to the target now at the removed index, else the last one, else the fallback, such as the
 * input or the Add button. Every list that removes rows or chips uses it, so focus never drops to the page.
 * Internal to the web components.
 */
export function focusAfterRemove(targets: ArrayLike<HTMLElement | null | undefined>, at: number, fallback?: HTMLElement | null): void {
    var next = targets.length ? targets[Math.min(at, targets.length - 1)] : null;
    if (next) next.focus();
    else if (fallback) fallback.focus();
}

/**
 * Whether any of an item's fields holds the search text, ignoring case. The one text match every search in Base uses.
 * Internal to the web components.
 *
 * @param item the item, or a plain string
 * @param query the search text, where '' matches everything
 * @param keys the fields to look in (default name and Name); ignored for a string item
 */
export function matchesText(item: unknown, query: string, keys?: string[]): boolean {
    if (!query) return true;
    var q = query.toLowerCase();
    if (typeof item === 'string' || typeof item === 'number') return String(item).toLowerCase().indexOf(q) !== -1;
    if (!item || typeof item !== 'object') return false;
    return (keys || ['name', 'Name']).some(function (k) {
        var v = (item as Record<string, unknown>)[k];
        return v !== null && v !== undefined && String(v).toLowerCase().indexOf(q) !== -1;
    });
}

/**
 * Reads an item's id by a key name or a function, as a list with selection names it.
 * Internal to the web components.
 */
export function idOf(item: unknown, idKey?: string | ((item: any) => unknown)): unknown {
    var k = idKey || 'id';
    if (typeof k === 'function') return k(item);
    return item && typeof item === 'object' ? (item as Record<string, unknown>)[k] : undefined;
}

/**
 * Formats a byte count, such as 2 MB or 2.34 MB, up to TB. The bag's formatSize and every size message use it, so sizes read alike.
 * Internal to the web components.
 */
export function formatBytes(bytes: number): string {
    if (!bytes) return '0 B';
    var units = ['B', 'KB', 'MB', 'GB', 'TB'];
    var i = 0;
    while (bytes >= 1024 && i < units.length - 1) { bytes /= 1024; i++; }
    // Up to two decimals with no trailing zeros, so 2 MB and 2.34 MB, never 2.00 MB.
    return parseFloat(bytes.toFixed(i > 0 ? 2 : 0)) + ' ' + units[i];
}

/**
 * Writes seconds as clock time, such as 90 as '1:30' and 5400 as '1:30:00'. A time that is not a positive number is '0:00'.
 * The audio player, the countdown, and the bag's formatDuration all use it, so times read alike.
 * Internal to the web components.
 */
export function clockText(seconds: number): string {
    var total = isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
    var h = Math.floor(total / 3600);
    var m = Math.floor((total % 3600) / 60);
    var s = total % 60;
    var pad = function (n: number): string { return n < 10 ? '0' + n : String(n); };
    return h ? h + ':' + pad(m) + ':' + pad(s) : m + ':' + pad(s);
}
