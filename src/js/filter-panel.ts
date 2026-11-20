import { make, icon, nextId, listen, runAll, clear, fill, has, viewport } from './lib/dom.js';
import { makeCheck, makeCheckRow } from './lib/check.js';
import { anchorPopover } from './lib/popover.js';
import { openDialog } from './dialog.js';
import type { DialogHandle } from './dialog.js';
import type { ComponentHandle } from './types.js';
import { baseText } from './lib/base-text.js';

/** One choice in a filter group. */
export interface FilterPanelOption {
    value: string;
    label: string;
}

/** One group of a filter panel, shown as a heading over checkboxes, or over radio choices when single is true. */
export interface FilterPanelGroup {
    name: string;
    label: string;
    single?: boolean;
    options: FilterPanelOption[];
}

/** The picked values of a filter panel, from group name to the values picked in it. */
export type FilterPanelValue = Record<string, string[]>;

/** What createFilterPanel takes. onChange hears the picked values each time they apply. */
export interface FilterPanelOptions {
    groups?: FilterPanelGroup[];
    value?: FilterPanelValue | null;
    buttonText?: string;
    title?: string;
    clearText?: string;
    doneText?: string;
    countLabel?: string;
    countOneLabel?: string;
    applyOnChange?: boolean;
    asDialog?: boolean;
    onChange?(value: FilterPanelValue): void;
}

/** What createFilterPanel returns, where element is the Filter button. setValue and setGroups do not call onChange. */
export interface FilterPanelHandle extends ComponentHandle {
    element: HTMLButtonElement;
    getValue(): FilterPanelValue;
    setValue(value: FilterPanelValue | null): void;
    setGroups(groups: FilterPanelGroup[] | null): void;
    open(): void;
    close(): void;
    isOpen(): boolean;
    destroy(): void;
}

/**
 * A Filter button with a count of the filters on, which opens a panel of filter groups. The panel is a popover under the button, or a dialog on a screen under 600px wide or with asDialog.
 *
 * @param options {
 *   groups        : array of { name, label, single, options: [{ value, label }] } [optional]
 *   value         : object from group name to an array of picked values, where a single group holds at most one [optional]
 *   buttonText    : text of the button (default 'Filter')
 *   title         : heading of the panel (default 'Filters')
 *   clearText     : text of the button that unchecks every group (default 'Clear')
 *   doneText      : text of the button that closes the panel (default 'Done')
 *   countLabel    : end of the button's aria-label while filters are on, where {value} is the count (default '{value} filters on')
 *   countOneLabel : the same while one filter is on (default '{value} filter on')
 *   applyOnChange : apply each change at once, or with false only on Done (default true)
 *   asDialog      : always open as a dialog (default false)
 *   onChange      : function(value) called each time the picked values apply [optional]
 * }
 * @returns { element, getValue, setValue, setGroups, open, close, isOpen, destroy }, where element is the button.
 * Escape and a click outside close the panel and return focus to the button. With applyOnChange false they drop the pending changes.
 */
