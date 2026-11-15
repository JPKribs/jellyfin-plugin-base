import { make, icon, listen, runAll, toText } from './lib/dom.js';
import { createDataTable } from './data-table.js';
import type { DataTableColumn } from './data-table.js';
import type { ListHeight } from './list.js';
import type { ComponentHandle } from './types.js';

/** One compared property: its key, its label, and its value in each column by column key. */
export interface CompareTableRow {
    key: string;
    label: string;
    values: Record<string, unknown>;
}

/** A heading row across every column that groups the rows after it, up to the next heading. key names it, else one is made. */
export interface CompareTableSection {
    section: string;
    key?: string;
}

/** A dimmed text row across every column, such as why a group changed. It shows while the row before it shows. */
export interface CompareTableNote {
    note: string;
    key?: string;
}

/** One entry of a compare table: a compared row, a section heading, or a note. */
export type CompareTableEntry = CompareTableRow | CompareTableSection | CompareTableNote;

/** One column of values, such as the source, the local copy, or the result after a sync. */
export interface CompareTableColumn {
    key: string;
    label: string;
    icon?: string;
}

/** What createCompareTable takes. onlyChanges starts with only the changed rows shown. */
export interface CompareTableOptions {
    rows?: CompareTableEntry[] | null;
    columns?: CompareTableColumn[] | null;
    propertyHeader?: string;
    onlyChanges?: boolean;
    changesText?: string;
    emptyText?: string;
    noChangesText?: string;
    missingText?: string;
    label?: string;
    height?: ListHeight;
    maxHeight?: number | string | null;
    size?: 'small' | 'medium' | 'large';
    onChange?(onlyChanges: boolean): void;
}

/** What createCompareTable returns. setOnlyChanges shows only the changed rows, or every row. */
export interface CompareTableHandle extends ComponentHandle {
    setRows(rows: CompareTableEntry[] | null): void;
    getOnlyChanges(): boolean;
    setOnlyChanges(on: boolean): void;
    getChanged(): string[];
    destroy(): void;
}

// A drawn line: a compared row, or a section or note that spans every column.
interface Line extends CompareTableRow {
    kind: 'row' | 'section' | 'note';
}

var DEFAULT_COLUMNS: CompareTableColumn[] = [{ key: 'source', label: 'Source' }, { key: 'local', label: 'Local' }, { key: 'after', label: 'After Sync' }];

/**
 * A table of properties by columns of values, such as source, local, and after sync. A row whose values differ is
 * changed: it wears the accent wash, and each value that differs from the first column is marked. A Show Only Changes
 * toggle hides the rows that match. It is a Data Table with no sort, search, or selection. A section row heads the
 * rows after it and a note row adds a line of detail, each across every column. With only changes shown, a section
 * hides while no row under it shows, and a note shows only while the row before it shows.
 *
 * @param options {
 *   rows           : array of { key, label, values: { columnKey: value } }, { section } for a heading over the rows after it, or { note } for a dimmed line across every column [optional]
 *   columns        : array of { key, label, icon } (default Source, Local, and After Sync, keyed source, local, and after)
 *   propertyHeader : header of the property column (default 'Property')
 *   onlyChanges    : true starts with only the changed rows shown (default false)
 *   changesText    : label of the toggle (default 'Show Only Changes')
 *   emptyText      : shown while there is no row (default 'Nothing to compare.')
 *   noChangesText  : shown while only changes are shown and none changed (default 'No changes.')
 *   missingText    : shown for a missing value (default 'None')
 *   label          : aria-label of the table (default 'Comparison')
 *   height, maxHeight : the rows' height, as the Data Table takes it (default 'auto')
 *   size           : 'small', 'medium', or 'large' for its fields (default 'medium')
 *   onChange       : function(onlyChanges) after the toggle changes [optional]
 * }
 * @returns { element, setRows, getOnlyChanges, setOnlyChanges, getChanged, destroy }. getChanged gives the keys of the changed rows.
 */
