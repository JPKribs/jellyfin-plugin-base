import { make, nextId, listen, runAll, clear } from './dom-util.js';
import type { ComponentHandle } from './types.js';

/** One tab of a sub tab list. text is plain text for its panel. */
export interface SubTab {
    id: string | number;
    label?: string;
    text?: string;
    disabled?: boolean;
}

/** What createSubTabs takes. render builds a panel the first time its tab opens. */
export interface SubTabsOptions {
    tabs?: SubTab[];
    value?: string | number;
    label?: string;
    render?(tab: SubTab, panel: HTMLElement): Node | string | void;
    onChange?(id: string, tab: SubTab): void;
}

/** What createSubTabs returns. getValue returns the selected id as a string. */
export interface SubTabsHandle extends ComponentHandle {
    getValue(): string | null;
    setValue(id: string | number): void;
    setItems(next: SubTab[], value?: string | number): void;
    getPanel(id: string | number): HTMLElement | null;
    destroy(): void;
}

/**
 * An in-page tab list with tab panels. Left and Right move between tabs, Home and End jump to the ends, and the focused tab is the selected one. A panel is built the first time its tab opens.
 *
 * @param options {
 *   tabs     : array of { id, label, text, disabled } where text is plain text for the panel [optional]
 *   value    : id of the tab to open first (default the first enabled tab)
 *   label    : aria-label of the tab list (default 'Sections')
 *   render   : function(tab, panel) called once, the first time the tab opens, that returns a node or an escaped HTML string for the panel or fills the panel itself [optional]
 *   onChange : function(id, tab) called when the selected tab changes [optional]
 * }
 * @returns { element, getValue, setValue, setItems, getPanel, destroy }. getPanel(id) returns the panel element of a tab. getValue returns the selected id as a string.
 * An id is read as a string everywhere, so 2 and '2' name the same tab.
 */
export function createSubTabs(options?: SubTabsOptions): SubTabsHandle {
    options = options || {};
    var tabs: SubTab[] = [];
    var selected: string | null = null;
    var built: Record<string, boolean> = {};
    var cleanups: Array<() => void> = [];

    var root = make('div', 'jpk-subtabs');
    var list = make('div', 'jpk-subtab-list', { role: 'tablist', 'aria-label': options.label || 'Sections' });
    var panels = make('div', 'jpk-subtab-panels');
    root.appendChild(list);
    root.appendChild(panels);

    // Every id is read as a string, so a number id and its text match.
    function idOf(tab: SubTab): string { return String(tab.id); }
    // An id made safe to join into an element id.
    function safe(id: unknown): string { return String(id).replace(/[^A-Za-z0-9_-]+/g, '-'); }

    function tabEl(id: unknown): HTMLElement { return Array.prototype.filter.call(list.querySelectorAll('.jpk-subtab'), function (el) { return el.getAttribute('data-id') === String(id); })[0]; }
    function panelEl(id: unknown): HTMLElement { return Array.prototype.filter.call(panels.querySelectorAll('.jpk-subtab-panel'), function (el) { return el.getAttribute('data-id') === String(id); })[0]; }
    function enabledTabs(): SubTab[] { return tabs.filter(function (t) { return !t.disabled; }); }

    function draw(): void {
        clear(list);
        clear(panels);
        built = {};
        var base = nextId('subtab');
        tabs.forEach(function (tab) {
            var id = safe(idOf(tab));
            var tabButton = make('button', 'jpk-subtab', { type: 'button', role: 'tab', id: base + '-' + id, 'aria-controls': base + '-panel-' + id, 'data-id': idOf(tab) }, tab.label);
            tabButton.disabled = !!tab.disabled;
            var panel = make('div', 'jpk-subtab-panel', { role: 'tabpanel', id: base + '-panel-' + id, 'aria-labelledby': base + '-' + id, 'data-id': idOf(tab), tabindex: '0' });
            panel.hidden = true;
            list.appendChild(tabButton);
            panels.appendChild(panel);
        });
    }

    function build(tab: SubTab): void {
        if (built[idOf(tab)]) return;
        built[idOf(tab)] = true;
        var panel = panelEl(idOf(tab));
        if (tab.text) panel.textContent = tab.text;
        if (options!.render) {
            var content = options!.render(tab, panel);
            if (content instanceof Node) panel.appendChild(content);
            else if (typeof content === 'string') panel.innerHTML = content;
        }
    }

    function select(id: string | number, focus: boolean, silent?: boolean): void {
        id = String(id);
        var tab = tabs.filter(function (t) { return idOf(t) === id && !t.disabled; })[0];
        if (!tab) return;
        var changed = selected !== id;
        selected = id;
        tabs.forEach(function (t) {
            var active = idOf(t) === id;
            var el = tabEl(idOf(t));
            el.classList.toggle('active', active);
            el.setAttribute('aria-selected', active ? 'true' : 'false');
            el.setAttribute('tabindex', active ? '0' : '-1');
            panelEl(idOf(t)).hidden = !active;
        });
        build(tab);
        if (focus) tabEl(id).focus();
        if (changed && !silent && options!.onChange) options!.onChange(id, tab);
    }

    cleanups.push(listen(list, 'click', function (e) {
        var el = e.target.closest && e.target.closest('.jpk-subtab');
        if (el && !el.disabled) select(el.getAttribute('data-id'), false);
    }));
    cleanups.push(listen(list, 'keydown', function (e) {
        var open = enabledTabs();
        var at = open.map(idOf).indexOf(selected as string);
        var next: SubTab | null = null;
        if (e.key === 'ArrowRight') next = open[(at + 1) % open.length];
        else if (e.key === 'ArrowLeft') next = open[(at - 1 + open.length) % open.length];
        else if (e.key === 'Home') next = open[0];
        else if (e.key === 'End') next = open[open.length - 1];
        if (!next) return;
        e.preventDefault();
        select(idOf(next), true);
    }));

    function setItems(next: SubTab[] | undefined, value?: string | number): void {
        tabs = (next || []).slice();
        selected = null;
        draw();
        var first = enabledTabs()[0];
        var start = value !== undefined ? value : (first ? idOf(first) : undefined);
        if (start !== undefined) select(start, false, true);
    }

    setItems(options.tabs, options.value);

    return {
        element: root,
        getValue: function () { return selected; },
        setValue: function (id) { select(id, false); },
        setItems: setItems,
        getPanel: function (id) { return panelEl(id) || null; },
        destroy: function () { runAll(cleanups); clear(list); clear(panels); }
    };
}
