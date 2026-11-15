import { formatBytes, clockText } from './lib/dom.js';
import { copyToClipboard, debounce, downloadJson, pickJsonFile, escapeHtml, plural, errorText, generateGuid } from './browser-helpers.js';
import { badgeHtml, classBadgeHtml } from './lib/badge.js';
import { createUserSelector } from './user-selector.js';
import type { UserSelectorOptions, UserSelectorHandle } from './user-selector.js';
import { createUserMultiSelector } from './user-multi-selector.js';
import type { UserMultiSelectorOptions, UserMultiSelectorHandle } from './user-multi-selector.js';
import { classNames } from './lib/class-names.js';
import { insertAtCursor, placeholderHint, bindPlaceholders } from './placeholder-hint.js';
import { bindSecretField, clearSecretField, readSecretField } from './secret-field.js';
import { initCollapsibles } from './collapsible-section.js';
import { setStatus } from './status-text.js';
import { renderCards } from './count-cards.js';
import { createPoller } from './poller.js';
import { createChangeTracker } from './change-tracker.js';
import { createSearchableComboBox } from './combo-box.js';
import { pollTaskProgress } from './task-progress-button.js';
import type {
    SecretFieldOptions, Poller, PollerOptions, ChangeTracker, ChangeTrackerOptions, CardData, SaveMessages, CopyFeedbackOptions,
    ComboBoxOptions, ComboBoxHandle, TaskProgressHandle
} from './types.js';

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

        setStatus: function (elementId: string | Element, message: string, isError?: boolean, opts?: { timeout?: number; state?: 'success' | 'error' | 'warn' | 'info' }): void {
            setStatus(view, elementId, message, isError, opts);
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
            if (!cb.dataset.baseRevealBound) {
                cb.dataset.baseRevealBound = '1';
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
            return classBadgeHtml(label, cls);
        },

        statusBadge: function (text: string, stateClass: string): string {
            return badgeHtml(text, stateClass, null, 'base-table-status-badge ' + classNames(stateClass));
        },

        emptySection: function (message: string, opts?: { inline?: boolean }): string {
            var cls = opts && opts.inline ? 'base-empty' : 'base-empty-section';
            return '<div class="' + cls + '">' + this.escapeHtml(message) + '</div>';
        },

        formatSize: function (bytes: number): string { return formatBytes(bytes); },

        formatDuration: function (seconds: number): string { return seconds ? clockText(seconds) : ''; },

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
            renderCards.call(this, containerId, cards);
        },

        copyToClipboard: function (text: string): Promise<boolean> {
            return copyToClipboard(text);
        },

        copyWithFeedback: function (btn: HTMLElement | null, text: string, opts?: CopyFeedbackOptions): Promise<boolean> {
            opts = opts || {};
            var label = btn ? (btn.querySelector<HTMLElement>('span:last-child') || btn) : null;
            return this.copyToClipboard(text).then(function (ok) {
                if (label) {
                    var original = label.dataset.baseCopyLabel || label.textContent;
                    label.dataset.baseCopyLabel = original;
                    label.textContent = ok ? (opts.copiedText || 'Copied.') : (opts.failedText || 'Copy failed.');
                    setTimeout(function () {
                        label!.textContent = original;
                        delete label!.dataset.baseCopyLabel;
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
            return createPoller(fn, intervalMs, opts);
        },

        createChangeTracker: function (opts?: ChangeTrackerOptions): ChangeTracker {
            return createChangeTracker.call(this, opts);
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
            var self = this;
            var latest = 0;
            var later = debounce(function (mine: number, query: string, callback: (results: any[]) => void) {
                self.apiRequest(endpoint + '?query=' + encodeURIComponent(query), 'GET')
                    .then(function (results) { if (mine === latest) callback(results || []); })
                    .catch(function () { if (mine === latest) callback([]); });
            }, delay || 300);
            return function (query, callback) {
                var mine = ++latest;
                if (!query || query.length < 2) { later.cancel(); callback([]); return; }
                later(mine, query, callback);
            };
        },

        createUserSelector: function (options?: UserSelectorOptions): UserSelectorHandle {
            return createUserSelector(options);
        },

        createUserMultiSelector: function (options?: UserMultiSelectorOptions): UserMultiSelectorHandle {
            return createUserMultiSelector(options);
        },

        createSearchableComboBox: function (options: ComboBoxOptions): ComboBoxHandle {
            return createSearchableComboBox(options);
        },

        pollTaskProgress: function (btn: HTMLButtonElement, taskKey: string, label: string, onComplete?: () => void): TaskProgressHandle {
            return pollTaskProgress(btn, taskKey, label, onComplete);
        }
    };
}
