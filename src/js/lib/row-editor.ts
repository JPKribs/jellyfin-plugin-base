// row-editor.ts
// The shared core of the row editors: the move buttons and the focus they keep, and a keyed set of rows with Add and Remove.

import { iconButton, listen, runAll, fill, focusAfterRemove } from './dom.js';
import { createFieldMessage } from '../field-message.js';
import { createList } from '../list.js';
import type { ListHeight } from '../list.js';
import { baseText } from './base-text.js';

/** A row's button label, as a template that holds {value} or as a function of the row's name. */
export type RowLabel = string | ((name: string) => string);

/** What moveButtons takes. index and count place the row, and name fills the labels. */
export interface MoveButtonsOptions {
    index: number;
    count: number;
    name: string;
    className?: string;
    upTitle?: string;
    downTitle?: string;
    upLabel?: RowLabel | null;
    downLabel?: RowLabel | null;
    onMove?(from: number, to: number): void;
}

/**
 * Turns a row label into text for one row. A template has {value} replaced, and a function is called with the name.
 * Internal to the web components.
 *
 * @param label the caller's label, or nothing for the fallback
 * @param fallback the default template
 * @param name the row's name
 */
export function rowLabel(label: RowLabel | null | undefined, fallback: string, name: string): string {
    if (typeof label === 'function') return label(name);
    return fill(label || fallback, name);
}

/**
 * Builds a row's up and down buttons. Each is a row button marked move, with data-move -1 or 1, a short title, and an aria-label that names the row. The first row's up and the last row's down are disabled.
 * Internal to the web components.
 *
 * @param options index, count, name, an optional class prefix that adds prefix-up and prefix-down, the titles, the labels, and onMove
 * @returns the up button and the down button
 */
export function moveButtons(options: MoveButtonsOptions): HTMLButtonElement[] {
    return [-1, 1].map(function (delta) {
        var up = delta < 0;
        var label = rowLabel(up ? options.upLabel : options.downLabel, baseText(up ? 'Base.MoveUpValue' : 'Base.MoveDownValue'), options.name);
        var btn = iconButton('base-row-btn move' + (options.className ? ' ' + options.className + (up ? '-up' : '-down') : ''), up ? 'keyboard_arrow_up' : 'keyboard_arrow_down', label);
        btn.title = up ? (options.upTitle || baseText('Base.MoveUp')) : (options.downTitle || baseText('Base.MoveDown'));
        btn.setAttribute('data-move', String(delta));
        btn.disabled = up ? options.index <= 0 : options.index >= options.count - 1;
        if (options.onMove) btn.addEventListener('click', function () { options.onMove!(options.index, options.index + delta); });
        return btn;
    });
}

/**
 * Puts focus back on a moved row's pressed move button after a redraw, or on the row's other move button when the pressed one is now disabled.
 * Internal to the web components.
 *
 * @param container element whose children are the rows, in order
 * @param from index the row moved from
 * @param to index the row moved to
 */
export function refocusAfterMove(container: Element, from: number, to: number): void {
    var row = container.children[to];
    if (!row || from === to) return;
    var pressed = row.querySelector<HTMLButtonElement>('[data-move="' + (to < from ? -1 : 1) + '"]');
    var other = row.querySelector<HTMLButtonElement>('[data-move="' + (to < from ? 1 : -1) + '"]');
    var target = pressed && !pressed.disabled ? pressed : other;
    if (target && !target.disabled) target.focus();
}

/**
 * Moves focus after a row is removed, to the row that took its place, or the row before when it was the last, or the fallback when none is left.
 * Internal to the web components.
 *
 * @param targets the element to focus in each remaining row, in order
 * @param at index the removed row had
 * @param fallback element focused when no row is left, such as the Add button
 */
export { focusAfterRemove };

/** One row of a row set. focus is the field that takes focus, and off holds the row's listeners. */
export interface RowSetRow {
    element: HTMLElement;
    focus: HTMLElement;
    remove: HTMLButtonElement;
    off: Array<() => void>;
    label?(): void;
    destroy?(): void;
}

/** What createRowSet takes. build makes one row from its data, and onChange runs after the user adds or removes one. */
export interface RowSetOptions<D, R extends RowSetRow> {
    body: HTMLElement;
    build(data: D | null | undefined): R;
    addButton: HTMLButtonElement;
    maxRows?: number;
    minRows?: number;
    limitText?: string;
    emptyText?: string | null;
    emptyClass?: string;
    height?: ListHeight;
    maxHeight?: number | string | null;
    minHeight?: number | string | null;
    onChange?(): void;
    onCount?(count: number): void;
}

