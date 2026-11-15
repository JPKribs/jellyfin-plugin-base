import { classNames } from './escape.js';
import type { Shared, PagedResult } from './types.js';

/** One column of a paginated table. label is written on each cell as data-label. */
export interface TableColumn<T = any> {
    key: string;
    type?: 'status' | 'custom' | string;
    render?(item: T, value: any): string;
    label?: string;
    className?: unknown;
    hidden?: boolean;
}

/** One option of the filter select. A hidden option starts out of view until setFilterOptionVisible shows it. */
export interface TableFilterOption {
    value: string;
    label: string;
    id?: string;
    hidden?: boolean;
}

/** The filter select. buildParams runs only for a value other than empty, and initialValue is the filter the first load carries. */
export interface TableFilters {
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
    selection?: TableSelection<T>;
    pagination?: TablePagination;
    filters?: TableFilters | null;
    search?: TableSearch;
    actions?: TableActions<T>;
    emptyState?: { message?: string };
}

/** What createPaginatedTable returns. load resolves to the page result, or to null when a newer load superseded it. */
export interface TableHandle<T = any> {
    load(): Promise<PagedResult<T> | null>;
    reload(): Promise<PagedResult<T> | null>;
    setFilter(value: string): Promise<PagedResult<T> | null>;
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
    setFilterValue(value: string): void;
    setFilterOptionVisible(optionId: string, visible: boolean): void;
}

// TableElements
// The parts of the rendered table that the controller reads after a render.
interface TableElements {
    container?: HTMLElement;
    search?: HTMLInputElement | null;
    filter?: HTMLSelectElement | null;
    selectAll?: HTMLInputElement | null;
    selectedCount?: HTMLElement | null;
    bulkActions?: HTMLElement | null;
    reloadBtn?: HTMLButtonElement | null;
    body?: HTMLElement | null;
    loadingMore?: HTMLElement | null;
    scrollSentinel?: HTMLElement | null;
    itemCount?: HTMLElement | null;
    footerActions?: HTMLElement | null;
    loadMoreBtn?: HTMLButtonElement | null;
    loadAllBtn?: HTMLButtonElement | null;
}

// TableState
// The loaded rows, the paging position, the query, and the selection.
interface TableState<T> {
    items: T[];
    totalCount: number;
    currentPage: number;
    pageSize: number;
    searchQuery: string;
    filterValue: string;
    selectedIds: Set<string>;
    isLoading: boolean;
    hasMore: boolean;
}

// TableConfig
// The options after the defaults are merged in, so the defaulted members are always present. containerId starts null until the caller's options land.
type TableConfig<T> = Omit<TableOptions<T>, 'containerId' | 'pagination' | 'search' | 'emptyState'> & {
    containerId: string | null;
    pagination: TablePagination & { pageSize: number };
    search: TableSearch;
    emptyState: { message: string };
};

// TableInternals
// The controller's private record of its options, state, elements, and timers.
interface TableInternals<T> {
    options: TableConfig<T>;
    state: TableState<T>;
    elements: TableElements;
    searchTimeout: ReturnType<typeof setTimeout> | null;
    loadSeq: number;
    loadedOnce: boolean;
    destroyed: boolean;
    wantObserver: boolean;
    _scrollObserver?: IntersectionObserver | null;
}

// TargetEvent
// An event whose target is known to be an element of the given type.
type TargetEvent<E extends EventTarget> = Event & { target: E };

// TargetEventHost
// An element whose listeners take a TargetEvent of the given element type.
interface TargetEventHost<E extends EventTarget> {
    addEventListener(type: string, listener: (e: TargetEvent<E>) => void): void;
}

