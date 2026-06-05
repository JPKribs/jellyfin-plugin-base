// ============================================================
// JPKribs shared module for Jellyfin plugin configuration UIs
// ============================================================

// Wire up the tab bar. Call inside viewshow with the active index.
export function setTabs(key, index, tabs) {
    if (typeof LibraryMenu !== 'undefined' && LibraryMenu.setTabs) {
        LibraryMenu.setTabs(key, index, function () { return tabs; });
    }
}

// Bind every .collapsibleHeader in the view to toggle its target content.
export function initCollapsibles(view) {
    view.querySelectorAll('.collapsibleHeader').forEach(function (header) {
        if (header.dataset.jpkBound) return;
        header.dataset.jpkBound = '1';
        header.addEventListener('click', function () {
            var content = view.querySelector('#' + this.dataset.target);
            if (!content) return;
            this.classList.toggle('collapsed');
            content.classList.toggle('collapsed');
            this.setAttribute('aria-expanded', String(!this.classList.contains('collapsed')));
        });
    });
}

// RFC 4122 v4 GUID (for new config entities keyed client-side).
export function generateGuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Per-view helper bag. Pass the view, the plugin GUID, and (optionally) the
// API controller prefix used by apiRequest (e.g. "UserManagement").
export function createShared(view, pluginId, apiPrefix) {
    return {
        pluginId: pluginId,
        apiPrefix: apiPrefix || '',

        // ----- DOM -----
        getEl: function (id) {
            return view.querySelector('#' + id);
        },

        setVisible: function (id, visible) {
            var el = typeof id === 'string' ? view.querySelector('#' + id) : id;
            if (el) {
                if (visible) el.classList.remove('hidden');
                else el.classList.add('hidden');
            }
        },

        setStatus: function (elementId, message, isError) {
            var el = view.querySelector('#' + elementId);
            if (!el) return;
            el.textContent = message;
            el.style.color = isError ? 'var(--jpk-error)' : 'var(--jpk-success)';
            if (message) {
                setTimeout(function () { if (el.textContent === message) el.textContent = ''; }, 5000);
            }
        },

        bindEvent: function (id, event, handler) {
            var el = view.querySelector('#' + id);
            if (el) el.addEventListener(event, handler);
            return el;
        },

        bindClick: function (id, handler) {
            return this.bindEvent(id, 'click', handler);
        },

        initCollapsibles: function () {
            initCollapsibles(view);
        },

        // ----- Text / formatting -----
        escapeHtml: function (str) {
            if (str === null || str === undefined) return '';
            return String(str)
                .replace(/&/g, '&amp;').replace(/</g, '&lt;')
                .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        },

        badge: function (cls, label) {
            return '<span class="jpk-badge ' + cls + '">' + this.escapeHtml(label) + '</span>';
        },

        formatSize: function (bytes) {
            if (!bytes) return '0 B';
            var units = ['B', 'KB', 'MB', 'GB', 'TB'];
            var i = 0;
            while (bytes >= 1024 && i < units.length - 1) { bytes /= 1024; i++; }
            return bytes.toFixed(i > 0 ? 2 : 0) + ' ' + units[i];
        },

        formatDuration: function (seconds) {
            if (!seconds) return '';
            var h = Math.floor(seconds / 3600);
            var m = Math.floor((seconds % 3600) / 60);
            var s = Math.floor(seconds % 60);
            if (h > 0) return h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
            return m + ':' + String(s).padStart(2, '0');
        },

        formatRelativeTime: function (date) {
            var diff = new Date() - date;
            var minutes = Math.floor(diff / 60000);
            var hours = Math.floor(minutes / 60);
            var days = Math.floor(hours / 24);
            if (days > 0) return days + ' day' + (days > 1 ? 's' : '') + ' ago';
            if (hours > 0) return hours + ' hour' + (hours > 1 ? 's' : '') + ' ago';
            if (minutes > 0) return minutes + ' minute' + (minutes > 1 ? 's' : '') + ' ago';
            return 'Just now';
        },

        formatDate: function (value) {
            if (!value) return '';
            var d = new Date(value);
            return isNaN(d.getTime()) ? '' : d.toLocaleString();
        },

        toDateInput: function (value) {
            if (!value) return '';
            var d = new Date(value);
            return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
        },

        getFileName: function (path) {
            if (!path) return '';
            return path.split('/').pop().split('\\').pop();
        },

        generateGuid: generateGuid,

        // ----- Config / API -----
        getConfig: function () {
            return ApiClient.getPluginConfiguration(this.pluginId);
        },

        saveConfig: function (config) {
            return ApiClient.updatePluginConfiguration(this.pluginId, config);
        },

        apiRequest: function (endpoint, method, data) {
            var url = this.apiPrefix ? this.apiPrefix + '/' + endpoint : endpoint;
            var options = { url: ApiClient.getUrl(url), type: method || 'GET', dataType: 'json' };
            if (data !== undefined && data !== null) {
                options.contentType = 'application/json';
                options.data = JSON.stringify(data);
            }
            return ApiClient.fetch(options).catch(function (error) {
                if (error && error.message && error.message.indexOf('JSON') !== -1) return null;
                throw error;
            });
        },

        showAlert: function (message) {
            Dashboard.alert(message);
        },

        // ----- Source-server image helpers -----
        buildSourceImageUrl: function (serverUrl, apiKey, itemId, imageType, maxHeight) {
            if (!serverUrl || !apiKey || !itemId) return null;
            return serverUrl + '/Items/' + encodeURIComponent(itemId) + '/Images/' + (imageType || 'Primary') +
                '?maxHeight=' + (maxHeight || 80) + '&api_key=' + encodeURIComponent(apiKey);
        },

        buildSourceUserImageUrl: function (serverUrl, apiKey, userId, maxHeight) {
            if (!serverUrl || !apiKey || !userId) return null;
            return serverUrl + '/Users/' + encodeURIComponent(userId) + '/Images/Primary' +
                '?maxHeight=' + (maxHeight || 80) + '&api_key=' + encodeURIComponent(apiKey);
        },

        // ----- Combo box -----
        // Debounced remote search callback for the combo box below.
        createDebouncedSearch: function (endpoint, delay) {
            var timeout = null;
            var self = this;
            return function (query, callback) {
                if (timeout) clearTimeout(timeout);
                if (!query || query.length < 2) { callback([]); return; }
                timeout = setTimeout(function () {
                    self.apiRequest(endpoint + '?query=' + encodeURIComponent(query), 'GET')
                        .then(function (results) { callback(results || []); })
                        .catch(function () { callback([]); });
                }, delay || 300);
            };
        },

        // Searchable combo box. Returns { element, getValue, setValue, destroy }.
        createSearchableComboBox: function (options) {
            var container = document.createElement('div');
            container.className = 'jpk-combo';
            var input = document.createElement('input');
            input.type = 'text';
            input.className = 'jpk-edit-input';
            input.placeholder = options.placeholder || '';
            var dropdown = document.createElement('div');
            dropdown.className = 'jpk-combo-dropdown hidden';
            container.appendChild(input);
            container.appendChild(dropdown);

            input.addEventListener('input', function () {
                if (options.onInput) options.onInput();
                options.searchFn(input.value, function (results) {
                    dropdown.innerHTML = '';
                    if (!results.length) { dropdown.classList.add('hidden'); return; }
                    results.forEach(function (item) {
                        var opt = document.createElement('div');
                        opt.className = 'jpk-combo-option';
                        opt.textContent = item;
                        opt.addEventListener('click', function () {
                            input.value = item;
                            dropdown.classList.add('hidden');
                            if (options.onSelect) options.onSelect(item);
                        });
                        dropdown.appendChild(opt);
                    });
                    dropdown.classList.remove('hidden');
                });
            });

            function onDocClick(e) {
                if (!container.contains(e.target)) dropdown.classList.add('hidden');
            }
            document.addEventListener('click', onDocClick);

            return {
                element: container,
                getValue: function () { return input.value; },
                setValue: function (val) { input.value = val || ''; },
                destroy: function () { document.removeEventListener('click', onDocClick); }
            };
        },

        // ----- Scheduled task progress -----
        // Drives a button's label + .btn-progress bar while a task runs.
        pollTaskProgress: function (btn, taskKey, label, onComplete) {
            var progressBar = btn.querySelector('.btn-progress');
            if (!progressBar) {
                progressBar = document.createElement('div');
                progressBar.className = 'btn-progress';
                btn.appendChild(progressBar);
            }
            progressBar.style.width = '0%';
            btn.disabled = true;
            var btnSpan = btn.querySelector('span');
            if (btnSpan) btnSpan.textContent = label + ' 0%';

            var hasSeenRunning = false;
            var pollCount = 0;
            var maxIdlePolls = 10;

            function finish() {
                if (btnSpan) btnSpan.textContent = label;
                progressBar.style.width = '0%';
                btn.disabled = false;
                if (onComplete) onComplete();
            }

            var pollInterval = setInterval(function () {
                pollCount++;
                ApiClient.getScheduledTasks().then(function (tasks) {
                    var task = tasks.find(function (t) { return t.Key === taskKey; });
                    if (!task) { clearInterval(pollInterval); finish(); return; }
                    if (task.State === 'Running') {
                        hasSeenRunning = true;
                        var pct = Math.round(task.CurrentProgressPercentage || 0);
                        if (btnSpan) btnSpan.textContent = label + ' ' + pct + '%';
                        progressBar.style.width = pct + '%';
                    } else if (task.State === 'Idle' && (hasSeenRunning || pollCount >= maxIdlePolls)) {
                        clearInterval(pollInterval);
                        finish();
                    }
                }).catch(function () {
                    clearInterval(pollInterval);
                    finish();
                });
            }, 1500);

            return pollInterval;
        }
    };
}

