import { make, listen, runAll, applyFieldSize, fillAll, toText } from './lib/dom.js';
import { adornField } from './field-adornments.js';
import { createFieldMessage } from './field-message.js';
import { bindValidation, validateValue, readRules } from './lib/validate.js';
import type { ComponentHandle } from './types.js';

/** One unit of a duration: hours, minutes, or seconds. */
export type DurationUnit = 'h' | 'm' | 's';

/** What createDurationField takes. The value, min, and max are in seconds. */
export interface DurationFieldOptions {
    value?: number | null;
    units?: DurationUnit[];
    unitText?: Partial<Record<DurationUnit, string>>;
    unitLabels?: Partial<Record<DurationUnit, string>>;
    min?: number;
    max?: number;
    required?: boolean;
    rangeText?: string;
    minText?: string;
    maxText?: string;
    size?: 'small' | 'medium' | 'large';
    validate?(seconds: number | null): string | null | undefined;
    onChange?(seconds: number | null): void;
}

/** What createDurationField returns. getValue is the duration in seconds, or null while every box is empty. */
export interface DurationFieldHandle extends ComponentHandle {
    inputs: HTMLInputElement[];
    getValue(): number | null;
    setValue(seconds: number | null | undefined): void;
    isValid(): boolean;
    setSize(size?: 'small' | 'medium' | 'large'): void;
    destroy(): void;
}

var ORDER: DurationUnit[] = ['h', 'm', 's'];
var SECONDS: Record<DurationUnit, number> = { h: 3600, m: 60, s: 1 };
var TEXT: Record<DurationUnit, string> = { h: 'h', m: 'm', s: 's' };
var LABELS: Record<DurationUnit, string> = { h: 'Hours', m: 'Minutes', s: 'Seconds' };

/**
 * Writes seconds as a short duration in the given units, such as 5400 as '1h 30m'. The smallest unit takes what is left, rounded.
 *
 * @param seconds the duration
 * @param units the units to write, largest first (default ['h', 'm', 's'])
 * @param text the mark after each number (default 'h', 'm', and 's') [optional]
 * @returns the duration as text, such as '0m' for zero
 */
export function durationText(seconds: number, units?: DurationUnit[], text?: Partial<Record<DurationUnit, string>>): string {
    var list = ORDER.filter(function (u) { return !units || units.indexOf(u) !== -1; });
    if (!list.length) list = ORDER.slice();
    var marks: Record<DurationUnit, string> = Object.assign({}, TEXT, text || {});
    var left = Math.max(0, Math.round(seconds / SECONDS[list[list.length - 1]]) * SECONDS[list[list.length - 1]]);
    var parts: string[] = [];
    list.forEach(function (u, i) {
        var n = Math.floor(left / SECONDS[u]);
        left -= n * SECONDS[u];
        if (n || (i === list.length - 1 && !parts.length)) parts.push(n + marks[u]);
    });
    return parts.join(' ');
}

/**
 * Hours, minutes, and seconds number boxes on one line, each with Base's up and down arrows and its unit inside the box,
 * like the color picker's percent. The value is in seconds. Each box and the whole duration check through the validation
 * core, so a minute of 75 or a duration past max shows the message under the boxes.
 *
 * @param options {
 *   value      : the duration in seconds [optional]
 *   units      : the boxes to show, such as ['h', 'm'] (default ['h', 'm', 's'])
 *   unitText   : the unit shown inside each box, by unit (default 'h', 'm', and 's')
 *   unitLabels : the aria-label of each box, by unit (default 'Hours', 'Minutes', and 'Seconds')
 *   min        : the shortest duration allowed, in seconds [optional]
 *   max        : the longest duration allowed, in seconds [optional]
 *   required   : true requires a duration (default false)
 *   rangeText  : message for a duration outside min and max, with {min} and {max} as durations (default 'Enter a duration from {min} to {max}.')
 *   minText    : message when only min is set (default 'Enter {min} or more.')
 *   maxText    : message when only max is set (default 'Enter {max} or less.')
 *   size       : 'small', 'medium', or 'large' for its fields (default 'medium')
 *   validate   : function(seconds) returning an error sentence, or an empty value when valid, after the range passes [optional]
 *   onChange   : function(seconds) after each change, with null while every box is empty [optional]
 * }
 * @returns { element, inputs, getValue, setValue, isValid, setSize, destroy }. A box below the largest holds 0 to 59, and setValue rounds to the smallest unit shown.
 */