/**
 * Builds a searchable, filterable, infinite scrolling table backed by an endpoint that returns Items and TotalCount. It renders into the container and returns a controller.
 *
 * @param view page element containing the table container
 * @param shared helper bag from createShared, used for escapeHtml and apiRequest
 * @param options {
 *   containerId   : id of the element the table renders into [required]
 *   endpoint      : path that takes skip, take, search, and filter parameters [required]
 *   columns       : [{ key, type: 'status' | 'custom', render(item, value), label, className, hidden }], where label is written on each cell as data-label [required]
 *   getDisplayStatus : function(item, value) returning the text of a status column [optional]
 *   getStatusClass   : function(item, value) returning the state class of a status column [optional]
 *   selection     : { enabled, idKey, onSelectionChange(ids) }, where idKey is a property name or a function (default 'id')
 *   pagination    : { pageSize (default 50), loadMore }, where loadMore swaps infinite scroll for Load More and Load All buttons
 *   filters       : { options: [{ value, label, id, hidden }], buildParams(value), onChange(value), initialValue, allValue, allLabel }, or null for none
 *   search        : { enabled, placeholder, debounceMs } (defaults true, 'Search items', 300)
 *   actions       : { onRowClick(item), onReload() }
 *   emptyState    : { message } (default 'No items found.')
 * }
 * @returns { load, reload, setFilter, setSearch, getSelectedIds, getSelectedItems, clearSelection, getItems, getTotalCount, getBulkActionsContainer, getControlsContainer, disconnectObserver, reconnectObserver, refresh, destroy, setFilterValue, setFilterOptionVisible }.
 * load resolves to the page result, or to null when a newer load superseded it. refresh reloads and keeps the selection, which reload clears. destroy stops the observer and the search timer, so call it on viewhide.
 * The All filter value is allValue (default ''), and buildParams runs only for a non-empty value, so give allValue one when buildParams must also run for All. initialValue is the filter the first load carries.
 */
