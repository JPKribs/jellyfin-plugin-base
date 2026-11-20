import { make, has, toText } from './lib/dom.js';
import { makeBadge, badgeColor } from './lib/badge.js';
import { buildControl, validationFor } from './lib/field-control.js';
import { bindValidation } from './lib/validate.js';
import type { ValidationHandle } from './lib/validate.js';
import type { FieldChoice, FieldControl } from './lib/field-control.js';
import { createFieldMessage } from './field-message.js';
import type { FieldMessageHandle } from './field-message.js';
import { createDataTable } from './data-table.js';
import type { DataTableColumn } from './data-table.js';
import type { ComponentHandle } from './types.js';
import { baseText, fillLabel } from './lib/base-text.js';

/**
 * One row of the grid: its key, its label, and a dimmed hint under the label. cells changes a cell of this row by column
 * key, such as its type, options, or unit, or null leaves that cell empty.
 */
export interface MatrixGridRow {
    key: string;
    label: string;
    hint?: string;
    cells?: Record<string, Partial<MatrixGridColumn> | null>;
}

/**
 * One column: its key, its header, an icon the header shows when the grid is narrow, and the control in each of its
 * cells. badge and static cells show their value and take no input. unit is a number's fixed suffix inside its box, and
 * disabled greys out the control so it shows its value and takes no input, as a row's cells can do for one cell.
 */
export interface MatrixGridColumn {
    key: string;
    label: string;
    icon?: string;
    type?: 'toggle' | 'select' | 'number' | 'text' | 'time' | 'badge' | 'static';
    options?: FieldChoice[];
    min?: number;
    max?: number;
    step?: number;
    placeholder?: string;
    unit?: string;
    hidden?: boolean;
    disabled?: boolean;
}

/** A badge cell's value: its label, or { label, color } where color is a status color name, a hex code, or a badge state name. */
export type MatrixGridBadge = string | { label: string; color?: string };

/** Every cell's value, by row key and then column key. */
export type MatrixGridValue = Record<string, Record<string, unknown>>;

/** What createMatrixGrid takes. */
export interface MatrixGridOptions {
    rows: MatrixGridRow[];
    columns: MatrixGridColumn[];
    value?: MatrixGridValue | null;
    rowHeader?: string;
    cellLabel?: string;
    label?: string;
    emptyText?: string;
    size?: 'small' | 'medium' | 'large';
    note?: string;
    onChange?(value: MatrixGridValue, rowKey: string, columnKey: string): void;
}

/** What createMatrixGrid returns. setRows draws other rows and keeps every value. isValid checks every cell and shows its message. */
export interface MatrixGridHandle extends ComponentHandle {
    getValue(): MatrixGridValue;
    setValue(next: MatrixGridValue | null): void;
    setRows(rows: MatrixGridRow[] | null): void;
    isValid(): boolean;
    setColumnHidden(key: string, hidden: boolean): void;
    destroy(): void;
}

// MatrixCell
// The control and message of one drawn cell.
interface MatrixCell {
    row: string;
    column: MatrixGridColumn;
    disabled: boolean;
    control: FieldControl;
    message: FieldMessageHandle;
    binding: ValidationHandle | null;
}

/**
 * A grid of row labels, each with a hint, by column headers, with a control in each cell: a toggle, a select, a number
 * box, a text box, or a time box, or a read only badge or text. It is a Data Table whose cells hold controls, so it shares
 * its column tracks, its compact layout with icon headings, its hidden columns, and its sideways scroll inside its frame.
 *
 * @param options {
 *   rows      : array of { key, label, hint, cells (by column key, part of a column that changes this row's cell, or null for an empty cell) } [required]
 *   columns   : array of { key, label, icon, type ('toggle', 'select', 'number', 'text', 'time', or the read only 'badge' and 'static'; default 'toggle'), options, min, max, step, placeholder, unit (a number's suffix inside its box), hidden (default false), disabled (greys out the cells, which keep their value; default false) } [required]
 *   value     : object of row key to an object of column key to value [optional]
 *   rowHeader : header of the label column (default '')
 *   cellLabel : aria-label of a cell's control, where {column} and {row} are the labels (default '{column} for {row}')
 *   label     : aria-label of the grid (default 'Grid')
 *   emptyText : shown while there is no row (default 'Nothing to show.')
 *   size      : 'small', 'medium', or 'large' for its fields (default 'medium')
 *   note      : a dimmed line under the grid [optional]
 *   onChange  : function(value, rowKey, columnKey) after a cell changes [optional]
 * }
 * @returns { element, getValue, setValue, setRows, isValid, setColumnHidden, destroy }. A badge cell's value is its label or { label, color }, and a static cell's is its text. Neither changes, and isValid skips them, disabled cells, and hidden columns.
 */
