import { make, listen, runAll, clear, fill, has, applyFieldSize, iconButton, focusAfterRemove } from './lib/dom.js';
import { buildControl, createFieldGroup } from './lib/field-control.js';
import type { FieldSpec, FieldGroupHandle, FieldControl } from './lib/field-control.js';
import type { ComponentHandle } from './types.js';

/** A source row of the table, such as a remote library or a remote user. */
export interface MappingTableRow {
    value: string;
    label?: string;
    description?: string;
}

/** A target a source can be paired with, such as a local library or a local user. */
export interface MappingTableTarget {
    value: string;
    label?: string;
}

/** The pairs, as an object from source value to target value. */
export type MappingTableValue = Record<string, string>;

/** A row's extra state: whether it is on, and the values of its extra fields by key. */
export interface MappingTableDetail {
    target?: string;
    enabled?: boolean;
    [key: string]: unknown;
}

/** Every row's extra state, by source value. */
export type MappingTableDetails = Record<string, MappingTableDetail>;

/** What createMappingTable takes. unique true lets each target be picked by one row only. fields adds Repeater fields to each row, toggle an on and off control, and removable a remove button. */
export interface MappingTableOptions {
    rows?: MappingTableRow[] | null;
    targets?: MappingTableTarget[] | null;
    value?: MappingTableValue | null;
    sourceHeader?: string;
    targetHeader?: string;
    noneLabel?: string;
    emptyText?: string;
    targetLabel?: string;
    unique?: boolean;
    size?: 'small' | 'medium' | 'large';
    fields?: FieldSpec[] | null;
    toggle?: boolean;
    removable?: boolean;
    details?: MappingTableDetails | null;
    enabledHeader?: string;
    enabledLabel?: string;
    removeLabel?: string;
    onChange?(value: MappingTableValue): void;
    onRemove?(source: string): void;
}

/** What createMappingTable returns. setRows and setTargets redraw the table and keep every pair. */
export interface MappingTableHandle extends ComponentHandle {
    getValue(): MappingTableValue;
    setValue(next: MappingTableValue | null): void;
    setRows(next: MappingTableRow[] | null): void;
    setTargets(next: MappingTableTarget[] | null): void;
    getDetails(): MappingTableDetails;
    setDetails(next: MappingTableDetails | null): void;
    isValid(): boolean;
    destroy(): void;
}

// MappingTableLine
// The select and listener of one drawn source row.
interface MappingTableLine {
    source: string;
    select: HTMLSelectElement;
    off: () => void;
    group: FieldGroupHandle | null;
    toggle: FieldControl | null;
    remove: HTMLButtonElement | null;
}

// put
// Sets an own property even for a key such as __proto__, so a source value never reaches the prototype.
function put(target: MappingTableValue, key: string, value: string): void {
    Object.defineProperty(target, key, { value: value, enumerable: true, writable: true, configurable: true });
}

/**
 * A table that pairs each source with one target picked from a select, such as remote libraries to local libraries or remote users to local users. It stacks the two columns on a narrow screen.
 *
 * @param options {
 *   rows         : array of { value, label, description } sources [optional]
 *   targets      : array of { value, label } choices [optional]
 *   value        : object from source value to target value [optional]
 *   sourceHeader : header of the source column (default 'Source')
 *   targetHeader : header of the target column (default 'Target')
 *   noneLabel    : the choice that leaves a source unmapped (default 'None')
 *   emptyText    : sentence shown while there is no source (default 'Nothing to map.')
 *   targetLabel  : aria-label of a select, where {value} is the source label (default 'Target for {value}')
 *   unique       : true disables a target in the other rows once one row picks it (default false)
 *   size         : 'small', 'medium', or 'large' for its fields (default 'medium')
 *   fields       : Repeater fields drawn as more columns on each row, as { key, label, type, options, required, validate } [optional]
 *   toggle       : true adds an on and off control at the start of each row, and a row that is off is left out of getValue (default false)
 *   removable    : true adds a remove button at the end of each row, which drops the source (default false)
 *   details      : object from source value to { enabled, and a value per field key } [optional]
 *   enabledHeader: header of the toggle column (default 'Enabled')
 *   enabledLabel : aria-label of a toggle, where {value} is the source label (default 'Enable {value}')
 *   removeLabel  : aria-label of a remove button, where {value} is the source label (default 'Remove {value}')
 *   onChange     : function(value) after any change [optional]
 *   onRemove     : function(source) after a row is removed [optional]
 * }
 * @returns { element, getValue, setValue, setRows, setTargets, getDetails, setDetails, isValid, destroy }. getDetails returns each shown row's { target, enabled, and its field values }. getValue returns only the shown sources whose target exists. A pair whose source or target is missing is kept, shows as unmapped, and returns once both exist again.
 * With unique on, a target that several sources hold stays with the first row in order, and the later rows show as unmapped.
 */
