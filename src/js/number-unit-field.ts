import { make, listen, runAll, clear, nextId, applyFieldSize, toText } from './lib/dom.js';
import { bindValidation } from './lib/validate.js';
import { createFieldMessage } from './field-message.js';
import { adornField } from './field-adornments.js';
import type { ComponentHandle } from './types.js';
import { baseText } from './lib/base-text.js';

/** One unit choice. factor is how many base units one of this unit holds. */
export interface NumberUnit {
    value: string;
    label?: string;
    factor?: number | null;
}

/** What getValue returns. value is null while the input is empty, and base is null with no factor. */
export interface NumberUnitValue {
    value: number | null;
    unit: string;
    base: number | null;
}

/** What createNumberUnitField takes. units is required, and min and max bound the number. */
export interface NumberUnitFieldOptions {
    value?: number | string | null;
    unit?: string;
    units: Array<string | NumberUnit>;
    min?: number | string;
    max?: number | string;
    step?: number;
    valueLabel?: string;
    unitLabel?: string;
    rangeText?: string;
    minText?: string;
    maxText?: string;
    size?: 'small' | 'medium' | 'large';
    validate?(value: NumberUnitValue): string | null | undefined;
    onChange?(value: NumberUnitValue): void;
}

/** What createNumberUnitField returns. */
export interface NumberUnitFieldHandle extends ComponentHandle {
    input: HTMLInputElement;
    select: HTMLSelectElement;
    getValue(): NumberUnitValue;
    setValue(next?: { value?: number | string | null; unit?: string }): void;
    setBaseValue(base: number): void;
    isValid(): boolean;
    setSize(size?: 'small' | 'medium' | 'large'): void;
    destroy(): void;
}

/**
 * A number input beside a unit select, such as 512 MB or 2 GB. The value is checked against min and max through the validation core, and a unit may carry a factor so the field can also report and take a base value.
 *
 * @param options {
 *   value     : first number [optional]
 *   unit      : first unit value (default the first unit)
 *   units     : array of strings, or of { value, label, factor } where factor is how many base units one of this unit holds [required]
 *   min       : lowest number allowed, and a min above max swaps the two [optional]
 *   max       : highest number allowed [optional]
 *   step      : step of the number input, and a given step is also a rule, so 0.5 refuses 0.25 (default 1, which the arrows use and typing may leave)
 *   valueLabel: aria-label of the number input (default 'Value')
 *   unitLabel : aria-label of the unit select (default 'Unit')
 *   rangeText : message for a number out of range, where {min} and {max} are filled in (default 'Enter a number from {min} to {max}.')
 *   minText   : message when only min is set (default 'Enter {min} or more.')
 *   maxText   : message when only max is set (default 'Enter {max} or less.')
 *   size      : 'small', 'medium', or 'large' for its fields (default 'medium')
 *   validate  : function({ value, unit, base }) returning an error sentence, or an empty value when valid, after the range passes [optional]
 *   onChange  : function({ value, unit, base }) [optional]
 * }
 * @returns { element, input, select, getValue, setValue, setBaseValue, isValid, setSize, destroy }. getValue returns { value, unit, base }, where value is null while the input is empty and base is value times the unit's factor, or null with no factor.
 * setBaseValue(base) picks the largest unit that divides the base evenly, so 2048 with MB and GB units shows 2 GB. It ignores a base that is not a finite number.
 */
export function createNumberUnitField(options: NumberUnitFieldOptions): NumberUnitFieldHandle {
    options = options || {} as NumberUnitFieldOptions;
    if (!options.units || !options.units.length) throw new Error('createNumberUnitField needs units');
    var units: NumberUnit[] = options.units.map(function (u) {
        return typeof u === 'string' ? { value: u, label: u, factor: null } : { value: u.value, label: u.label || u.value, factor: u.factor === undefined ? null : u.factor };
    });
    var cleanups: Array<() => void> = [];
    // A limit that is not a number is no limit, and a range written backwards is read the right way round.
    var min: number | undefined = isFinite(parseFloat(options.min as string)) ? parseFloat(options.min as string) : undefined;
    var max: number | undefined = isFinite(parseFloat(options.max as string)) ? parseFloat(options.max as string) : undefined;
    if (min !== undefined && max !== undefined && min > max) { var swap = min; min = max; max = swap; }

    var root = make('div', 'base-number-unit');
    applyFieldSize(root, options.size);
    var input = make('input', '', { type: 'number', 'aria-label': options.valueLabel || baseText('LabelValue'), step: String(options.step || 1) });
    if (min !== undefined) input.setAttribute('min', String(min));
    if (max !== undefined) input.setAttribute('max', String(max));
    var select = make('select', '', { 'aria-label': options.unitLabel || baseText('Base.Unit') });
    units.forEach(function (u) { select.appendChild(make('option', '', { value: u.value }, u.label)); });
    var wrap = make('div', 'base-number-unit-row');
    wrap.appendChild(input);
    wrap.appendChild(select);
    var adorned = adornField(input);
    cleanups.push(function () { adorned.destroy(); });
    var message = createFieldMessage({ input: input, id: nextId('range') });
    root.appendChild(wrap);
    root.appendChild(message.element);

    function unitOf(value: string | undefined): NumberUnit { return units.filter(function (u) { return u.value === value; })[0] || units[0]; }

    function number(): number | null {
        if (input.value === '' || input.value === null || input.value === undefined) return null;
        var n = parseFloat(input.value);
        return isNaN(n) ? null : n;
    }

    function value(): NumberUnitValue {
        var n = number();
        var u = unitOf(select.value);
        return { value: n, unit: u.value, base: n !== null && u.factor !== null ? n * u.factor! : null };
    }

    function changed(): void {
        if (options.onChange) options.onChange(value());
    }

    cleanups.push(listen(input, 'input', changed));
    cleanups.push(listen(select, 'change', function () { if (message.getValue().state) check(); changed(); }));
    var messages: Record<string, string> = {};
    if (options.rangeText) messages.range = options.rangeText;
    if (options.minText) messages.min = options.minText;
    if (options.maxText) messages.max = options.maxText;
    // The default step only moves the arrows, so typing 1.5 stays allowed unless the caller sets a step.
    var validation = bindValidation(input, {
        message: message,
        messages: messages,
        rules: { step: options.step ? options.step : 'any' },
        validate: function () { return options.validate ? options.validate(value()) : ''; }
    });
    cleanups.push(validation.destroy);
    function check(): boolean { return validation.check(); }

    select.value = unitOf(options.unit).value;
    if (options.value !== undefined && options.value !== null) input.value = String(options.value);
    check();

    return {
        element: root,
        input: input,
        select: select,
        getValue: value,
        setValue: function (next?: { value?: number | string | null; unit?: string }) {
            next = next || {};
            if (next.unit !== undefined) select.value = unitOf(next.unit).value;
            if (next.value !== undefined) input.value = toText(next.value);
            check();
        },
        setBaseValue: function (base: number) {
            if (typeof base !== 'number' || !isFinite(base)) return;
            var withFactor = units.filter(function (u) { return u.factor; }).sort(function (a, b) { return b.factor! - a.factor!; });
            var pick = withFactor.filter(function (u) { return base !== 0 && base % u.factor! === 0; })[0] || withFactor[withFactor.length - 1];
            if (!pick) return;
            select.value = pick.value;
            input.value = String(base / pick.factor!);
            check();
        },
        isValid: check,
        setSize: function (size?: 'small' | 'medium' | 'large') { applyFieldSize(root, size); },
        destroy: function () { runAll(cleanups); message.destroy(); clear(wrap); }
    };
}