/** What createRowSet returns. empty and limit are the empty sentence and the limit message, which the editor places. move puts a row at another place and reports it. */
export interface RowSetHandle<D, R extends RowSetRow> {
    empty: HTMLElement;
    limit: HTMLElement;
    rows(): R[];
    add(data?: D | null, silent?: boolean): R | null;
    set(data: Array<D | null | undefined>): void;
    move(from: number, to: number): void;
    setHeight(height: ListHeight, maxHeight?: number | string | null): void;
    destroy(): void;
}

/**
 * The rows of an editor with Add and Remove, built on createList. It owns the rows, Remove and the focus after it, Add and the focus on the new row, the remove labels, maxRows with its limit message, minRows, which disables Remove and fills a set up to it with empty rows, moving a row, and the empty sentence.
 * Internal to the web components.
 *
 * @param options body, build, addButton, maxRows, minRows, limitText, emptyText, emptyClass, height, maxHeight, minHeight, onChange, and onCount
 * @returns { empty, limit, rows, add, set, move, setHeight, destroy }
 */
export function createRowSet<D, R extends RowSetRow>(options: RowSetOptions<D, R>): RowSetHandle<D, R> {
    var rows: R[] = [];
    var addButton = options.addButton;
    var list = createList<R>({
        element: options.body,
        layout: 'plain',
        wrap: false,
        role: null,
        emptyText: options.emptyText || null,
        emptyOutside: true,
        height: options.height,
        maxHeight: options.maxHeight,
        minHeight: options.minHeight,
        render: function (row) { return row.element; }
    });
    var empty = list.emptyElement;
    if (options.emptyClass) empty.classList.add(options.emptyClass);
    var limit = createFieldMessage();
    var off = [listen(addButton, 'click', function () {
        var row = add(null);
        if (row) row.focus.focus();
    })];

    function full(): boolean {
        return !!(options.maxRows && rows.length >= options.maxRows);
    }

    // Relabels every row, since a label may hold the row's number, and shows the limit. The list shows the empty sentence.
    function reflect(): void {
        var least = options.minRows || 0;
        rows.forEach(function (r) { if (least) r.remove.disabled = rows.length <= least; if (r.label) r.label(); });
        addButton.disabled = full();
        if (full()) limit.set('info', options.limitText || baseText('Base.RowsFull'));
        else limit.clear();
        if (options.onCount) options.onCount(rows.length);
    }

    function teardown(row: R): void {
        runAll(row.off);
        if (row.destroy) row.destroy();
    }

    function buildRow(data: D | null | undefined): R {
        var row = options.build(data);
        row.off.push(listen(row.remove, 'click', function () { remove(row); }));
        return row;
    }

    function add(data?: D | null, silent?: boolean): R | null {
        if (full()) return null;
        var row = buildRow(data);
        rows.push(row);
        list.append([row]);
        reflect();
        if (!silent && options.onChange) options.onChange();
        return row;
    }

    function remove(row: R): void {
        var at = rows.indexOf(row);
        teardown(row);
        rows.splice(at, 1);
        list.setItems(rows);
        reflect();
        if (options.onChange) options.onChange();
        focusAfterRemove(rows.map(function (r) { return r.focus; }), at, addButton);
    }

    function set(data: Array<D | null | undefined>): void {
        rows.forEach(teardown);
        rows = [];
        data.forEach(function (d) { if (!full()) rows.push(buildRow(d)); });
        while (rows.length < (options.minRows || 0) && !full()) rows.push(buildRow(null));
        list.setItems(rows);
        reflect();
    }

    function move(from: number, to: number): void {
        if (from === to || from < 0 || to < 0 || from >= rows.length || to >= rows.length) return;
        var row = rows.splice(from, 1)[0];
        rows.splice(to, 0, row);
        list.setItems(rows);
        reflect();
        if (options.onChange) options.onChange();
    }

    reflect();

    return {
        empty: empty,
        limit: limit.element,
        rows: function () { return rows.slice(); },
        add: add,
        set: set,
        move: move,
        setHeight: function (height, maxHeight) { list.setHeight(height, maxHeight); },
        destroy: function () {
            rows.forEach(teardown);
            rows = [];
            list.setItems(rows);
            reflect();
            runAll(off);
            limit.destroy();
            list.destroy();
        }
    };
}
