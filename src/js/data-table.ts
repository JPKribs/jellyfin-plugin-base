import { make, icon, iconButton, listen, runAll, idOf, fill, toText } from './lib/dom.js';
import { createFieldGroup } from './lib/field-control.js';
import type { FieldSpec, FieldGroupHandle } from './lib/field-control.js';
import { createFieldMessage } from './field-message.js';
import type { FieldMessageHandle } from './field-message.js';
import { fieldOf } from './lib/data-view.js';
import type { DataSort, DataState, DataQuery } from './lib/data-view.js';
import { createFilteredList } from './filtered-list.js';
import type { FilteredListBulkAction, FilteredListToolbarAction, FilteredListOption } from './filtered-list.js';
import type { ListHeight } from './list.js';
import type { ComponentHandle, PagedResult } from './types.js';
import { baseText, fillLabel } from './lib/base-text.js';

/** One column. value gives the sort and display value, and render draws the cell, else the value is shown as text. hidden starts it hidden. width 'auto' sizes it to its widest value, up to maxWidth. */
export interface DataTableColumn<T = any> {
    key: string;
    label: string;
    icon?: string;
    sortable?: boolean;
    align?: 'start' | 'end' | 'center';
    width?: string;
    maxWidth?: string;
    hidden?: boolean;
    value?(row: T): unknown;
    render?(row: T): Node | string | null | undefined;
}

/** A filter shown as a select above the table. field is the row field it matches, and options its choices. */
export interface DataTableFilter {
    name: string;
    label: string;
    field?: string;
    options: Array<{ value: string; label: string }>;
}

/** Inline row editing. fields are Repeater fields read from the row by key, and onSave gets the row and the edited values, and may return a promise. */
export interface DataTableEditing<T = any> {
    fields: FieldSpec[];
    saveText?: string;
    cancelText?: string;
    editLabel?: string;
    failedText?: string;
    onSave(row: T, values: Record<string, any>): unknown;
}

/** What createDataTable takes. Give rows for local data, or fetch for data the server searches, filters, sorts, and pages. */
export interface DataTableOptions<T = any> {
    columns: DataTableColumn<T>[];
    rows?: T[] | null;
    fetch?(query: DataQuery): Promise<PagedResult<T> | T[]> | PagedResult<T> | T[];
    rowKey?: string | ((row: T) => unknown);
    rowClass?(row: T, index: number): unknown;
    search?: { keys?: string[]; placeholder?: string; label?: string } | false;
    filters?: DataTableFilter[];
    filterValues?: Record<string, string[]>;
    sort?: DataSort | null;
    selectable?: boolean | 'single' | 'multiple';
    selected?: unknown;
    pageSize?: number;
    limit?: number;
    limitText?: string;
    bulkActions?: FilteredListBulkAction<T>[];
    actions?: FilteredListToolbarAction<T>[];
    selectAllText?: string;
    selectedText?: string;
    height?: ListHeight;
    maxHeight?: number | string | null;
    minHeight?: number | string | null;
    label?: string;
    emptyText?: string;
    allText?: string;
    size?: 'small' | 'medium' | 'large';
    editable?: DataTableEditing<T> | null;
    resizable?: boolean;
    widthKey?: string;
    resizeText?: string;
    onSelect?(row: T | null, key: string | null): void;
    onOpen?(row: T): void;
    onSelectionChange?(keys: string[], rows: T[]): void;
    onChange?(state: DataState<T>): void;
}

