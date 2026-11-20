import { make, toText, has } from './lib/dom.js';
import { buildControl, toChoice } from './lib/field-control.js';
import type { FieldChoice, FieldControl, FieldSpec } from './lib/field-control.js';
import { buildRepeater } from './repeater.js';
import type { RepeaterRow } from './repeater.js';
import { createPillGroup } from './pill-group.js';
import { createFieldMessage } from './field-message.js';
import type { ComponentHandle } from './types.js';
import { baseText } from './lib/base-text.js';
import type { BASE_TEXT } from './lib/base-text.js';

/** A field a rule can test. type picks the value control: a text box, a select of options, a number box, or chips. operators replaces the type's own list. */
export interface RuleBuilderField {
    key: string;
    label: string;
    type?: 'text' | 'select' | 'number' | 'chips';
    options?: FieldChoice[];
    operators?: FieldChoice[];
    placeholder?: string;
}

/** One rule: the field it tests, its operator, and the value, which is a list of text for a chips field. */
export interface RuleBuilderRule {
    field: string;
    operator: string;
    value: unknown;
}

/** The rules and whether an item must match all of them or any one. */
export interface RuleBuilderValue {
    match: 'all' | 'any';
    rules: RuleBuilderRule[];
}

/** What createRuleBuilder takes. warn returns a warning sentence for the rules, such as one that can never match, shown under them. */
export interface RuleBuilderOptions {
    fields: RuleBuilderField[];
    value?: RuleBuilderValue | null;
    allText?: string;
    anyText?: string;
    matchLabel?: string;
    fieldLabel?: string;
    operatorLabel?: string;
    valueLabel?: string;
    addText?: string;
    removeText?: string;
    rowName?: string;
    maxRows?: number;
    minRows?: number;
    limitText?: string;
    emptyText?: string;
    size?: 'small' | 'medium' | 'large';
    warn?(value: RuleBuilderValue): string | null | undefined;
    onChange?(value: RuleBuilderValue): void;
}

/** What createRuleBuilder returns. setWarning shows a warning sentence under the rules, or none for an empty value. */
export interface RuleBuilderHandle extends ComponentHandle {
    getValue(): RuleBuilderValue;
    setValue(next: RuleBuilderValue | null): void;
    isValid(): boolean;
    setWarning(text: string | null | undefined): void;
    destroy(): void;
}

/** The operators each field type offers when the field names none. */
var OPERATOR_TEXT: Record<string, keyof typeof BASE_TEXT> = {
    'is': 'Base.OpIs', 'is not': 'Base.OpIsNot', 'contains': 'Base.OpContains', 'starts with': 'Base.OpStartsWith', 'equals': 'Base.OpEquals',
    'does not equal': 'Base.OpNotEquals', 'is more than': 'Base.OpMoreThan', 'is less than': 'Base.OpLessThan', 'has any of': 'Base.OpHasAny',
    'has all of': 'Base.OpHasAll', 'has none of': 'Base.OpHasNone'
};

export var RULE_OPERATORS: Record<string, Array<{ value: string; label: string }>> = {
    text: [{ value: 'is', label: 'is' }, { value: 'not', label: 'is not' }, { value: 'contains', label: 'contains' }, { value: 'starts', label: 'starts with' }],
    number: [{ value: 'eq', label: 'equals' }, { value: 'ne', label: 'does not equal' }, { value: 'gt', label: 'is more than' }, { value: 'lt', label: 'is less than' }],
    select: [{ value: 'is', label: 'is' }, { value: 'not', label: 'is not' }],
    chips: [{ value: 'any', label: 'has any of' }, { value: 'all', label: 'has all of' }, { value: 'none', label: 'has none of' }]
};

// ValueSlot
// The value cell of one rule, whose control is drawn again when the rule's field changes type.
interface ValueSlot {
    holder: HTMLElement;
    control: FieldControl | null;
    kind: string;
    pending: unknown;
    change(): void;
}

