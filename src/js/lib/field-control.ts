// field-control.ts
// One form control built from a field spec, and a group of them with labels and messages. The repeater, the rule builder, the matrix grid, the mapping table, and the data table's row editor share it. None of it is exported from the bundle.

import { make, listen, runAll, nextId, toText, has, clear } from './dom.js';
import { adornField } from '../field-adornments.js';
import { createFieldMessage } from '../field-message.js';
import type { FieldMessageHandle } from '../field-message.js';
import { createTagInput } from '../tag-input.js';
import { createCheckbox } from '../checkbox.js';
import { bindSecretField, readSecretField, SECRET_KEPT } from '../secret-field.js';
import { bindValidation, validateValue } from './validate.js';
import type { ValidationHandle, ValidationOptions } from './validate.js';

/** The kinds of control a field can be. */
export type FieldType = 'text' | 'secret' | 'select' | 'number' | 'tags' | 'time' | 'toggle' | 'custom';

/** One choice of a select field, or its value as plain text. */
export type FieldChoice = { value: string; label?: string } | string;

/** What a custom field's render returns. input is the element its label and message name. */
export interface FieldControlParts {
    element: HTMLElement;
    input?: HTMLElement | null;
    getValue(): unknown;
    setValue?(value: unknown): void;
    destroy?(): void;
}

/**
 * One field of a row or a card. type picks the control, options are a select's choices, and validate returns an
 * error sentence for a value, or an empty value when it is valid. width is the field's grid track, such as '2fr', and unit a
 * number's fixed suffix drawn dimmed inside its box, such as 'Mbps'.
 */
export interface FieldSpec {
    key: string;
    label: string;
    type?: FieldType;
    options?: FieldChoice[];
    placeholder?: string;
    required?: boolean;
    requiredText?: string;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    allowExpose?: boolean;
    width?: string;
    validate?(value: any, item: Record<string, any>, index: number): string | null | undefined;
    render?(value: any, change: () => void): FieldControlParts;
}

/** A built control. input is the element a label and a message name, and setOptions swaps a select's choices. */
export interface FieldControl {
    element: HTMLElement;
    input: HTMLElement | null;
    getValue(): unknown;
    setValue(value: unknown): void;
    setOptions(options: FieldChoice[] | null | undefined): void;
    destroy(): void;
}

/** A choice as { value, label }, with the value as text and the value standing in for a missing label. */
export function toChoice(choice: FieldChoice): { value: string; label: string } {
    if (typeof choice === 'string') return { value: choice, label: choice };
    var value = toText(choice && choice.value);
    return { value: value, label: choice && choice.label ? String(choice.label) : value };
}

/**
 * Builds the control a field's type names, holding value, and calls change after the reader changes it.
 * Internal to the web components.
 *
 * @param field the field spec
 * @param value the value it starts with
 * @param change function() called after each change by the reader
 * @param name the control's accessible name (default the field's label)
 */
