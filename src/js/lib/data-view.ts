import { matchesText } from './dom.js';
import type { PagedResult } from '../types.js';
import { baseText } from './base-text.js';

/** A sort on one key, ascending or descending. */
export interface DataSort {
    key: string;
    dir: 'asc' | 'desc';
}

/** What a data view asks of its items: a search, the picked values of each filter, a sort, and how many pages. */
export interface DataQuery {
    search: string;
    filters: Record<string, string[]>;
    sort: DataSort | null;
    page: number;
    pageSize: number;
}

/** What a data view holds after each change: the items to show, how many match in all, and whether more can load. */
export interface DataState<T> {
    items: T[];
    total: number;
    hasMore: boolean;
    loading: boolean;
    error: unknown;
    query: DataQuery;
}

/** One filter a data view applies to local items. test decides whether an item passes for the picked values. */
export interface DataFilter<T> {
    name: string;
    field?: string;
    test?(item: T, values: string[]): boolean;
}

/** What a change to a data view settles to. answer is the fetch's answer once shown, error is why it failed, and stale is true when a newer change replaced it. */
export interface DataResult<T> {
    answer: PagedResult<T> | { Items?: T[]; TotalCount?: number } | T[] | null;
    error: unknown;
    stale: boolean;
}

/** What createDataView takes. Give items for local data, or fetch for data the server filters, sorts, and pages. paging 'pages' shows one page at a time where 'more' adds each page to the last, and immediate false waits for the first reload before it fetches. */
export interface DataViewOptions<T> {
    items?: T[] | null;
    fetch?(query: DataQuery): Promise<PagedResult<T> | { Items?: T[]; TotalCount?: number } | T[]> | PagedResult<T> | T[];
    searchKeys?: string[];
    match?(item: T, search: string): boolean;
    filters?: DataFilter<T>[];
    sortValue?(item: T, key: string): unknown;
    search?: string;
    filterValues?: Record<string, string[]>;
    sort?: DataSort | null;
    pageSize?: number;
    paging?: 'more' | 'pages';
    immediate?: boolean;
    onChange?(state: DataState<T>): void;
}

/** What createDataView returns. Each setter recomputes the view, calls onChange, and settles once the view shows the result. */
export interface DataViewHandle<T> {
    getState(): DataState<T>;
    setItems(items: T[] | null | undefined): void;
    setSearch(search: string): Promise<DataResult<T>>;
    setFilter(name: string, values: string[] | null | undefined): Promise<DataResult<T>>;
    setFilters(values: Record<string, string[]>): Promise<DataResult<T>>;
    setSort(key: string | null, dir?: 'asc' | 'desc'): Promise<DataResult<T>>;
    setQuery(change: { search?: string; filters?: Record<string, string[]>; sort?: DataSort | null }): Promise<DataResult<T>>;
    toggleSort(key: string): Promise<DataResult<T>>;
    setPage(page: number): Promise<DataResult<T>>;
    setPageSize(pageSize: number): Promise<DataResult<T>>;
    more(): Promise<DataResult<T>>;
    reload(): Promise<DataResult<T>>;
    destroy(): void;
}

/**
 * Reads a value from an item by key, so filters, search, and sort can name a field such as Country.
 *
 * @param item the item
 * @param key the field name
 * @returns the field's value, or undefined
 */
export function fieldOf(item: unknown, key: string): unknown {
    return item && typeof item === 'object' ? (item as Record<string, unknown>)[key] : undefined;
}

/**
 * Compares two values for a sort, numbers by value and anything else as text in the reader's language, with blanks last.
 *
 * @param a the first value
 * @param b the second value
 * @returns a negative number when a sorts first, a positive one when b does, and 0 when they tie
 */