export function createFilterPanel(options?: FilterPanelOptions): FilterPanelHandle {
    options = options || {};
    var groups: FilterPanelGroup[] = (options.groups || []).slice();
    var applyOnChange: boolean = options.applyOnChange !== false;
    var buttonText: string = options.buttonText || baseText('Filter');
    var title: string = options.title || baseText('Filters');
    var cleanups: Array<() => void> = [];
    var mode: 'none' | 'popover' | 'dialog' = 'none';
    var dialog: DialogHandle | null = null;

    var button = make('button', 'raised base-button base-filter-button', { type: 'button', 'aria-haspopup': 'dialog', 'aria-expanded': 'false' });
    button.appendChild(icon('filter_list'));
    button.appendChild(make('span', 'base-filter-text', null, buttonText));
    var badge = make('span', 'base-filter-count', { 'aria-hidden': 'true' });
    badge.hidden = true;
    button.appendChild(badge);

    var panel = make('div', 'base-filter-panel', { role: 'dialog' });
    panel.id = nextId('filter');
    var heading = make('div', 'base-filter-title', null, title);
    heading.id = panel.id + '-title';
    panel.setAttribute('aria-labelledby', heading.id);
    button.setAttribute('aria-controls', panel.id);
    var body = make('div', 'base-filter-groups');
    var actions = make('div', 'base-filter-actions');
    var clearButton = make('button', 'raised base-button small secondary base-filter-clear', { type: 'button' }, options.clearText || baseText('Base.Clear'));
    var doneButton = make('button', 'raised base-button small primary base-filter-done', { type: 'button' }, options.doneText || baseText('Base.Done'));
    actions.appendChild(clearButton);
    actions.appendChild(doneButton);
    panel.appendChild(heading);
    panel.appendChild(body);
    panel.appendChild(actions);

    // Keeps only the groups and options that exist, as fresh arrays, and at most one value in a single group.
    function normalize(raw: FilterPanelValue | null | undefined): FilterPanelValue {
        var out: FilterPanelValue = {};
        groups.forEach(function (group: FilterPanelGroup): void {
            var picked: unknown = raw && has(raw, group.name) ? raw[group.name] : null;
            var list: string[] = Array.isArray(picked) ? picked.map(String) : [];
            var known: string[] = (group.options || []).map(function (o: FilterPanelOption): string { return String(o.value); });
            var kept: string[] = known.filter(function (v: string): boolean { return list.indexOf(v) !== -1; });
            out[group.name] = group.single ? kept.slice(0, 1) : kept;
        });
        return out;
    }

    function copy(source: FilterPanelValue): FilterPanelValue {
        var out: FilterPanelValue = {};
        Object.keys(source).forEach(function (k: string): void { out[k] = source[k].slice(); });
        return out;
    }

    function same(a: FilterPanelValue, b: FilterPanelValue): boolean {
        return JSON.stringify(a) === JSON.stringify(b);
    }

    var value: FilterPanelValue = normalize(options.value);
    var draft: FilterPanelValue = copy(value);

    function count(source: FilterPanelValue): number {
        return Object.keys(source).reduce(function (sum: number, k: string): number { return sum + source[k].length; }, 0);
    }

    function updateButton(): void {
        var n: number = count(value);
        badge.textContent = String(n);
        badge.hidden = n === 0;
        button.classList.toggle('active', n > 0);
        if (n === 0) button.setAttribute('aria-label', buttonText);
        else button.setAttribute('aria-label', buttonText + ', ' + fill(n === 1 ? (options!.countOneLabel || baseText('Base.FiltersOnOne')) : (options!.countLabel || baseText('Base.FiltersOnMany')), n));
    }

    function inputs(): HTMLInputElement[] {
        return Array.prototype.slice.call(body.querySelectorAll<HTMLInputElement>('.base-filter-input'));
    }

    // Sets each box from the pending values, which also keeps a single group to one radio.
    function sync(): void {
        inputs().forEach(function (input: HTMLInputElement): void {
            var list: string[] = draft[input.getAttribute('data-group') as string] || [];
            input.checked = list.indexOf(input.value) !== -1;
        });
    }

    function render(): void {
        clear(body);
        groups.forEach(function (group: FilterPanelGroup, index: number): void {
            var set = make('fieldset', 'base-filter-group' + (group.single ? ' single' : ''));
            set.appendChild(make('legend', 'base-filter-group-name', null, group.label));
            (group.options || []).forEach(function (option: FilterPanelOption): void {
                var input = makeCheck('base-filter-input', { name: panel.id + '-' + index, 'data-group': group.name }, group.single ? 'radio' : 'checkbox');
                input.value = String(option.value);
                set.appendChild(makeCheckRow(input, option.label, 'base-filter-option'));
            });
            body.appendChild(set);
        });
        sync();
    }

    function emit(): void {
        if (options!.onChange) options!.onChange(copy(value));
    }

    // Applies the pending values when they differ from the applied ones.
    function commit(): void {
        if (same(draft, value)) return;
        value = copy(draft);
        updateButton();
        emit();
    }

    function changed(): void {
        sync();
        if (applyOnChange) commit();
    }

    cleanups.push(listen(body, 'change', function (e: Event): void {
        var input = e.target as HTMLInputElement;
        if (!input || !input.classList || !input.classList.contains('base-filter-input')) return;
        var name: string = input.getAttribute('data-group') as string;
        var group: FilterPanelGroup | undefined = groups.filter(function (g: FilterPanelGroup): boolean { return g.name === name; })[0];
        if (!group) return;
        var list: string[] = (draft[name] || []).filter(function (v: string): boolean { return v !== input.value; });
        if (input.checked) list = group.single ? [input.value] : list.concat(input.value);
        var raw: FilterPanelValue = {};
        raw[name] = list;
        draft[name] = normalize(raw)[name];
        changed();
    }));

    function clearAll(): void {
        Object.keys(draft).forEach(function (k: string): void { draft[k] = []; });
        changed();
    }

    var popover = anchorPopover(button, panel, {
        align: 'start',
        onDismiss: function (): void { finish(false, false); }
    });

    // Closes the panel, applies the pending values when keep is true, and drops them otherwise.
    function finish(keep: boolean, refocus: boolean): void {
        if (mode === 'none') return;
        if (keep) commit();
        draft = copy(value);
        sync();
        button.setAttribute('aria-expanded', 'false');
        if (mode === 'dialog') {
            var d = dialog;
            mode = 'none';
            dialog = null;
            if (d) d.close();
        } else {
            mode = 'none';
            popover.close();
            if (panel.parentNode) panel.parentNode.removeChild(panel);
        }
        if (refocus) button.focus();
    }

    function openPopover(): void {
        mode = 'popover';
        if (body.parentNode !== panel) panel.insertBefore(body, actions);
        if (button.parentNode) button.parentNode.insertBefore(panel, button.nextSibling);
        else document.body.appendChild(panel);
        popover.open();
        var first: HTMLElement = inputs()[0] || doneButton;
        first.focus();
    }

    function openAsDialog(): void {
        mode = 'dialog';
        button.focus();
        dialog = openDialog({
            title: title,
            body: body,
            size: 'small',
            className: 'base-filter-dialog',
            returnFocus: button,
            buttons: [
                { text: options!.clearText || baseText('Base.Clear'), className: 'base-button secondary base-filter-clear', action: function (): void { clearAll(); } },
                { text: options!.doneText || baseText('Base.Done'), className: 'base-button primary base-filter-done', action: function (): void { finish(true, true); } }
            ],
            onClose: function (): void {
                // A dismiss by Escape, the backdrop, or the close button drops the pending changes.
                if (mode === 'dialog') { dialog = null; finish(false, false); }
            }
        });
    }

    function open(): void {
        if (mode !== 'none') return;
        draft = copy(value);
        sync();
        button.setAttribute('aria-expanded', 'true');
        if (options!.asDialog || viewport().width < 600) openAsDialog();
        else openPopover();
    }

    cleanups.push(listen(button, 'click', function (): void {
        if (mode === 'popover') finish(false, true);
        else open();
    }));

    cleanups.push(listen(panel, 'focusout', function (e: FocusEvent): void {
        var next = e.relatedTarget as Node | null;
        if (mode === 'popover' && next && !panel.contains(next) && next !== button) finish(false, false);
    }));

    cleanups.push(listen(clearButton, 'click', clearAll));
    cleanups.push(listen(doneButton, 'click', function (): void { finish(true, true); }));

    render();
    updateButton();

    return {
        element: button,
        getValue: function (): FilterPanelValue { return copy(value); },
        setValue: function (next: FilterPanelValue | null): void {
            value = normalize(next);
            draft = copy(value);
            sync();
            updateButton();
        },
        setGroups: function (next: FilterPanelGroup[] | null): void {
            groups = (next || []).slice();
            value = normalize(value);
            draft = normalize(draft);
            render();
            updateButton();
        },
        open: open,
        close: function (): void { finish(false, false); },
        isOpen: function (): boolean { return mode !== 'none'; },
        destroy: function (): void { finish(false, false); popover.destroy(); runAll(cleanups); clear(body); }
    };
}
