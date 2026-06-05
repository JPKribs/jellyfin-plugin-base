// setTabs
// Wires the dashboard tab bar for a config page. Call it inside viewshow with the active tab index.
//
// Param: key   | string grouping the plugin's tabs
// Param: index | active tab index
// Param: tabs  | array of { href, name }
export function setTabs(key, index, tabs) {
    if (typeof LibraryMenu !== 'undefined' && LibraryMenu.setTabs) {
        LibraryMenu.setTabs(key, index, function () { return tabs; });
    }
}

// initCollapsibles
// Binds every collapsible header in the view so a click toggles its target. Safe to call more than once per header.
//
// Param: view | page element to search within
export function initCollapsibles(view) {
    view.querySelectorAll('.jpk-collapsible-header').forEach(function (header) {
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

// generateGuid
// Returns a random RFC 4122 version 4 GUID for keying new config entities on the client.
//
// No parameters
export function generateGuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// createShared
// Builds the per view helper bag used by a config page. Bind it once on viewshow and reuse the returned object.
//
// Param: view      | page element the helpers operate on
// Param: pluginId  | plugin GUID string
// Param: apiPrefix | controller name for apiRequest [optional]
export function createShared(view, pluginId, apiPrefix) {
    return {
        pluginId: pluginId,
        apiPrefix: apiPrefix || '',

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

        escapeHtml: function (str) {
            if (str === null || str === undefined) return '';
            return String(str)
                .replace(/&/g, '&amp;').replace(/</g, '&lt;')
                .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        },

        badge: function (cls, label) {
            return '<span class="jpk-badge ' + cls + '">' + this.escapeHtml(label) + '</span>';
        },

        emptySection: function (message) {
            return '<div class="jpk-empty-section">' + this.escapeHtml(message) + '</div>';
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

        pollTaskProgress: function (btn, taskKey, label, onComplete) {
            var btnSpan = btn.querySelector('span');
            var progressBar = btn.querySelector('.btn-progress');
            if (!progressBar) {
                progressBar = document.createElement('div');
                progressBar.className = 'btn-progress';
                btn.appendChild(progressBar);
            }
            btn.disabled = true;

            var lastPct = 0;
            var sawRunning = false;
            var startedAt = Date.now();
            var done = false;
            var socketBound = false;
            var poll = null;

            var send = ApiClient && (ApiClient.sendMessage || ApiClient.sendWebSocketMessage);
            if (send) send = send.bind(ApiClient);

            function setPct(pct) {
                if (typeof pct !== 'number' || isNaN(pct)) pct = lastPct;
                if (pct < lastPct) pct = lastPct;
                if (pct > 100) pct = 100;
                lastPct = pct;
                if (btnSpan) btnSpan.textContent = label + ' ' + Math.round(pct) + '%';
                progressBar.style.width = pct + '%';
            }

            function finish() {
                if (done) return;
                done = true;
                if (socketBound) {
                    try { send('ScheduledTasksInfoStop'); } catch (e) { /* socket already closed */ }
                    try { Events.off(ApiClient, 'message', onMessage); } catch (e) { /* never bound */ }
                }
                if (poll) clearInterval(poll);
                if (btnSpan) btnSpan.textContent = label;
                progressBar.style.width = '0%';
                btn.disabled = false;
                if (onComplete) onComplete();
            }

            function apply(task) {
                if (!task) return;
                if (task.State === 'Running') {
                    sawRunning = true;
                    setPct(task.CurrentProgressPercentage);
                } else if (task.State === 'Idle') {
                    var end = task.LastExecutionResult && task.LastExecutionResult.EndTimeUtc;
                    var endedAfterStart = end && new Date(end).getTime() >= startedAt - 1000;
                    if (sawRunning || endedAfterStart) { setPct(100); finish(); }
                }
            }

            function onMessage(e, msg) {
                msg = msg || e;
                if (!msg || msg.MessageType !== 'ScheduledTasksInfo' || !msg.Data) return;
                apply(msg.Data.find(function (t) { return t.Key === taskKey; }));
            }

            setPct(0);

            // Prefer the dashboard WebSocket when its event bus is reachable.
            if (send && typeof Events !== 'undefined') {
                try {
                    Events.on(ApiClient, 'message', onMessage);
                    send('ScheduledTasksInfoStart', '0,1000');
                    socketBound = true;
                } catch (e) {
                    socketBound = false;
                }
            }

            // Poll as a safety net: fast when polling is the only source, slow to reconcile the socket.
            poll = setInterval(function () {
                if (Date.now() - startedAt > 30 * 60 * 1000) { finish(); return; }
                ApiClient.getScheduledTasks().then(function (tasks) {
                    apply(tasks.find(function (t) { return t.Key === taskKey; }));
                }).catch(function () { /* transient, try again next tick */ });
            }, socketBound ? 5000 : 1000);

            return { cancel: finish };
        }
    };
}