export function compareValues(a: unknown, b: unknown): number {
    var aBlank = a === null || a === undefined || a === '';
    var bBlank = b === null || b === undefined || b === '';
    if (aBlank || bBlank) return aBlank === bBlank ? 0 : aBlank ? 1 : -1;
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
    return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

/**
 * The state behind a filterable list or data table: a search, filters, a sort, and pages, over local items or a server
 * fetch. Local items are searched, filtered, sorted, and paged here. A fetch gets the query and returns one page, and
 * an answer that is no longer the latest is dropped. With paging 'more' each page adds to the rows shown, and with
 * 'pages' the rows are one page, which setPage moves.
 *
 * @param options items or fetch, how to search, filter, and sort local items, the first query, the page size, paging, immediate, and onChange
 * @returns { getState, setItems, setSearch, setFilter, setFilters, setSort, setQuery, toggleSort, setPage, setPageSize, more, reload, destroy }
 */
export function createDataView<T = any>(options: DataViewOptions<T>): DataViewHandle<T> {
    var opts = options || ({} as DataViewOptions<T>);
    var remote = typeof opts.fetch === 'function';
    var pages = opts.paging === 'pages';
    var all: T[] = (opts.items || []).slice();
    var query: DataQuery = {
        search: opts.search || '',
        filters: copyFilters(opts.filterValues || {}),
        sort: opts.sort || null,
        page: 1,
        pageSize: opts.pageSize && opts.pageSize > 0 ? opts.pageSize : 0
    };
    var state: DataState<T> = { items: [], total: 0, hasMore: false, loading: false, error: null, query: query };
    var request = 0;
    var destroyed = false;

    function copyFilters(values: Record<string, string[]>): Record<string, string[]> {
        var out: Record<string, string[]> = {};
        Object.keys(values).forEach(function (k) { out[k] = (values[k] || []).map(String); });
        return out;
    }

    function emit(): void {
        state.query = { search: query.search, filters: copyFilters(query.filters), sort: query.sort, page: query.page, pageSize: query.pageSize };
        if (opts.onChange && !destroyed) opts.onChange(state);
    }

    function matchesSearch(item: T): boolean {
        if (!query.search) return true;
        if (opts.match) return opts.match(item, query.search);
        return matchesText(item, query.search, opts.searchKeys);
    }

    function passesFilters(item: T): boolean {
        return (opts.filters || []).every(function (f) {
            var values = query.filters[f.name];
            if (!values || !values.length) return true;
            if (f.test) return f.test(item, values);
            var v = fieldOf(item, f.field || f.name);
            return values.indexOf(String(v)) !== -1;
        });
    }

    function sortValue(item: T, key: string): unknown {
        return opts.sortValue ? opts.sortValue(item, key) : fieldOf(item, key);
    }

    function computeLocal(): void {
        var rows = all.filter(function (item) { return matchesSearch(item) && passesFilters(item); });
        if (query.sort) {
            var key = query.sort.key;
            var sign = query.sort.dir === 'desc' ? -1 : 1;
            // A stable sort keeps the source order between rows that tie.
            rows = rows.map(function (item, i) { return { item: item, i: i }; })
                .sort(function (a, b) { return sign * compareValues(sortValue(a.item, key), sortValue(b.item, key)) || a.i - b.i; })
                .map(function (x) { return x.item; });
        }
        state.total = rows.length;
        if (query.pageSize && pages) query.page = Math.min(query.page, Math.max(1, Math.ceil(rows.length / query.pageSize)));
        var from = query.pageSize && pages ? (query.page - 1) * query.pageSize : 0;
        state.items = query.pageSize ? rows.slice(from, query.page * query.pageSize) : rows;
        state.hasMore = query.page * query.pageSize < rows.length && !!query.pageSize;
        state.loading = false;
        state.error = null;
        emit();
    }

    function settled(answer: DataResult<T>['answer'], error: unknown, stale: boolean): DataResult<T> {
        return { answer: answer, error: error, stale: stale };
    }

    function computeRemote(append: boolean): Promise<DataResult<T>> {
        var mine = ++request;
        state.loading = true;
        state.error = null;
        emit();
        var asked: DataQuery = { search: query.search, filters: copyFilters(query.filters), sort: query.sort, page: query.page, pageSize: query.pageSize };
        return Promise.resolve().then(function () { return opts.fetch!(asked); }).then(function (answer) {
            if (mine !== request || destroyed) return settled(null, null, true);
            var list: T[] = Array.isArray(answer) ? answer : ((answer && (answer as PagedResult<T>).Items) || []);
            var total = Array.isArray(answer) ? list.length : (answer && typeof (answer as PagedResult<T>).TotalCount === 'number' ? (answer as PagedResult<T>).TotalCount : list.length);
            state.items = append ? state.items.concat(list) : list;
            state.total = total;
            state.hasMore = !!query.pageSize && (pages ? query.page * query.pageSize : state.items.length) < total;
            state.loading = false;
            emit();
            return settled(answer, null, false);
        }, function (err) {
            if (mine !== request || destroyed) return settled(null, null, true);
            state.loading = false;
            state.error = err || new Error(baseText('Base.CouldNotLoad'));
            emit();
            return settled(null, state.error, false);
        });
    }

    // Shows the current page, fetching it for a remote view.
    function show(append: boolean): Promise<DataResult<T>> {
        if (remote) return computeRemote(append);
        computeLocal();
        return Promise.resolve(settled(null, null, false));
    }

    // Starts over from the first page, as any change to what matches does.
    function restart(): Promise<DataResult<T>> {
        query.page = 1;
        return show(false);
    }

    // A remote view that waits starts empty and fetches on the first reload.
    if (remote && opts.immediate === false) emit();
    else restart();

    return {
        getState: function () { return state; },
        setItems: function (items) { all = (items || []).slice(); if (!remote) computeLocal(); },
        setSearch: function (search) { query.search = search || ''; return restart(); },
        setFilter: function (name, values) { query.filters[name] = (values || []).map(String); return restart(); },
        setFilters: function (values) { query.filters = copyFilters(values || {}); return restart(); },
        setSort: function (key, dir) { query.sort = key ? { key: key, dir: dir === 'desc' ? 'desc' : 'asc' } : null; return restart(); },
        setQuery: function (change) {
            // Several parts change at once, so the view starts over only once.
            if (change.search !== undefined) query.search = change.search || '';
            if (change.filters !== undefined) query.filters = copyFilters(change.filters || {});
            if (change.sort !== undefined) query.sort = change.sort;
            return restart();
        },
        toggleSort: function (key) {
            // A first click sorts ascending, a second descending, and a third clears the sort.
            if (!query.sort || query.sort.key !== key) query.sort = { key: key, dir: 'asc' };
            else if (query.sort.dir === 'asc') query.sort = { key: key, dir: 'desc' };
            else query.sort = null;
            return restart();
        },
        setPage: function (page) {
            query.page = Math.max(1, Math.floor(page) || 1);
            return show(false);
        },
        setPageSize: function (pageSize) {
            query.pageSize = pageSize && pageSize > 0 ? pageSize : 0;
            return restart();
        },
        more: function () {
            if (!state.hasMore || state.loading) return Promise.resolve(settled(null, null, true));
            query.page++;
            return show(!pages);
        },
        reload: function () { return restart(); },
        destroy: function () { destroyed = true; request++; }
    };
}