export function createCompareTable(options?: CompareTableOptions): CompareTableHandle {
    var opts = options || {};
    var columns = opts.columns && opts.columns.length ? opts.columns : DEFAULT_COLUMNS;
    var all: Line[] = [];
    var only = opts.onlyChanges === true;
    var cleanups: Array<() => void> = [];

    function text(value: unknown): string {
        if (value === null || value === undefined || value === '') return '';
        return typeof value === 'object' ? JSON.stringify(value) : String(value);
    }

    function changed(row: Line): boolean {
        if (row.kind !== 'row') return false;
        var first = text(row.values[columns[0].key]);
        return columns.some(function (c) { return text(row.values[c.key]) !== first; });
    }

    function valueCell(row: Line, column: CompareTableColumn, index: number): HTMLElement | string {
        if (row.kind !== 'row') return '';
        var value = text(row.values ? row.values[column.key] : undefined);
        var differs = index > 0 && value !== text(row.values[columns[0].key]);
        var cell = make('span', 'base-compare-value' + (differs ? ' differs' : '') + (value === '' ? ' missing' : ''), { title: value });
        cell.textContent = value === '' ? (opts.missingText || 'None') : value;
        return cell;
    }

    // A section or note draws its text in the first cell, which spans every column once mark sets its class.
    function labelCell(row: Line): HTMLElement | string {
        if (row.kind === 'row') return row.label;
        return make('span', row.kind === 'section' ? 'base-compare-section-text' : 'base-compare-note-text', { title: row.label }, row.label);
    }

    var tableColumns: DataTableColumn<Line>[] = [{ key: 'label', label: opts.propertyHeader || 'Property', sortable: false, render: labelCell }];
    columns.forEach(function (column, i) {
        tableColumns.push({ key: column.key, label: column.label, icon: column.icon, sortable: false, render: function (row) { return valueCell(row, column, i); } });
    });

    var table = createDataTable<Line>({
        columns: tableColumns,
        rows: [],
        rowKey: 'key',
        label: opts.label || 'Comparison',
        emptyText: opts.emptyText || 'Nothing to compare.',
        height: opts.height,
        maxHeight: opts.maxHeight,
        size: opts.size,
        onChange: mark
    });
    var root = table.element;
    root.classList.add('base-compare-table');

    // The toggle sits in the table's own toolbar, as the Filtered List lets a variation add its controls.
    var toolbar = root.querySelector<HTMLElement>('.base-filtered-toolbar');
    var toggle = make('button', 'base-toggle base-compare-toggle', { type: 'button', 'aria-pressed': only ? 'true' : 'false' });
    var mark0 = icon('check');
    toggle.appendChild(mark0);
    toggle.appendChild(make('span', '', null, opts.changesText || 'Show Only Changes'));
    if (toolbar) toolbar.appendChild(toggle);
    else root.insertBefore(toggle, root.firstChild);
    cleanups.push(listen(toggle, 'click', function () {
        setOnly(!only);
        if (opts.onChange) opts.onChange(only);
    }));

    // Marks each drawn row that changed with the accent wash, and each section and note row as one cell across the table.
    function mark(): void {
        if (!root) return;
        var kinds: Record<string, string> = {};
        all.forEach(function (r) { kinds[r.key] = changed(r) ? 'changed' : r.kind; });
        Array.prototype.forEach.call(root.querySelectorAll('.base-data-row'), function (el: HTMLElement) {
            var kind = kinds[toText(el.getAttribute('data-key'))];
            el.classList.toggle('changed', kind === 'changed');
            el.classList.toggle('base-compare-section', kind === 'section');
            el.classList.toggle('base-compare-note', kind === 'note');
        });
    }

    // The lines to draw. A section shows while a row under it shows, and a note while the line before it shows.
    function visible(): Line[] {
        var shown = all.map(function (r) { return r.kind === 'row' && (!only || changed(r)); });
        all.forEach(function (r, i) {
            if (r.kind !== 'section') return;
            for (var j = i + 1; j < all.length && all[j].kind !== 'section'; j++) {
                if (shown[j]) { shown[i] = true; return; }
            }
        });
        all.forEach(function (r, i) {
            if (r.kind === 'note') shown[i] = i > 0 ? shown[i - 1] : !only;
        });
        return all.filter(function (r, i) { return shown[i]; });
    }

    function draw(): void {
        var shown = visible();
        var empty = root.querySelector<HTMLElement>('.base-list-empty');
        if (empty) empty.textContent = only && all.length ? (opts.noChangesText || 'No changes.') : (opts.emptyText || 'Nothing to compare.');
        table.setRows(shown);
        mark();
    }

    function setOnly(on: boolean): void {
        only = !!on;
        toggle.setAttribute('aria-pressed', only ? 'true' : 'false');
        mark0.hidden = !only;
        draw();
    }

    function setRows(next: CompareTableEntry[] | null | undefined): void {
        all = [];
        (Array.isArray(next) ? next : []).forEach(function (entry, i) {
            if (!entry) return;
            var e = entry as CompareTableRow & CompareTableSection & CompareTableNote;
            var kind: Line['kind'] = e.section !== undefined && e.section !== null ? 'section' : e.note !== undefined && e.note !== null ? 'note' : 'row';
            if (kind === 'row') {
                if (e.key === undefined || e.key === null) return;
                all.push({ kind: kind, key: String(e.key), label: String(e.label === undefined ? e.key : e.label), values: e.values || {} });
                return;
            }
            // A section or note without a key takes one from its kind and place.
            var key = e.key === undefined || e.key === null ? 'base-compare-' + kind + '-' + i : String(e.key);
            all.push({ kind: kind, key: key, label: toText(kind === 'section' ? e.section : e.note), values: {} });
        });
        draw();
    }

    mark0.hidden = !only;
    setRows(opts.rows);

    return {
        element: root,
        setRows: setRows,
        getOnlyChanges: function () { return only; },
        setOnlyChanges: setOnly,
        getChanged: function () { return all.filter(changed).map(function (r) { return r.key; }); },
        destroy: function () { runAll(cleanups); table.destroy(); }
    };
}
