import { make, listen, runAll, fillAll, toText, applyFieldSize } from './lib/dom.js';
import { createRowSet, rowLabel, moveButtons, refocusAfterMove } from './lib/row-editor.js';
import type { RowSetRow } from './lib/row-editor.js';
import { createFieldGroup, isEmptyValue } from './lib/field-control.js';
import type { FieldSpec, FieldGroupHandle, FieldChoice, FieldType, FieldControlParts } from './lib/field-control.js';
import type { ListHeight } from './list.js';
import type { ComponentHandle } from './types.js';

/**
 * One field of a repeater row. type picks the control: a text box, a secret with its three states and allowExpose,
 * the form select with options, a number with min, max, and step, the tag input, a time box, a toggle, or a custom
 * control from render(value, change). validate(value, item, index) returns an error sentence, or an empty value when
 * the value is valid. width is the field's grid track in the inline layout, such as '2fr' or '8rem'. hidden carries a
 * value with no control, visible(item) shows the field only in the rows it returns true for, labelFor(item) gives a label
 * that follows the row, clearable adds a Clear button to a stored secret, and transform(text) rewrites text as it is typed.
 */
export type RepeaterField = FieldSpec;

/** The kinds of control a repeater field can be. */
export type RepeaterFieldType = FieldType;

/** One choice of a select field, as { value, label } or as plain text. */
export type RepeaterChoice = FieldChoice;

/** What a custom field's render returns: its element, the input its label names, and how to read and set its value. */
export type RepeaterControl = FieldControlParts;

/** One row of a repeater, as an object of field values by key. */
export type RepeaterItem = Record<string, any>;

/** What createRepeater takes. layout 'inline' draws each item as one row of fields, and 'card' as a boxed card with a title and its fields in a grid. */
export interface RepeaterOptions {
    fields: RepeaterField[];
    layout?: 'inline' | 'card';
    value?: RepeaterItem[] | null;
    addText?: string;
    removeText?: string;
    upText?: string;
    downText?: string;
    rowName?: string;
    titleText?: string;
    showLabels?: boolean;
    maxRows?: number;
    minRows?: number;
    limitText?: string;
    reorder?: boolean;
    emptyText?: string;
    height?: ListHeight;
    maxHeight?: number | string | null;
    minHeight?: number | string | null;
    size?: 'small' | 'medium' | 'large';
    newItem?(): RepeaterItem | null | undefined;
    onChange?(value: RepeaterItem[]): void;
}

/** What createRepeater returns. isValid checks every field, shows every message, and moves focus to the first invalid one. */
export interface RepeaterHandle extends ComponentHandle {
    getValue(): RepeaterItem[];
    setValue(next: RepeaterItem[] | null): void;
    setItems(next: RepeaterItem[] | null): void;
    addRow(item?: RepeaterItem | null): boolean;
    isValid(): boolean;
    setHeight(height: ListHeight, maxHeight?: number | string | null): void;
    destroy(): void;
}

/**
 * The classes and behavior a variation built on the repeater sets, such as the Key Value Editor's own class names.
 * Internal to the web components.
 */
export interface RepeaterParts {
    rootClass?: string;
    headClass?: string;
    rowsClass?: string;
    rowClass?: string;
    addClass?: string;
    removeClass?: string;
    emptyClass?: string;
    cellClass?: Record<string, string>;
    eager?: boolean;
    onRowChange?(row: RepeaterRow, key: string | null): void;
}

/** One drawn row of a repeater, with its field group. Internal to the web components. */
export interface RepeaterRow extends RowSetRow {
    group: FieldGroupHandle;
    extra(): RepeaterItem;
    title: HTMLElement | null;
    label(): void;
    destroy(): void;
}

/** What buildRepeater returns: the handle, the rows, and a check that may leave focus alone. Internal to the web components. */
export interface RepeaterBuild extends RepeaterHandle {
    rows(): RepeaterRow[];
    checkAll(focus: boolean): boolean;
    changed(): void;
}

/**
 * The base for any list of rows or cards of mixed fields, built on the row editor core. Each item is a row of fields,
 * or a card with a title and its fields in a grid. Rows add and remove, keep minRows and maxRows, and move up and down
 * with reorder. Every field validates through the field core, with its message under it.
 *
 * @param options {
 *   fields     : array of { key, label, type ('text', 'secret', 'select', 'number', 'tags', 'time', 'toggle', or 'custom'), options, placeholder, required, requiredText, min, max, step, allowExpose, width, hidden (true carries the value with no control), visible(item), labelFor(item), clearable (a Clear button on a stored secret), clearText (default 'Clear {value}'), transform(text), validate(value, item, index), render(value, change) } [required]
 *   layout     : 'inline' for one row of fields per item, or 'card' for a boxed card per item (default 'inline')
 *   value      : array of items, each an object of values by field key [optional]
 *   addText    : text of the add button (default 'Add')
 *   removeText : aria-label of a remove button, where {value} is the row's name (default 'Remove {value}')
 *   upText, downText : aria-labels of the move buttons, where {value} is the row's name (default 'Move {value} up' and 'Move {value} down')
 *   rowName    : prefix of the name of an inline row whose first text field is empty (default 'Row')
 *   titleText  : a card's title, where {index} is its number and {key} any field's value (default 'Item {index}')
 *   showLabels : false hides the column labels over inline rows (default true)
 *   maxRows    : most rows allowed, after which Add is disabled and limitText shows [optional]
 *   minRows    : fewest rows, below which Remove is disabled, and up to which empty rows are added [optional]
 *   limitText  : message when maxRows is reached (default 'No more rows can be added.')
 *   reorder    : true adds up and down buttons to each row (default false)
 *   emptyText  : sentence shown while there is no row [optional]
 *   height, maxHeight, minHeight : the rows' height, as createList takes it (default 'auto')
 *   size       : 'small', 'medium', or 'large' for its fields (default 'medium')
 *   newItem    : function() returning the values a new row starts with, for Add and addRow() [optional]
 *   onChange   : function(value) after each change [optional]
 * }
 * @returns { element, getValue, setValue, setItems, addRow, isValid, setHeight, destroy }. getValue leaves out a row whose fields are all empty, and keeps each item's keys that no field shows, such as an id.
 */
