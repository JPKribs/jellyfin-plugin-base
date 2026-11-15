import { classNames } from './lib/class-names.js';
import { make, iconButton, listen, runAll, toText, idOf } from './lib/dom.js';
import { plural } from './browser-helpers.js';
import { createFilteredList } from './filtered-list.js';
import { buildThumb, SHAPE_ICONS } from './lib/thumb.js';
import type { DataQuery, DataResult, DataState } from './lib/data-view.js';
import type { ListItemHandle } from './list.js';
import type { ThumbShape, ThumbSource } from './lib/thumb.js';
import type { Shared, PagedResult } from './types.js';

/** One column of a paginated table. label is written on each cell as data-label, and image puts a thumbnail of imageShape before the cell's content, from an address or a function that returns an address, a Blob, or a promise of one. */
export interface TableColumn<T = any> {
    key: string;
    type?: 'status' | 'custom' | string;
    render?(item: T, value: any): string;
    label?: string;
    className?: unknown;
    hidden?: boolean;
    image?(item: T): ThumbSource;
    imageShape?: ThumbShape;
}

/** One option of the filter select. A hidden option starts out of view until setFilterOptionVisible shows it. */
export interface TableFilterOption {
    value: string;
    label: string;
    id?: string;
    hidden?: boolean;
}

/** One filter select. buildParams runs only for a value other than empty, and initialValue is the filter the first load carries. name is the query parameter, and label the select's aria-label. */
export interface TableFilters {
    name?: string;
    label?: string;
    options?: TableFilterOption[];
    buildParams?(value: string): Record<string, string | number | boolean | null | undefined>;
    onChange?(value: string): void;
    initialValue?: string;
    allValue?: string;
    allLabel?: string;
}

/** Row selection. idKey is a property name or a function that returns a row's id. */
export interface TableSelection<T = any> {
    enabled?: boolean;
    idKey?: string | ((item: T) => unknown);
    onSelectionChange?(ids: string[]): void;
}

/** The page size, and loadMore to swap infinite scroll for Load More and Load All buttons. */
export interface TablePagination {
    pageSize?: number;
    loadMore?: boolean;
}

/** The search box and how long it waits after typing before it loads. */
export interface TableSearch {
    enabled?: boolean;
    placeholder?: string;
    debounceMs?: number;
}

/** onRowClick runs when a row or its status button is chosen, and onReload after the reload button's load. */
export interface TableActions<T = any> {
    onRowClick?(item: T): void;
    onReload?(): void;
}

/** What createPaginatedTable takes. The endpoint takes skip, take, search, and filter parameters and returns Items and TotalCount. */
export interface TableOptions<T = any> {
    containerId: string;
    endpoint: string;
    columns: TableColumn<T>[];
    getDisplayStatus?(item: T, value: any): string;
    getStatusClass?(item: T, value: any): unknown;
    rowClass?(item: T, index: number): unknown;
    selection?: TableSelection<T>;
    pagination?: TablePagination;
    filters?: TableFilters | TableFilters[] | null;
    search?: TableSearch;
    actions?: TableActions<T>;
    emptyState?: { message?: string };
    size?: 'small' | 'medium' | 'large';
}

/** What createPaginatedTable returns. load resolves to the page result, or to null when a newer load superseded it. */
export interface TableHandle<T = any> {
    load(): Promise<PagedResult<T> | null>;
    reload(): Promise<PagedResult<T> | null>;
    setFilter(value: string, name?: string): Promise<PagedResult<T> | null>;
    setSearch(query: string): Promise<PagedResult<T> | null>;
    getSelectedIds(): string[];
    getSelectedItems(): T[];
    clearSelection(): void;
    getItems(): T[];
    getTotalCount(): number;
    getBulkActionsContainer(): HTMLElement | null | undefined;
    getControlsContainer(): HTMLElement | null | undefined;
    disconnectObserver(): void;
    reconnectObserver(): void;
    refresh(): Promise<PagedResult<T> | null>;
    destroy(): void;
    setFilterValue(value: string, name?: string): void;
    setFilterOptionVisible(optionId: string, visible: boolean): void;
}

// TableConfig
// The options after the defaults are merged in, so the defaulted members are always present.
type TableConfig<T> = Omit<TableOptions<T>, 'pagination' | 'search' | 'emptyState'> & {
    pagination: TablePagination & { pageSize: number };
    search: TableSearch;
    emptyState: { message: string };
};