export function buildControl(field: FieldSpec, value: unknown, change: () => void, name?: string): FieldControl {
    var type: FieldType = field.type || 'text';
    var label = name || field.label;
    var holder = make('div', 'base-control base-control-' + type);
    var off: Array<() => void> = [];
    var adorned: { destroy(): void } | null = null;

    if (type === 'tags') {
        var tags = createTagInput({ values: Array.isArray(value) ? value : [], placeholder: field.placeholder, inputLabel: label, onChange: change });
        holder.appendChild(tags.element);
        return {
            element: holder, input: tags.input,
            getValue: function () { return tags.getValue(); },
            setValue: function (v) { tags.setValue(Array.isArray(v) ? v : []); },
            setOptions: function () { /* a tag field has no choices */ },
            destroy: function () { tags.destroy(); }
        };
    }

    if (type === 'toggle') {
        // A toggle is the shared Checkbox, a field tall so it lines up with the fields beside it.
        var box = createCheckbox({ ariaLabel: label, checked: value === true, field: true, onChange: function () { change(); } });
        box.input.classList.add('base-control-switch');
        holder.appendChild(box.element);
        return {
            element: holder, input: box.input,
            getValue: function () { return box.getValue(); },
            setValue: function (v) { box.setValue(v === true); },
            setOptions: function () { /* a toggle has no choices */ },
            destroy: function () { box.destroy(); }
        };
    }

    if (type === 'custom' && field.render) {
        var parts = field.render(value, change);
        holder.appendChild(parts.element);
        // A custom control may swap its input, so the input is read when asked.
        return {
            element: holder,
            get input() { return parts.input || null; },
            getValue: function () { return parts.getValue(); },
            setValue: function (v) { if (parts.setValue) parts.setValue(v); },
            setOptions: function () { /* a custom field draws its own choices */ },
            destroy: function () { if (parts.destroy) parts.destroy(); }
        };
    }

    if (type === 'select') {
        var select = make('select', '', { 'aria-label': label });
        var fillChoices = function (choices: FieldChoice[] | null | undefined): void {
            var keep = select.value;
            clear(select);
            if (field.placeholder !== undefined) select.appendChild(make('option', '', { value: '' }, field.placeholder));
            (choices || []).forEach(function (c) { var o = toChoice(c); select.appendChild(make('option', '', { value: o.value }, o.label)); });
            select.value = keep;
            if (select.value !== keep && select.options.length) select.selectedIndex = 0;
        };
        fillChoices(field.options);
        var choose = function (v: unknown): void {
            select.value = toText(v);
            // A select with no empty choice always shows one of its choices.
            if (select.selectedIndex === -1 && select.options.length) select.selectedIndex = 0;
        };
        choose(value);
        off.push(listen(select, 'change', change));
        holder.appendChild(select);
        return {
            element: holder, input: select,
            getValue: function () { return select.value; },
            setValue: choose,
            setOptions: fillChoices,
            destroy: function () { runAll(off); }
        };
    }

    var input = make('input', '', { type: type === 'secret' ? 'password' : type === 'number' || type === 'time' ? type : 'text', 'aria-label': label, autocomplete: type === 'secret' ? 'new-password' : 'off' });
    if (field.placeholder) input.setAttribute('placeholder', field.placeholder);
    if (type === 'number') {
        if (field.min !== undefined) input.setAttribute('min', String(field.min));
        if (field.max !== undefined) input.setAttribute('max', String(field.max));
        if (field.step !== undefined) input.setAttribute('step', String(field.step));
        if (field.unit) input.setAttribute('data-base-unit', field.unit);
    }
    holder.appendChild(input);
    if (type === 'number' || type === 'time') adorned = adornField(input);

    function put(v: unknown): void {
        if (type !== 'secret') { input.value = toText(v); return; }
        // A secret is stored but kept off the page when its value is the kept sentinel, and known otherwise.
        bindSecretField(input, v === SECRET_KEPT, { allowExpose: field.allowExpose === true });
        if (v !== SECRET_KEPT && v) input.value = String(v);
    }
    put(value);
    off.push(listen(input, 'input', change));

    return {
        element: holder, input: input,
        getValue: function () {
            if (type === 'secret') return readSecretField(input);
            if (type === 'number') return input.value === '' ? null : Number(input.value);
            return input.value;
        },
        setValue: put,
        setOptions: function () { /* a text field has no choices */ },
        destroy: function () { runAll(off); if (adorned) adorned.destroy(); }
    };
}

/** Whether a value counts as empty: nothing, empty text, an empty list, or a toggle that is off. */
export function isEmptyValue(value: unknown): boolean {
    if (value === null || value === undefined || value === false) return true;
    if (Array.isArray(value)) return value.length === 0;
    return typeof value === 'string' && value.trim() === '';
}

/**
 * The noun a field's label gives a validation message, such as 'port' from Port, keeping an acronym as written.
 * Internal to the web components.
 */
export function nounOf(label: string): string {
    return String(label || '').split(/\s+/).map(function (w) { return w.length > 1 && w === w.toUpperCase() ? w : w.toLowerCase(); }).join(' ');
}

