import { classNames } from './escape.js';

// createPaginatedTable
// Builds a searchable, filterable, infinite scrolling table backed by an endpoint that returns Items and TotalCount. It renders into the container and returns a controller.
//
// Param: view    | page element containing the table container
// Param: shared  | helper bag from createShared, used for escapeHtml and apiRequest
// Param: options | {
//   containerId   : id of the element the table renders into [required]
//   endpoint      : path that takes skip, take, search, and filter parameters [required]
//   columns       : [{ key, type: 'status' | 'custom', render(item, value), label, className, hidden }], where label is written on each cell as data-label [required]
//   getDisplayStatus : function(item, value) returning the text of a status column [optional]
//   getStatusClass   : function(item, value) returning the state class of a status column [optional]
//   selection     : { enabled, idKey, onSelectionChange(ids) }, where idKey is a property name or a function (default 'id')
//   pagination    : { pageSize (default 50), loadMore }, where loadMore swaps infinite scroll for Load More and Load All buttons
//   filters       : { options: [{ value, label, id, hidden }], buildParams(value), onChange(value), initialValue, allValue, allLabel }, or null for none
//   search        : { enabled, placeholder, debounceMs } (defaults true, 'Search items', 300)
//   actions       : { onRowClick(item), onReload() }
//   emptyState    : { message } (default 'No items found.')
// }
// Returns { load, reload, setFilter, setSearch, getSelectedIds, getSelectedItems, clearSelection, getItems, getTotalCount, getBulkActionsContainer, getControlsContainer, disconnectObserver, reconnectObserver, refresh, destroy, setFilterValue, setFilterOptionVisible }.
// load resolves to the page result, or to null when a newer load superseded it. refresh reloads and keeps the selection, which reload clears. destroy stops the observer and the search timer, so call it on viewhide.
// The All filter value is allValue (default ''), and buildParams runs only for a non-empty value, so give allValue one when buildParams must also run for All. initialValue is the filter the first load carries.
export function createPaginatedTable(view, shared, options) {
    var table = {
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
        state: null,
        elements: {},
        searchTimeout: null,
        // An answer to an older load is dropped, so a newer load never loses to it.
        loadSeq: 0,
        loadedOnce: false,
        destroyed: false,
        // Keeps the observer off when the caller disconnected it before the first load landed.
        wantObserver: true
    };

    Object.keys(options).forEach(function (key) {
        if (typeof options[key] === 'object' && options[key] !== null && !Array.isArray(options[key])) {
            table.options[key] = Object.assign({}, table.options[key], options[key]);
        } else {
            table.options[key] = options[key];
        }
    });

    // A null filters option means none.
    var initialFilters = table.options.filters || {};
    table.state = {
        items: [], totalCount: 0, currentPage: 1,
        pageSize: table.options.pagination.pageSize,
        searchQuery: '', filterValue: initialFilters.initialValue || initialFilters.allValue || '',
        selectedIds: new Set(), isLoading: false, hasMore: true
    };

    function _getItemId(item) {
        var idKey = (table.options.selection && table.options.selection.idKey) || 'id';
        return typeof idKey === 'function' ? idKey(item) : item[idKey];
    }

    function _createStructure() {
        var container = view.querySelector('#' + table.options.containerId);
        if (!container) return;
        container.innerHTML = _buildHTML();
        _cacheElements(container);
    }

    function _cacheElements(container) {
        table.elements = {
            container: container,
            search: container.querySelector('.jpk-table-search'),
            filter: container.querySelector('.jpk-table-filter'),
            selectAll: container.querySelector('.jpk-table-select-all'),
            selectedCount: container.querySelector('.jpk-table-selected-count'),
            bulkActions: container.querySelector('.jpk-table-bulk-actions'),
            reloadBtn: container.querySelector('.jpk-table-reload-btn'),
            body: container.querySelector('.jpk-table-body'),
            loadingMore: container.querySelector('.jpk-table-loading-more'),
            scrollSentinel: container.querySelector('.jpk-table-scroll-sentinel'),
            itemCount: container.querySelector('.jpk-table-item-count'),
            footerActions: container.querySelector('.jpk-table-footer-actions'),
            loadMoreBtn: container.querySelector('.jpk-table-load-more'),
            loadAllBtn: container.querySelector('.jpk-table-load-all')
        };
    }

    // Returns the markup for the controls, selection header, body, and footer.
    function _buildHTML() {
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
    function _bindEvents() {
        if (table.elements.search) {
            table.elements.search.addEventListener('input', function (e) {
                if (table.searchTimeout) clearTimeout(table.searchTimeout);
                var ms = table.options.search.debounceMs || 300;
                var value = e.target.value;
                table.searchTimeout = setTimeout(function () { publicAPI.setSearch(value); }, ms);
            });
        }
        if (table.elements.filter) {
            table.elements.filter.addEventListener('change', function (e) { publicAPI.setFilter(e.target.value); });
        }
        if (table.elements.selectAll) {
            table.elements.selectAll.addEventListener('change', function (e) { _toggleSelectAll(e.target.checked); });
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
    function _createScrollObserver() {
        if (table._scrollObserver || !table.elements.scrollSentinel || !table.loadedOnce || table.destroyed || !table.wantObserver) return;
        if (typeof IntersectionObserver === 'undefined') return;
        if (table.options.pagination && table.options.pagination.loadMore) return;
        table._scrollObserver = new IntersectionObserver(function (entries) {
            if (entries[0].isIntersecting && !table.state.isLoading && table.state.hasMore) _loadMore();
        }, { rootMargin: '200px' });
        table._scrollObserver.observe(table.elements.scrollSentinel);
    }

    // Resets paging state for a fresh load. Clears the selection unless keepSelection is true.
    function _resetState(keepSelection) {
        table.state.items = [];
        table.state.currentPage = 1;
        table.state.hasMore = true;
        // Goes through clearSelection so the checkboxes and any listener update.
        if (!keepSelection) publicAPI.clearSelection();
    }

    function _setFooterLoading(loading) {
        if (table.elements.loadingMore) table.elements.loadingMore.style.display = loading ? 'block' : 'none';
        if (table.elements.loadMoreBtn) table.elements.loadMoreBtn.disabled = loading;
        if (table.elements.loadAllBtn) table.elements.loadAllBtn.disabled = loading;
    }

    // Loads every remaining page one after another.
    function _loadAll() {
        if (table.state.isLoading || !table.state.hasMore) return;
        _setFooterLoading(true);
        // A load superseded by a search, filter or reload ends the run.
        function step(result) {
            if (result === null || !table.state.hasMore) { _setFooterLoading(false); return; }
            table.state.currentPage++;
            publicAPI.load().then(step).catch(function () { _setFooterLoading(false); });
        }
        step();
    }

    // Reloads from the first page with the spinner on, then calls onReload.
    function _handleReload() {
        var btn = table.elements.reloadBtn;
        if (btn) { btn.classList.add('spinning'); btn.disabled = true; }
        _resetState(false);
        function done() {
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

    function _loadMore() {
        if (!table.state.hasMore || table.state.isLoading) return;
        table.state.currentPage++;
        if (table.elements.loadingMore) table.elements.loadingMore.style.display = 'block';
        publicAPI.load().finally(function () {
            if (table.elements.loadingMore) table.elements.loadingMore.style.display = 'none';
        });
    }

    function _setLoading(loading) {
        if (!table.elements.container) return;
        if (loading && table.state.currentPage === 1) table.elements.container.classList.add('jpk-table-loading');
        else table.elements.container.classList.remove('jpk-table-loading');
    }

    function _render() {
        _renderBody();
        _updateItemCount();
        _updateSelectionUI();
    }

    function _renderBody() {
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
    function _renderRow(item) {
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
            var value = item[col.key];
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
    function _bindRowEvents() {
        var body = table.elements.body;
        if (!body) return;
        body.querySelectorAll('.jpk-table-row').forEach(function (row) {
            row.addEventListener('click', function (e) {
                if (e.target.type === 'checkbox' || e.target.classList.contains('jpk-table-row-checkbox') ||
                    e.target.classList.contains('jpk-table-status-btn')) return;
                var item = _getItemById(row.dataset.id);
                if (item && table.options.actions && table.options.actions.onRowClick) {
                    e.preventDefault();
                    e.stopPropagation();
                    table.options.actions.onRowClick(item);
                }
            });
            row.addEventListener('keydown', function (e) {
                if (e.target !== row || (e.key !== 'Enter' && e.key !== ' ')) return;
                var item = _getItemById(row.dataset.id);
                if (item && table.options.actions && table.options.actions.onRowClick) {
                    e.preventDefault();
                    table.options.actions.onRowClick(item);
                }
            });
        });
        body.querySelectorAll('.jpk-table-status-btn').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                var item = _getItemById(btn.dataset.id);
                if (item && table.options.actions && table.options.actions.onRowClick) {
                    table.options.actions.onRowClick(item);
                }
            });
        });
        body.querySelectorAll('.jpk-table-row-checkbox').forEach(function (checkbox) {
            checkbox.addEventListener('change', function (e) {
                e.stopPropagation();
                if (checkbox.checked) table.state.selectedIds.add(checkbox.dataset.id);
                else table.state.selectedIds.delete(checkbox.dataset.id);
                _markRow(checkbox, checkbox.checked);
                _updateSelectionUI();
                _notifySelectionChange();
            });
            checkbox.addEventListener('click', function (e) { e.stopPropagation(); });
        });
    }

    function _getItemById(id) {
        return table.state.items.find(function (item) { return String(_getItemId(item)) === String(id); });
    }

    // Writes the item count and shows the footer buttons while more rows remain.
    function _updateItemCount() {
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

    function _updateSelectionUI() {
        var count = table.state.selectedIds.size;
        if (table.elements.selectedCount) table.elements.selectedCount.textContent = count + ' selected';
        if (table.elements.selectAll) {
            table.elements.selectAll.checked = count > 0 && count === table.state.items.length;
            table.elements.selectAll.indeterminate = count > 0 && count < table.state.items.length;
        }
    }

    // Selects or clears every loaded row.
    function _toggleSelectAll(checked) {
        table.state.selectedIds.clear();
        if (checked) table.state.items.forEach(function (item) { table.state.selectedIds.add(String(_getItemId(item))); });
        if (table.elements.body) {
            table.elements.body.querySelectorAll('.jpk-table-row-checkbox').forEach(function (cb) { cb.checked = checked; _markRow(cb, checked); });
        }
        _updateSelectionUI();
        _notifySelectionChange();
    }

    // Adds or removes the selected class on the row that holds a checkbox.
    function _markRow(checkbox, on) {
        var row = checkbox.closest && checkbox.closest('.jpk-table-row');
        if (row) row.classList.toggle('selected', on);
    }

    function _notifySelectionChange() {
        if (table.options.selection && table.options.selection.onSelectionChange) {
            table.options.selection.onSelectionChange(publicAPI.getSelectedIds());
        }
    }

    var publicAPI = {
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

            return shared.apiRequest(endpoint, 'GET').then(function (result) {
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
        setFilter: function (value) {
            table.state.filterValue = value;
            if (table.elements.filter) table.elements.filter.value = value;
            _resetState(false);
            var filters = table.options.filters;
            if (filters && filters.onChange) filters.onChange(value);
            return this.load();
        },
        setSearch: function (query) {
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
                table.elements.body.querySelectorAll('.jpk-table-row-checkbox').forEach(function (cb) { cb.checked = false; _markRow(cb, false); });
            }
            if (table.elements.selectAll) {
                table.elements.selectAll.checked = false;
                table.elements.selectAll.indeterminate = false;
            }
        },
        getItems: function () { return table.state.items; },
        getTotalCount: function () { return table.state.totalCount; },
        getBulkActionsContainer: function () { return table.elements.bulkActions; },
        getControlsContainer: function () { return table.elements.container && table.elements.container.querySelector('.jpk-table-controls'); },
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
        setFilterValue: function (value) {
            table.state.filterValue = value;
            if (table.elements.filter) table.elements.filter.value = value;
        },
        setFilterOptionVisible: function (optionId, visible) {
            if (!table.elements.filter) return;
            var option = table.elements.filter.querySelector('#' + optionId);
            if (option) option.style.display = visible ? 'block' : 'none';
        }
    };

    _createStructure();
    _bindEvents();
    return publicAPI;
}