/**
 * Builds a searchable, filterable, infinite scrolling table backed by an endpoint that returns Items and TotalCount. It renders into the container and returns a controller.
 * It is a Filtered List whose items are rows from a server fetch, with the Filtered List's search, multiple selection, select all, open action, and paging, and its own filter select, status cells, and footer.
 *
 * @param view page element containing the table container
 * @param shared helper bag from createShared, used for apiRequest and statusBadge
 * @param options {
 *   containerId   : id of the element the table renders into [required]
 *   endpoint      : path that takes skip, take, search, and filter parameters [required]
 *   rowClass      : function(item, index) returning class names for the row, such as 'selected' for a row picked elsewhere, set after every draw and refresh through the Filtered List's itemClass [optional]
 *   columns       : [{ key, type: 'status' | 'custom', render(item, value), label, className, hidden, image(item), imageShape }], where label is written on each cell as data-label, and image(item) returns the thumbnail drawn before the cell in imageShape, as an address or a function that returns an address, a Blob, or a promise of one, loaded lazily and freed when its row goes, 'portrait' (default), 'wide', 'square', or 'round' [required]
 *   getDisplayStatus : function(item, value) returning the text of a status column [optional]
 *   getStatusClass   : function(item, value) returning the state class of a status column [optional]
 *   selection     : { enabled, idKey, onSelectionChange(ids) }, where idKey is a property name or a function (default 'id')
 *   pagination    : { pageSize (default 50), loadMore }, where loadMore swaps infinite scroll for Load More and Load All buttons
 *   filters       : { name, label, options: [{ value, label, id, hidden }], buildParams(value), onChange(value), initialValue, allValue, allLabel }, an array of them for several selects, or null for none. name is the query parameter (default 'filter' for the first, then 'filter2' and on), and label the select's aria-label
 *   search        : { enabled, placeholder, debounceMs } (defaults true, 'Search items', 300)
 *   actions       : { onRowClick(item), onReload() }
 *   emptyState    : { message } (default 'No items found.')
 *   size          : 'small', 'medium', or 'large' for its fields (default 'medium')
 * }
 * @returns { load, reload, setFilter, setSearch, getSelectedIds, getSelectedItems, clearSelection, getItems, getTotalCount, getBulkActionsContainer, getControlsContainer, disconnectObserver, reconnectObserver, refresh, destroy, setFilterValue, setFilterOptionVisible }.
 * load starts from the first page and resolves to the page result, or to null when a newer load superseded it. refresh reloads and keeps the selection, which reload clears. destroy stops the observer and any pending search, so call it on viewhide.
 * The All filter value is allValue (default ''), and buildParams runs only for a non-empty value, so give allValue one when buildParams must also run for All. initialValue is the filter the first load carries.
 * setFilter and setFilterValue act on the filter named by name, or the first one.
 */
