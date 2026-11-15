import { make, clear, listen, runAll, viewport, idOf } from './lib/dom.js';
import { balanceRows } from './lib/balance.js';
import type { ComponentHandle } from './types.js';

/**
 * How tall a list is. `auto` grows with its items so the page scrolls. A number of pixels or a CSS length is a
 * fixed height that scrolls inside. `fill` takes the room from the list's top to the bottom of the window, then
 * scrolls inside.
 */
export type ListHeight = 'auto' | 'fill' | number | string;

/** How a list lays out its items. `rows` are bordered rows with dividers, `grid` is tiles, `plain` has no frame. */
export type ListLayout = 'rows' | 'grid' | 'plain';

/** A rendered item with its own teardown, such as the handle a Base component returns. */
export interface ListItemHandle {
    element: HTMLElement;
    destroy?(): void;
}

/** What a list's render function returns for one item. Text is shown as text, never as markup. */
export type ListContent = Node | string | ListItemHandle | null | undefined;

/** What createList takes. The list owns the frame, the height, and the empty and loading states. render owns each item. key names an item, so setItems keeps the items that did not change. */
export interface ListOptions<T = any> {
    items?: T[] | null;
    render(item: T, index: number): ListContent;
    element?: HTMLElement | null;
    layout?: ListLayout;
    height?: ListHeight;
    maxHeight?: number | string | null;
    minHeight?: number | string | null;
    fillGap?: number;
    minColumn?: number | string;
    label?: string;
    role?: string | null;
    wrap?: boolean;
    emptyText?: string | null;
    emptyOutside?: boolean;
    loadingText?: string;
    key?: string | ((item: T) => unknown);
    onEndReached?(): void;
}

/** What createList returns. */
export interface ListHandle<T = any> extends ComponentHandle {
    getItems(): T[];
    setItems(items: T[] | null | undefined): void;
    append(items: T[] | null | undefined): void;
    removeFirst(count: number): void;
    setHeight(height: ListHeight, maxHeight?: number | string | null): void;
    setLoading(loading: boolean): void;
    scrollToStart(): void;
    scrollToEnd(): void;
    cellAt(index: number): HTMLElement | null;
    emptyElement: HTMLElement;
    destroy(): void;
}

/** The two parts of a boxed row's text: the primary text, and a dimmed secondary text that starts at the same place on every row of a list. */
export interface ItemRowParts {
    primary: Node | string;
    secondary?: Node | string | null;
}

var LAYOUTS: ListLayout[] = ['rows', 'grid', 'plain'];

/**
 * Fills a boxed row's text with a primary and a secondary part. Every row of one List shares the primary's width, so the
 * secondary texts line up, and on a narrow row the secondary wraps under the primary.
 * Internal to the web components.
 *
 * @param text the row's text element, such as a base-item-row-text
 * @param parts { primary, secondary }, each a node or plain text
 */
export function fillRowParts(text: HTMLElement, parts: ItemRowParts): void {
    text.classList.add('base-item-row-parts');
    var primary = make('span', 'base-item-row-primary');
    if (typeof parts.primary === 'string') primary.textContent = parts.primary;
    else if (parts.primary) primary.appendChild(parts.primary);
    text.appendChild(primary);
    var second = parts.secondary;
    if (second === null || second === undefined || second === '') return;
    var secondary = make('span', 'base-item-row-secondary');
    if (typeof second === 'string') secondary.textContent = second;
    else secondary.appendChild(second);
    text.appendChild(secondary);
}

/**
 * Turns a number of pixels or a CSS length into a CSS length.
 *
 * @param value a number of pixels, a CSS length, or nothing
 * @returns the CSS length, or an empty string for nothing
 */
export function cssLength(value: number | string | null | undefined): string {
    if (value === null || value === undefined || value === '') return '';
    return typeof value === 'number' ? value + 'px' : String(value);
}

/**
 * Builds a list. The list is the frame, its height, and its empty and loading states. Each item's content comes
 * from render, so any Base component, such as a media card, can sit inside it. With key, setItems keeps every item
 * whose key and content are unchanged and draws only the rest, so a list that refreshes on a timer keeps its scroll
 * position and focus.
 *
 * @param options items, render, layout, height, key, and the labels
 * @returns a handle with getItems, setItems, append, removeFirst, setHeight, setLoading, scrollToStart, scrollToEnd, cellAt, and destroy. cellAt(index) is the element that holds an item.
 */
