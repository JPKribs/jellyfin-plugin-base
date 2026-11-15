import { copyToClipboard } from './clipboard.js';
import { createUserSelector, createUserMultiSelector } from './user-selector.js';
import type { UserSelectorOptions, UserSelectorHandle, UserMultiSelectorOptions, UserMultiSelectorHandle } from './user-selector.js';
import { escapeHtml, classNames } from './escape.js';
import { insertAtCursor, placeholderHint, bindPlaceholders } from './placeholders.js';
import { bindComboAria } from './combo-aria.js';
import type {
    Tabs, PageHandle, ConfigPageOptions, SecretFieldOptions, UnsavedEditor, Poller, PollerOptions, ChangeTracker,
    ChangeTrackerOptions, CardData, SaveMessages, CopyFeedbackOptions, ComboBoxItem, ComboBoxOptions, ComboBoxHandle,
    TaskProgressHandle, ScheduledTaskInfo, BadgeState, BadgeColor
} from './types.js';

/**
 * Wires the dashboard tab bar for a config page. Call it inside viewshow with the active tab index.
 *
 * @param key string grouping the plugin's tabs
 * @param index active tab index
 * @param tabs array of { href, name }, or a function returning one that runs each time the tabs are shown
 */
export function setTabs(key: string, index: number, tabs: Tabs): void {
    if (typeof LibraryMenu !== 'undefined' && LibraryMenu.setTabs) {
        LibraryMenu.setTabs(key, index, function () { return typeof tabs === 'function' ? tabs() : tabs; });
    }
}

/**
 * Binds every collapsible header in the view so a click toggles its target, once per header. The arrow becomes the web client expand_more icon, and the header gets aria-controls and aria-expanded.
 *
 * @param view page element to search within
 */
export function initCollapsibles(view: ParentNode): void {
    view.querySelectorAll<HTMLElement>('.jpk-collapsible-header').forEach(function (header) {
        if (header.dataset.jpkBound) return;
        header.dataset.jpkBound = '1';
        var icon = header.querySelector<HTMLElement>('.jpk-collapsible-icon');
        if (icon) {
            icon.className = 'material-icons jpk-collapsible-icon expand_more';
            icon.textContent = '';
            icon.setAttribute('aria-hidden', 'true');
        }
        if (header.dataset.target) header.setAttribute('aria-controls', header.dataset.target);
        header.setAttribute('aria-expanded', String(!header.classList.contains('collapsed')));
        header.addEventListener('click', function () {
            var content = view.querySelector<HTMLElement>('#' + this.dataset.target);
            if (!content) return;
            this.classList.toggle('collapsed');
            content.classList.toggle('collapsed');
            this.setAttribute('aria-expanded', String(!this.classList.contains('collapsed')));
        });
    });
}

/**
 * Returns a random RFC 4122 version 4 GUID for keying new config entities on the client.
 *
 * @param opts { compact: true } leaves out the dashes [optional]
 */
