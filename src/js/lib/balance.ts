import { listen, runAll } from './dom.js';

/** How balanceRows sizes a group. minWidth is the least a tile takes, and maxColumns caps a row. */
export interface BalanceOptions {
    minWidth?: number;
    maxColumns?: number;
    gap?: number;
    skip?: string;
}

/** What balanceRows returns. update lays the group out again, such as after its tiles change. */
export interface BalanceHandle {
    update(): void;
    destroy(): void;
}

/**
 * Splits a number of tiles into rows of even size, so no row is left with a single tile. It takes the fewest rows
 * the columns allow, keeps the rows within one tile of each other, and joins rows when one would hold a lone tile.
 *
 * @param count the number of tiles
 * @param columns the most tiles a row fits
 * @returns the size of each row, the larger rows first
 */
export function rowSizes(count: number, columns: number): number[] {
    if (count <= 0) return [];
    columns = Math.max(1, Math.floor(columns));
    if (columns === 1) return Array.from({ length: count }, function () { return 1; });
    var rows = Math.ceil(count / columns);
    // A row of one would stand alone, so use fewer, fuller rows instead.
    if (count > 1 && Math.floor(count / rows) < 2) rows = Math.max(1, Math.floor(count / 2));
    var small = Math.floor(count / rows);
    var large = count % rows;
    var sizes: number[] = [];
    for (var i = 0; i < rows; i++) sizes.push(i < large ? small + 1 : small);
    return sizes;
}

function gcd(a: number, b: number): number { return b ? gcd(b, a % b) : a; }

/**
 * Lays a group's tiles out in balanced rows, on a grid whose columns are the least common multiple of the row sizes,
 * so every tile in a row spans the same share. It lays out again when the group resizes or its tiles change.
 *
 * @param container the element that holds the tiles
 * @param options minWidth (default 160), maxColumns, gap (default the container's column gap, else 12), and skip, a selector for children that are not tiles
 * @returns { update, destroy }
 */
export function balanceRows(container: HTMLElement, options?: BalanceOptions): BalanceHandle {
    var opts = options || {};
    var cleanups: Array<() => void> = [];
    var frame = 0;
    container.classList.add('base-balanced');

    function tiles(): HTMLElement[] {
        return Array.prototype.filter.call(container.children, function (el: HTMLElement) {
            if (el.hidden || el.classList.contains('hidden')) return false;
            if (typeof getComputedStyle === 'function' && getComputedStyle(el).display === 'none') return false;
            return !(opts.skip && el.matches && el.matches(opts.skip));
        }) as HTMLElement[];
    }

    function update(): void {
        frame = 0;
        var list = tiles();
        var width = container.clientWidth || 0;
        var style = typeof getComputedStyle === 'function' ? getComputedStyle(container) : null;
        var gap = opts.gap !== undefined ? opts.gap : parseFloat((style && (style.columnGap || style.gap)) || '') || 12;
        // A group's CSS may set --base-balance-min and --base-balance-max, which win over the options.
        var cssMin = style ? parseFloat(style.getPropertyValue('--base-balance-min')) : NaN;
        var cssMax = style ? parseFloat(style.getPropertyValue('--base-balance-max')) : NaN;
        var min = cssMin > 0 ? cssMin : (opts.minWidth || 160);
        var max = cssMax > 0 ? cssMax : opts.maxColumns;
        var columns = width ? Math.floor((width + gap) / (min + gap)) : list.length;
        if (max) columns = Math.min(columns, max);
        var sizes = rowSizes(list.length, Math.max(1, columns));
        var total = sizes.reduce(function (acc, n) { return acc * n / gcd(acc, n); }, 1);
        container.style.setProperty('--base-balance-columns', String(total));
        var index = 0;
        sizes.forEach(function (size) {
            for (var i = 0; i < size; i++) list[index++].style.setProperty('--base-balance-span', String(total / size));
        });
    }

    function queue(): void {
        if (frame) return;
        frame = typeof requestAnimationFrame === 'function' ? requestAnimationFrame(update) : (setTimeout(update, 16) as unknown as number);
    }

    if (typeof ResizeObserver !== 'undefined') {
        var resize = new ResizeObserver(queue);
        resize.observe(container);
        cleanups.push(function () { resize.disconnect(); });
    } else {
        cleanups.push(listen(window, 'resize', queue));
    }
    if (typeof MutationObserver !== 'undefined') {
        var mutation = new MutationObserver(queue);
        mutation.observe(container, { childList: true });
        cleanups.push(function () { mutation.disconnect(); });
    }
    update();

    return {
        update: update,
        destroy: function () {
            runAll(cleanups);
            if (frame && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame);
            container.classList.remove('base-balanced');
            container.style.removeProperty('--base-balance-columns');
        }
    };
}