/**
 * Rows of field, operator, and value, with a choice of matching all rules or any one. It is a Repeater whose value
 * control follows the chosen field: a text box, a select, a number box, or chips. A warning row under the rules says
 * when they need attention.
 *
 * @param options {
 *   fields        : array of { key, label, type ('text', 'select', 'number', or 'chips'), options, operators, placeholder } [required]
 *   value         : { match ('all' or 'any'), rules: [{ field, operator, value }] } [optional]
 *   allText, anyText : the two match choices (default 'Match all' and 'Match any')
 *   matchLabel    : aria-label of the match choice (default 'Match')
 *   fieldLabel, operatorLabel, valueLabel : the column labels (default 'Field', 'Operator', and 'Value')
 *   addText       : text of the add button (default 'Add rule')
 *   removeText    : aria-label of a remove button, where {value} is the rule's name (default 'Remove {value}')
 *   rowName       : prefix of a rule's name (default 'Rule')
 *   maxRows, minRows, limitText, emptyText : the Repeater's row limits and sentences [optional]
 *   size          : 'small', 'medium', or 'large' for its fields (default 'medium')
 *   warn          : function(value) returning a warning sentence, or an empty value for none [optional]
 *   onChange      : function(value) after each change [optional]
 * }
 * @returns { element, getValue, setValue, isValid, setWarning, destroy }.
 */