export function createMappingTable(options?: MappingTableOptions): MappingTableHandle {
    options = options || {};
    var rows: MappingTableRow[] = [];
    var targets: MappingTableTarget[] = [];
    var pairs: MappingTableValue = {};
    var lines: MappingTableLine[] = [];
    var extraFields: FieldSpec[] = options.fields || [];
    var details: MappingTableDetails = {};

    var root = make('div', 'base-mapping-table');
    applyFieldSize(root, options.size);
    var scroll = make('div', 'base-static-table-scroll');
    var table = make('table', 'base-static-table base-mapping-table-grid');
    var thead = make('thead');
    var headRow = make('tr');
    if (options.toggle) headRow.appendChild(make('th', 'base-mapping-table-toggle', { scope: 'col' }, options.enabledHeader || 'Enabled'));
    headRow.appendChild(make('th', '', { scope: 'col' }, options.sourceHeader || 'Source'));
    headRow.appendChild(make('th', '', { scope: 'col' }, options.targetHeader || 'Target'));
    extraFields.forEach(function (f) { headRow.appendChild(make('th', 'base-mapping-table-extra', { scope: 'col' }, f.label)); });
    if (options.removable) headRow.appendChild(make('td', 'base-mapping-table-remove'));
    if (options.toggle || extraFields.length || options.removable) table.classList.add('extended');
    thead.appendChild(headRow);
    var tbody = make('tbody');
    table.appendChild(thead);
    table.appendChild(tbody);
    scroll.appendChild(table);
    var empty = make('div', 'base-list-empty outside base-mapping-table-empty', null, options.emptyText || 'Nothing to map.');
    root.appendChild(scroll);
    root.appendChild(empty);

    function toRows(list: MappingTableRow[] | null | undefined): MappingTableRow[] {
        var seen: Record<string, boolean> = Object.create(null);
        return (Array.isArray(list) ? list : []).filter(function (r) {
            if (!r || r.value === undefined || r.value === null) return false;
            var key = String(r.value);
            if (has(seen, key)) return false;
            seen[key] = true;
            return true;
        }).map(function (r) {
            return { value: String(r.value), label: r.label === undefined || r.label === null || r.label === '' ? String(r.value) : String(r.label), description: r.description ? String(r.description) : '' };
        });
    }

    function isOn(source: string): boolean {
        return !options!.toggle || !has(details, source) || details[source].enabled !== false;
    }

    function detailOf(source: string): MappingTableDetail {
        if (!has(details, source)) Object.defineProperty(details, source, { value: {}, enumerable: true, writable: true, configurable: true });
        return details[source];
    }

    function changed(): void {
        if (options!.onChange) options!.onChange(resolved());
    }

    function isTarget(value: string): boolean {
        return value !== '' && targets.some(function (t) { return t.value === value; });
    }

    // The target each shown row holds, after missing targets and, with unique on, a later row's repeat are left out.
    function resolved(): MappingTableValue {
        var out: MappingTableValue = {};
        var taken: Record<string, boolean> = Object.create(null);
        rows.forEach(function (r) {
            if (!has(pairs, r.value) || !isOn(r.value)) return;
            var target = pairs[r.value];
            if (!isTarget(target)) return;
            if (options!.unique && has(taken, target)) return;
            taken[target] = true;
            put(out, r.value, target);
        });
        return out;
    }

    // Shows each row's target, and with unique on disables a target that another row holds.
    function reflect(): void {
        var current = resolved();
        lines.forEach(function (line) {
            var mine = has(current, line.source) ? current[line.source] : '';
            line.select.value = mine;
            Array.prototype.forEach.call(line.select.options, function (o: HTMLOptionElement) {
                var other = !!options!.unique && o.value !== '' && o.value !== mine && Object.keys(current).some(function (k) { return k !== line.source && current[k] === o.value; });
                o.disabled = other;
            });
        });
    }

    function teardown(): void {
        lines.forEach(function (line) {
            line.off();
            if (line.group) line.group.destroy();
            if (line.toggle) line.toggle.destroy();
        });
        lines = [];
    }

    function render(): void {
        teardown();
        clear(tbody);
        scroll.hidden = rows.length === 0;
        empty.hidden = rows.length > 0;
        rows.forEach(function (r) {
            var tr = make('tr', 'base-mapping-table-row');
            var toggle: FieldControl | null = null;
            if (options!.toggle) {
                var on = isOn(r.value);
                tr.classList.toggle('off', !on);
                toggle = buildControl({ key: 'enabled', label: '', type: 'toggle' }, on, function () {
                    detailOf(r.value).enabled = toggle!.getValue() === true;
                    tr.classList.toggle('off', !isOn(r.value));
                    reflect();
                    changed();
                }, fill(options!.enabledLabel || 'Enable {value}', r.label));
                var toggleCell = make('td', 'base-mapping-table-toggle');
                toggleCell.appendChild(toggle.element);
                tr.appendChild(toggleCell);
            }
            var th = make('th', 'base-mapping-table-source', { scope: 'row' });
            th.appendChild(make('span', 'base-mapping-table-name', null, r.label));
            if (r.description) th.appendChild(make('span', 'base-mapping-table-description', null, r.description));
            var td = make('td', 'base-mapping-table-target');
            var select = make('select', '', { 'aria-label': fill(options!.targetLabel || 'Target for {value}', r.label) });
            select.appendChild(make('option', '', { value: '' }, options!.noneLabel || 'None'));
            targets.forEach(function (t) { select.appendChild(make('option', '', { value: t.value }, t.label)); });
            td.appendChild(select);
            tr.appendChild(th);
            tr.appendChild(td);
            var group: FieldGroupHandle | null = null;
            if (extraFields.length) {
                group = createFieldGroup(extraFields, has(details, r.value) ? details[r.value] as Record<string, unknown> : null, {
                    name: function (f) { return f.label + ' for ' + r.label; },
                    onChange: function (key) {
                        detailOf(r.value)[key] = group!.cell(key)!.control.getValue();
                        changed();
                    }
                });
                group.cells.forEach(function (cell) {
                    var extra = make('td', 'base-mapping-table-extra');
                    extra.appendChild(cell.element);
                    tr.appendChild(extra);
                });
            }
            var remove: HTMLButtonElement | null = null;
            if (options!.removable) {
                remove = iconButton('base-row-btn base-mapping-table-remove-btn', 'close', fill(options!.removeLabel || 'Remove {value}', r.label));
                var removeCell = make('td', 'base-mapping-table-remove');
                removeCell.appendChild(remove);
                tr.appendChild(removeCell);
            }
            tbody.appendChild(tr);
            var offs = [listen(select, 'change', function () {
                if (select.value === '') delete pairs[r.value];
                else put(pairs, r.value, select.value);
                reflect();
                changed();
            })];
            if (remove) offs.push(listen(remove, 'click', function () { removeRow(r.value); }));
            lines.push({ source: r.value, select: select, off: function () { runAll(offs); }, group: group, toggle: toggle, remove: remove });
        });
        reflect();
    }

    // Drops a source and its pair, then moves focus to the next row's remove button.
    function removeRow(source: string): void {
        var at = rows.map(function (r) { return r.value; }).indexOf(source);
        rows = rows.filter(function (r) { return r.value !== source; });
        delete pairs[source];
        delete details[source];
        render();
        focusAfterRemove(lines.map(function (line) { return line.remove; }), at, null);
        if (options!.onRemove) options!.onRemove(source);
        changed();
    }

    function setDetails(next: MappingTableDetails | null | undefined): void {
        details = {};
        if (next && typeof next === 'object') Object.keys(next).forEach(function (k) {
            if (next[k] && typeof next[k] === 'object') Object.defineProperty(details, k, { value: Object.assign({}, next[k]), enumerable: true, writable: true, configurable: true });
        });
        render();
    }

    function getDetails(): MappingTableDetails {
        var current = resolved();
        var out: MappingTableDetails = {};
        rows.forEach(function (r) {
            var line = lines.filter(function (l) { return l.source === r.value; })[0];
            var detail: MappingTableDetail = { target: has(pairs, r.value) && isTarget(pairs[r.value]) ? pairs[r.value] : '', enabled: isOn(r.value) };
            if (has(current, r.value)) detail.target = current[r.value];
            if (line && line.group) Object.assign(detail, line.group.getValue());
            Object.defineProperty(out, r.value, { value: detail, enumerable: true, writable: true, configurable: true });
        });
        return out;
    }

    function setValue(next: MappingTableValue | null | undefined): void {
        pairs = {};
        if (next && typeof next === 'object') Object.keys(next).forEach(function (k) {
            var v = next[k];
            if (v !== undefined && v !== null && v !== '') put(pairs, k, String(v));
        });
        reflect();
    }

    function setRows(next: MappingTableRow[] | null | undefined): void {
        rows = toRows(next);
        render();
    }

    function setTargets(next: MappingTableTarget[] | null | undefined): void {
        var seen: Record<string, boolean> = Object.create(null);
        targets = (Array.isArray(next) ? next : []).filter(function (t) {
            if (!t || t.value === undefined || t.value === null || String(t.value) === '' || has(seen, String(t.value))) return false;
            seen[String(t.value)] = true;
            return true;
        }).map(function (t) { return { value: String(t.value), label: t.label === undefined || t.label === null || t.label === '' ? String(t.value) : String(t.label) }; });
        render();
    }

    setValue(options.value);
    if (options.details) setDetails(options.details);
    setTargets(options.targets);
    setRows(options.rows);

    return {
        element: root,
        getValue: resolved,
        setValue: setValue,
        setRows: setRows,
        setTargets: setTargets,
        getDetails: getDetails,
        setDetails: setDetails,
        isValid: function () { return lines.map(function (line) { return line.group ? line.group.check(true) : true; }).every(Boolean); },
        destroy: teardown
    };
}