export function createPaginatedTable<T = any>(view: ParentNode, shared: Shared, options: TableOptions<T>): TableHandle<T> {
    var table: TableInternals<T> = {
        options: {
            containerId: null,
            endpoint: '',
            columns: [],
            selection: { enabled: false, idKey: 'id' },
            pagination: { pageSize: 50 },
            filters: { options: [] },
            search: { enabled: true, placeholder: 'Search items', debounceMs: 300 },
            actions: {},
            emptyState: { message: 'No items found.' }
        },
        state: null!,
        elements: {},
        searchTimeout: null,
        // An answer to an older load is dropped, so a newer load never loses to it.
        loadSeq: 0,
        loadedOnce: false,
        destroyed: false,
        // Keeps the observer off when the caller disconnected it before the first load landed.
        wantObserver: true
    };

    (Object.keys(options) as Array<keyof TableOptions<T>>).forEach(function (key) {
        if (typeof options[key] === 'object' && options[key] !== null && !Array.isArray(options[key])) {
            (table.options as Record<string, unknown>)[key] = Object.assign({}, (table.options as Record<string, unknown>)[key], options[key]);
        } else {
            (table.options as Record<string, unknown>)[key] = options[key];
        }
    });

    // A null filters option means none.
    var initialFilters: TableFilters = table.options.filters || {};
    table.state = {
        items: [], totalCount: 0, currentPage: 1,
        pageSize: table.options.pagination.pageSize,
        searchQuery: '', filterValue: initialFilters.initialValue || initialFilters.allValue || '',
        selectedIds: new Set(), isLoading: false, hasMore: true
    };

    function _getItemId(item: T): unknown {
        var idKey: string | ((item: T) => unknown) = (table.options.selection && table.options.selection.idKey) || 'id';
        return typeof idKey === 'function' ? idKey(item) : (item as Record<string, unknown>)[idKey];
    }

    function _createStructure(): void {
        var container = view.querySelector<HTMLElement>('#' + table.options.containerId);
        if (!container) return;
        container.innerHTML = _buildHTML();
        _cacheElements(container);
    }

    function _cacheElements(container: HTMLElement): void {
        table.elements = {
            container: container,
            search: container.querySelector<HTMLInputElement>('.jpk-table-search'),
            filter: container.querySelector<HTMLSelectElement>('.jpk-table-filter'),
            selectAll: container.querySelector<HTMLInputElement>('.jpk-table-select-all'),
            selectedCount: container.querySelector<HTMLElement>('.jpk-table-selected-count'),
            bulkActions: container.querySelector<HTMLElement>('.jpk-table-bulk-actions'),
            reloadBtn: container.querySelector<HTMLButtonElement>('.jpk-table-reload-btn'),
            body: container.querySelector<HTMLElement>('.jpk-table-body'),
            loadingMore: container.querySelector<HTMLElement>('.jpk-table-loading-more'),
            scrollSentinel: container.querySelector<HTMLElement>('.jpk-table-scroll-sentinel'),
            itemCount: container.querySelector<HTMLElement>('.jpk-table-item-count'),
            footerActions: container.querySelector<HTMLElement>('.jpk-table-footer-actions'),
            loadMoreBtn: container.querySelector<HTMLButtonElement>('.jpk-table-load-more'),
            loadAllBtn: container.querySelector<HTMLButtonElement>('.jpk-table-load-all')
        };
    }

    // Returns the markup for the controls, selection header, body, and footer.
    function _buildHTML(): string {
        var opts = table.options;
        var html = '<div class="jpk-table-wrapper"><div class="jpk-table-controls">';
        if (opts.search && opts.search.enabled !== false) {
            html += '<input type="text" class="jpk-table-search" placeholder="' +
                shared.escapeHtml(opts.search.placeholder || 'Search items') + '" />';
        }
        if (opts.filters && opts.filters.options && opts.filters.options.length) {
            html += '<div class="jpk-table-filter-wrapper"><select class="jpk-table-filter"><option value="' +
                shared.escapeHtml(opts.filters.allValue || '') + '">' + shared.escapeHtml(opts.filters.allLabel || 'All') + '</option>';
            opts.filters.options.forEach(function (opt) {
                var style = opt.hidden ? ' style="display:none"' : '';
                var id = opt.id ? ' id="' + shared.escapeHtml(opt.id) + '"' : '';
                html += '<option value="' + shared.escapeHtml(opt.value) + '"' + style + id + '>' +
                    shared.escapeHtml(opt.label) + '</option>';
            });
            html += '</select><span class="jpk-table-filter-arrow">&#9662;</span></div>';
        }
        html += '</div>';

        if (opts.selection && opts.selection.enabled) {
            html += '<div class="jpk-table-selection-header">' +
                '<label class="jpk-table-select-all-label"><input type="checkbox" class="jpk-table-select-all" />' +
                '<span class="jpk-table-checkbox-custom"></span><span class="jpk-table-select-all-text">Select All</span></label>' +
                '<span class="jpk-table-selected-count">0 selected</span>' +
                '<div class="jpk-table-bulk-actions"></div><span class="jpk-table-header-spacer"></span>' +
                '<button type="button" class="jpk-table-reload-btn" title="Reload"><span class="jpk-table-reload-icon">&#8635;</span></button>' +
                '</div>';
        }

        var loadMore = opts.pagination && opts.pagination.loadMore;
        html += '<div class="jpk-table-body"></div>' +
            '<div class="jpk-table-loading-more" style="display:none;">Loading more…</div>' +
            '<div class="jpk-table-scroll-sentinel"></div>' +
            '<div class="jpk-table-footer"><span class="jpk-table-item-count"></span>' +
            (loadMore ?
                '<span class="jpk-table-footer-actions" style="display:none;">' +
                    '<button type="button" class="jpk-table-load-more">Load More</button>' +
                    '<button type="button" class="jpk-table-load-all">Load All</button>' +
                '</span>' : '') +
            '</div></div>';
        return html;
    }

    // Binds the search, filter, select all, reload, and load more controls.
    function _bindEvents(): void {
        if (table.elements.search) {
            (table.elements.search as TargetEventHost<HTMLInputElement>).addEventListener('input', function (e: TargetEvent<HTMLInputElement>) {
                if (table.searchTimeout) clearTimeout(table.searchTimeout);
                var ms = table.options.search.debounceMs || 300;
                var value = e.target.value;
                table.searchTimeout = setTimeout(function () { publicAPI.setSearch(value); }, ms);
            });
        }
        if (table.elements.filter) {
            (table.elements.filter as TargetEventHost<HTMLSelectElement>).addEventListener('change', function (e: TargetEvent<HTMLSelectElement>) { publicAPI.setFilter(e.target.value); });
        }
        if (table.elements.selectAll) {
            (table.elements.selectAll as TargetEventHost<HTMLInputElement>).addEventListener('change', function (e: TargetEvent<HTMLInputElement>) { _toggleSelectAll(e.target.checked); });
        }
        if (table.elements.reloadBtn) {
            table.elements.reloadBtn.addEventListener('click', _handleReload);
        }
        var loadMore = table.options.pagination && table.options.pagination.loadMore;
        if (loadMore) {
                if (table.elements.loadMoreBtn) table.elements.loadMoreBtn.addEventListener('click', _loadMore);
            if (table.elements.loadAllBtn) table.elements.loadAllBtn.addEventListener('click', _loadAll);
        }
        if (table.elements.filter) table.elements.filter.value = table.state.filterValue;
    }

    // Starts the infinite scroll observer once the first page is in, so it never pages past a page that has not arrived.
    function _createScrollObserver(): void {
        if (table._scrollObserver || !table.elements.scrollSentinel || !table.loadedOnce || table.destroyed || !table.wantObserver) return;
        if (typeof IntersectionObserver === 'undefined') return;
        if (table.options.pagination && table.options.pagination.loadMore) return;
        table._scrollObserver = new IntersectionObserver(function (entries) {
            if (entries[0].isIntersecting && !table.state.isLoading && table.state.hasMore) _loadMore();
        }, { rootMargin: '200px' });
        table._scrollObserver.observe(table.elements.scrollSentinel);
    }

    // Resets paging state for a fresh load. Clears the selection unless keepSelection is true.
    function _resetState(keepSelection: boolean): void {
        table.state.items = [];
        table.state.currentPage = 1;
        table.state.hasMore = true;
        // Goes through clearSelection so the checkboxes and any listener update.
        if (!keepSelection) publicAPI.clearSelection();
    }

    function _setFooterLoading(loading: boolean): void {
        if (table.elements.loadingMore) table.elements.loadingMore.style.display = loading ? 'block' : 'none';
        if (table.elements.loadMoreBtn) table.elements.loadMoreBtn.disabled = loading;
        if (table.elements.loadAllBtn) table.elements.loadAllBtn.disabled = loading;
    }

    // Loads every remaining page one after another.
    function _loadAll(): void {
        if (table.state.isLoading || !table.state.hasMore) return;
        _setFooterLoading(true);
        // A load superseded by a search, filter or reload ends the run.
        function step(result?: PagedResult<T> | null): void {
            if (result === null || !table.state.hasMore) { _setFooterLoading(false); return; }
            table.state.currentPage++;
            publicAPI.load().then(step).catch(function () { _setFooterLoading(false); });
        }
        step();
    }

    // Reloads from the first page with the spinner on, then calls onReload.
    function _handleReload(): void {
        var btn = table.elements.reloadBtn;
        if (btn) { btn.classList.add('spinning'); btn.disabled = true; }
        _resetState(false);
        function done(): void {
            if (btn) { btn.classList.remove('spinning'); btn.disabled = false; }
            if (table.options.actions && table.options.actions.onReload) table.options.actions.onReload();
        }
        publicAPI.load().then(function (result) {
            // A null result means a newer load replaced this one, so onReload is not told of it.
            if (result !== null) done();
            else if (btn) { btn.classList.remove('spinning'); btn.disabled = false; }
        }, function () {
            // A failed load still ends the reload, and is swallowed here so it does not surface as unhandled.
            done();
        });
    }

    function _loadMore(): void {
        if (!table.state.hasMore || table.state.isLoading) return;
        table.state.currentPage++;
        if (table.elements.loadingMore) table.elements.loadingMore.style.display = 'block';
        publicAPI.load().finally(function () {
            if (table.elements.loadingMore) table.elements.loadingMore.style.display = 'none';
        });
    }

    function _setLoading(loading: boolean): void {
        if (!table.elements.container) return;
        if (loading && table.state.currentPage === 1) table.elements.container.classList.add('jpk-table-loading');
        else table.elements.container.classList.remove('jpk-table-loading');
    }

    function _render(): void {
        _renderBody();
        _updateItemCount();
        _updateSelectionUI();
    }

    function _renderBody(): void {
        var state = table.state, opts = table.options, body = table.elements.body;
        if (!body) return;
        if (state.items.length === 0) {
            body.innerHTML = '<div class="jpk-table-empty">' + shared.escapeHtml(opts.emptyState.message) + '</div>';
            return;
        }
        body.innerHTML = state.items.map(_renderRow).join('');
        _bindRowEvents();
    }

    // Returns the markup for one row, including its selection checkbox and cells.
    function _renderRow(item: T): string {
        var opts = table.options;
        var itemId = _getItemId(item);
        // A row that opens something is reached and opened from the keyboard too.
        var opens = opts.actions && opts.actions.onRowClick ? ' jpk-table-row-clickable" tabindex="0' : '';
        var picked = table.state.selectedIds.has(String(itemId)) ? ' selected' : '';
        var html = '<div class="jpk-table-row' + picked + opens + '" data-id="' + shared.escapeHtml(String(itemId)) + '">';
        if (opts.selection && opts.selection.enabled) {
            var checked = table.state.selectedIds.has(String(itemId)) ? ' checked' : '';
            html += '<div class="jpk-table-cell jpk-table-cell-checkbox"><input type="checkbox" class="jpk-table-row-checkbox" data-id="' +
                shared.escapeHtml(String(itemId)) + '"' + checked + ' /></div>';
        }
        opts.columns.filter(function (c) { return !c.hidden; }).forEach(function (col) {
            var value = (item as Record<string, unknown>)[col.key];
            var cellClass = 'jpk-table-cell';
            if (col.type === 'status') cellClass += ' jpk-table-cell-status';
            if (col.className) cellClass += ' ' + classNames(col.className);
            var content = '';
            if (col.type === 'status') {
                var displayStatus = table.options.getDisplayStatus ? table.options.getDisplayStatus(item, value) : (value || '');
                var statusClass = table.options.getStatusClass ? table.options.getStatusClass(item, value) : (value || '');
                content = '<button type="button" class="jpk-table-status-badge jpk-table-status-btn ' + classNames(statusClass) + '" data-id="' +
                    shared.escapeHtml(String(itemId)) + '">' + shared.escapeHtml(displayStatus) + '</button>';
            } else if (col.type === 'custom' && col.render) {
                content = col.render(item, value);
            } else {
                content = value !== null && value !== undefined ? shared.escapeHtml(String(value)) : '';
            }
            var labelAttr = col.label ? ' data-label="' + shared.escapeHtml(col.label) + '"' : '';
            html += '<div class="' + cellClass + '"' + labelAttr + '>' + content + '</div>';
        });
        return html + '</div>';
    }

    // Binds click and key handling on the rendered rows, status buttons, and checkboxes.
    function _bindRowEvents(): void {
        var body = table.elements.body;
        if (!body) return;
        body.querySelectorAll<HTMLElement>('.jpk-table-row').forEach(function (row) {
            (row as TargetEventHost<HTMLInputElement>).addEventListener('click', function (e: TargetEvent<HTMLInputElement>) {
                if (e.target.type === 'checkbox' || e.target.classList.contains('jpk-table-row-checkbox') ||
                    e.target.classList.contains('jpk-table-status-btn')) return;
                var item = _getItemById(row.dataset.id);
                if (item && table.options.actions && table.options.actions.onRowClick) {
                    e.preventDefault();
                    e.stopPropagation();
                    table.options.actions.onRowClick(item);
                }
            });
            row.addEventListener('keydown', function (e: KeyboardEvent) {
                if (e.target !== row || (e.key !== 'Enter' && e.key !== ' ')) return;
                var item = _getItemById(row.dataset.id);
                if (item && table.options.actions && table.options.actions.onRowClick) {
                    e.preventDefault();
                    table.options.actions.onRowClick(item);
                }
            });
        });
        body.querySelectorAll<HTMLElement>('.jpk-table-status-btn').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                var item = _getItemById(btn.dataset.id);
                if (item && table.options.actions && table.options.actions.onRowClick) {
                    table.options.actions.onRowClick(item);
                }
            });
        });
        body.querySelectorAll<HTMLInputElement>('.jpk-table-row-checkbox').forEach(function (checkbox) {
            checkbox.addEventListener('change', function (e) {
                e.stopPropagation();
                if (checkbox.checked) table.state.selectedIds.add(checkbox.dataset.id!);
                else table.state.selectedIds.delete(checkbox.dataset.id!);
                _markRow(checkbox, checkbox.checked);
                _updateSelectionUI();
                _notifySelectionChange();
            });
            checkbox.addEventListener('click', function (e) { e.stopPropagation(); });
        });
    }

    function _getItemById(id: unknown): T | undefined {
        return table.state.items.find(function (item) { return String(_getItemId(item)) === String(id); });
    }

    // Writes the item count and shows the footer buttons while more rows remain.
    function _updateItemCount(): void {
        if (!table.elements.itemCount) return;
        var loaded = table.state.items.length, total = table.state.totalCount;
        var loadMore = table.options.pagination && table.options.pagination.loadMore;
        var noun = total === 1 ? ' item' : ' items';
        if (total === 0) table.elements.itemCount.textContent = '';
        else if (loaded >= total) table.elements.itemCount.textContent = total + noun;
        else table.elements.itemCount.textContent = loadMore
            ? (loaded + '/' + total + noun)
            : ('Showing ' + loaded + ' of ' + total + noun);
        if (table.elements.footerActions) {
            table.elements.footerActions.style.display = (total > 0 && loaded < total) ? '' : 'none';
        }
    }

    function _updateSelectionUI(): void {
        var count = table.state.selectedIds.size;
        if (table.elements.selectedCount) table.elements.selectedCount.textContent = count + ' selected';
        if (table.elements.selectAll) {
            table.elements.selectAll.checked = count > 0 && count === table.state.items.length;
            table.elements.selectAll.indeterminate = count > 0 && count < table.state.items.length;
        }
    }

    // Selects or clears every loaded row.
    function _toggleSelectAll(checked: boolean): void {
        table.state.selectedIds.clear();
        if (checked) table.state.items.forEach(function (item) { table.state.selectedIds.add(String(_getItemId(item))); });
        if (table.elements.body) {
            table.elements.body.querySelectorAll<HTMLInputElement>('.jpk-table-row-checkbox').forEach(function (cb) { cb.checked = checked; _markRow(cb, checked); });
        }
        _updateSelectionUI();
        _notifySelectionChange();
    }

    // Adds or removes the selected class on the row that holds a checkbox.
    function _markRow(checkbox: Element, on: boolean): void {
        var row = checkbox.closest && checkbox.closest('.jpk-table-row');
        if (row) row.classList.toggle('selected', on);
    }

    function _notifySelectionChange(): void {
        if (table.options.selection && table.options.selection.onSelectionChange) {
            table.options.selection.onSelectionChange(publicAPI.getSelectedIds());
        }
    }

    var publicAPI: TableHandle<T> = {
        load: function () {
            var state = table.state, opts = table.options;
            var seq = ++table.loadSeq;
            state.isLoading = true;
            _setLoading(true);

            var params = ['skip=' + ((state.currentPage - 1) * state.pageSize), 'take=' + state.pageSize];
            if (state.searchQuery) params.push('search=' + encodeURIComponent(state.searchQuery));
            if (state.filterValue) {
                if (opts.filters && opts.filters.buildParams) {
                    var fp = opts.filters.buildParams(state.filterValue);
                    Object.keys(fp).forEach(function (k) {
                        if (fp[k] !== null && fp[k] !== undefined) params.push(k + '=' + encodeURIComponent(fp[k]));
                    });
                } else {
                    params.push('filter=' + encodeURIComponent(state.filterValue));
                }
            }
            var endpoint = opts.endpoint + (params.length ? '?' + params.join('&') : '');

            return shared.apiRequest(endpoint, 'GET').then(function (result: PagedResult<T>) {
                if (seq !== table.loadSeq) return null;
                var newItems = result.Items || [];
                state.totalCount = result.TotalCount || 0;
                state.items = state.currentPage === 1 ? newItems : state.items.concat(newItems);
                state.hasMore = state.items.length < state.totalCount;
                _render();
                state.isLoading = false;
                _setLoading(false);
                if (!table.loadedOnce) { table.loadedOnce = true; _createScrollObserver(); }
                return result;
            }).catch(function (err) {
                if (seq !== table.loadSeq) return null;
                state.isLoading = false;
                _setLoading(false);
                throw err;
            });
        },
        reload: function () {
            _resetState(false);
            return this.load();
        },
        setFilter: function (value: string) {
            table.state.filterValue = value;
            if (table.elements.filter) table.elements.filter.value = value;
            _resetState(false);
            var filters = table.options.filters;
            if (filters && filters.onChange) filters.onChange(value);
            return this.load();
        },
        setSearch: function (query: string) {
            table.state.searchQuery = query;
            _resetState(false);
            return this.load();
        },
        getSelectedIds: function () { return Array.from(table.state.selectedIds); },
        getSelectedItems: function () {
            return table.state.items.filter(function (item) {
                return table.state.selectedIds.has(String(_getItemId(item)));
            });
        },
        clearSelection: function () {
            table.state.selectedIds.clear();
            _updateSelectionUI();
            _notifySelectionChange();
            if (table.elements.body) {
                table.elements.body.querySelectorAll<HTMLInputElement>('.jpk-table-row-checkbox').forEach(function (cb) { cb.checked = false; _markRow(cb, false); });
            }
            if (table.elements.selectAll) {
                table.elements.selectAll.checked = false;
                table.elements.selectAll.indeterminate = false;
            }
        },
        getItems: function () { return table.state.items; },
        getTotalCount: function () { return table.state.totalCount; },
        getBulkActionsContainer: function () { return table.elements.bulkActions; },
        getControlsContainer: function () { return table.elements.container && table.elements.container.querySelector<HTMLElement>('.jpk-table-controls'); },
        disconnectObserver: function () {
            table.wantObserver = false;
            if (table._scrollObserver) { table._scrollObserver.disconnect(); table._scrollObserver = null; }
        },
        reconnectObserver: function () {
            table.destroyed = false;
            table.wantObserver = true;
            _createScrollObserver();
        },
        refresh: function () {
            _resetState(true);
            return this.load();
        },
        destroy: function () {
            table.destroyed = true;
            this.disconnectObserver();
            if (table.searchTimeout) { clearTimeout(table.searchTimeout); table.searchTimeout = null; }
        },
        setFilterValue: function (value: string) {
            table.state.filterValue = value;
            if (table.elements.filter) table.elements.filter.value = value;
        },
        setFilterOptionVisible: function (optionId: string, visible: boolean) {
            if (!table.elements.filter) return;
            var option = table.elements.filter.querySelector<HTMLElement>('#' + optionId);
            if (option) option.style.display = visible ? 'block' : 'none';
        }
    };

    _createStructure();
    _bindEvents();
    return publicAPI;
}