export function createPaginatedTable<T = any>(view: ParentNode, shared: Shared, options: TableOptions<T>): TableHandle<T> {
    var opts = {
        endpoint: '',
        columns: [],
        selection: { enabled: false, idKey: 'id' },
        pagination: { pageSize: 50 },
        filters: { options: [] },
        search: { enabled: true, placeholder: 'Search items', debounceMs: 300 },
        actions: {},
        emptyState: { message: 'No items found.' }
    } as unknown as TableConfig<T>;

    (Object.keys(options) as Array<keyof TableOptions<T>>).forEach(function (key) {
        if (typeof options[key] === 'object' && options[key] !== null && !Array.isArray(options[key])) {
            (opts as Record<string, unknown>)[key] = Object.assign({}, (opts as Record<string, unknown>)[key], options[key]);
        } else {
            (opts as Record<string, unknown>)[key] = options[key];
        }
    });

    // A null filters option means none, and one object is one select.
    var rawFilters = opts.filters as TableFilters | TableFilters[] | null;
    var filterList: TableFilters[] = Array.isArray(rawFilters) ? rawFilters.filter(Boolean) : rawFilters ? [rawFilters] : [];
    var names = filterList.map(function (f, i) { return f.name || (i === 0 ? 'filter' : 'filter' + (i + 1)); });
    var filterValues: Record<string, string> = {};
    filterList.forEach(function (f, i) { filterValues[names[i]] = f.initialValue || f.allValue || ''; });
    var selecting = !!(opts.selection && opts.selection.enabled);
    var loadMoreMode = !!(opts.pagination && opts.pagination.loadMore);
    var actions: TableActions<T> = opts.actions || {};
    var searchText = '';
    var destroyed = false;
    var loadingAll = false;
    var current: T[] = [];
    // The footer and the reload button exist before the Filtered List first draws, since its first draw paints them.
    var container = view.querySelector<HTMLElement>('#' + opts.containerId);
    var footer = make('div', 'base-table-footer');
    var itemCount = make('span', 'base-table-item-count');
    footer.appendChild(itemCount);
    var footerActions: HTMLElement | null = null;
    var loadMoreBtn: HTMLButtonElement | null = null;
    var loadAllBtn: HTMLButtonElement | null = null;
    if (loadMoreMode) {
        footerActions = make('span', 'base-table-footer-actions');
        footerActions.hidden = true;
        loadMoreBtn = make('button', 'raised base-button secondary small base-table-load-more', { type: 'button' }, 'Load More');
        loadAllBtn = make('button', 'raised base-button secondary small base-table-load-all', { type: 'button' }, 'Load All');
        footerActions.appendChild(loadMoreBtn);
        footerActions.appendChild(loadAllBtn);
        footer.appendChild(footerActions);
    }

    function idOfItem(item: T): string {
        return toText(idOf(item, (opts.selection && opts.selection.idKey) || 'id'));
    }

    // Builds one cell's content: a status button that opens the row, the caller's markup, or the value as text. A thumbnail's destroy goes on frees, so a row that leaves revokes its object URL.
    function fillCell(cell: HTMLElement, col: TableColumn<T>, item: T, id: string, frees: Array<() => void>): void {
        var value = (item as Record<string, unknown>)[col.key];
        if (col.type === 'status') {
            var text = opts.getDisplayStatus ? opts.getDisplayStatus(item, value) : (value || '');
            var state = opts.getStatusClass ? opts.getStatusClass(item, value) : (value || '');
            var btn = make('button', 'base-table-status-btn', { type: 'button', 'data-id': id, 'data-base-open': '' });
            btn.innerHTML = shared.statusBadge(toText(text), classNames(state));
            cell.appendChild(btn);
        } else if (col.type === 'custom' && col.render) {
            cell.innerHTML = col.render(item, value);
        } else {
            cell.textContent = toText(value);
        }
        if (col.image) {
            var shape: ThumbShape = col.imageShape || 'portrait';
            var thumb = buildThumb({ src: col.image(item), icon: SHAPE_ICONS[shape], className: 'base-table-thumb ' + shape, lazy: true, whenVisible: true });
            cell.insertBefore(thumb.element, cell.firstChild);
            frees.push(thumb.destroy);
        }
    }

    // Builds one row, with the selection checkbox the Filtered List gives it in a cell of its own, and its cells.
    function renderRow(item: T, index: number, check?: HTMLInputElement | null): ListItemHandle {
        var id = idOfItem(item);
        var frees: Array<() => void> = [];
        var row = make('div', 'base-table-row', { 'data-id': id });
        if (actions.onRowClick) row.classList.add('base-table-row-clickable');
        if (check) {
            var boxCell = make('div', 'base-table-cell base-table-cell-checkbox');
            check.classList.add('base-table-row-checkbox');
            boxCell.appendChild(check);
            row.appendChild(boxCell);
        }
        opts.columns.filter(function (c) { return !c.hidden; }).forEach(function (col) {
            var cls = 'base-table-cell';
            if (col.type === 'status') cls += ' base-table-cell-status';
            if (col.image) cls += ' base-table-cell-with-thumb';
            if (col.className) cls += ' ' + classNames(col.className);
            var cell = make('div', cls, col.label ? { 'data-label': col.label } : null);
            fillCell(cell, col, item, id, frees);
            row.appendChild(cell);
        });
        return { element: row, destroy: function () { runAll(frees); } };
    }

    // Asks the endpoint for one page of the query the data view holds.
    function fetchPage(q: DataQuery): Promise<PagedResult<T>> {
        var params = ['skip=' + ((q.page - 1) * q.pageSize), 'take=' + q.pageSize];
        if (q.search) params.push('search=' + encodeURIComponent(q.search));
        filterList.forEach(function (filter, i) {
            var value = (q.filters[names[i]] || [])[0] || '';
            if (!value) return;
            if (filter.buildParams) {
                var fp = filter.buildParams(value);
                Object.keys(fp).forEach(function (k) {
                    if (fp[k] !== null && fp[k] !== undefined) params.push(k + '=' + encodeURIComponent(fp[k] as string));
                });
            } else {
                params.push(names[i] + '=' + encodeURIComponent(value));
            }
        });
        return shared.apiRequest(opts.endpoint + '?' + params.join('&'), 'GET');
    }

    // Writes the item count and shows the footer buttons while more rows remain.
    function paintFooter(state: DataState<T>): void {
        var loaded = state.items.length, total = state.total;
        if (total === 0) itemCount.textContent = '';
        else if (loaded >= total) itemCount.textContent = plural(total, 'item');
        else itemCount.textContent = loadMoreMode ? loaded + '/' + plural(total, 'item') : 'Showing ' + loaded + ' of ' + plural(total, 'item');
        if (footerActions) footerActions.hidden = !(total > 0 && loaded < total);
        if (loadMoreBtn) loadMoreBtn.disabled = state.loading || loadingAll;
        if (loadAllBtn) loadAllBtn.disabled = state.loading || loadingAll;
    }

    var base = createFilteredList<T>({
        itemClass: opts.rowClass,
        render: renderRow,
        fetch: fetchPage,
        rowKey: idOfItem,
        immediate: false,
        pageSize: opts.pagination.pageSize,
        loadOnScroll: !loadMoreMode,
        search: opts.search && opts.search.enabled !== false ? { placeholder: opts.search.placeholder || 'Search items', delay: opts.search.debounceMs || 300 } : false,
        selectable: selecting ? 'multiple' : null,
        selectAllText: 'Select All',
        selectedText: selecting ? '{count} selected' : undefined,
        selectText: 'Select row',
        containChecks: true,
        wrap: false,
        emptyText: opts.emptyState.message,
        summary: false,
        size: opts.size,
        onOpen: actions.onRowClick ? function (item) { actions.onRowClick!(item); } : undefined,
        onSelectionChange: function (ids) {
            if (opts.selection && opts.selection.onSelectionChange) opts.selection.onSelectionChange(ids);
        },
        onSearch: function (value) {
            // The table runs its own search, which clears the selection, and a failed one is caught so typing never leaves an unhandled rejection.
            if (!destroyed) publicAPI.setSearch(value).catch(function () { return null; });
            return false;
        },
        onChange: function (state) {
            current = state.items;
            if (container) container.classList.toggle('base-table-loading', state.loading && state.query.page === 1);
            paintFooter(state);
        }
    });

    var wrapper = base.element;
    wrapper.classList.add('base-table-wrapper');
    var controls = base.toolbar;
    controls.classList.add('base-table-controls');
    var body = base.list.element;
    body.classList.add('base-table-body');
    var searchField = controls.querySelector<HTMLElement>('.base-search');
    if (searchField) searchField.classList.add('base-table-search');

    var filterSelects: Record<string, HTMLSelectElement> = {};
    filterList.forEach(function (filter, i) {
        if (!filter.options || !filter.options.length) return;
        var name = names[i];
        var select = make('select', 'base-filtered-select base-table-filter', filter.label ? { 'aria-label': filter.label } : null);
        select.appendChild(make('option', '', { value: filter.allValue || '' }, filter.allLabel || 'All'));
        filter.options.forEach(function (opt) {
            var option = make('option', '', { value: opt.value }, opt.label);
            if (opt.id) option.id = opt.id;
            if (opt.hidden) option.hidden = true;
            select.appendChild(option);
        });
        controls.appendChild(select);
        select.value = filterValues[name];
        filterSelects[name] = select;
        listen(select, 'change', function () { publicAPI.setFilter(select.value, name); });
    });

    function filterQuery(): Record<string, string[]> {
        var out: Record<string, string[]> = {};
        names.forEach(function (name) { out[name] = filterValues[name] ? [filterValues[name]] : []; });
        return out;
    }

    function nameOf(name?: string): string | null {
        if (name === undefined || name === null) return names.length ? names[0] : null;
        return names.indexOf(name) === -1 ? null : name;
    }

    var reloadBtn: HTMLButtonElement | null = null;
    var bar = base.selectBar;
    if (bar) {
        bar.classList.add('base-table-selection-header');
        var mark = function (selector: string, cls: string): void { var el = bar!.querySelector(selector); if (el) el.classList.add(cls); };
        mark('.base-filtered-selectall', 'base-table-select-all-label');
        mark('.base-filtered-selectall-box', 'base-table-select-all');
        mark('.base-filtered-selectall .base-check-label', 'base-table-select-all-text');
        mark('.base-filtered-selected', 'base-table-selected-count');
        mark('.base-filtered-bulk', 'base-table-bulk-actions');
        bar.appendChild(make('span', 'base-table-header-spacer'));
        reloadBtn = iconButton('base-row-btn base-table-reload-btn', 'refresh', 'Reload');
        bar.appendChild(reloadBtn);
        listen(reloadBtn, 'click', handleReload);
    }
    wrapper.appendChild(footer);
    if (loadMoreBtn) listen(loadMoreBtn, 'click', function () { loadMore(); });
    if (loadAllBtn) listen(loadAllBtn, 'click', loadAll);

    if (container) {
        container.innerHTML = '';
        container.appendChild(wrapper);
    }

    // Turns what the data view settled to into what load promises: the page, null when superseded, or the error.
    function answer(result: DataResult<T>): PagedResult<T> | null {
        if (result.stale) return null;
        if (result.error) throw result.error;
        return result.answer as PagedResult<T>;
    }

    function loadMore(): Promise<PagedResult<T> | null> {
        var state = base.getState();
        if (!state.hasMore || state.loading) return Promise.resolve(null);
        return base.more().then(answer);
    }

    // Loads every remaining page one after another, and stops when a search, filter, or reload supersedes it.
    function loadAll(): void {
        var state = base.getState();
        if (state.loading || !state.hasMore || loadingAll) return;
        loadingAll = true;
        function step(result: DataResult<T>): void {
            if (result.stale || result.error || !base.getState().hasMore) {
                loadingAll = false;
                paintFooter(base.getState());
                return;
            }
            base.more().then(step);
        }
        base.more().then(step);
    }

    // Reloads from the first page with the icon turning, then calls onReload.
    function handleReload(): void {
        var btn = reloadBtn!;
        btn.classList.add('spinning');
        btn.disabled = true;
        function stop(): void { btn.classList.remove('spinning'); btn.disabled = false; }
        publicAPI.reload().then(function (result) {
            stop();
            // A null result means a newer load replaced this one, so onReload is not told of it.
            if (result !== null && actions.onReload) actions.onReload();
        }, function () {
            // A failed load still ends the reload, and is swallowed here so it does not surface as unhandled.
            stop();
            if (actions.onReload) actions.onReload();
        });
    }

    var publicAPI: TableHandle<T> = {
        load: function () {
            return base.query({ search: searchText, filters: filterQuery() }).then(answer);
        },
        reload: function () {
            publicAPI.clearSelection();
            return publicAPI.load();
        },
        setFilter: function (value: string, name?: string) {
            var key = nameOf(name);
            if (key !== null) {
                filterValues[key] = value;
                if (filterSelects[key]) filterSelects[key].value = value;
            }
            publicAPI.clearSelection();
            var filter = key === null ? null : filterList[names.indexOf(key)];
            if (filter && filter.onChange) filter.onChange(value);
            return publicAPI.load();
        },
        setSearch: function (text: string) {
            searchText = text;
            publicAPI.clearSelection();
            return publicAPI.load();
        },
        getSelectedIds: function () { return base.getSelected(); },
        getSelectedItems: function () { return base.getSelectedItems(); },
        clearSelection: function () { base.clearSelection(); },
        getItems: function () { return current; },
        getTotalCount: function () { return base.getState().total; },
        getBulkActionsContainer: function () { return base.bulkBar; },
        getControlsContainer: function () { return controls; },
        disconnectObserver: function () { base.setLoadOnScroll(false); },
        reconnectObserver: function () {
            destroyed = false;
            base.setLoadOnScroll(true);
        },
        refresh: function () { return publicAPI.load(); },
        destroy: function () {
            destroyed = true;
            base.setLoadOnScroll(false);
            base.list.destroy();
        },
        setFilterValue: function (value: string, name?: string) {
            var key = nameOf(name);
            if (key === null) return;
            filterValues[key] = value;
            if (filterSelects[key]) filterSelects[key].value = value;
        },
        setFilterOptionVisible: function (optionId: string, visible: boolean) {
            Object.keys(filterSelects).forEach(function (key) {
                var option = filterSelects[key].querySelector<HTMLElement>('#' + optionId);
                if (option) option.hidden = !visible;
            });
        }
    };

    return publicAPI;
}