// ============================================================
// PaginatedTable: search + filter + infinite scroll + selection.
// Backed by an endpoint returning { Items, TotalCount }.
// ============================================================
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
            search: container.querySelector('.pt-search'),
            filter: container.querySelector('.pt-filter'),
            selectAll: container.querySelector('.pt-select-all'),
            selectedCount: container.querySelector('.pt-selected-count'),
            bulkActions: container.querySelector('.pt-bulk-actions'),
            reloadBtn: container.querySelector('.pt-reload-btn'),
            body: container.querySelector('.pt-body'),
            loadingMore: container.querySelector('.pt-loading-more'),
            scrollSentinel: container.querySelector('.pt-scroll-sentinel'),
            itemCount: container.querySelector('.pt-item-count')
        };
    }

    function _buildHTML() {
        var opts = table.options;
        var html = '<div class="pt-wrapper"><div class="pt-controls">';
        if (opts.search && opts.search.enabled !== false) {
            html += '<input type="text" class="pt-search" placeholder="' +
                shared.escapeHtml(opts.search.placeholder || 'Search items...') + '" />';
        }
        if (opts.filters && opts.filters.options && opts.filters.options.length) {
            html += '<div class="pt-filter-wrapper"><select class="pt-filter"><option value="">All</option>';
            opts.filters.options.forEach(function (opt) {
                var style = opt.hidden ? ' style="display:none"' : '';
                var id = opt.id ? ' id="' + opt.id + '"' : '';
                html += '<option value="' + shared.escapeHtml(opt.value) + '"' + style + id + '>' +
                    shared.escapeHtml(opt.label) + '</option>';
            });
            html += '</select><span class="pt-filter-arrow">&#9662;</span></div>';
        }
        html += '</div>';

        if (opts.selection && opts.selection.enabled) {
            html += '<div class="pt-selection-header">' +
                '<label class="pt-select-all-label"><input type="checkbox" class="pt-select-all" />' +
                '<span class="pt-checkbox-custom"></span><span class="pt-select-all-text">Select All</span></label>' +
                '<span class="pt-selected-count">0 selected</span>' +
                '<div class="pt-bulk-actions"></div><span class="pt-header-spacer"></span>' +
                '<button type="button" class="pt-reload-btn" title="Reload"><span class="pt-reload-icon">&#8635;</span></button>' +
                '</div>';
        }

        html += '<div class="pt-body"></div>' +
            '<div class="pt-loading-more" style="display:none;">Loading more...</div>' +
            '<div class="pt-scroll-sentinel" style="height:1px;"></div>' +
            '<div class="pt-footer"><span class="pt-item-count"></span></div></div>';
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
        if (loading && table.state.currentPage === 1) table.elements.container.classList.add('pt-loading');
        else table.elements.container.classList.remove('pt-loading');
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
            body.innerHTML = '<div class="pt-empty">' + shared.escapeHtml(opts.emptyState.message) + '</div>';
            return;
        }
        body.innerHTML = state.items.map(_renderRow).join('');
        _bindRowEvents();
    }

    function _renderRow(item) {
        var opts = table.options;
        var itemId = _getItemId(item);
        var html = '<div class="pt-row" data-id="' + shared.escapeHtml(String(itemId)) + '">';
        if (opts.selection && opts.selection.enabled) {
            var checked = table.state.selectedIds.has(String(itemId)) ? ' checked' : '';
            html += '<div class="pt-cell pt-cell-checkbox"><input type="checkbox" class="pt-row-checkbox" data-id="' +
                shared.escapeHtml(String(itemId)) + '"' + checked + ' /></div>';
        }
        opts.columns.filter(function (c) { return !c.hidden; }).forEach(function (col) {
            var value = item[col.key];
            var cellClass = 'pt-cell';
            if (col.type === 'status') cellClass += ' pt-cell-status';
            if (col.className) cellClass += ' ' + col.className;
            var content = '';
            if (col.type === 'status') {
                var displayStatus = table.options.getDisplayStatus ? table.options.getDisplayStatus(item, value) : (value || '');
                var statusClass = table.options.getStatusClass ? table.options.getStatusClass(item, value) : (value || '');
                content = '<button type="button" class="pt-status-badge pt-status-btn ' + statusClass + '" data-id="' +
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
        body.querySelectorAll('.pt-row').forEach(function (row) {
            row.addEventListener('click', function (e) {
                if (e.target.type === 'checkbox' || e.target.classList.contains('pt-row-checkbox') ||
                    e.target.classList.contains('pt-status-btn')) return;
                var item = _getItemById(row.dataset.id);
                if (item && table.options.actions && table.options.actions.onRowClick) {
                    e.preventDefault();
                    e.stopPropagation();
                    table.options.actions.onRowClick(item);
                }
            });
        });
        body.querySelectorAll('.pt-status-btn').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                var item = _getItemById(btn.dataset.id);
                if (item && table.options.actions && table.options.actions.onRowClick) {
                    table.options.actions.onRowClick(item);
                }
            });
        });
        body.querySelectorAll('.pt-row-checkbox').forEach(function (checkbox) {
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
            table.elements.body.querySelectorAll('.pt-row-checkbox').forEach(function (cb) { cb.checked = checked; });
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
                table.elements.body.querySelectorAll('.pt-row-checkbox').forEach(function (cb) { cb.checked = false; });
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