export function createRepeater(options: RepeaterOptions): RepeaterHandle {
    var built = buildRepeater(options, null);
    return {
        element: built.element,
        getValue: built.getValue,
        setValue: built.setValue,
        setItems: built.setItems,
        addRow: built.addRow,
        isValid: built.isValid,
        setHeight: built.setHeight,
        destroy: built.destroy
    };
}

/**
 * Builds a repeater with a variation's class names and hooks, for the Key Value Editor and the Rule Builder.
 * Internal to the web components.
 *
 * @param options the repeater options
 * @param parts the variation's classes and hooks, or null
 */
export function buildRepeater(options: RepeaterOptions, parts: RepeaterParts | null): RepeaterBuild {
    var opts = options || ({ fields: [] } as RepeaterOptions);
    var p = parts || {};
    var allFields = opts.fields || [];
    // A hidden field draws nothing, so the columns and the head are of the fields shown.
    var fields = allFields.filter(function (f) { return !f.hidden; });
    var card = opts.layout === 'card';
    var cleanups: Array<() => void> = [];

    var root = make('div', 'base-repeater ' + (card ? 'base-repeater-layout-card' : 'base-repeater-layout-inline') + (p.rootClass ? ' ' + p.rootClass : ''));
    applyFieldSize(root, opts.size);
    root.style.setProperty('--base-repeater-columns', fields.map(function (f) { return f.width || (f.type === 'toggle' ? 'max-content' : 'minmax(0, 1fr)'); }).join(' '));
    root.style.setProperty('--base-repeater-buttons', String(1 + (opts.reorder ? 2 : 0)));
    var head: HTMLElement | null = null;
    if (!card) {
        head = make('div', 'base-repeater-head' + (p.headClass ? ' ' + p.headClass : ''));
        fields.forEach(function (f) { head!.appendChild(make('span', '', null, f.label)); });
        head.hidden = opts.showLabels === false;
        root.appendChild(head);
    }
    var body = make('div', 'base-repeater-rows' + (p.rowsClass ? ' ' + p.rowsClass : ''));
    var addButton = make('button', 'raised base-button small base-repeater-add' + (p.addClass ? ' ' + p.addClass : ''), { type: 'button' }, opts.addText || 'Add');
    var set = createRowSet<RepeaterItem, RepeaterRow>({
        body: body,
        build: buildRow,
        addButton: addButton,
        maxRows: opts.maxRows,
        minRows: opts.minRows,
        limitText: opts.limitText,
        emptyText: opts.emptyText,
        emptyClass: p.emptyClass || 'base-repeater-empty',
        height: opts.height,
        maxHeight: opts.maxHeight,
        minHeight: opts.minHeight,
        onChange: changed
    });
    root.appendChild(body);
    root.appendChild(set.empty);
    root.appendChild(addButton);
    root.appendChild(set.limit);

    function nameOf(row: RepeaterRow, index: number): string {
        var values = row.group.getValue();
        if (card) return fillAll(opts.titleText || 'Item {index}', Object.assign({}, values, { index: index + 1 }));
        var first = fields.filter(function (f) { return !f.type || f.type === 'text'; })[0];
        var text = first ? toText(values[first.key]).trim() : '';
        return text || ((opts.rowName || 'Row') + ' ' + (index + 1));
    }

    function buildRow(data: RepeaterItem | null | undefined): RepeaterRow {
        var el = make('div', p.rowClass || (card ? 'base-repeater-card' : 'base-repeater-row'));
        var actions = make('div', 'base-repeater-actions');
        var title: HTMLElement | null = null;
        var holder: HTMLElement = el;
        if (card) {
            var cardHead = make('div', 'base-repeater-card-head');
            title = make('span', 'base-repeater-card-title');
            cardHead.appendChild(title);
            cardHead.appendChild(actions);
            el.appendChild(cardHead);
            holder = make('div', 'base-field-group grid');
            el.appendChild(holder);
        }
        var remove = make('button', 'base-row-btn' + (p.removeClass ? ' ' + p.removeClass : ' base-repeater-remove'), { type: 'button' });
        remove.appendChild(make('span', 'material-icons', { 'aria-hidden': 'true' }, 'close'));
        var row = {} as RepeaterRow;
        var start = data === null || data === undefined ? (opts.newItem ? opts.newItem() : null) : data;
        // The keys no field shows ride along with the row, so an id or a name it was saved under is never lost.
        var extra: RepeaterItem = {};
        if (start && typeof start === 'object') {
            Object.keys(start).forEach(function (k) {
                if (!allFields.some(function (f) { return f.key === k; })) extra[k] = start![k];
            });
        }
        var group = createFieldGroup(allFields, start, {
            element: holder,
            eager: p.eager,
            keepPlace: !card,
            cellClass: p.cellClass,
            context: function () { return { item: group.getValue(), index: set.rows().indexOf(row) }; },
            onChange: function (key) { rowChanged(row, key); }
        });
        var arrows = opts.reorder ? moveButtons({ index: 0, count: 1, name: '' }) : [];
        var off: Array<() => void> = [];
        arrows.forEach(function (btn) {
            actions.appendChild(btn);
            off.push(listen(btn, 'click', function () {
                var from = set.rows().indexOf(row);
                var to = from + Number(btn.getAttribute('data-move'));
                set.move(from, to);
                refocusAfterMove(body, from, to);
            }));
        });
        actions.appendChild(remove);
        if (!card) el.appendChild(actions);
        var focusTarget = group.cells.map(function (c) { return c.control.input; }).filter(Boolean)[0] as HTMLElement | undefined;
        row.element = el;
        row.focus = focusTarget || remove;
        row.remove = remove;
        row.off = off;
        row.group = group;
        row.extra = function () { return extra; };
        row.title = title;
        row.label = function () {
            var all = set.rows();
            var index = all.indexOf(row);
            if (index === -1) index = all.length;
            var name = nameOf(row, index);
            var text = rowLabel(opts.removeText, 'Remove {value}', name);
            remove.title = text;
            remove.setAttribute('aria-label', text);
            if (title) title.textContent = name;
            arrows.forEach(function (btn) {
                var up = btn.getAttribute('data-move') === '-1';
                var label = rowLabel(up ? opts.upText : opts.downText, up ? 'Move {value} up' : 'Move {value} down', name);
                btn.setAttribute('aria-label', label);
                btn.disabled = up ? index <= 0 : index >= all.length - 1;
            });
        };
        row.destroy = function () { group.destroy(); };
        if (p.onRowChange) p.onRowChange(row, null);
        return row;
    }

    function rowChanged(row: RepeaterRow, key: string | null): void {
        if (p.onRowChange) p.onRowChange(row, key);
        if (row.label) row.label();
        changed();
    }

    // A row is blank when every field it shows is empty, whatever it carries.
    function blank(item: RepeaterItem): boolean {
        return fields.every(function (f) { return isEmptyValue(item[f.key]); });
    }

    function getValue(): RepeaterItem[] {
        return set.rows().map(function (r) { return Object.assign({}, r.extra(), r.group.getValue()); }).filter(function (item) { return !blank(item); });
    }

    // Checks every row again, since a field's validate may read the other rows, then reports the value.
    function changed(): void {
        set.rows().forEach(function (r) { r.group.check(false); });
        if (opts.onChange) opts.onChange(getValue());
    }

    function checkAll(focus: boolean): boolean {
        var rows = set.rows();
        var ok = rows.map(function (r) { return r.group.check(true); }).every(Boolean);
        if (!ok && focus) {
            var bad = rows.map(function (r) { return r.group.firstInvalid(); }).filter(Boolean)[0];
            if (bad) bad.focus();
        }
        return ok;
    }

    function setValue(next: RepeaterItem[] | null | undefined): void {
        set.set(Array.isArray(next) ? next : []);
        set.rows().forEach(function (r) { r.group.check(false); });
    }

    // An inline repeater too narrow for its fields side by side stacks each row's fields, each under its label.
    if (!card) {
        // Each field needs room for a short value, and a toggle only the room of its box.
        var needed = fields.reduce(function (sum, f) { return sum + (f.type === 'toggle' ? 48 : 160); }, 0) + 80;
        var fit = function (): void {
            var width = root.clientWidth || 0;
            root.classList.toggle('compact', !!width && width < needed);
        };
        if (typeof ResizeObserver !== 'undefined') {
            var watch = new ResizeObserver(fit);
            watch.observe(root);
            cleanups.push(function () { watch.disconnect(); });
        } else {
            cleanups.push(listen(window, 'resize', fit));
        }
        fit();
    }

    setValue(opts.value);

    return {
        element: root,
        rows: function () { return set.rows(); },
        checkAll: checkAll,
        changed: changed,
        getValue: getValue,
        setValue: setValue,
        setItems: setValue,
        addRow: function (item) { return !!set.add(item || null); },
        isValid: function () { return checkAll(true); },
        setHeight: function (height, maxHeight) { set.setHeight(height, maxHeight); },
        destroy: function () { runAll(cleanups); set.destroy(); }
    };
}