export function createRuleBuilder(options: RuleBuilderOptions): RuleBuilderHandle {
    var opts = options || ({ fields: [] } as RuleBuilderOptions);
    var fields = opts.fields || [];
    var slots: Array<{ element: HTMLElement; slot: ValueSlot }> = [];
    var match: 'all' | 'any' = opts.value && opts.value.match === 'any' ? 'any' : 'all';
    var ready = false;

    var root = make('div', 'base-rule-builder');
    var pills = make('div', 'base-pill-group base-rule-match', { role: 'group', 'aria-label': opts.matchLabel || baseText('Base.Match') });
    pills.appendChild(make('button', 'base-pill small', { type: 'button', 'data-value': 'all', 'aria-pressed': match === 'all' ? 'true' : 'false' }, opts.allText || baseText('Base.MatchAll')));
    pills.appendChild(make('button', 'base-pill small', { type: 'button', 'data-value': 'any', 'aria-pressed': match === 'any' ? 'true' : 'false' }, opts.anyText || baseText('Base.MatchAny')));
    var choice = createPillGroup(pills, { onChange: function (v) { match = v === 'any' ? 'any' : 'all'; changed(); } });
    root.appendChild(pills);

    function specOf(key: unknown): RuleBuilderField {
        return fields.filter(function (f) { return f.key === key; })[0] || fields[0] || { key: '', label: '' };
    }

    function slotOf(row: RepeaterRow): ValueSlot | null {
        var cell = row.group.cell('value');
        var holder = cell ? cell.control.element.children[0] as HTMLElement : null;
        var found = slots.filter(function (s) { return s.element === holder; })[0];
        return found ? found.slot : null;
    }

    // Draws the value control the field's type takes, keeping the value while the type stays the same.
    function fillSlot(slot: ValueSlot, spec: RuleBuilderField): boolean {
        var kind = spec.type || 'text';
        var keep = slot.control ? slot.control.getValue() : slot.pending;
        if (slot.control && slot.kind === kind && kind !== 'select') return false;
        if (slot.control) { slot.control.destroy(); slot.holder.removeChild(slot.control.element); }
        var field: FieldSpec = { key: 'value', label: opts.valueLabel || baseText('LabelValue'), type: kind === 'chips' ? 'tags' : kind, options: spec.options, placeholder: spec.placeholder };
        var start = slot.kind === kind || !slot.control ? keep : undefined;
        if (kind === 'select' && spec.options && spec.options.length && !spec.options.some(function (o) { return toChoice(o).value === toText(start); })) start = toChoice(spec.options[0]).value;
        slot.control = buildControl(field, start, slot.change);
        slot.kind = kind;
        slot.holder.appendChild(slot.control.element);
        return true;
    }

    var built = buildRepeater({
        fields: [
            { key: 'field', label: opts.fieldLabel || baseText('Base.Field'), type: 'select', options: fields.map(function (f) { return { value: f.key, label: f.label }; }) },
            { key: 'operator', label: opts.operatorLabel || baseText('Base.Operator'), type: 'select', options: [] },
            {
                key: 'value', label: opts.valueLabel || baseText('LabelValue'), type: 'custom', required: true,
                render: function (value, change) {
                    var slot: ValueSlot = { holder: make('div', 'base-rule-value'), control: null, kind: '', pending: value, change: change };
                    slots.push({ element: slot.holder, slot: slot });
                    return {
                        element: slot.holder,
                        get input() { return slot.control ? slot.control.input : null; },
                        getValue: function () { return slot.control ? slot.control.getValue() : slot.pending; },
                        setValue: function (v) { if (slot.control) slot.control.setValue(v); else slot.pending = v; },
                        destroy: function () {
                            if (slot.control) slot.control.destroy();
                            slots = slots.filter(function (s) { return s.slot !== slot; });
                        }
                    };
                }
            }
        ],
        addText: opts.addText || baseText('Base.AddRule'),
        removeText: opts.removeText,
        rowName: opts.rowName || baseText('Base.Rule'),
        maxRows: opts.maxRows,
        minRows: opts.minRows,
        limitText: opts.limitText,
        emptyText: opts.emptyText,
        size: opts.size,
        onChange: function () { if (ready) changed(); }
    }, {
        rootClass: 'base-rule-rows',
        onRowChange: function (row, key) {
            if (key !== null && key !== 'field') return;
            var fieldCell = row.group.cell('field');
            var operatorCell = row.group.cell('operator');
            if (!fieldCell || !operatorCell) return;
            var spec = specOf(fieldCell.control.getValue());
            if (key === null && fieldCell.control.getValue() !== spec.key) fieldCell.control.setValue(spec.key);
            var ops = spec.operators || (RULE_OPERATORS[spec.type || 'text'] || RULE_OPERATORS.text).map(function (o) {
                return { value: o.value, label: has(OPERATOR_TEXT, o.label) ? baseText(OPERATOR_TEXT[o.label]) : o.label };
            });
            operatorCell.control.setOptions(ops);
            var slot = slotOf(row);
            var cell = row.group.cell('value');
            if (!slot || !cell || !fillSlot(slot, spec)) return;
            // The new control takes the cell's label, message, and validation, which were made before it.
            row.group.rebind('value');
        }
    });
    root.appendChild(built.element);
    var warning = createFieldMessage();
    var warningRow = make('div', 'base-rule-warning');
    warningRow.appendChild(warning.element);
    built.element.insertBefore(warningRow, built.element.querySelector('.base-repeater-add'));
    var manual = '';

    function getValue(): RuleBuilderValue {
        return { match: match, rules: built.getValue().map(function (r) { return { field: toText(r.field), operator: toText(r.operator), value: r.value }; }) };
    }

    function showWarning(): void {
        var text = manual || (opts.warn ? opts.warn(getValue()) || '' : '');
        warning.set(text ? 'warn' : '', text);
    }

    function changed(): void {
        showWarning();
        if (opts.onChange) opts.onChange(getValue());
    }

    function setValue(next: RuleBuilderValue | null | undefined): void {
        match = next && next.match === 'any' ? 'any' : 'all';
        choice.set(match);
        var rules = next && Array.isArray(next.rules) ? next.rules : [];
        built.setValue(rules.map(function (r) { return { field: r.field, operator: r.operator, value: r.value }; }));
        built.rows().forEach(function (row, i) {
            var r = rules[i];
            if (!r) return;
            var operatorCell = row.group.cell('operator');
            if (operatorCell) operatorCell.control.setValue(r.operator);
            var slot = slotOf(row);
            if (slot && slot.control) slot.control.setValue(r.value);
        });
        showWarning();
    }

    setValue(opts.value);
    ready = true;

    return {
        element: root,
        getValue: getValue,
        setValue: setValue,
        isValid: function () { return built.isValid(); },
        setWarning: function (text) { manual = text || ''; showWarning(); },
        destroy: function () {
            choice.destroy();
            built.destroy();
            warning.destroy();
        }
    };
}