/** What createDataTable returns. setFilter and setSearch change what matches, and select highlights a row by its key. */
export interface DataTableHandle<T = any> extends ComponentHandle {
    setRows(rows: T[] | null | undefined): void;
    setSearch(text: string): void;
    setFilter(name: string, values: string[] | null | undefined): void;
    setSort(key: string | null, dir?: 'asc' | 'desc'): void;
    select(key: unknown): void;
    getSelected(): string | null;
    getSelectedKeys(): string[];
    getSelectedRows(): T[];
    setSelectedKeys(keys: unknown[] | null | undefined): void;
    clearSelection(): void;
    setFilterOptions(name: string, options: FilteredListOption[] | null | undefined): void;
    onSelect(listener: (row: T | null, key: string | null) => void): () => void;
    setHeight(height: ListHeight, maxHeight?: number | string | null): void;
    getState(): DataState<T>;
    reload(): void;
    edit(key: unknown): void;
    cancelEdit(): void;
    getEditing(): string | null;
    setColumnHidden(key: string, hidden: boolean): void;
    setColumnWidth(key: string, width: number | 'fit' | null): void;
    getColumnWidths(): Record<string, number | 'fit'>;
    destroy(): void;
}

/** A column width set by a drag, the keyboard, or a double-click: pixels, or 'fit' for the column's widest value. */
export type DataTableWidth = number | 'fit';

// A number or checkbox column, which takes the narrow fixed track.
function narrow(column: { align?: string }): boolean { return column.align === 'end' || column.align === 'center'; }

// The class a heading and its cells take for the column's alignment.
function alignClass(column: { align?: string }): string { return column.align === 'end' ? ' end' : column.align === 'center' ? ' center' : ''; }

// A fixed width that is a plain length, so it can count toward the table's least width. A share or a range counts as the least text column.
function isLength(width: string): boolean { return /^(-?[\d.]+(px|em|rem|ch)|calc\(.*\)|var\(.*\)|min\(.*\)|max\(.*\))$/.test(width.trim()); }

// The step Alt with an arrow key resizes a column by, in pixels.
var RESIZE_STEP = 16;

// Reads the widths saved under a widthKey. Storage can be missing or refuse, so any fault reads as none saved.
function loadWidths(storeKey: string | null): Record<string, DataTableWidth> {
    if (!storeKey) return {};
    try {
        var raw = window.localStorage ? window.localStorage.getItem(storeKey) : null;
        var parsed = raw ? JSON.parse(raw) : null;
        var out: Record<string, DataTableWidth> = {};
        if (parsed && typeof parsed === 'object') {
            Object.keys(parsed).forEach(function (k) {
                var v = parsed[k];
                if (v === 'fit' || (typeof v === 'number' && isFinite(v) && v > 0)) out[k] = v;
            });
        }
        return out;
    } catch (e) {
        return {};
    }
}

function saveWidths(storeKey: string | null, widths: Record<string, DataTableWidth>): void {
    if (!storeKey) return;
    try {
        if (!window.localStorage) return;
        if (Object.keys(widths).length) window.localStorage.setItem(storeKey, JSON.stringify(widths));
        else window.localStorage.removeItem(storeKey);
    } catch (e) {
        return;
    }
}