export function createMatrixGrid(options: MatrixGridOptions): MatrixGridHandle {
    var opts = options || ({ rows: [], columns: [] } as unknown as MatrixGridOptions);
    var columns = opts.columns || [];
    var values: MatrixGridValue = {};
    var cells: MatrixCell[] = [];

    function put(row: string, column: string, value: unknown): void {
        if (!has(values, row)) Object.defineProperty(values, row, { value: {}, enumerable: true, writable: true, configurable: true });
        Object.defineProperty(values[row], column, { value: value, enumerable: true, writable: true, configurable: true });
    }

    function read(row: string, column: string): unknown {
        return has(values, row) && has(values[row], column) ? values[row][column] : undefined;
    }

    function check(cell: MatrixCell): boolean {
        if (cell.disabled) return true;
        return cell.binding ? cell.binding.check() : true;
    }

    function drop(cell: MatrixCell): void {
        if (cell.binding) cell.binding.destroy();
        cell.control.destroy();
        cell.message.destroy();
    }

    function labelCell(row: MatrixGridRow): HTMLElement {
        var box = make('span', 'base-matrix-label');
        box.appendChild(make('span', 'base-matrix-name', { title: row.label }, row.label));
        if (row.hint) box.appendChild(make('span', 'base-matrix-hint', { title: row.hint }, row.hint));
        return box;
    }

    // A row's own part of a column replaces that column's settings for its one cell, and null leaves the cell empty.
    function specOf(row: MatrixGridRow, column: MatrixGridColumn): MatrixGridColumn | null {
        if (!row.cells || !has(row.cells, column.key)) return column;
        var part = row.cells[column.key];
        return part ? Object.assign({}, column, part, { key: column.key, label: column.label }) : null;
    }

    function readOnlyCell(type: string, value: unknown): HTMLElement {
        var box = make('span', 'base-matrix-cell base-matrix-' + type);
        if (value === undefined || value === null || value === '') return box;
        if (type === 'badge') {
            var badge = value as { label?: unknown; color?: unknown };
            var label = typeof value === 'object' ? badge.label : value;
            box.appendChild(makeBadge(label, badgeColor(typeof value === 'object' ? badge.color : null, 'gray')));
        } else {
            var text = toText(value);
            box.appendChild(make('span', 'base-matrix-text', { title: text }, text));
        }
        return box;
    }

    function controlCell(row: MatrixGridRow, base: MatrixGridColumn): HTMLElement {
        var own = specOf(row, base);
        if (!own) return make('span', 'base-matrix-cell base-matrix-empty');
        var column: MatrixGridColumn = own;
        var type = column.type || 'toggle';
        if (type === 'badge' || type === 'static') return readOnlyCell(type, read(row.key, column.key));
        var name = fillLabel(opts.cellLabel || baseText('Base.ColumnForRow'), 'column', column.label).replace(/\{row\}/g, row.label);
        var start = read(row.key, column.key);
        var cell = {} as MatrixCell;
        var control = buildControl({ key: column.key, label: column.label, type: type, options: column.options, min: column.min, max: column.max, step: column.step, placeholder: column.placeholder, unit: column.unit }, start, function () {
            put(row.key, column.key, control.getValue());
            if (opts.onChange) opts.onChange(getValue(), row.key, column.key);
        }, name);
        if (start === undefined) put(row.key, column.key, control.getValue());
        var message = createFieldMessage({ input: control.input });
        cell.row = row.key;
        cell.column = column;
        cell.disabled = !!column.disabled;
        if (cell.disabled) control.element.querySelectorAll<HTMLInputElement>('input, select, textarea, button').forEach(function (el) { el.disabled = true; });
        cell.control = control;
        cell.message = message;
        // A cell checks through the validation core, so validateAll on a form around the grid checks it too.
        var spec = { key: column.key, label: column.label, type: type, min: column.min, max: column.max };
        cell.binding = control.input && control.input.tagName !== 'BUTTON' ? bindValidation(control.input, Object.assign(validationFor(spec, function () { return control.getValue(); }, function () { return { item: values[row.key] || {}, index: 0 }; }), { message: message })) : null;
        cells.push(cell);
        var box = make('span', 'base-matrix-cell' + (cell.disabled ? ' disabled' : ''));
        box.appendChild(control.element);
        box.appendChild(message.element);
        return box;
    }

    var tableColumns: DataTableColumn<MatrixGridRow>[] = [{ key: 'label', label: opts.rowHeader || '', sortable: false, render: labelCell }];
    columns.forEach(function (column) {
        var type = column.type || 'toggle';
        tableColumns.push({
            key: column.key,
            label: column.label,
            icon: column.icon,
            hidden: column.hidden,
            sortable: false,
            align: type === 'toggle' ? 'center' : 'start',
            render: function (row) { return controlCell(row, column); }
        });
    });

    var table = createDataTable<MatrixGridRow>({
        columns: tableColumns,
        rows: [],
        rowKey: 'key',
        label: opts.label || baseText('Base.Grid'),
        emptyText: opts.emptyText || baseText('Base.NothingToShow'),
        size: opts.size,
        resizable: false
    });
    var root = table.element;
    root.classList.add('base-matrix-grid');
    // A unit takes room inside its box, so a grid with one gives its columns a wider floor and scrolls sideways before it hides digits.
    if (columns.some(function (c) { return !!c.unit; }) || (opts.rows || []).some(function (r) { return !!r.cells && Object.keys(r.cells).some(function (k) { var part = r.cells![k]; return !!(part && part.unit); }); })) root.classList.add('has-units');
    var hidden: Record<string, boolean> = {};
    columns.forEach(function (c) { if (c.hidden) hidden[c.key] = true; });
    if (opts.note) root.appendChild(make('div', 'fieldDescription base-matrix-note', null, opts.note));

    function getValue(): MatrixGridValue {
        var out: MatrixGridValue = {};
        Object.keys(values).forEach(function (r) {
            Object.defineProperty(out, r, { value: Object.assign({}, values[r]), enumerable: true, writable: true, configurable: true });
        });
        return out;
    }

    function setRows(next: MatrixGridRow[] | null | undefined): void {
        var rows = (Array.isArray(next) ? next : []).filter(function (r) { return r && r.key !== undefined && r.key !== null; });
        cells.forEach(drop);
        cells = [];
        // Rows are drawn again in full, since their controls read the values when drawn.
        table.setRows([]);
        table.setRows(rows.map(function (r) { return { key: String(r.key), label: String(r.label === undefined ? r.key : r.label), hint: r.hint, cells: r.cells }; }));
    }

    var current: MatrixGridRow[] = opts.rows || [];

    function setValue(next: MatrixGridValue | null | undefined): void {
        values = {};
        if (next && typeof next === 'object') Object.keys(next).forEach(function (r) {
            var row = next[r];
            if (row && typeof row === 'object') Object.keys(row).forEach(function (c) { put(r, c, row[c]); });
        });
        setRows(current);
    }

    setValue(opts.value);

    return {
        element: root,
        getValue: getValue,
        setValue: setValue,
        setRows: function (next) { current = next || []; setRows(current); },
        isValid: function () { return cells.filter(function (c) { return !hidden[c.column.key]; }).map(check).every(Boolean); },
        setColumnHidden: function (key, on) {
            if (on) hidden[key] = true;
            else delete hidden[key];
            // A hidden cell keeps no message, so a column shown again starts clean.
            cells.forEach(function (c) { if (c.column.key === key && on && c.binding) c.binding.clear(); });
            table.setColumnHidden(key, on);
        },
        destroy: function () {
            cells.forEach(drop);
            cells = [];
            table.destroy();
        }
    };
}