/** A value as the text the validation core checks: a list joins its entries, and nothing is empty text. */
function asText(value: unknown): string {
    if (Array.isArray(value)) return value.join(', ');
    if (value === null || value === undefined || value === false) return '';
    return String(value);
}

/**
 * The validation core's options for a field: its required, min, and max rules, its label as the noun, requiredText as the
 * required message, and its validate called with the value, the row, and its place.
 * Internal to the web components.
 *
 * @param field the field spec
 * @param read function() returning the control's value
 * @param context function() returning the row and its place
 */
export function validationFor(field: FieldSpec, read: () => unknown, context: () => { item: Record<string, any>; index: number }): ValidationOptions {
    var type = field.type || 'text';
    var options: ValidationOptions = {
        noun: nounOf(field.label),
        rules: { required: !!field.required && type !== 'toggle', min: field.min === undefined ? null : field.min, max: field.max === undefined ? null : field.max },
        validate: function () {
            if (!field.validate) return '';
            var ctx = context();
            return field.validate(read(), ctx.item, ctx.index);
        }
    };
    if (field.requiredText) options.messages = { required: field.requiredText, requiredNoun: field.requiredText, select: field.requiredText };
    if (type === 'tags' || type === 'custom') options.value = function () { return asText(read()); };
    return options;
}

/**
 * The problem with one field's value, or '' when it is valid, through the validation core, for a control with no input
 * the core can bind.
 * Internal to the web components.
 *
 * @param field the field spec
 * @param value the value its control holds
 * @param item every value of the row, by field key
 * @param index the row's place
 */
export function fieldProblem(field: FieldSpec, value: unknown, item: Record<string, any>, index: number): string {
    var options = validationFor(field, function () { return value; }, function () { return { item: item, index: index }; });
    var rules = Object.assign({ type: field.type === 'number' ? 'number' : field.type === 'time' ? 'time' : null }, options.rules);
    return validateValue(asText(value), rules, options, null);
}

/** One field of a group: its spec, its control, its label, and its message. touched is true once the reader left it. */
export interface FieldCell {
    field: FieldSpec;
    element: HTMLElement;
    label: HTMLLabelElement;
    control: FieldControl;
    message: FieldMessageHandle;
    binding: ValidationHandle | null;
    touched: boolean;
}

/** What createFieldGroup takes. element is where the cells go (default a new div), eager shows a problem as soon as there is one, and context gives the row and its place for validate. */
export interface FieldGroupOptions {
    element?: HTMLElement;
    eager?: boolean;
    cellClass?: Record<string, string>;
    name?(field: FieldSpec): string;
    context?(): { item: Record<string, any>; index: number };
    onChange?(key: string): void;
}

/** What createFieldGroup returns. check validates every cell and returns whether all are valid, and force shows every message. */
export interface FieldGroupHandle {
    element: HTMLElement;
    cells: FieldCell[];
    getValue(): Record<string, any>;
    setValue(item: Record<string, any> | null | undefined): void;
    check(force?: boolean): boolean;
    cell(key: string): FieldCell | null;
    rebind(key: string): void;
    firstInvalid(): HTMLElement | null;
    focus(): void;
    destroy(): void;
}

/**
 * Builds a labeled cell for each field, with its control and its message under it. Each field checks through the
 * validation core, so validateAll on a form around the group checks it too. A message shows once the reader leaves
 * the field, or at once when eager, and then follows each change. rebind binds a cell again after its control swaps its input.
 * Internal to the web components.
 *
 * @param fields the field specs
 * @param item the values the controls start with, by key
 * @param options element, eager, cellClass, name, context, and onChange
 */