export function generateGuid(opts?: { compact?: boolean }): string {
    var pattern = opts && opts.compact ? 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx' : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
    return pattern.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/** Sentinel a config page posts back in a secret field to keep the stored value, so the real secret never travels to the browser. It mirrors SecretProtector.KeptSentinel, and the C# side reads the posted value through SecretProtector.ResolveIncoming. */
export var SECRET_KEPT: string = '__JPK_SECRET_KEPT__';

/**
 * Prepares a secret input so the stored secret never reaches the browser, leaving the field empty with a placeholder when a secret is stored. Call it after every load, since a save may change whether a secret is stored.
 *
 * @param input the input element
 * @param hasStored whether a secret is stored, from SecretProtector.HasSecret on the C# side
 * @param opts { placeholder (default "Saved, leave blank to keep"), clearButton } where clearButton is shown while a secret is stored and clears it [optional]
 */
export function bindSecretField(input: HTMLInputElement | null, hasStored: boolean, opts?: SecretFieldOptions): void {
    if (!input) return;
    opts = opts || {};
    var clear = opts.clearButton;
    if (clear) {
        clear.classList.toggle('hidden', !hasStored);
        if (!clear.dataset.jpkSecretClear) {
            clear.dataset.jpkSecretClear = '1';
            clear.addEventListener('click', function () {
                clearSecretField(input);
                clear!.classList.add('hidden');
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

/**
 * Marks a bound secret field to clear the stored secret on the next save, since an empty field otherwise keeps it.
 *
 * @param input the input element
 */
export function clearSecretField(input: HTMLInputElement | null): void {
    if (!input) return;
    input.value = '';
    input.dataset.jpkSecretCleared = '1';
    input.placeholder = input.dataset.jpkSecretPlaceholder || '';
}

/**
 * Returns the value to post for a bound secret field. That is SECRET_KEPT when it is empty and a secret is stored, '' after clearSecretField, and otherwise the typed replacement.
 *
 * @param input the input element
 */
export function readSecretField(input: HTMLInputElement | null): string {
    if (!input) return '';
    if (input.value) return input.value;
    if (input.dataset.jpkSecretCleared) return '';
    return input.dataset.jpkSecretStored ? SECRET_KEPT : '';
}

/**
 * Resolves to the reason a failed request gave, such as the Error of a 400 response's JSON body, or to fallback.
 *
 * @param err what apiRequest rejected with, or a { Error } object
 * @param fallback text when there is no reason (default "Could not save.")
 */
export function errorText(err: any, fallback?: string): Promise<string> {
    var otherwise = fallback || 'Could not save.';
    // Reads a plugin's own { Error } or the title and detail of ASP.NET problem details.
    var pick = function (body: any): string { return (body && (body.Error || body.error || body.detail || body.title || body.message)) || otherwise; };
    if (err && typeof err.json === 'function') {
        return err.json().then(pick, function () { return otherwise; });
    }
    return Promise.resolve(err && (err.Error || err.error) ? pick(err) : otherwise);
}

/**
 * Returns a function that runs fn once calls have paused for ms milliseconds, with the latest arguments. The returned function has cancel() to drop a pending call.
 *
 * @param fn the function to debounce
 * @param ms quiet period in milliseconds (default 300)
 */
export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms?: number): ((...args: A) => void) & { cancel(): void } {
    var timer: ReturnType<typeof setTimeout> | null = null;
    function debounced(this: unknown) {
        var self = this;
        var args = arguments;
        if (timer) clearTimeout(timer);
        timer = setTimeout(function () { timer = null; fn.apply(self, args as unknown as A); }, ms == null ? 300 : ms);
    }
    debounced.cancel = function () { if (timer) { clearTimeout(timer); timer = null; } };
    return debounced;
}

/**
 * Saves a value as a pretty-printed JSON file through the browser's download, for exporting configuration.
 *
 * @param filename the suggested file name, such as "channels.json"
 * @param value the value to serialize
 */
export function downloadJson(filename: string, value: unknown): void {
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

/** Opens a file picker for a JSON file and resolves to its parsed value, or to null when the picker is cancelled. It rejects when the file is not valid JSON or cannot be read. */
export function pickJsonFile(): Promise<any> {
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
                try { resolve(JSON.parse(reader.result as string)); } catch (e) { reject(new Error('The file is not valid JSON.')); }
            };
            reader.onerror = function () { reject(new Error('The file could not be read.')); };
            reader.readAsText(file);
        });
        input.click();
    });
}

/**
 * Returns the count, a space, and the matching word, such as "1 item" and "3 items". Only a count of exactly 1 takes the singular.
 *
 * @param count number
 * @param one the singular word
 * @param many the plural word (default the singular word and "s")
 */
export function plural(count: number, one: string, many?: string | null): string {
    return count + ' ' + (count === 1 ? one : (many === undefined || many === null ? one + 's' : many));
}

/** The state names that badges.css tints, in names, and the color modifiers that jpk-badge takes, in colors. A plugin maps its own statuses onto these so the mapping has one source. */
export var BADGE_STATES: { names: BadgeState[]; colors: BadgeColor[] } = {
    names: [
        'Active', 'Synced', 'Downloaded', 'Imported',
        'Queued', 'Downloading', 'Pending', 'Pending-Download', 'Pending-Replacement',
        'Errored', 'Error', 'Disabled', 'Deleting', 'Pending-Deletion',
        'Expired', 'Locked', 'Admin', 'Ignored', 'Group',
        'Completed', 'Enabled', 'Failed', 'Paused', 'Running', 'Skipped', 'Unknown'
    ],
    colors: ['green', 'red', 'orange', 'purple', 'blue', 'gray', 'yellow', 'pink', 'teal']
};

/**
 * Wires the config page lifecycle by building the shared bag, setting the tabs, running bind once, and running load on every viewshow. On viewhide it runs the registered cleanups and onHide.
 *
 * @param view the page element the framework passes to the module's default export
 * @param opts {
 *   pluginId     : plugin GUID string [required]
 *   apiPrefix    : controller name for shared.apiRequest [optional]
 *   tabsKey      : LibraryMenu tab group key [optional]
 *   tabIndex     : active tab index (default 0)
 *   tabs         : array of { href, name }, or a function returning one that runs each time the tabs are shown, set only when tabsKey is also given [optional]
 *   bind         : function(shared, page) run once, for event wiring [optional]
 *   load         : function(shared, page) run on every viewshow, for loading data [optional]
 *   onHide       : function(shared, page) run on viewhide, after the automatic cleanups [optional]
 *   isDirty      : function() returning whether there are unsaved changes, so leaving the page asks first and closing the tab warns [optional]
 *   leaveMessage : the question asked before leaving with unsaved changes (default 'You have unsaved changes. Leave without saving?')
 * }
 * @returns a page handle { view, shared, addCleanup(fn), createPoller(fn, ms, opts), guardUnsaved(isDirty, message), trackEditor(dialog), untrackEditor(dialog) }.
 * guardUnsaved takes a function or a createChangeTracker tracker, and a poller from createPoller stops on viewhide.
 */
export function createConfigPage(view: HTMLElement, opts: ConfigPageOptions): PageHandle {
    opts = opts || ({} as ConfigPageOptions);
    var shared = createShared(view, opts.pluginId, opts.apiPrefix);
    var cleanups: Array<() => void> = [];
    var bound = false;
    var isDirty: (() => boolean) | null = opts.isDirty || null;
    // Editor dialogs from openEditorDialog, whose unsaved edits count as the page.
    var editors: UnsavedEditor[] = [];
    var leaveMessage = opts.leaveMessage || 'You have unsaved changes. Leave without saving?';

    function hasUnsaved() {
        if (editors.some(function (d) { return d.isDirty(); })) return true;
        try { return !!(isDirty && isDirty()); } catch (e) { return false; }
    }

    function onBeforeUnload(e: BeforeUnloadEvent) {
        if (hasUnsaved()) {
            e.preventDefault();
            e.returnValue = '';
        }
    }

    var page: PageHandle = {
        view: view,
        shared: shared,
        addCleanup: function <F>(fn: F): F { if (typeof fn === 'function') cleanups.push(fn as () => void); return fn; },
        createPoller: function (fn, intervalMs, pollerOpts) {
            var poller = shared.createPoller(fn, intervalMs, pollerOpts);
            cleanups.push(poller.stop);
            return poller;
        },
        guardUnsaved: function (dirty, message) {
            isDirty = dirty && typeof (dirty as { isDirty?: unknown }).isDirty === 'function' ? (dirty as { isDirty(): boolean }).isDirty : dirty as () => boolean;
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

/**
 * Builds the per view helper bag that a config page uses. Create it once on viewshow and reuse it.
 *
 * @param view page element the helpers operate on
 * @param pluginId plugin GUID string
 * @param apiPrefix controller name for apiRequest [optional]
 * @returns the helper bag, whose methods the web components page lists.
 */
export function createShared(view: HTMLElement, pluginId: string, apiPrefix?: string) {
    return {
        pluginId: pluginId,
        apiPrefix: apiPrefix || '',

        getEl: function (id: string): any {
            return view.querySelector('#' + id);
        },

        setVisible: function (id: string | Element, visible: boolean): void {
            var el = typeof id === 'string' ? view.querySelector('#' + id) : id;
            if (el) {
                if (visible) el.classList.remove('hidden');
                else el.classList.add('hidden');
            }
        },

        setStatus: function (elementId: string | Element, message: string, isError?: boolean, opts?: { timeout?: number }): void {
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
                    if (el!.textContent === message) {
                        el!.textContent = '';
                        el!.classList.remove('jpk-status-ok', 'jpk-status-bad');
                    }
                }, timeout);
            }
        },

        bindEvent: function (id: string, event: string, handler: (e: any) => void): Element | null {
            var el = view.querySelector('#' + id);
            if (el) el.addEventListener(event, handler);
            return el;
        },

        bindClick: function (id: string, handler: (e: any) => void): Element | null {
            return this.bindEvent(id, 'click', handler);
        },

        setChecked: function (id: string, checked: boolean): void {
            var el = this.getEl(id);
            if (el) el.checked = !!checked;
        },

        getChecked: function (id: string): boolean {
            var el = this.getEl(id);
            return el ? el.checked : false;
        },

        setValue: function (id: string, value: unknown): void {
            var el = this.getEl(id);
            if (el) el.value = value === null || value === undefined ? '' : value;
        },

        getValue: function (id: string, fallback?: string): string {
            var el = this.getEl(id);
            return el ? el.value : (fallback === undefined ? '' : fallback);
        },

        getIntValue: function <F extends number | undefined = undefined>(id: string, fallback?: F): number | F {
            var v = parseInt(this.getValue(id, ''), 10);
            return isNaN(v) ? fallback as F : v;
        },

        bindSecretField: function (id: string | HTMLInputElement, hasStored: boolean, opts?: SecretFieldOptions): void {
            bindSecretField(typeof id === 'string' ? this.getEl(id) : id, hasStored, opts);
        },

        clearSecretField: function (id: string | HTMLInputElement): void {
            clearSecretField(typeof id === 'string' ? this.getEl(id) : id);
        },

        readSecretField: function (id: string | HTMLInputElement): string {
            return readSecretField(typeof id === 'string' ? this.getEl(id) : id);
        },

        debounce: debounce,
        downloadJson: downloadJson,
        pickJsonFile: pickJsonFile,

        bindReveal: function (checkboxId: string, targetId: string | Element, invert?: boolean): void {
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

        initCollapsibles: function (): void {
            initCollapsibles(view);
        },

        escapeHtml: escapeHtml,
        plural: plural,
        errorText: errorText,
        insertAtCursor: insertAtCursor,
        placeholderHint: placeholderHint,
        bindPlaceholders: bindPlaceholders,

        badge: function (cls: string, label: string): string {
            return '<span class="jpk-badge ' + classNames(cls) + '">' + this.escapeHtml(label) + '</span>';
        },

        statusBadge: function (text: string, stateClass: string): string {
            return '<span class="jpk-table-status-badge ' + classNames(stateClass) + '">' + this.escapeHtml(text) + '</span>';
        },

        emptySection: function (message: string, opts?: { inline?: boolean }): string {
            var cls = opts && opts.inline ? 'jpk-empty' : 'jpk-empty-section';
            return '<div class="' + cls + '">' + this.escapeHtml(message) + '</div>';
        },

        formatSize: function (bytes: number): string {
            if (!bytes) return '0 B';
            var units = ['B', 'KB', 'MB', 'GB', 'TB'];
            var i = 0;
            while (bytes >= 1024 && i < units.length - 1) { bytes /= 1024; i++; }
            return bytes.toFixed(i > 0 ? 2 : 0) + ' ' + units[i];
        },

        formatDuration: function (seconds: number): string {
            if (!seconds) return '';
            var h = Math.floor(seconds / 3600);
            var m = Math.floor((seconds % 3600) / 60);
            var s = Math.floor(seconds % 60);
            if (h > 0) return h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
            return m + ':' + String(s).padStart(2, '0');
        },

        formatRelativeTime: function (date: Date | number): string {
            var diff = (new Date() as unknown as number) - (date as number);
            var minutes = Math.floor(diff / 60000);
            var hours = Math.floor(minutes / 60);
            var days = Math.floor(hours / 24);
            if (days > 0) return days + ' day' + (days > 1 ? 's' : '') + ' ago';
            if (hours > 0) return hours + ' hour' + (hours > 1 ? 's' : '') + ' ago';
            if (minutes > 0) return minutes + ' minute' + (minutes > 1 ? 's' : '') + ' ago';
            return 'Just now';
        },

        formatDate: function (value: string | number | Date, opts?: { seconds?: boolean }): string {
            if (!value) return '';
            var d = new Date(value);
            if (isNaN(d.getTime())) return '';
            return opts && opts.seconds === false ? d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : d.toLocaleString();
        },

        toDateInput: function (value: string | number | Date): string {
            if (!value) return '';
            // A date only string already is the local date, and parsing it would read it as UTC.
            if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
            var d = new Date(value);
            if (isNaN(d.getTime())) return '';
            return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        },

        getFileName: function (path: string): string {
            if (!path) return '';
            return path.split('/').pop()!.split('\\').pop()!;
        },

        generateGuid: generateGuid,

        getConfig: function (): Promise<any> {
            return ApiClient!.getPluginConfiguration(this.pluginId);
        },

        saveConfig: function (config: unknown): Promise<any> {
            return ApiClient!.updatePluginConfiguration(this.pluginId, config);
        },

        saveConfigWith: function (mutator: (config: any) => any, statusId?: string, messages?: SaveMessages): Promise<any> {
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

        renderCards: function (containerId: string | Element, cards: CardData[]): void {
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

        copyToClipboard: function (text: string): Promise<boolean> {
            return copyToClipboard(text);
        },

        copyWithFeedback: function (btn: HTMLElement | null, text: string, opts?: CopyFeedbackOptions): Promise<boolean> {
            opts = opts || {};
            var label = btn ? (btn.querySelector<HTMLElement>('span:last-child') || btn) : null;
            return this.copyToClipboard(text).then(function (ok) {
                if (label) {
                    var original = label.dataset.jpkCopyLabel || label.textContent;
                    label.dataset.jpkCopyLabel = original;
                    label.textContent = ok ? (opts.copiedText || 'Copied.') : (opts.failedText || 'Copy failed.');
                    setTimeout(function () {
                        label!.textContent = original;
                        delete label!.dataset.jpkCopyLabel;
                    }, opts.duration || 1500);
                }
                return ok;
            });
        },

        fetchObjectUrl: function (endpoint: string, params?: Record<string, unknown>): Promise<string> {
            var url = this.apiPrefix ? this.apiPrefix + '/' + endpoint : endpoint;
            return ApiClient!.fetch({ url: ApiClient!.getUrl(url, params), type: 'GET' }).then(function (response) {
                if (!response || !response.ok) throw new Error('Request failed' + (response ? ' (' + response.status + ')' : ''));
                return response.blob();
            }).then(function (blob) {
                return URL.createObjectURL(blob);
            });
        },

        createPoller: function (fn: () => unknown, intervalMs?: number, opts?: PollerOptions): Poller {
            var timer: ReturnType<typeof setInterval> | null = null;
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
                start: function (immediate?: boolean) {
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

        createChangeTracker: function (opts?: ChangeTrackerOptions): ChangeTracker {
            opts = opts || {};
            var serialize = opts.serialize || function () { return ''; };
            var indicator: HTMLElement | null = opts.indicatorId ? this.getEl(opts.indicatorId) : (opts.indicator || null);
            var snapshot = serialize();
            var savedText = opts.savedText;
            var flashTimer: ReturnType<typeof setTimeout> | null = null;
            var flashOriginal: string | null = null;
            // The indicator announces itself politely when it appears.
            if (indicator && !indicator.getAttribute('role')) indicator.setAttribute('role', 'status');
            function setVisible(dirty: boolean) {
                if (indicator) indicator.classList.toggle('visible', dirty);
            }
            // The last text of the indicator, so the dot before it stays.
            function labelNode(): ChildNode | null {
                var nodes: ArrayLike<ChildNode> = indicator!.childNodes || [];
                for (var i = nodes.length - 1; i >= 0; i--) {
                    if (nodes[i].nodeType === 3 && String(nodes[i].nodeValue).trim()) return nodes[i];
                }
                return null;
            }
            function readLabel() {
                var node = labelNode();
                return node ? node.nodeValue : indicator!.textContent;
            }
            function writeLabel(text: string) {
                var node = labelNode();
                if (node) node.nodeValue = text;
                else if (!indicator!.children || !indicator!.children.length) indicator!.textContent = text;
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
                        indicator!.classList.remove('visible', 'save-success');
                        if (flashOriginal !== null) { writeLabel(flashOriginal); flashOriginal = null; }
                        flashTimer = null;
                    }, 1500);
                }
            };
        },

        apiRequest: function (endpoint: string, method?: string, data?: unknown): Promise<any> {
            var url = this.apiPrefix ? this.apiPrefix + '/' + endpoint : endpoint;
            var options: JellyfinFetchOptions = { url: ApiClient!.getUrl(url), type: method || 'GET', dataType: 'json' };
            if (data !== undefined && data !== null) {
                options.contentType = 'application/json';
                options.data = JSON.stringify(data);
            }
            return ApiClient!.fetch(options).catch(function (error) {
                if (error && error.message && error.message.indexOf('JSON') !== -1) return null;
                throw error;
            });
        },

        showAlert: function (message: string): void {
            Dashboard!.alert(message);
        },

        createDebouncedSearch: function (endpoint: string, delay?: number): (query: string, callback: (results: any[]) => void) => void {
            var timeout: ReturnType<typeof setTimeout> | null = null;
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

        createUserSelector: function (options?: UserSelectorOptions): UserSelectorHandle {
            return createUserSelector(options);
        },

        createUserMultiSelector: function (options?: UserMultiSelectorOptions): UserMultiSelectorHandle {
            return createUserMultiSelector(options);
        },

        createSearchableComboBox: function (options: ComboBoxOptions): ComboBoxHandle {
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

            var selectedValue: unknown = null;
            var results: ComboBoxItem[] = [];
            var activeIndex = -1;
            // Each search takes a number, and an answer that is not the latest, or that comes after the dropdown closed, is dropped.
            var requestId = 0;

            function itemLabel(item: ComboBoxItem): string { return item && typeof item === 'object' ? (item.label != null ? item.label : String(item.value)) : String(item); }
            function itemValue(item: ComboBoxItem): unknown { return item && typeof item === 'object' ? item.value : item; }

            function choose(item: ComboBoxItem) {
                selectedValue = itemValue(item);
                input.value = itemLabel(item);
                requestId++;
                aria.setOpen(false);
                activeIndex = -1;
                if (options.onSelect) options.onSelect(selectedValue, item);
            }

            function highlight(delta: number) {
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

            function onDocClick(e: MouseEvent) {
                if (!container.contains(e.target as Node)) { requestId++; aria.setOpen(false); }
            }
            document.addEventListener('click', onDocClick);

            return {
                element: container,
                getValue: function () { return selectedValue != null ? selectedValue : input.value; },
                setValue: function (val: any) { input.value = val || ''; selectedValue = val || null; },
                destroy: function () { requestId++; document.removeEventListener('click', onDocClick); }
            };
        },

        pollTaskProgress: function (btn: HTMLButtonElement, taskKey: string, label: string, onComplete?: () => void): TaskProgressHandle {
            var btnSpan = btn.querySelector('span');
            var progressBar = btn.querySelector<HTMLElement>('.btn-progress');
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
            var poll: ReturnType<typeof setInterval> | null = null;

            var send = ApiClient && (ApiClient.sendMessage || ApiClient.sendWebSocketMessage);
            if (send) send = send.bind(ApiClient);

            // Shows a percent that never goes backward and never passes 100.
            function setPct(pct: number | undefined) {
                if (typeof pct !== 'number' || isNaN(pct)) pct = lastPct;
                if (pct < lastPct) pct = lastPct;
                if (pct > 100) pct = 100;
                lastPct = pct;
                if (btnSpan) btnSpan.textContent = label + ' ' + Math.round(pct) + '%';
                progressBar!.style.width = pct + '%';
            }

            // Stops the socket and the poll, resets the button, and calls onComplete once.
            function finish() {
                if (done) return;
                done = true;
                if (socketBound) {
                    try { send!('ScheduledTasksInfoStop'); } catch (e) { /* socket already closed */ }
                    try { Events!.off(ApiClient, 'message', onMessage); } catch (e) { /* never bound */ }
                }
                if (poll) clearInterval(poll);
                if (btnSpan) btnSpan.textContent = label;
                progressBar!.style.width = '0%';
                btn.disabled = false;
                if (onComplete) onComplete();
            }

            // Shows a running task's progress, and finishes once it is idle after running or after a run that ended since the start.
            function apply(task: ScheduledTaskInfo | undefined) {
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

            function onMessage(e: any, msg?: any) {
                msg = msg || e;
                if (!msg || msg.MessageType !== 'ScheduledTasksInfo' || !msg.Data) return;
                apply(msg.Data.find(function (t: ScheduledTaskInfo) { return t.Key === taskKey; }));
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
                ApiClient!.getScheduledTasks().then(function (tasks) {
                    apply(tasks.find(function (t: ScheduledTaskInfo) { return t.Key === taskKey; }));
                }).catch(function () { /* transient, try again next tick */ });
            }, socketBound ? 5000 : 1000);

            return { cancel: finish };
        }
    };
}