export function createList<T = any>(options: ListOptions<T>): ListHandle<T> {
    options = options || ({} as ListOptions<T>);
    var root = options.element || make('div', '');
    var items: T[] = [];
    var handles: Array<ListItemHandle | null> = [];
    var cells: HTMLElement[] = [];
    var cleanups: Array<() => void> = [];
    var loading = false;
    var observer: IntersectionObserver | null = null;
    var sentinel = make('div', 'base-list-sentinel', { 'aria-hidden': 'true' });
    var showEmpty = options.emptyText !== null;
    var empty = make('div', 'base-list-empty', null, options.emptyText || 'Nothing to show.');
    var itemsOnly = /^(UL|OL)$/.test(String(root.tagName).toUpperCase());
    // A ul or ol may hold only items, so its empty text lives outside it, where the caller puts emptyElement.
    var outside = options.emptyOutside === true || itemsOnly;
    if (outside) { empty.classList.add('outside'); empty.hidden = true; }
    // The list's own role, or none for a list whose element already carries its meaning, such as a log.
    var role = options.role === undefined ? 'list' : options.role;
    var wrap = options.wrap !== false;
    // A ul or ol may hold only items, so its loading line is an item of its own.
    var busy = make(itemsOnly ? 'li' : 'div', 'base-list-loading', { role: 'status' }, options.loadingText || 'Loading');
    var height: ListHeight = options.height === undefined ? 'auto' : options.height;
    var maxHeight = options.maxHeight;
    var layout: ListLayout = LAYOUTS.indexOf(options.layout as ListLayout) === -1 ? 'rows' : options.layout as ListLayout;
    var fillFrame = 0;

    root.classList.add('base-list', layout);
    if (role) root.setAttribute('role', role);
    if (options.label) root.setAttribute('aria-label', options.label);
    if (layout === 'grid' && options.minColumn !== undefined) root.style.setProperty('--base-list-column', cssLength(options.minColumn));
    if (options.minHeight !== undefined && options.minHeight !== null) root.style.setProperty('--base-list-min', cssLength(options.minHeight));
    if (options.fillGap !== undefined) root.style.setProperty('--base-list-gap', options.fillGap + 'px');

    // Whether the list scrolls inside itself, which decides what the end of the list is measured against.
    function scrollsInside(): boolean {
        return height !== 'auto' || !!cssLength(maxHeight);
    }

    // Measures the list's place on the page, so a filling list ends at the bottom of the window.
    function measureFill() {
        fillFrame = 0;
        if (height !== 'fill') return;
        var scroller = document.scrollingElement || document.documentElement;
        var top = root.getBoundingClientRect().top + ((scroller && scroller.scrollTop) || 0);
        var windowHeight = viewport().height;
        // A list that starts below the first screen is as tall as the window, so it fills it once scrolled to.
        if (top >= windowHeight) top = 0;
        root.style.setProperty('--base-list-top', Math.max(0, Math.round(top)) + 'px');
    }

    // Gives every primary part of a boxed row the width of the widest, so the secondary parts start at one place.
    function alignParts() {
        var parts = root.querySelectorAll<HTMLElement>('.base-item-row-primary');
        root.style.removeProperty('--base-item-primary-width');
        if (!parts.length) return;
        var widest = 0;
        Array.prototype.forEach.call(parts, function (part: HTMLElement) {
            var box = part.getBoundingClientRect ? part.getBoundingClientRect() : null;
            if (box && box.width > widest) widest = box.width;
        });
        if (widest) root.style.setProperty('--base-item-primary-width', Math.ceil(widest) + 'px');
    }

    function onResize() {
        queueFill();
        alignParts();
    }

    function queueFill() {
        if (height !== 'fill' || fillFrame) return;
        fillFrame = typeof requestAnimationFrame === 'function' ? requestAnimationFrame(measureFill) : (setTimeout(measureFill, 16) as unknown as number);
    }

    function applyHeight() {
        root.classList.remove('fixed', 'fill', 'capped', 'scrolls');
        root.style.removeProperty('--base-list-height');
        root.style.removeProperty('--base-list-max');
        if (height === 'fill') {
            root.classList.add('fill', 'scrolls');
            queueFill();
        } else if (height !== 'auto' && cssLength(height)) {
            root.classList.add('fixed', 'scrolls');
            root.style.setProperty('--base-list-height', cssLength(height));
        }
        if (cssLength(maxHeight)) {
            root.classList.add('capped', 'scrolls');
            root.style.setProperty('--base-list-max', cssLength(maxHeight));
        }
        watchEnd();
    }

    // Calls onEndReached when the end of the list comes into view, in the list itself or in the window.
    function watchEnd() {
        if (observer) { observer.disconnect(); observer = null; }
        if (!options.onEndReached || typeof IntersectionObserver === 'undefined' || !items.length) return;
        observer = new IntersectionObserver(function (entries) {
            if (!entries.some(function (e) { return e.isIntersecting; }) || loading) return;
            options.onEndReached!();
        }, { root: scrollsInside() ? root : null, rootMargin: '0px 0px 200px 0px' });
        observer.observe(sentinel);
    }

    function teardownItems() {
        handles.forEach(function (h) { if (h && h.destroy) h.destroy(); });
        handles = [];
        cells = [];
    }

    // Draws one item into its cell, and records the cell and its handle at the end of the drawn items.
    function renderItem(item: T, index: number): HTMLElement {
        var made = drawItem(item, index);
        handles.push(made.handle);
        cells.push(made.cell);
        return made.cell;
    }

    function drawItem(item: T, index: number): { cell: HTMLElement; handle: ListItemHandle | null } {
        var content = options.render(item, index);
        var handle: ListItemHandle | null = null;
        var cell: HTMLElement;
        if (content && (content as ListItemHandle).element) handle = content as ListItemHandle;
        var node = handle ? handle.element : content as HTMLElement;
        if (typeof content === 'string') {
            cell = make('div', 'base-list-item text', null, content);
        } else if (!wrap && node && node.classList) {
            // An unwrapped item is the rendered row itself, so the row keeps its place in the markup.
            cell = node;
            cell.classList.add('base-list-item');
        } else {
            cell = make('div', 'base-list-item');
            if (node) cell.appendChild(node);
        }
        if (role === 'list') cell.setAttribute('role', 'listitem');
        return { cell: cell, handle: handle };
    }

    function keyOf(item: T): string {
        var k = idOf(item, options.key);
        return k === null || k === undefined || k === '' ? '' : String(k);
    }

    // Whether every item has a key of its own, which keeping items between draws needs.
    function keyed(list: T[]): boolean {
        if (!options.key) return false;
        var seen: Record<string, boolean> = {};
        return list.every(function (item) {
            var k = keyOf(item);
            if (!k || seen[k]) return false;
            seen[k] = true;
            return true;
        });
    }

    // Whether an item shows the same as before, so its cell can stay.
    function same(a: T, b: T): boolean {
        if (a === b) return true;
        try { return JSON.stringify(a) === JSON.stringify(b); } catch (e) { return false; }
    }

    // Draws the items again, keeping the cells of items whose key and content did not change, and focus where it was.
    function reconcile(before: T[]) {
        var old: Record<string, { cell: HTMLElement; handle: ListItemHandle | null; item: T }> = {};
        before.forEach(function (item, i) { if (cells[i]) old[keyOf(item)] = { cell: cells[i], handle: handles[i], item: item }; });
        var active = document.activeElement as HTMLElement | null;
        var focusKey = '';
        var focusClass = '';
        Object.keys(old).forEach(function (k) {
            var cell = old[k].cell;
            if (active && (cell === active || cell.contains(active))) { focusKey = k; focusClass = cell === active ? '' : String(active.className || '').split(/\s+/)[0]; }
        });
        var nextCells: HTMLElement[] = [];
        var nextHandles: Array<ListItemHandle | null> = [];
        var redrawn: Record<string, boolean> = {};
        items.forEach(function (item, i) {
            var k = keyOf(item);
            var was = old[k];
            if (was && same(was.item, item)) {
                nextCells.push(was.cell);
                nextHandles.push(was.handle);
                delete old[k];
                return;
            }
            var made = drawItem(item, i);
            nextCells.push(made.cell);
            nextHandles.push(made.handle);
            redrawn[k] = true;
        });
        Object.keys(old).forEach(function (k) {
            if (old[k].handle && old[k].handle!.destroy) old[k].handle!.destroy!();
            if (old[k].cell.parentNode === root) root.removeChild(old[k].cell);
        });
        [empty, busy, sentinel].forEach(function (el) { if (el.parentNode === root) root.removeChild(el); });
        var at = root.firstChild;
        nextCells.forEach(function (cell) {
            if (cell === at) at = at.nextSibling;
            else root.insertBefore(cell, at);
        });
        cells = nextCells;
        handles = nextHandles;
        if (focusKey && redrawn[focusKey]) {
            var cell = cells[items.map(keyOf).indexOf(focusKey)];
            var target = cell && focusClass ? cell.querySelector<HTMLElement>('.' + focusClass) : cell;
            if (target && target.focus) target.focus();
        }
    }

    function renderAll(before?: T[]) {
        var top = root.scrollTop;
        if (before && before.length && keyed(before) && keyed(items)) {
            reconcile(before);
        } else {
            teardownItems();
            clear(root);
            items.forEach(function (item, i) { root.appendChild(renderItem(item, i)); });
        }
        // Drawing the items again keeps the list where the reader scrolled it.
        if (top && scrollsInside()) root.scrollTop = top;
        finish();
    }

    // Puts the empty text, the loading line, and the end marker after the items.
    function finish() {
        if (outside) empty.hidden = !(!items.length && !loading && showEmpty);
        else if (empty.parentNode) empty.parentNode.removeChild(empty);
        if (busy.parentNode) busy.parentNode.removeChild(busy);
        if (sentinel.parentNode) sentinel.parentNode.removeChild(sentinel);
        if (!outside && !items.length && !loading && showEmpty) root.appendChild(empty);
        if (loading) root.appendChild(busy);
        // Only a list that loads more needs the end marker, so other lists keep their last child.
        if (options.onEndReached) root.appendChild(sentinel);
        root.classList.toggle('empty', !items.length);
        watchEnd();
        queueFill();
        alignParts();
    }

    cleanups.push(listen(window, 'resize', onResize));
    if (typeof ResizeObserver !== 'undefined') {
        var resize = new ResizeObserver(onResize);
        resize.observe(document.body);
        cleanups.push(function () { resize.disconnect(); });
    }

    items = (options.items || []).slice();
    applyHeight();
    renderAll();
    // Grid tiles wrap in even rows, so no row is left with a single tile.
    if (layout === 'grid') {
        var balance = balanceRows(root, { minWidth: typeof options.minColumn === 'number' ? options.minColumn : 140, skip: '.base-list-empty, .base-list-loading, .base-list-sentinel' });
        cleanups.push(function () { balance.destroy(); });
    }

    return {
        element: root,
        emptyElement: empty,
        getItems: function () { return items.slice(); },
        setItems: function (next) { var before = items; items = (next || []).slice(); renderAll(before); },
        append: function (more) {
            (more || []).forEach(function (item) {
                items.push(item);
                var before = !outside && empty.parentNode ? empty : busy.parentNode ? busy : sentinel.parentNode ? sentinel : null;
                root.insertBefore(renderItem(item, items.length - 1), before);
            });
            finish();
        },
        removeFirst: function (count) {
            var n = Math.max(0, Math.min(count || 0, items.length));
            if (!n) return;
            items.splice(0, n);
            handles.splice(0, n).forEach(function (h) { if (h && h.destroy) h.destroy(); });
            cells.splice(0, n).forEach(function (cell) { if (cell.parentNode === root) root.removeChild(cell); });
            finish();
        },
        setHeight: function (next, nextMax) {
            height = next;
            maxHeight = nextMax;
            applyHeight();
        },
        setLoading: function (on) { loading = !!on; finish(); },
        scrollToStart: function () { if (scrollsInside()) root.scrollTop = 0; },
        scrollToEnd: function () { if (scrollsInside()) root.scrollTop = root.scrollHeight; },
        cellAt: function (index) { return cells[index] || null; },
        destroy: function () {
            runAll(cleanups);
            if (observer) observer.disconnect();
            if (fillFrame && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(fillFrame);
            teardownItems();
        }
    };
}