export function createFieldGroup(fields: FieldSpec[], item: Record<string, any> | null | undefined, options?: FieldGroupOptions): FieldGroupHandle {
    var opts = options || {};
    var root = opts.element || make('div', 'base-field-group');
    var values = item || {};
    var off: Array<() => void> = [];
    var cells: FieldCell[] = fields.map(function (field) {
        var control = buildControl(field, has(values, field.key) ? values[field.key] : undefined, function () {
            refresh();
            if (opts.onChange) opts.onChange(field.key);
        }, opts.name ? opts.name(field) : field.label);
        var extra = opts.cellClass && has(opts.cellClass, field.key) ? ' ' + opts.cellClass[field.key] : '';
        var element = make('div', 'base-field-cell' + (field.type === 'toggle' ? ' toggle' : '') + extra, { 'data-key': field.key });
        var label = make('label', 'base-field-cell-label', null, field.label);
        if (control.input) {
            if (!control.input.id) control.input.id = nextId('field');
            if (control.input.tagName !== 'BUTTON') label.setAttribute('for', control.input.id);
        }
        var message = createFieldMessage({ input: control.input });
        element.appendChild(label);
        element.appendChild(control.element);
        element.appendChild(message.element);
        root.appendChild(element);
        var cell: FieldCell = { field: field, element: element, label: label, control: control, message: message, binding: null, touched: false };
        bind(cell);
        off.push(listen(element, 'focusout', function (e: FocusEvent) {
            var next = e.relatedTarget as Node | null;
            if (next && element.contains(next)) return;
            cell.touched = true;
            refresh();
        }));
        return cell;
    });

    // Binds the cell's input to the validation core, with the cell's own message. A toggle has nothing to check.
    function bind(cell: FieldCell): void {
        if (cell.binding) cell.binding.destroy();
        cell.binding = null;
        var input = cell.control.input;
        if (!input || input.tagName === 'BUTTON') return;
        if (!input.id) input.id = nextId('field');
        cell.label.setAttribute('for', input.id);
        cell.message.bind(input);
        cell.binding = bindValidation(input, Object.assign(validationFor(cell.field, function () { return cell.control.getValue(); }, context), { message: cell.message }));
    }

    function getValue(): Record<string, any> {
        var out: Record<string, any> = {};
        cells.forEach(function (c) { out[c.field.key] = c.control.getValue(); });
        return out;
    }

    // Checks one cell, shows its message when it may, and returns whether it is valid.
    function checkCell(cell: FieldCell, ctx: { item: Record<string, any>; index: number }): boolean {
        var shown = !!(opts.eager || cell.touched);
        var ok: boolean;
        if (cell.binding) {
            ok = shown ? cell.binding.check() : cell.binding.isValid();
            if (!shown) cell.binding.clear();
        } else {
            var problem = fieldProblem(cell.field, cell.control.getValue(), ctx.item, ctx.index);
            ok = !problem;
            cell.message.set(problem && shown ? 'error' : '', problem);
        }
        cell.element.classList.toggle('invalid', !ok && shown);
        return ok;
    }

    function context(): { item: Record<string, any>; index: number } {
        return opts.context ? opts.context() : { item: getValue(), index: 0 };
    }

    function refresh(): void {
        var ctx = context();
        cells.forEach(function (c) { checkCell(c, ctx); });
    }

    return {
        element: root,
        cells: cells,
        getValue: getValue,
        setValue: function (next) {
            var v = next || {};
            cells.forEach(function (c) { c.touched = false; c.control.setValue(has(v, c.field.key) ? v[c.field.key] : undefined); });
            refresh();
        },
        check: function (force) {
            if (force) cells.forEach(function (c) { c.touched = true; });
            var ctx = context();
            return cells.map(function (c) { return checkCell(c, ctx); }).every(Boolean);
        },
        cell: function (key) { return cells.filter(function (c) { return c.field.key === key; })[0] || null; },
        rebind: function (key) {
            var cell = cells.filter(function (c) { return c.field.key === key; })[0];
            if (cell) bind(cell);
        },
        firstInvalid: function () {
            var bad = cells.filter(function (c) { return c.element.classList.contains('invalid'); })[0];
            return bad ? bad.control.input : null;
        },
        focus: function () {
            var first = cells.filter(function (c) { return !!c.control.input; })[0];
            if (first) first.control.input!.focus();
        },
        destroy: function () {
            runAll(off);
            cells.forEach(function (c) { if (c.binding) c.binding.destroy(); c.control.destroy(); c.message.destroy(); });
        }
    };
}
