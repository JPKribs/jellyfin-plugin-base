import { bindBalancedRows } from './balanced-rows.js';
import { bindFieldAdornments } from './field-adornments.js';
import { createShared } from './shared-bag.js';
import { setTabs } from './tabs.js';
import type { PageHandle, ConfigPageOptions, UnsavedEditor } from './types.js';
import { baseText } from './lib/base-text.js';

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
    var leaveMessage = opts.leaveMessage || '';

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
        var balance = bindBalancedRows(view);
        cleanups.push(function () { balance.destroy(); });
        var adornments = bindFieldAdornments(view);
        cleanups.push(function () { adornments.destroy(); });
    });

    view.addEventListener('viewbeforehide', function (e) {
        if (hasUnsaved() && !window.confirm(leaveMessage || baseText('Base.LeaveUnsaved'))) {
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