/**
 * A sortable, filterable table: a Filtered List whose items are rows, framed by a header whose sortable columns sort
 * ascending, descending, then not at all. The Filtered List brings the search, the filter selects, the data view over
 * local rows or a server fetch, and the List the rows sit in. With selectable a click or Enter on a row selects it, and again clears
 * it, and onSelect reports it, so a map or a detail pane can follow. select(key) highlights a row picked elsewhere.
 *
 * @param options {
 *   columns      : array of { key, label, icon (a Material icon the heading shows in place of the label when the table is narrow), sortable (default true), align ('start', 'end', or 'center' for a narrow column such as a checkbox), width (a grid track, or 'auto' to size it to its widest value up to maxWidth while the other columns share what is left; default a share, or a fixed number column for end and center), maxWidth (the most an 'auto' column takes; default six large sizes), hidden (true starts it hidden; default false), value(row), render(row) } [required]
 *   rows         : local rows [optional]
 *   fetch        : function(query) returning a page { Items, TotalCount } or an array, for server data [optional]
 *   rowKey       : the field or function that names a row (default 'id')
 *   rowClass     : function(row, index) returning class names for the row, such as 'selected' for a row picked elsewhere, set after every draw and refresh through the Filtered List's itemClass [optional]
 *   search       : { keys, placeholder, label } to show a search field, or false (default no search)
 *   filters      : array of { name, label, field, options: [{ value, label }] } shown as selects [optional]
 *   filterValues : the filter values that start picked, by name [optional]
 *   sort         : { key, dir } to start sorted [optional]
 *   selectable   : true or 'single' lets a click or Enter select one row, and again clears it, and 'multiple' draws a checkbox on each row with a select all, from the Filtered List (default false)
 *   selected     : the row key, or under multiple an array of keys, that starts selected [optional]
 *   limit, limitText, bulkActions, actions, selectAllText, selectedText : the Filtered List's cap with its note, bulk actions on the selected rows, toolbar actions, and selection labels [optional]
 *   onOpen       : function(row) when a row is clicked or gets Enter or Space, apart from its checkbox [optional]
 *   onSelectionChange : function(keys, rows) after the selection changes [optional]
 *   pageSize     : rows to show before more load as the list scrolls (default all)
 *   height, maxHeight, minHeight : the rows' height, which the List underneath owns, so the rows grow, hold a fixed height and scroll inside, cap, or fill to the bottom of the window (default 'auto')
 *   label        : aria-label of the table (default 'Table')
 *   emptyText    : shown when nothing matches (default 'Nothing matches.')
 *   allText      : the first choice of each filter select (default 'All {label}')
 *   size         : 'small', 'medium', or 'large' for its fields (default 'medium')
 *   editable     : { fields, saveText (default 'Save'), cancelText (default 'Cancel'), editLabel (default 'Edit {value}'), failedText (default 'Could not save.'), onSave(row, values) } adds an edit button to each row, which opens the row into Repeater fields with Save and Cancel. The open row stays open, with what was typed, while the rows refresh [optional]
 *   resizable    : a handle on each heading's right edge that drags the column wider or narrower, where a double-click or Enter fits it to its widest value, and Alt with the arrow keys resizes it from the keyboard (default true)
 *   widthKey     : a name to remember each reader's column widths under in localStorage [optional]
 *   resizeText   : the handle's label (default 'Resize {value}')
 *   onSelect     : function(row, key) with the selected row, or (null, null) when the selection clears [optional]
 *   onChange     : function(state) after the rows shown change [optional]
 * }
 * A cell too narrow for its text shows the full text on hover.
 * @returns { element, setRows, setSearch, setFilter, setFilterOptions, setSort, select, getSelected, getSelectedKeys, getSelectedRows, setSelectedKeys, clearSelection, onSelect, setHeight, getState, reload, edit, cancelEdit, getEditing, setColumnHidden, setColumnWidth, getColumnWidths, destroy }. edit(key) opens a row's editor, and cancelEdit closes it. setColumnHidden(key, hidden) hides or shows a column's heading and cells, and the other columns share its width. setColumnWidth(key, width) sets a column to pixels, to 'fit', or with null back to its own width, and getColumnWidths returns what was set. onSelect(listener) adds a listener beside the option and returns a function that removes it.
 */
