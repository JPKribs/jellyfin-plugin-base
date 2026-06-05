// createPaginatedTable
// Builds a searchable, filterable, infinite scrolling table backed by an endpoint that returns Items and TotalCount. Returns a controller with load, reload, setSearch, setFilter, and selection helpers.
//
// Param: view    | page element containing the table container
// Param: shared  | helper bag from createShared, used for escapeHtml and apiRequest
// Param: options | table config such as containerId, endpoint, columns, and selection
export function createPaginatedTable(view, shared, options) {
    var table = {
        options: {
            containerId: null,
            endpoint: '',
            columns: [],
            selection: { enabled: false, idKey: 'id' },
            pagination: { pageSize: 50 },
            filters: { options: [] },
            search: { enabled: true, placeholder: 'Search items...', debounceMs: 300 },
            actions: {},
            emptyState: { message: 'No items found' }
        },
        state: null,
        elements: {},
        searchTimeout: null
    };

    Object.keys(options).forEach(function (key) {
        if (typeof options[key] === 'object' && options[key] !== null && !Array.isArray(options[key])) {
            table.options[key] = Object.assign({}, table.options[key], options[key]);
        } else {
            table.options[key] = options[key];
        }
    });

    table.state = {
        items: [], totalCount: 0, currentPage: 1,
        pageSize: table.options.pagination.pageSize,
        searchQuery: '', filterValue: '',
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
            itemCount: container.querySelector('.jpk-table-item-count')
        };
    }

    function _buildHTML() {
        var opts = table.options;
        var html = '<div class="jpk-table-wrapper"><div class="jpk-table-controls">';
        if (opts.search && opts.search.enabled !== false) {
            html += '<input type="text" class="jpk-table-search" placeholder="' +
                shared.escapeHtml(opts.search.placeholder || 'Search items...') + '" />';
        }
        if (opts.filters && opts.filters.options && opts.filters.options.length) {
            html += '<div class="jpk-table-filter-wrapper"><select class="jpk-table-filter"><option value="">All</option>';
            opts.filters.options.forEach(function (opt) {
                var style = opt.hidden ? ' style="display:none"' : '';
                var id = opt.id ? ' id="' + opt.id + '"' : '';
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

        html += '<div class="jpk-table-body"></div>' +
            '<div class="jpk-table-loading-more" style="display:none;">Loading more...</div>' +
            '<div class="jpk-table-scroll-sentinel" style="height:1px;"></div>' +
            '<div class="jpk-table-footer"><span class="jpk-table-item-count"></span></div></div>';
        return html;
    }

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
        if (table.elements.scrollSentinel) {
            table._scrollObserver = new IntersectionObserver(function (entries) {
                if (entries[0].isIntersecting && !table.state.isLoading && table.state.hasMore) _loadMore();
            }, { rootMargin: '200px' });
            table._scrollObserver.observe(table.elements.scrollSentinel);
        }
    }

    function _handleReload() {
        var btn = table.elements.reloadBtn;
        if (btn) { btn.classList.add('spinning'); btn.disabled = true; }
        table.state.items = [];
        table.state.currentPage = 1;
        table.state.hasMore = true;
        table.state.selectedIds.clear();
        publicAPI.load().finally(function () {
            if (btn) { btn.classList.remove('spinning'); btn.disabled = false; }
            if (table.options.actions && table.options.actions.onReload) table.options.actions.onReload();
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

    function _renderRow(item) {
        var opts = table.options;
        var itemId = _getItemId(item);
        var html = '<div class="jpk-table-row" data-id="' + shared.escapeHtml(String(itemId)) + '">';
        if (opts.selection && opts.selection.enabled) {
            var checked = table.state.selectedIds.has(String(itemId)) ? ' checked' : '';
            html += '<div class="jpk-table-cell jpk-table-cell-checkbox"><input type="checkbox" class="jpk-table-row-checkbox" data-id="' +
                shared.escapeHtml(String(itemId)) + '"' + checked + ' /></div>';
        }
        opts.columns.filter(function (c) { return !c.hidden; }).forEach(function (col) {
            var value = item[col.key];
            var cellClass = 'jpk-table-cell';
            if (col.type === 'status') cellClass += ' jpk-table-cell-status';
            if (col.className) cellClass += ' ' + col.className;
            var content = '';
            if (col.type === 'status') {
                var displayStatus = table.options.getDisplayStatus ? table.options.getDisplayStatus(item, value) : (value || '');
                var statusClass = table.options.getStatusClass ? table.options.getStatusClass(item, value) : (value || '');
                content = '<button type="button" class="jpk-table-status-badge jpk-table-status-btn ' + statusClass + '" data-id="' +
                    shared.escapeHtml(String(itemId)) + '">' + shared.escapeHtml(displayStatus) + '</button>';
            } else if (col.type === 'custom' && col.render) {
                content = col.render(item, value);
            } else {
                content = value !== null && value !== undefined ? shared.escapeHtml(String(value)) : '';
            }
            html += '<div class="' + cellClass + '">' + content + '</div>';
        });
        return html + '</div>';
    }

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
                _updateSelectionUI();
                _notifySelectionChange();
            });
            checkbox.addEventListener('click', function (e) { e.stopPropagation(); });
        });
    }

    function _getItemById(id) {
        return table.state.items.find(function (item) { return String(_getItemId(item)) === String(id); });
    }

    function _updateItemCount() {
        if (!table.elements.itemCount) return;
        var loaded = table.state.items.length, total = table.state.totalCount;
        if (total === 0) table.elements.itemCount.textContent = '';
        else if (loaded >= total) table.elements.itemCount.textContent = total + ' items';
        else table.elements.itemCount.textContent = 'Showing ' + loaded + ' of ' + total + ' items';
    }

    function _updateSelectionUI() {
        var count = table.state.selectedIds.size;
        if (table.elements.selectedCount) table.elements.selectedCount.textContent = count + ' selected';
        if (table.elements.selectAll) {
            table.elements.selectAll.checked = count > 0 && count === table.state.items.length;
            table.elements.selectAll.indeterminate = count > 0 && count < table.state.items.length;
        }
    }

    function _toggleSelectAll(checked) {
        table.state.selectedIds.clear();
        if (checked) table.state.items.forEach(function (item) { table.state.selectedIds.add(String(_getItemId(item))); });
        if (table.elements.body) {
            table.elements.body.querySelectorAll('.jpk-table-row-checkbox').forEach(function (cb) { cb.checked = checked; });
        }
        _updateSelectionUI();
        _notifySelectionChange();
    }

    function _notifySelectionChange() {
        if (table.options.selection && table.options.selection.onSelectionChange) {
            table.options.selection.onSelectionChange(publicAPI.getSelectedIds());
        }
    }

    var publicAPI = {
        load: function () {
            var state = table.state, opts = table.options;
            if (state.isLoading) return Promise.resolve();
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
                var newItems = result.Items || [];
                state.totalCount = result.TotalCount || 0;
                state.items = state.currentPage === 1 ? newItems : state.items.concat(newItems);
                state.hasMore = state.items.length < state.totalCount;
                _render();
                state.isLoading = false;
                _setLoading(false);
                return result;
            }).catch(function (err) {
                state.isLoading = false;
                _setLoading(false);
                throw err;
            });
        },
        reload: function () {
            table.state.items = [];
            table.state.currentPage = 1;
            table.state.hasMore = true;
            table.state.selectedIds.clear();
            return this.load();
        },
        setFilter: function (value) {
            table.state.filterValue = value;
            table.state.items = [];
            table.state.currentPage = 1;
            table.state.hasMore = true;
            this.clearSelection();
            return this.load();
        },
        setSearch: function (query) {
            table.state.searchQuery = query;
            table.state.items = [];
            table.state.currentPage = 1;
            table.state.hasMore = true;
            this.clearSelection();
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
                table.elements.body.querySelectorAll('.jpk-table-row-checkbox').forEach(function (cb) { cb.checked = false; });
            }
            if (table.elements.selectAll) {
                table.elements.selectAll.checked = false;
                table.elements.selectAll.indeterminate = false;
            }
        },
        getItems: function () { return table.state.items; },
        getTotalCount: function () { return table.state.totalCount; },
        getBulkActionsContainer: function () { return table.elements.bulkActions; },
        disconnectObserver: function () {
            if (table._scrollObserver) { table._scrollObserver.disconnect(); table._scrollObserver = null; }
        }
    };

    _createStructure();
    _bindEvents();
    return publicAPI;
}
