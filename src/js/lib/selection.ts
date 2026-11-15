// selection.ts
// The picked ids behind a list with checkboxes, and the binding of its row checkboxes, which the paginated table and the checkbox list share. None of it is exported from the bundle.

import { toText, listen, runAll } from './dom.js';

/** What createSelection takes. matchKey turns an id into the text two ids are compared by, and onChange hears the ids after each change. */
export interface SelectionOptions {
    ids?: unknown[] | null;
    matchKey?(id: unknown): string;
    onChange?(ids: string[]): void;
}

/** Whether a select all box over some ids is checked, partly checked, or clear. */
export interface SelectionBoxState {
    checked: boolean;
    indeterminate: boolean;
}

/** What createSelection returns. setIds replaces the ids without calling onChange, and every other change calls it. */
export interface SelectionHandle {
    key(id: unknown): string;
    has(id: unknown): boolean;
    select(id: unknown, on?: boolean): void;
    toggle(id: unknown): boolean;
    selectAll(ids: unknown[], on?: boolean): void;
    clear(): void;
    getIds(): string[];
    setIds(ids: unknown[] | null | undefined): void;
    size(): number;
    boxState(ids: unknown[]): SelectionBoxState;
    syncBox(box: HTMLInputElement | null | undefined, ids: unknown[]): void;
}

/**
 * A set of picked ids, kept in the order they were picked. select all works on the ids given, which are the rows in view,
 * and boxState tells a select all box over those rows whether it is checked or partly checked.
 * Internal to the web components.
 *
 * @param options the first ids, matchKey, and onChange [optional]
 * @returns { key, has, select, toggle, selectAll, clear, getIds, setIds, size, boxState, syncBox }
 */
export function createSelection(options?: SelectionOptions): SelectionHandle {
    var opts = options || {};
    var picked: string[] = [];

    function key(id: unknown): string {
        return opts.matchKey ? opts.matchKey(id) : toText(id);
    }

    function has(id: unknown): boolean {
        return picked.indexOf(key(id)) !== -1;
    }

    function emit(): void {
        if (opts.onChange) opts.onChange(picked.slice());
    }

    // Sets one id without telling onChange, and reports whether it changed.
    function put(id: unknown, on: boolean): boolean {
        var k = key(id);
        var at = picked.indexOf(k);
        if (on && at === -1) { picked.push(k); return true; }
        if (!on && at !== -1) { picked.splice(at, 1); return true; }
        return false;
    }

    function setIds(ids: unknown[] | null | undefined): void {
        picked = [];
        (ids || []).forEach(function (id) { put(id, true); });
    }

    function boxState(ids: unknown[]): SelectionBoxState {
        var on = ids.filter(has).length;
        return { checked: ids.length > 0 && on === ids.length, indeterminate: on > 0 && on < ids.length };
    }

    setIds(opts.ids);

    return {
        key: key,
        has: has,
        select: function (id, on) { if (put(id, on !== false)) emit(); },
        toggle: function (id) { var on = !has(id); put(id, on); emit(); return on; },
        selectAll: function (ids, on) {
            var changed = false;
            ids.forEach(function (id) { if (put(id, on !== false)) changed = true; });
            if (changed) emit();
        },
        clear: function () { picked = []; emit(); },
        getIds: function () { return picked.slice(); },
        setIds: setIds,
        size: function () { return picked.length; },
        boxState: boxState,
        syncBox: function (box, ids) {
            if (!box) return;
            var state = boxState(ids);
            box.checked = state.checked;
            box.indeterminate = state.indeterminate;
        }
    };
}

/** What bindChecks takes. boxClass marks a row's checkbox, whose data-id names the row, and rowClass the row a box marks selected. ids gives the ids select all acts on. */
export interface CheckBindingOptions {
    selection: SelectionHandle;
    boxClass: string;
    rowClass?: string;
    selectAll?: HTMLInputElement | null;
    contain?: boolean;
    ids(): unknown[];
}

/** What bindChecks returns. paint sets every box, row, and the select all box from the selection. */
export interface CheckBinding {
    paint(): void;
    destroy(): void;
}

/**
 * Wires the checkboxes of a list of rows to a selection, as the checkbox list and the paginated table share it. A box
 * that changes selects or clears its row, select all acts on the ids given, and paint marks each box and row from the
 * selection. With contain a box's change stays inside the container, for a selection that is not a setting.
 * Internal to the web components.
 *
 * @param container element that holds the rows
 * @param opts { selection, boxClass, rowClass, selectAll, contain, ids }
 * @returns { paint, destroy }
 */
export function bindChecks(container: HTMLElement, opts: CheckBindingOptions): CheckBinding {
    var stops: Array<() => void> = [];

    function paint(): void {
        container.querySelectorAll<HTMLInputElement>('.' + opts.boxClass).forEach(function (box) {
            var on = opts.selection.has(box.getAttribute('data-id'));
            box.checked = on;
            var row = opts.rowClass ? box.closest<HTMLElement>('.' + opts.rowClass) : null;
            if (row) row.classList.toggle('selected', on);
        });
        opts.selection.syncBox(opts.selectAll, opts.ids());
    }

    function onBox(e: Event): void {
        var box = e.target as HTMLInputElement;
        if (!box || !box.classList || !box.classList.contains(opts.boxClass) || box.disabled) return;
        if (opts.contain) e.stopPropagation();
        opts.selection.select(box.getAttribute('data-id'), box.checked);
    }

    function onAll(): void {
        opts.selection.selectAll(opts.ids(), opts.selectAll!.checked);
        // A select all that changed nothing still needs its box set back from the selection.
        paint();
    }

    stops.push(listen(container, 'change', onBox));
    if (opts.selectAll) stops.push(listen(opts.selectAll, 'change', onAll));

    return {
        paint: paint,
        destroy: function () { runAll(stops); }
    };
}