export function createDataTable<T = any>(options: DataTableOptions<T>): DataTableHandle<T> {
    var opts = options || ({ columns: [] } as unknown as DataTableOptions<T>);
    var columns = opts.columns || [];
    var cleanups: Array<() => void> = [];
    var mode: 'single' | 'multiple' | null = opts.selectable === 'multiple' ? 'multiple' : opts.selectable ? 'single' : null;
    var first = opts.selected === undefined || opts.selected === null ? [] : (Array.isArray(opts.selected) ? opts.selected : [opts.selected]);
    var listeners: Array<(row: T | null, key: string | null) => void> = [];
    var editing = opts.editable || null;
    var editor: { key: string; element: HTMLElement; group: FieldGroupHandle; message: FieldMessageHandle; off: Array<() => void> } | null = null;

    function keyOf(row: T): string { return String(idOf(row, opts.rowKey as any)); }
    function valueOf(row: T, column: DataTableColumn<T>): unknown { return column.value ? column.value(row) : fieldOf(row, column.key); }
    function columnOf(key: string): DataTableColumn<T> | undefined { return columns.filter(function (c) { return c.key === key; })[0]; }
    var hiddenKeys: Record<string, boolean> = {};
    columns.forEach(function (c) { if (c.hidden) hiddenKeys[c.key] = true; });
    function shown(): DataTableColumn<T>[] { return columns.filter(function (c) { return !hiddenKeys[c.key]; }); }
    var storeKey = opts.widthKey ? 'base-data-widths:' + opts.widthKey : null;
    var widths = loadWidths(storeKey);
    var resizable = opts.resizable !== false;
    // The widest value of each column, in characters, measured from the cells drawn.
    var widest: Record<string, number> = {};

    // The Filtered List marks the selected row, so a row draws only its cells, with the checkbox in a cell of its own under multiple selection.
    function renderRow(row: T, index: number, check?: HTMLInputElement | null): HTMLElement {
        var key = keyOf(row);
        var el = make('div', 'base-data-row', { role: 'row', 'data-key': key });
        if (check) {
            var box = make('div', 'base-data-cell base-data-check', { role: 'cell' });
            box.appendChild(check);
            el.appendChild(box);
        }
        columns.forEach(function (column) {
            var cell = make('div', 'base-data-cell' + alignClass(column), { role: 'cell', 'data-column': column.key });
            if (hiddenKeys[column.key]) cell.hidden = true;
            var content = column.render ? column.render(row) : null;
            if (content === null || content === undefined) {
                var v = valueOf(row, column);
                cell.textContent = v === null || v === undefined ? '' : String(v);
            } else if (typeof content === 'string') {
                cell.textContent = content;
            } else {
                cell.appendChild(content);
            }
            el.appendChild(cell);
        });
        if (editing) {
            var name = columns.length ? toText(valueOf(row, columns[0])) : key;
            var editCell = make('div', 'base-data-cell base-data-edit-cell', { role: 'cell' });
            var button = iconButton('base-row-btn base-data-edit-btn', 'edit', fill(editing.editLabel || baseText('Base.EditValue'), name));
            button.addEventListener('click', function () { edit(key); });
            editCell.appendChild(button);
            el.appendChild(editCell);
            // The open editor is kept between draws, so a refresh keeps what was typed.
            if (editor && editor.key === key) {
                el.classList.add('editing');
                el.appendChild(editor.element);
            }
        }
        return el;
    }

    function rowOf(key: string): T | null {
        return base.getState().items.filter(function (r) { return keyOf(r) === key; })[0] || null;
    }

    function closeEditor(): void {
        if (!editor) return;
        var key = editor.key;
        runAll(editor.off);
        editor.group.destroy();
        editor.message.destroy();
        editor = null;
        base.redraw();
        var btn = list.element.querySelector<HTMLElement>('[data-key="' + key + '"] .base-data-edit-btn');
        if (btn) btn.focus();
    }

    function edit(rawKey: unknown): void {
        if (!editing) return;
        var key = toText(rawKey);
        var row = rowOf(key);
        if (!row) return;
        if (editor) closeEditor();
        var spec = editing;
        var values: Record<string, any> = {};
        spec.fields.forEach(function (f) { values[f.key] = fieldOf(row, f.key); });
        var element = make('div', 'base-data-editor', { role: 'cell' });
        var group = createFieldGroup(spec.fields, values, { element: make('div', 'base-field-group grid') });
        var message = createFieldMessage();
        var buttons = make('div', 'base-button-row base-data-editor-actions');
        var save = make('button', 'raised base-button primary small', { type: 'button' }, spec.saveText || baseText('Save'));
        var cancel = make('button', 'raised base-button secondary small', { type: 'button' }, spec.cancelText || baseText('ButtonCancel'));
        buttons.appendChild(save);
        buttons.appendChild(cancel);
        element.appendChild(group.element);
        element.appendChild(message.element);
        element.appendChild(buttons);
        var off = [
            listen(cancel, 'click', closeEditor),
            listen(element, 'keydown', function (e: KeyboardEvent) {
                if (e.key !== 'Escape') return;
                e.stopPropagation();
                closeEditor();
            }),
            listen(save, 'click', function () {
                if (!group.check(true)) {
                    var bad = group.firstInvalid();
                    if (bad) bad.focus();
                    return;
                }
                var current = rowOf(key) || row!;
                save.disabled = true;
                message.clear();
                Promise.resolve().then(function () { return spec.onSave(current, group.getValue()); }).then(function () {
                    if (editor && editor.element === element) closeEditor();
                }, function () {
                    save.disabled = false;
                    message.set('error', spec.failedText || baseText('Base.CouldNotSave'));
                });
            })
        ];
        editor = { key: key, element: element, group: group, message: message, off: off };
        base.redraw();
        group.focus();
    }

    // The headings exist before the list draws, since its first draw marks the sorted column.
    var headings: Record<string, HTMLElement> = {};
    var base = createFilteredList<T>({
        itemClass: opts.rowClass,
        render: renderRow,
        items: opts.rows || [],
        fetch: opts.fetch as any,
        search: opts.search ? { keys: opts.search.keys || columns.map(function (c) { return c.key; }), placeholder: opts.search.placeholder, label: opts.search.label } : false,
        filters: (opts.filters || []).map(function (f) { return { name: f.name, label: f.label, field: f.field, kind: 'select' as const, options: f.options }; }),
        filterValues: opts.filterValues,
        sort: opts.sort || null,
        sortValue: function (row, key) { var c = columnOf(key); return c ? valueOf(row, c) : fieldOf(row, key); },
        pageSize: opts.pageSize,
        rowKey: opts.rowKey === undefined ? 'id' : opts.rowKey,
        selectable: mode,
        selected: first,
        selectAllText: opts.selectAllText,
        selectedText: opts.selectedText,
        bulkActions: opts.bulkActions,
        actions: opts.actions,
        limit: opts.limit,
        limitText: opts.limitText,
        onOpen: opts.onOpen,
        onSelectionChange: function (keys, rows) {
            if (opts.onSelectionChange) opts.onSelectionChange(keys, rows);
            if (mode !== 'single') return;
            var key = keys.length ? keys[0] : null;
            var row = rows.length ? rows[0] : null;
            if (opts.onSelect) opts.onSelect(row, key);
            listeners.slice().forEach(function (fn) { fn(row, key); });
        },
        height: opts.height,
        maxHeight: opts.maxHeight,
        minHeight: opts.minHeight,
        listRole: 'rowgroup',
        wrap: false,
        emptyText: opts.emptyText,
        allText: opts.allText,
        summary: false,
        size: opts.size,
        onChange: function (state) {
            drawSort(state.query.sort);
            if (measure()) layout();
            if (opts.onChange) opts.onChange(state);
        }
    });
    var root = base.element;
    root.classList.add('base-data-table');
    if (opts.selectable) root.classList.add('selectable');
    // A column sized to its widest value, in characters, kept between the least text width and its limit.
    function fitTrack(column: DataTableColumn<T>): string {
        var chars = Math.max(widest[column.key] || 0, column.label.length + 3) + 1;
        return 'max(var(--base-data-min), min(' + chars + 'ch, ' + (column.maxWidth || 'var(--base-data-auto-max)') + '))';
    }
    function sized(column: DataTableColumn<T>): boolean {
        return widths[column.key] === 'fit' || (widths[column.key] === undefined && column.width === 'auto');
    }
    // Each column's track, and the least width it holds, so the header and rows never squeeze a column below it.
    function track(column: DataTableColumn<T>): { track: string; least: string } {
        var set = widths[column.key];
        if (typeof set === 'number') return { track: 'max(var(--base-size-medium), ' + Math.round(set) + 'px)', least: 'max(var(--base-size-medium), ' + Math.round(set) + 'px)' };
        if (sized(column)) { var fit = fitTrack(column); return { track: fit, least: fit }; }
        if (column.width) return { track: column.width, least: isLength(column.width) ? column.width : 'var(--base-data-min)' };
        if (narrow(column)) return { track: 'var(--base-data-number)', least: 'var(--base-data-number)' };
        return { track: 'minmax(var(--base-data-min), 1fr)', least: 'var(--base-data-min)' };
    }
    // The table is a Filtered List whose items are rows, framed by a header of column headings, on tracks of its shown columns.
    function layout(): void {
        var visible = shown();
        var tracks = visible.map(track);
        var least = tracks.map(function (t) { return t.least; });
        if (mode === 'multiple') least.unshift('var(--base-size-small)');
        if (editing) least.push('var(--base-size-small)');
        root.style.setProperty('--base-data-ends', String(visible.filter(function (c) { return narrow(c) && !c.width; }).length));
        root.style.setProperty('--base-data-texts', String(visible.filter(function (c) { return !narrow(c) && !c.width; }).length));
        root.style.setProperty('--base-data-gaps', String(Math.max(0, visible.length - (mode === 'multiple' ? 0 : 1) + (editing ? 1 : 0))));
        root.style.setProperty('--base-data-span', 'calc(' + (least.length ? least.join(' + ') : '0px') + ')');
        root.style.setProperty('--base-data-columns', (mode === 'multiple' ? 'var(--base-size-small) ' : '') + tracks.map(function (t) { return t.track; }).join(' ') + (editing ? ' var(--base-size-small)' : ''));
        visible.forEach(function (c) {
            var handle = handles[c.key];
            var set = widths[c.key];
            if (handle) handle.setAttribute('aria-valuenow', String(typeof set === 'number' ? Math.round(set) : Math.round(headingWidth(c.key))));
        });
    }
    // Reads the widest value of each sized column from the cells drawn, and reports whether any changed.
    function measure(): boolean {
        // The list draws once while it is built, before the table holds it.
        if (!list) return false;
        var changed = false;
        columns.forEach(function (column) {
            if (!sized(column)) return;
            var most = 0;
            list.element.querySelectorAll<HTMLElement>('.base-data-cell').forEach(function (cell) {
                if (cell.getAttribute('data-column') !== column.key) return;
                var text = (cell.textContent || '').trim();
                if (text.length > most) most = text.length;
            });
            if (widest[column.key] !== most) { widest[column.key] = most; changed = true; }
        });
        return changed;
    }
    function headingWidth(key: string): number {
        var cell = headings[key];
        if (!cell || !cell.getBoundingClientRect) return 0;
        return cell.getBoundingClientRect().width || 0;
    }
    var handles: Record<string, HTMLElement> = {};
    var list = base.list;
    list.element.classList.add('base-data-body');
    measure();
    layout();

    // The header of column headings sits over the rows in a grid, and follows them when they scroll sideways.
    var table = make('div', 'base-data-grid', { role: 'table', 'aria-label': opts.label || baseText('Base.Table') });
    var head = make('div', 'base-data-head', { role: 'row' });
    if (mode === 'multiple') head.appendChild(make('div', 'base-data-heading base-data-check', { role: 'columnheader' }));
    columns.forEach(function (column) {
        var cell = make('div', 'base-data-heading' + alignClass(column), { role: 'columnheader' });
        var text = make('span', 'base-data-label', null, column.label);
        var glyph = column.icon ? icon(column.icon) : null;
        if (glyph) { glyph.classList.add('base-data-glyph'); cell.classList.add('has-icon'); cell.title = column.label; }
        if (column.sortable === false) {
            if (glyph) cell.appendChild(glyph);
            cell.appendChild(text);
        } else {
            var button = make('button', 'base-data-sort', { type: 'button', 'data-key': column.key, 'aria-label': column.label });
            if (glyph) button.appendChild(glyph);
            button.appendChild(text);
            var arrow = icon('arrow_upward');
            arrow.classList.add('base-data-arrow');
            button.appendChild(arrow);
            cell.appendChild(button);
            cleanups.push(listen(button, 'click', function () { base.toggleSort(column.key); }));
        }
        if (hiddenKeys[column.key]) cell.hidden = true;
        headings[column.key] = cell;
        if (resizable) addHandle(column, cell);
        head.appendChild(cell);
    });
    if (editing) head.appendChild(make('div', 'base-data-heading base-data-edit-cell', { role: 'columnheader' }));
    root.insertBefore(table, list.element);
    table.appendChild(head);
    table.appendChild(list.element);
    // The rows scroll sideways inside their frame, and the header keeps level with them.
    cleanups.push(listen(list.element, 'scroll', function () {
        var left = list.element.scrollLeft;
        head.style.transform = left ? 'translateX(' + -left + 'px)' : '';
    }));

    function setWidth(key: string, width: DataTableWidth | null): void {
        var column = columnOf(key);
        if (!column) return;
        if (width === null || width === undefined) delete widths[key];
        else if (width === 'fit') widths[key] = 'fit';
        else if (typeof width === 'number' && isFinite(width)) widths[key] = Math.max(1, Math.round(width));
        else return;
        if (sized(column)) measure();
        saveWidths(storeKey, widths);
        layout();
        fit();
    }
    function currentWidth(key: string): number {
        var set = widths[key];
        return typeof set === 'number' ? set : headingWidth(key);
    }

    // The handle on a heading's right edge. A drag sets the width in pixels, and a double-click or Enter fits the column to its widest value.
    function addHandle(column: DataTableColumn<T>, cell: HTMLElement): void {
        cell.classList.add('resizable');
        var handle = make('span', 'base-data-resize', {
            role: 'separator', tabindex: '0', 'aria-orientation': 'vertical',
            'aria-label': fillLabel(opts.resizeText || baseText('Base.ResizeValue'), 'value', column.label)
        });
        handles[column.key] = handle;
        cell.appendChild(handle);
        var drag: { x: number; width: number; off: Array<() => void> } | null = null;
        function stop(): void {
            if (!drag) return;
            runAll(drag.off);
            drag = null;
            cell.classList.remove('resizing');
            saveWidths(storeKey, widths);
        }
        cleanups.push(stop);
        cleanups.push(listen(handle, 'pointerdown', function (e: PointerEvent) {
            if (e.button !== undefined && e.button !== 0) return;
            e.preventDefault();
            e.stopPropagation();
            stop();
            cell.classList.add('resizing');
            drag = {
                x: e.clientX || 0,
                width: currentWidth(column.key),
                off: [
                    listen(document, 'pointermove', function (m: PointerEvent) {
                        if (!drag) return;
                        widths[column.key] = Math.max(1, Math.round(drag.width + (m.clientX || 0) - drag.x));
                        layout();
                    }),
                    listen(document, 'pointerup', stop),
                    listen(document, 'pointercancel', stop)
                ]
            };
        }));
        cleanups.push(listen(handle, 'click', function (e: Event) { e.stopPropagation(); }));
        cleanups.push(listen(handle, 'dblclick', function (e: Event) {
            e.preventDefault();
            e.stopPropagation();
            setWidth(column.key, 'fit');
        }));
        cleanups.push(listen(handle, 'keydown', function (e: KeyboardEvent) {
            if (e.key !== 'Enter' || e.altKey) return;
            e.preventDefault();
            setWidth(column.key, 'fit');
        }));
        cleanups.push(listen(cell, 'keydown', function (e: KeyboardEvent) {
            var plain = e.target === handle && !e.ctrlKey && !e.metaKey;
            if (!e.altKey && !plain) return;
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
            e.preventDefault();
            e.stopPropagation();
            setWidth(column.key, currentWidth(column.key) + (e.key === 'ArrowRight' ? RESIZE_STEP : -RESIZE_STEP));
        }));
    }

    // A cell too narrow for its text shows the full text on hover, and loses it again once it fits.
    cleanups.push(listen(table, 'mouseover', function (e: MouseEvent) {
        var target = e.target as HTMLElement | null;
        var cell = target && target.closest ? target.closest<HTMLElement>('.base-data-cell') : null;
        if (!cell || cell.classList.contains('base-data-editor')) return;
        var ours = cell.hasAttribute('data-base-clipped');
        if (ours) { cell.removeAttribute('title'); cell.removeAttribute('data-base-clipped'); }
        if (cell.hasAttribute('title')) return;
        var text = (cell.textContent || '').trim();
        if (text && (cell.scrollWidth || 0) > (cell.clientWidth || 0) + 1) {
            cell.title = text;
            cell.setAttribute('data-base-clipped', '');
        }
    }));

    function drawSort(sort: DataSort | null): void {
        columns.forEach(function (column) {
            var cell = headings[column.key];
            if (!cell) return;
            var on = !!sort && sort.key === column.key;
            cell.setAttribute('aria-sort', on ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : 'none');
            cell.classList.toggle('sorted', on);
            cell.classList.toggle('desc', on && sort!.dir === 'desc');
        });
    }

    drawSort(opts.sort || null);

    // A table too narrow for its number columns at full width turns compact: narrower number columns and icon headings.
    function fit(): void {
        var ends = shown().filter(function (c) { return narrow(c) && !c.width; }).length;
        var width = root.clientWidth || 0;
        root.classList.toggle('compact', !!width && width < ends * 100 + 240);
    }
    if (typeof ResizeObserver !== 'undefined') {
        var watch = new ResizeObserver(fit);
        watch.observe(root);
        cleanups.push(function () { watch.disconnect(); });
    } else {
        cleanups.push(listen(window, 'resize', fit));
    }
    fit();

    function setColumnHidden(key: string, hidden: boolean): void {
        if (!columnOf(key) || !!hiddenKeys[key] === !!hidden) return;
        if (hidden) hiddenKeys[key] = true;
        else delete hiddenKeys[key];
        if (headings[key]) headings[key].hidden = !!hidden;
        list.element.querySelectorAll<HTMLElement>('.base-data-cell').forEach(function (cell) {
            if (cell.getAttribute('data-column') === key) cell.hidden = !!hidden;
        });
        layout();
        fit();
    }

    return {
        element: root,
        setRows: function (rows) { base.setItems(rows); },
        setSearch: function (text) { base.setSearch(text); },
        setFilter: function (name, values) { base.setFilter(name, values); },
        setSort: function (key, dir) { base.setSort(key, dir); },
        select: function (key) { base.setSelected(key === null || key === undefined ? [] : [key]); },
        getSelected: function () { var keys = base.getSelected(); return keys.length ? keys[0] : null; },
        getSelectedKeys: function () { return base.getSelected(); },
        getSelectedRows: function () { return base.getSelectedItems(); },
        setSelectedKeys: function (keys) { base.setSelected(keys); },
        clearSelection: function () { base.clearSelection(); },
        setFilterOptions: function (name, choices) { base.setFilterOptions(name, choices); },
        onSelect: function (listener) {
            listeners.push(listener);
            return function () { listeners = listeners.filter(function (fn) { return fn !== listener; }); };
        },
        setHeight: function (height, maxHeight) { base.setHeight(height, maxHeight); },
        getState: function () { return base.getState(); },
        reload: function () { base.reload(); },
        edit: edit,
        cancelEdit: closeEditor,
        getEditing: function () { return editor ? editor.key : null; },
        setColumnHidden: setColumnHidden,
        setColumnWidth: setWidth,
        getColumnWidths: function () { var out: Record<string, DataTableWidth> = {}; Object.keys(widths).forEach(function (k) { out[k] = widths[k]; }); return out; },
        destroy: function () {
            if (editor) { runAll(editor.off); editor.group.destroy(); editor.message.destroy(); editor = null; }
            runAll(cleanups);
            listeners = [];
            base.destroy();
        }
    };
}