export function createDurationField(options?: DurationFieldOptions): DurationFieldHandle {
    options = options || {};
    var opts = options;
    var units = ORDER.filter(function (u) { return !opts.units || opts.units.indexOf(u) !== -1; });
    if (!units.length) units = ORDER.slice();
    var marks: Record<DurationUnit, string> = Object.assign({}, TEXT, opts.unitText || {});
    var labels: Record<DurationUnit, string> = Object.assign({}, LABELS, opts.unitLabels || {});
    var cleanups: Array<() => void> = [];

    var root = make('div', 'base-duration');
    applyFieldSize(root, opts.size);
    var row = make('div', 'base-duration-row', { role: 'group' });
    var inputs = units.map(function (u, i) {
        var input = make('input', 'base-duration-' + u, { type: 'number', min: '0', step: '1', inputmode: 'numeric', 'data-base-unit': marks[u], 'aria-label': labels[u] });
        // The largest box holds any count, and each smaller one rolls over at 60.
        if (i > 0) input.setAttribute('max', '59');
        row.appendChild(input);
        var adorned = adornField(input);
        cleanups.push(function () { adorned.destroy(); });
        return input;
    });
    root.appendChild(row);
    var message = createFieldMessage({ input: inputs[0] });
    root.appendChild(message.element);

    function value(): number | null {
        if (inputs.every(function (input) { return input.value === ''; })) return null;
        var total = 0;
        inputs.forEach(function (input, i) {
            var n = parseFloat(input.value);
            if (isFinite(n)) total += n * SECONDS[units[i]];
        });
        return total;
    }

    function format(seconds: number | undefined): string { return seconds === undefined ? '' : durationText(seconds, units, marks); }

    // Why the duration is not valid, or '' when it is: a box that breaks its own rules first, then the range of the whole.
    function problemOf(): string {
        for (var i = 0; i < inputs.length; i++) {
            var own = validateValue(inputs[i].value, readRules(inputs[i]), null, inputs[i]);
            if (own) return own;
        }
        var total = value();
        var min = typeof opts.min === 'number' && isFinite(opts.min) ? opts.min : undefined;
        var max = typeof opts.max === 'number' && isFinite(opts.max) ? opts.max : undefined;
        if (total === null) return opts.required ? 'Fill this in.' : (opts.validate ? toText(opts.validate(null)) : '');
        if ((min !== undefined && total < min) || (max !== undefined && total > max)) {
            var text = min !== undefined && max !== undefined ? opts.rangeText || 'Enter a duration from {min} to {max}.' : min !== undefined ? opts.minText || 'Enter {min} or more.' : opts.maxText || 'Enter {max} or less.';
            return fillAll(text, { min: format(min), max: format(max) });
        }
        return opts.validate ? toText(opts.validate(total)) : '';
    }

    function changed(): void { if (opts.onChange) opts.onChange(value()); }

    inputs.forEach(function (input) { cleanups.push(listen(input, 'input', changed)); });
    var validation = bindValidation(inputs[0], {
        message: message,
        inputs: inputs.slice(1),
        rules: { type: null, min: null, max: null, step: null, required: false },
        value: function () { return toText(value()); },
        validate: problemOf
    });
    cleanups.push(validation.destroy);

    function setValue(seconds: number | null | undefined): void {
        if (typeof seconds !== 'number' || !isFinite(seconds)) {
            inputs.forEach(function (input) { input.value = ''; });
        } else {
            var smallest = SECONDS[units[units.length - 1]];
            var left = Math.max(0, Math.round(seconds / smallest) * smallest);
            units.forEach(function (u, i) {
                var n = Math.floor(left / SECONDS[u]);
                left -= n * SECONDS[u];
                inputs[i].value = String(n);
            });
        }
        validation.clear();
    }

    setValue(opts.value);

    return {
        element: root,
        inputs: inputs,
        getValue: value,
        setValue: setValue,
        isValid: function () { return validation.check(); },
        setSize: function (size?: 'small' | 'medium' | 'large') { applyFieldSize(root, size); },
        destroy: function () { runAll(cleanups); message.destroy(); }
    };
}
