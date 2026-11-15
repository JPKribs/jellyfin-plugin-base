import { make, listen, runAll, clear, fill } from './dom-util.js';
import type { ComponentHandle } from './types.js';

/** Where the pager stands, with the skip and take to request that page. */
export interface PaginationValue {
    page: number;
    pageSize: number;
    skip: number;
    take: number;
    total: number;
    pageCount: number;
}

/** What createPagination takes. Every label is plain text, and onChange runs when the user moves. */
export interface PaginationOptions {
    page?: number;
    pageSize?: number;
    total?: number;
    pageSizes?: number[];
    windowSize?: number;
    previousText?: string;
    nextText?: string;
    pageSizeLabel?: string;
    navLabel?: string;
    pageLabel?: string;
    totalText?: string;
    emptyText?: string;
    onChange?(value: PaginationValue): void;
}

/** What createPagination returns. setResult reads TotalCount, or totalCount, from a paged result. */
export interface PaginationHandle extends ComponentHandle {
    getValue(): PaginationValue;
    setValue(next?: { page?: number; pageSize?: number; total?: number } | null): void;
    setTotal(total: number | null | undefined): void;
    setResult(result: { TotalCount?: number; totalCount?: number } | null | undefined): void;
    destroy(): void;
}

// Builds the page numbers to show, always the first and last page and a window around the current one, with null for each gap.
function pageWindow(page: number, count: number, size: number): Array<number | null> {
    if (count <= size + 2) {
        var all: Array<number | null> = [];
        for (var n = 1; n <= count; n++) all.push(n);
        return all;
    }
    var from = Math.max(2, page - Math.floor((size - 1) / 2));
    var to = Math.min(count - 1, from + size - 1);
    from = Math.max(2, to - size + 1);
    var out: Array<number | null> = [1];
    if (from > 2) out.push(null);
    for (var i = from; i <= to; i++) out.push(i);
    if (to < count - 1) out.push(null);
    out.push(count);
    return out;
}

/**
 * A footer for a list that is read a page at a time. It has a page size select, Previous and Next buttons, a window of page numbers, and a total text. It reports skip and take, so it works with a PagedResult of Items and TotalCount.
 *
 * @param options {
 *   page         : first page, counted from 1 (default 1)
 *   pageSize     : rows per page (default 25)
 *   total        : total rows (default 0)
 *   pageSizes    : array of numbers in the page size select (default [10, 25, 50, 100])
 *   windowSize   : most page numbers shown around the current page (default 5)
 *   previousText : text of the previous button (default 'Previous')
 *   nextText     : text of the next button (default 'Next')
 *   pageSizeLabel: label of the page size select (default 'Page Size')
 *   navLabel     : aria-label of the footer (default 'Pagination')
 *   pageLabel    : aria-label of a page number button, where {value} is the number (default 'Page {value}')
 *   totalText    : summary where {from}, {to}, and {total} are filled in (default '{from} to {to} of {total}')
 *   emptyText    : summary when the total is 0 (default 'No items.')
 *   onChange     : function({ page, pageSize, skip, take, total, pageCount }) called when the user changes the page or the size [optional]
 * }
 * @returns { element, getValue, setValue, setTotal, setResult, destroy }. getValue returns { page, pageSize, skip, take, total, pageCount }. setResult(result) reads TotalCount, or totalCount, from a PagedResult.
 * A page size change returns to page 1. A page beyond the last page moves to the last.
 */
