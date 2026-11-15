import { copyToClipboard } from './clipboard.js';
import { createUserSelector, createUserMultiSelector } from './user-selector.js';
import { escapeHtml, classNames } from './escape.js';
import { insertAtCursor, placeholderHint, bindPlaceholders } from './placeholders.js';
import { bindComboAria } from './combo-aria.js';

// setTabs
// Wires the dashboard tab bar for a config page. Call it inside viewshow with the active tab index.
//
// Param: key   | string grouping the plugin's tabs
// Param: index | active tab index
// Param: tabs  | array of { href, name }, or a function returning one that runs each time the tabs are shown
export function setTabs(key, index, tabs) {
    if (typeof LibraryMenu !== 'undefined' && LibraryMenu.setTabs) {
        LibraryMenu.setTabs(key, index, function () { return typeof tabs === 'function' ? tabs() : tabs; });
    }
}

// initCollapsibles
// Binds every collapsible header in the view so a click toggles its target, once per header. The arrow becomes the web client expand_more icon, and the header gets aria-controls and aria-expanded.
//
// Param: view | page element to search within
export function initCollapsibles(view) {
    view.querySelectorAll('.jpk-collapsible-header').forEach(function (header) {
        if (header.dataset.jpkBound) return;
        header.dataset.jpkBound = '1';
        var icon = header.querySelector('.jpk-collapsible-icon');
        if (icon) {
            icon.className = 'material-icons jpk-collapsible-icon expand_more';
            icon.textContent = '';
            icon.setAttribute('aria-hidden', 'true');
        }
        if (header.dataset.target) header.setAttribute('aria-controls', header.dataset.target);
        header.setAttribute('aria-expanded', String(!header.classList.contains('collapsed')));
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
// Param: opts | { compact: true } leaves out the dashes [optional]
export function generateGuid(opts) {
    var pattern = opts && opts.compact ? 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx' : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
    return pattern.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// SECRET_KEPT
// Sentinel a config page posts back in a secret field to keep the stored value, so the real secret never travels to the browser. It mirrors SecretProtector.KeptSentinel, and the C# side reads the posted value through SecretProtector.ResolveIncoming.
export var SECRET_KEPT = '__JPK_SECRET_KEPT__';

// bindSecretField
// Prepares a secret input so the stored secret never reaches the browser, leaving the field empty with a placeholder when a secret is stored. Call it after every load, since a save may change whether a secret is stored.
//
// Param: input     | the input element
// Param: hasStored | whether a secret is stored, from SecretProtector.HasSecret on the C# side
// Param: opts      | { placeholder (default "Saved, leave blank to keep"), clearButton } where clearButton is shown while a secret is stored and clears it [optional]
export function bindSecretField(input, hasStored, opts) {
    if (!input) return;
    opts = opts || {};
    var clear = opts.clearButton;
    if (clear) {
        clear.classList.toggle('hidden', !hasStored);
        if (!clear.dataset.jpkSecretClear) {
            clear.dataset.jpkSecretClear = '1';
            clear.addEventListener('click', function () {
                clearSecretField(input);
                clear.classList.add('hidden');
                input.dispatchEvent(new Event('input', { bubbles: true }));
            });
        }
    }
    if (input.dataset.jpkSecretPlaceholder === undefined) {
        input.dataset.jpkSecretPlaceholder = input.placeholder || '';
    }
    input.value = '';
    delete input.dataset.jpkSecretCleared;
    if (hasStored) {
        input.dataset.jpkSecretStored = '1';
        input.placeholder = opts.placeholder || 'Saved, leave blank to keep';
    } else {
        delete input.dataset.jpkSecretStored;
        input.placeholder = input.dataset.jpkSecretPlaceholder;
    }
}

// clearSecretField
// Marks a bound secret field to clear the stored secret on the next save, since an empty field otherwise keeps it.
//
// Param: input | the input element
export function clearSecretField(input) {
    if (!input) return;
    input.value = '';
    input.dataset.jpkSecretCleared = '1';
    input.placeholder = input.dataset.jpkSecretPlaceholder || '';
}

// readSecretField
// Returns the value to post for a bound secret field. That is SECRET_KEPT when it is empty and a secret is stored, '' after clearSecretField, and otherwise the typed replacement.
//
// Param: input | the input element
export function readSecretField(input) {
    if (!input) return '';
    if (input.value) return input.value;
    if (input.dataset.jpkSecretCleared) return '';
    return input.dataset.jpkSecretStored ? SECRET_KEPT : '';
}

// errorText
// Resolves to the reason a failed request gave, such as the Error of a 400 response's JSON body, or to fallback.
//
// Param: err      | what apiRequest rejected with, or a { Error } object
// Param: fallback | text when there is no reason (default "Could not save.")
export function errorText(err, fallback) {
    var otherwise = fallback || 'Could not save.';
    // Reads a plugin's own { Error } or the title and detail of ASP.NET problem details.
    var pick = function (body) { return (body && (body.Error || body.error || body.detail || body.title || body.message)) || otherwise; };
    if (err && typeof err.json === 'function') {
        return err.json().then(pick, function () { return otherwise; });
    }
    return Promise.resolve(err && (err.Error || err.error) ? pick(err) : otherwise);
}

// debounce
// Returns a function that runs fn once calls have paused for ms milliseconds, with the latest arguments. The returned function has cancel() to drop a pending call.
//
// Param: fn | the function to debounce
// Param: ms | quiet period in milliseconds (default 300)
export function debounce(fn, ms) {
    var timer = null;
    function debounced() {
        var self = this;
        var args = arguments;
        if (timer) clearTimeout(timer);
        timer = setTimeout(function () { timer = null; fn.apply(self, args); }, ms == null ? 300 : ms);
    }
    debounced.cancel = function () { if (timer) { clearTimeout(timer); timer = null; } };
    return debounced;
}

// downloadJson
// Saves a value as a pretty-printed JSON file through the browser's download, for exporting configuration.
//
// Param: filename | the suggested file name, such as "channels.json"
// Param: value    | the value to serialize
export function downloadJson(filename, value) {
    var blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = filename || 'export.json';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(function () { URL.revokeObjectURL(url); }, 0);
}

// pickJsonFile
// Opens a file picker for a JSON file and resolves to its parsed value, or to null when the picker is cancelled. It rejects when the file is not valid JSON or cannot be read.
export function pickJsonFile() {
    return new Promise(function (resolve, reject) {
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.style.display = 'none';
        document.body.appendChild(input);
        function cleanup() { if (input.parentNode) input.parentNode.removeChild(input); }
        input.addEventListener('cancel', function () { cleanup(); resolve(null); });
        input.addEventListener('change', function () {
            var file = input.files && input.files[0];
            cleanup();
            if (!file) { resolve(null); return; }
            var reader = new FileReader();
            reader.onload = function () {
                try { resolve(JSON.parse(reader.result)); } catch (e) { reject(new Error('The file is not valid JSON.')); }
            };
            reader.onerror = function () { reject(new Error('The file could not be read.')); };
            reader.readAsText(file);
        });
        input.click();
    });
}

// plural
// Returns the count, a space, and the matching word, such as "1 item" and "3 items". Only a count of exactly 1 takes the singular.
//
// Param: count | number
// Param: one   | the singular word
// Param: many  | the plural word (default the singular word and "s")
export function plural(count, one, many) {
    return count + ' ' + (count === 1 ? one : (many === undefined || many === null ? one + 's' : many));
}

// BADGE_STATES
// The state names that badges.css tints, in names, and the color modifiers that jpk-badge takes, in colors. A plugin maps its own statuses onto these so the mapping has one source.
export var BADGE_STATES = {
    names: [
        'Active', 'Synced', 'Downloaded', 'Imported',
        'Queued', 'Downloading', 'Pending', 'Pending-Download', 'Pending-Replacement',
        'Errored', 'Error', 'Disabled', 'Deleting', 'Pending-Deletion',
        'Expired', 'Locked', 'Admin', 'Ignored', 'Group',
        'Completed', 'Enabled', 'Failed', 'Paused', 'Running', 'Skipped', 'Unknown'
    ],
    colors: ['green', 'red', 'orange', 'purple', 'blue', 'gray', 'yellow', 'pink', 'teal']
};

// createConfigPage
// Wires the config page lifecycle by building the shared bag, setting the tabs, running bind once, and running load on every viewshow. On viewhide it runs the registered cleanups and onHide.
//
// Param: view | the page element the framework passes to the module's default export
// Param: opts | {
//   pluginId     : plugin GUID string [required]
//   apiPrefix    : controller name for shared.apiRequest [optional]
//   tabsKey      : LibraryMenu tab group key [optional]
//   tabIndex     : active tab index (default 0)
//   tabs         : array of { href, name }, or a function returning one that runs each time the tabs are shown, set only when tabsKey is also given [optional]
//   bind         : function(shared, page) run once, for event wiring [optional]
//   load         : function(shared, page) run on every viewshow, for loading data [optional]
//   onHide       : function(shared, page) run on viewhide, after the automatic cleanups [optional]
//   isDirty      : function() returning whether there are unsaved changes, so leaving the page asks first and closing the tab warns [optional]
//   leaveMessage : the question asked before leaving with unsaved changes (default 'You have unsaved changes. Leave without saving?')
// }
// Returns a page handle { view, shared, addCleanup(fn), createPoller(fn, ms, opts), guardUnsaved(isDirty, message), trackEditor(dialog), untrackEditor(dialog) }.
// guardUnsaved takes a function or a createChangeTracker tracker, and a poller from createPoller stops on viewhide.
export function createConfigPage(view, opts) {
    opts = opts || {};
    var shared = createShared(view, opts.pluginId, opts.apiPrefix);
    var cleanups = [];
    var bound = false;
    var isDirty = opts.isDirty || null;
    // Editor dialogs from openEditorDialog, whose unsaved edits count as the page.
    var editors = [];
    var leaveMessage = opts.leaveMessage || 'You have unsaved changes. Leave without saving?';

    function hasUnsaved() {
        if (editors.some(function (d) { return d.isDirty(); })) return true;
        try { return !!(isDirty && isDirty()); } catch (e) { return false; }
    }

    function onBeforeUnload(e) {
        if (hasUnsaved()) {
            e.preventDefault();
            e.returnValue = '';
        }
    }

    var page = {
        view: view,
        shared: shared,
        addCleanup: function (fn) { if (typeof fn === 'function') cleanups.push(fn); return fn; },
        createPoller: function (fn, intervalMs, pollerOpts) {
            var poller = shared.createPoller(fn, intervalMs, pollerOpts);
            cleanups.push(poller.stop);
            return poller;
        },
        guardUnsaved: function (dirty, message) {
            isDirty = dirty && typeof dirty.isDirty === 'function' ? dirty.isDirty : dirty;
            if (message) leaveMessage = message;
        },
        trackEditor: function (dialog) { if (editors.indexOf(dialog) < 0) editors.push(dialog); },
        untrackEditor: function (dialog) { editors = editors.filter(function (d) { return d !== dialog; }); }
    };

    function runCleanups() {
        for (var i = 0; i < cleanups.length; i++) {
            try { cleanups[i](); } catch (e) { /* best effort teardown */ }
        }
        cleanups.length = 0;
    }

    function applyTabs() {
        if (opts.tabs && opts.tabsKey !== undefined && opts.tabsKey !== null) {
            setTabs(opts.tabsKey, opts.tabIndex || 0, opts.tabs);
        }
    }

    view.addEventListener('viewshow', function () {
        applyTabs();
        window.addEventListener('beforeunload', onBeforeUnload);
        if (!bound) {
            bound = true;
            if (opts.bind) opts.bind(shared, page);
        }
        if (opts.load) opts.load(shared, page);
    });

    view.addEventListener('viewbeforehide', function (e) {
        if (hasUnsaved() && !window.confirm(leaveMessage)) {
            e.preventDefault();
            // The dashboard has already moved the tab highlight, so put it back on this page.
            applyTabs();
        }
    });

    view.addEventListener('viewhide', function () {
        window.removeEventListener('beforeunload', onBeforeUnload);
        editors.slice().forEach(function (d) { d.close(); });
        runCleanups();
        if (opts.onHide) opts.onHide(shared, page);
    });

    return page;
}

// createShared
// Builds the per view helper bag that a config page uses. Create it once on viewshow and reuse it.
//
// Param: view      | page element the helpers operate on
// Param: pluginId  | plugin GUID string
// Param: apiPrefix | controller name for apiRequest [optional]
// Returns the helper bag, whose methods the web components page lists.
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

        setStatus: function (elementId, message, isError, opts) {
            var el = typeof elementId === 'string' ? view.querySelector('#' + elementId) : elementId;
            if (!el) return;
            opts = opts || {};
            // The role goes on before the text, so a screen reader announces the change.
            if (message) {
                var role = isError ? 'alert' : 'status';
                if (el.getAttribute('role') !== role) el.setAttribute('role', role);
            }
            el.textContent = message || '';
            el.classList.remove('jpk-status-ok', 'jpk-status-bad');
            if (message) el.classList.add(isError ? 'jpk-status-bad' : 'jpk-status-ok');
            var timeout = opts.timeout != null ? opts.timeout : 5000;
            if (message && timeout > 0) {
                setTimeout(function () {
                    if (el.textContent === message) {
                        el.textContent = '';
                        el.classList.remove('jpk-status-ok', 'jpk-status-bad');
                    }
                }, timeout);
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

        setChecked: function (id, checked) {
            var el = this.getEl(id);
            if (el) el.checked = !!checked;
        },

        getChecked: function (id) {
            var el = this.getEl(id);
            return el ? el.checked : false;
        },

        setValue: function (id, value) {
            var el = this.getEl(id);
            if (el) el.value = value === null || value === undefined ? '' : value;
        },

        getValue: function (id, fallback) {
            var el = this.getEl(id);
            return el ? el.value : (fallback === undefined ? '' : fallback);
        },

        getIntValue: function (id, fallback) {
            var v = parseInt(this.getValue(id, ''), 10);
            return isNaN(v) ? fallback : v;
        },

        bindSecretField: function (id, hasStored, opts) {
            bindSecretField(typeof id === 'string' ? this.getEl(id) : id, hasStored, opts);
        },

        clearSecretField: function (id) {
            clearSecretField(typeof id === 'string' ? this.getEl(id) : id);
        },

        readSecretField: function (id) {
            return readSecretField(typeof id === 'string' ? this.getEl(id) : id);
        },

        debounce: debounce,
        downloadJson: downloadJson,
        pickJsonFile: pickJsonFile,

        bindReveal: function (checkboxId, targetId, invert) {
            var self = this;
            var cb = this.getEl(checkboxId);
            if (!cb) return;
            var apply = function () { self.setVisible(targetId, invert ? !cb.checked : cb.checked); };
            if (!cb.dataset.jpkRevealBound) {
                cb.dataset.jpkRevealBound = '1';
                cb.addEventListener('change', apply);
            }
            apply();
        },

        initCollapsibles: function () {
            initCollapsibles(view);
        },

        escapeHtml: escapeHtml,
        plural: plural,
        errorText: errorText,
        insertAtCursor: insertAtCursor,
        placeholderHint: placeholderHint,
        bindPlaceholders: bindPlaceholders,

        badge: function (cls, label) {
            return '<span class="jpk-badge ' + classNames(cls) + '">' + this.escapeHtml(label) + '</span>';
        },

        statusBadge: function (text, stateClass) {
            return '<span class="jpk-table-status-badge ' + classNames(stateClass) + '">' + this.escapeHtml(text) + '</span>';
        },

        emptySection: function (message, opts) {
            var cls = opts && opts.inline ? 'jpk-empty' : 'jpk-empty-section';
            return '<div class="' + cls + '">' + this.escapeHtml(message) + '</div>';
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

        formatDate: function (value, opts) {
            if (!value) return '';
            var d = new Date(value);
            if (isNaN(d.getTime())) return '';
            return opts && opts.seconds === false ? d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : d.toLocaleString();
        },

        toDateInput: function (value) {
            if (!value) return '';
            // A date only string already is the local date, and parsing it would read it as UTC.
            if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
            var d = new Date(value);
            if (isNaN(d.getTime())) return '';
            return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
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

        saveConfigWith: function (mutator, statusId, messages) {
            var self = this;
            messages = messages || {};
            return this.getConfig().then(function (config) {
                var replacement = mutator(config);
                return self.saveConfig(replacement && typeof replacement === 'object' ? replacement : config);
            }).then(function (result) {
                if (statusId) self.setStatus(statusId, messages.success || 'Saved.', false);
                return result;
            }).catch(function (err) {
                if (statusId) self.setStatus(statusId, messages.error || 'Save failed.', true);
                throw err;
            });
        },

        renderCards: function (containerId, cards) {
            var el = typeof containerId === 'string' ? this.getEl(containerId) : containerId;
            if (!el) return;
            var self = this;
            el.classList.add('jpk-cards');
            el.innerHTML = (cards || []).map(function (c) {
                var count = c.count === null || c.count === undefined ? '' : c.count;
                return '<div class="jpk-card ' + (c.color || '') + '">' +
                    '<span class="jpk-card-count">' + self.escapeHtml(String(count)) + '</span>' +
                    '<span class="jpk-card-label">' + self.escapeHtml(c.label || '') + '</span></div>';
            }).join('');
        },

        copyToClipboard: function (text) {
            return copyToClipboard(text);
        },

        copyWithFeedback: function (btn, text, opts) {
            opts = opts || {};
            var label = btn ? (btn.querySelector('span:last-child') || btn) : null;
            return this.copyToClipboard(text).then(function (ok) {
                if (label) {
                    var original = label.dataset.jpkCopyLabel || label.textContent;
                    label.dataset.jpkCopyLabel = original;
                    label.textContent = ok ? (opts.copiedText || 'Copied.') : (opts.failedText || 'Copy failed.');
                    setTimeout(function () {
                        label.textContent = original;
                        delete label.dataset.jpkCopyLabel;
                    }, opts.duration || 1500);
                }
                return ok;
            });
        },

        fetchObjectUrl: function (endpoint, params) {
            var url = this.apiPrefix ? this.apiPrefix + '/' + endpoint : endpoint;
            return ApiClient.fetch({ url: ApiClient.getUrl(url, params), type: 'GET' }).then(function (response) {
                if (!response || !response.ok) throw new Error('Request failed' + (response ? ' (' + response.status + ')' : ''));
                return response.blob();
            }).then(function (blob) {
                return URL.createObjectURL(blob);
            });
        },

        createPoller: function (fn, intervalMs, opts) {
            var timer = null;
            var inFlight = false;
            var pauseWhenHidden = !!(opts && opts.pauseWhenHidden);
            function tick() {
                if (inFlight) return;
                inFlight = true;
                Promise.resolve()
                    .then(fn)
                    .catch(function () { /* transient, try again next tick */ })
                    .then(function () { inFlight = false; });
            }
            // A hidden tab skips its ticks when pauseWhenHidden is set.
            function scheduled() {
                if (pauseWhenHidden && document.hidden) return;
                tick();
            }
            function onVisibility() {
                if (!document.hidden) tick();
            }
            return {
                start: function (immediate) {
                    if (timer) return;
                    if (immediate !== false) scheduled();
                    timer = setInterval(scheduled, intervalMs || 3000);
                    if (pauseWhenHidden) document.addEventListener('visibilitychange', onVisibility);
                },
                stop: function () {
                    if (timer) { clearInterval(timer); timer = null; }
                    if (pauseWhenHidden) document.removeEventListener('visibilitychange', onVisibility);
                },
                isRunning: function () { return !!timer; }
            };
        },

        createChangeTracker: function (opts) {
            opts = opts || {};
            var serialize = opts.serialize || function () { return ''; };
            var indicator = opts.indicatorId ? this.getEl(opts.indicatorId) : (opts.indicator || null);
            var snapshot = serialize();
            var savedText = opts.savedText;
            var flashTimer = null;
            var flashOriginal = null;
            // The indicator announces itself politely when it appears.
            if (indicator && !indicator.getAttribute('role')) indicator.setAttribute('role', 'status');
            function setVisible(dirty) {
                if (indicator) indicator.classList.toggle('visible', dirty);
            }
            // The last text of the indicator, so the dot before it stays.
            function labelNode() {
                var nodes = indicator.childNodes || [];
                for (var i = nodes.length - 1; i >= 0; i--) {
                    if (nodes[i].nodeType === 3 && String(nodes[i].nodeValue).trim()) return nodes[i];
                }
                return null;
            }
            function readLabel() {
                var node = labelNode();
                return node ? node.nodeValue : indicator.textContent;
            }
            function writeLabel(text) {
                var node = labelNode();
                if (node) node.nodeValue = text;
                else if (!indicator.children || !indicator.children.length) indicator.textContent = text;
            }
            return {
                isDirty: function () { return serialize() !== snapshot; },
                check: function () { var d = serialize() !== snapshot; setVisible(d); return d; },
                markClean: function () { snapshot = serialize(); setVisible(false); },
                flashSaved: function () {
                    snapshot = serialize();
                    if (!indicator) return;
                    if (flashTimer) clearTimeout(flashTimer);
                    if (savedText) {
                        if (flashOriginal === null) flashOriginal = readLabel();
                        writeLabel(savedText);
                    }
                    indicator.classList.add('visible', 'save-success');
                    flashTimer = setTimeout(function () {
                        indicator.classList.remove('visible', 'save-success');
                        if (flashOriginal !== null) { writeLabel(flashOriginal); flashOriginal = null; }
                        flashTimer = null;
                    }, 1500);
                }
            };
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

        createUserSelector: function (options) {
            return createUserSelector(options);
        },

        createUserMultiSelector: function (options) {
            return createUserMultiSelector(options);
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
            var aria = bindComboAria(input, dropdown);

            var selectedValue = null;
            var results = [];
            var activeIndex = -1;
            // Each search takes a number, and an answer that is not the latest, or that comes after the dropdown closed, is dropped.
            var requestId = 0;

            function itemLabel(item) { return item && typeof item === 'object' ? (item.label != null ? item.label : String(item.value)) : String(item); }
            function itemValue(item) { return item && typeof item === 'object' ? item.value : item; }

            function choose(item) {
                selectedValue = itemValue(item);
                input.value = itemLabel(item);
                requestId++;
                aria.setOpen(false);
                activeIndex = -1;
                if (options.onSelect) options.onSelect(selectedValue, item);
            }

            function highlight(delta) {
                if (!results.length) return;
                activeIndex = (activeIndex + delta + results.length) % results.length;
                aria.activate(activeIndex);
            }

            input.addEventListener('input', function () {
                // Typing again invalidates an earlier pick.
                selectedValue = null;
                if (options.onInput) options.onInput();
                var mine = ++requestId;
                options.searchFn(input.value, function (list) {
                    if (mine !== requestId) return;
                    results = list || [];
                    activeIndex = -1;
                    dropdown.innerHTML = '';
                    aria.setOpen(false);
                    if (!results.length) return;
                    results.forEach(function (item, i) {
                        var opt = document.createElement('div');
                        opt.className = 'jpk-combo-option';
                        opt.textContent = itemLabel(item);
                        aria.option(opt, i);
                        opt.addEventListener('mousedown', function (e) { e.preventDefault(); choose(item); });
                        dropdown.appendChild(opt);
                    });
                    aria.setOpen(true);
                });
            });

            input.addEventListener('keydown', function (e) {
                if (e.key === 'ArrowDown') { e.preventDefault(); highlight(1); }
                else if (e.key === 'ArrowUp') { e.preventDefault(); highlight(-1); }
                else if (e.key === 'Enter' && activeIndex >= 0 && results[activeIndex]) { e.preventDefault(); choose(results[activeIndex]); }
                else if (e.key === 'Escape') { requestId++; aria.setOpen(false); }
            });

            input.addEventListener('blur', function () { requestId++; });

            function onDocClick(e) {
                if (!container.contains(e.target)) { requestId++; aria.setOpen(false); }
            }
            document.addEventListener('click', onDocClick);

            return {
                element: container,
                getValue: function () { return selectedValue != null ? selectedValue : input.value; },
                setValue: function (val) { input.value = val || ''; selectedValue = val || null; },
                destroy: function () { requestId++; document.removeEventListener('click', onDocClick); }
            };
        },

        pollTaskProgress: function (btn, taskKey, label, onComplete) {
            var btnSpan = btn.querySelector('span');
            var progressBar = btn.querySelector('.btn-progress');
            if (!progressBar) {
                progressBar = document.createElement('div');
                progressBar.className = 'btn-progress jpk-btn-progress';
                btn.appendChild(progressBar);
                btn.classList.add('jpk-btn-progress-host');
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

            // Shows a percent that never goes backward and never passes 100.
            function setPct(pct) {
                if (typeof pct !== 'number' || isNaN(pct)) pct = lastPct;
                if (pct < lastPct) pct = lastPct;
                if (pct > 100) pct = 100;
                lastPct = pct;
                if (btnSpan) btnSpan.textContent = label + ' ' + Math.round(pct) + '%';
                progressBar.style.width = pct + '%';
            }

            // Stops the socket and the poll, resets the button, and calls onComplete once.
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

            // Shows a running task's progress, and finishes once it is idle after running or after a run that ended since the start.
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