export function createPagination(options?: PaginationOptions): PaginationHandle {
    options = options || {};
    var state = { page: options.page || 1, pageSize: options.pageSize || 25, total: options.total || 0 };
    var sizes = (options.pageSizes || [10, 25, 50, 100]).slice();
    var cleanups: Array<() => void> = [];

    var root = make('nav', 'jpk-pager', { 'aria-label': options.navLabel || 'Pagination' });
    var summary = make('span', 'jpk-pager-total');
    var sizeWrap = make('label', 'jpk-pager-size');
    sizeWrap.appendChild(make('span', '', null, options.pageSizeLabel || 'Page Size'));
    var select = make('select', '');
    sizeWrap.appendChild(select);
    var buttons = make('div', 'jpk-pager-pages');
    root.appendChild(summary);
    root.appendChild(sizeWrap);
    root.appendChild(buttons);

    function pageCount() { return Math.max(1, Math.ceil(state.total / state.pageSize)); }

    function value() {
        return { page: state.page, pageSize: state.pageSize, skip: (state.page - 1) * state.pageSize, take: state.pageSize, total: state.total, pageCount: pageCount() };
    }

    function pageButton(className: string, label: string, text: string, target: number, disabled: boolean, current: boolean, kind: string): HTMLButtonElement {
        var btn = make('button', 'jpk-pager-button ' + className, { type: 'button' });
        if (label) btn.setAttribute('aria-label', label);
        if (current) { btn.classList.add('active'); btn.setAttribute('aria-current', 'page'); }
        btn.disabled = !!disabled;
        btn.textContent = text;
        btn.addEventListener('click', function () { go(target, true, kind); });
        return btn;
    }

    function render() {
        state.page = Math.min(Math.max(1, state.page), pageCount());
        var from = state.total ? (state.page - 1) * state.pageSize + 1 : 0;
        var to = Math.min(state.total, state.page * state.pageSize);
        summary.textContent = state.total ? String(options!.totalText || '{from} to {to} of {total}').replace('{from}', from as unknown as string).replace('{to}', to as unknown as string).replace('{total}', state.total as unknown as string) : (options!.emptyText || 'No items.');
        clear(select);
        if (sizes.indexOf(state.pageSize) === -1) sizes.push(state.pageSize);
        sizes.sort(function (a: number, b: number) { return a - b; }).forEach(function (n: number) {
            var o = make('option', '', { value: String(n) }, String(n));
            if (n === state.pageSize) o.setAttribute('selected', '');
            select.appendChild(o);
        });
        select.value = String(state.pageSize);
        clear(buttons);
        var count = pageCount();
        buttons.appendChild(pageButton('jpk-pager-prev', '', options!.previousText || 'Previous', state.page - 1, state.page <= 1, false, 'prev'));
        pageWindow(state.page, count, options!.windowSize || 5).forEach(function (n) {
            if (n === null) buttons.appendChild(make('span', 'jpk-pager-gap', { 'aria-hidden': 'true' }));
            else buttons.appendChild(pageButton('jpk-pager-number', fill(options!.pageLabel || 'Page {value}', n), String(n), n, false, n === state.page, 'number'));
        });
        buttons.appendChild(pageButton('jpk-pager-next', '', options!.nextText || 'Next', state.page + 1, state.page >= count, false, 'next'));
    }

    // Gives focus back after a render replaced the button, to the same role, or the current page when that button is now disabled.
    function refocus(kind: string) {
        var wanted = buttons.querySelector<HTMLButtonElement>('.jpk-pager-' + (kind === 'number' ? 'number.active' : kind));
        if (!wanted || wanted.disabled) wanted = buttons.querySelector<HTMLButtonElement>('.jpk-pager-number.active');
        if (wanted) wanted.focus();
    }

    function go(page: number, user: boolean, kind: string) {
        var before = state.page;
        state.page = page;
        render();
        if (kind) refocus(kind);
        if (user && state.page !== before && options!.onChange) options!.onChange(value());
    }

    cleanups.push(listen(select, 'change', function () {
        state.pageSize = parseInt(select.value, 10) || state.pageSize;
        state.page = 1;
        render();
        if (options.onChange) options.onChange(value());
    }));

    render();

    return {
        element: root,
        getValue: value,
        setValue: function (next?: { page?: number; pageSize?: number; total?: number } | null) {
            next = next || {};
            if (next.pageSize) state.pageSize = next.pageSize;
            if (next.total !== undefined) state.total = next.total;
            if (next.page) state.page = next.page;
            render();
        },
        setTotal: function (total: number | null | undefined) { state.total = total || 0; render(); },
        setResult: function (result: { TotalCount?: number; totalCount?: number } | null | undefined) {
            var total = result && (result.TotalCount !== undefined ? result.TotalCount : result.totalCount);
            state.total = total || 0;
            render();
        },
        destroy: function () { runAll(cleanups); clear(buttons); }
    };
}
