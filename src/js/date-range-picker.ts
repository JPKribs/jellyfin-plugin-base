import { make, listen, runAll, applyFieldSize, toText } from './lib/dom.js';
import { bindPressedGroup } from './lib/pressed-group.js';
import { adornField } from './field-adornments.js';
import { createFieldMessage } from './field-message.js';
import { bindValidation, validateValue } from './lib/validate.js';
import type { ComponentHandle } from './types.js';

/** A range of days, each as 'YYYY-MM-DD', or '' while open on that side. */
export interface DateRangeValue {
    from: string;
    to: string;
}

/** One preset pill. days sets the range to that many days ending today, so 1 is today, and no days is Custom, which leaves the dates to the reader. */
export interface DateRangePreset {
    value: string;
    label: string;
    days?: number | null;
}

/** What createDateRangePicker takes. today sets the day the presets count back from, mostly for tests. */
export interface DateRangePickerOptions {
    value?: Partial<DateRangeValue> | null;
    presets?: DateRangePreset[] | null;
    today?: string;
    min?: string;
    max?: string;
    required?: boolean;
    fromLabel?: string;
    toLabel?: string;
    presetsLabel?: string;
    endBeforeStartText?: string;
    size?: 'small' | 'medium' | 'large';
    validate?(value: DateRangeValue): string | null | undefined;
    onChange?(value: DateRangeValue): void;
}

/** What createDateRangePicker returns. from and to are the two date boxes, and getPreset reads the pressed preset. */
export interface DateRangePickerHandle extends ComponentHandle {
    from: HTMLInputElement;
    to: HTMLInputElement;
    getValue(): DateRangeValue;
    setValue(next?: Partial<DateRangeValue> | null): void;
    getPreset(): string | null;
    isValid(): boolean;
    setSize(size?: 'small' | 'medium' | 'large'): void;
    destroy(): void;
}

/** The presets a date range picker shows by default. */
export var DATE_RANGE_PRESETS: DateRangePreset[] = [
    { value: 'today', label: 'Today', days: 1 },
    { value: '7d', label: 'Last 7 Days', days: 7 },
    { value: '30d', label: 'Last 30 Days', days: 30 },
    { value: 'custom', label: 'Custom' }
];

function pad(n: number): string { return (n < 10 ? '0' : '') + n; }

/**
 * Reads a date as the local day it falls on, as 'YYYY-MM-DD'. A 'YYYY-MM-DD' text stays as it is, and a Date, a time in
 * milliseconds, or an ISO text with a time reads in the local time zone.
 *
 * @param value the date
 * @returns the day, or '' when it is not a date
 */
export function dateKey(value: unknown): string {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    if (value === null || value === undefined || value === '') return '';
    var date = value instanceof Date ? value : new Date(value as string | number);
    if (isNaN(date.getTime())) return '';
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

/**
 * Moves a day by a number of days, such as '2026-03-01' back one to '2026-02-28'.
 *
 * @param day the day as 'YYYY-MM-DD'
 * @param days how many days to move, back when negative
 * @returns the new day, or '' when day is not a date
 */
export function shiftDays(day: string, days: number): string {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(toText(day));
    if (!m) return '';
    return dateKey(new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10) + days));
}

/**
 * Two date boxes, from and to, each with the date field's calendar icon inside, under a row of preset pills on the pressed
 * group: Today, Last 7 Days, Last 30 Days, and Custom by default. A preset fills both dates, a second click on it clears
 * them, and typing dates presses the matching preset, or Custom. An end before the start is an error through the validation core.
 *
 * @param options {
 *   value              : { from, to } as 'YYYY-MM-DD' [optional]
 *   presets            : array of { value, label, days }, where days counts back from today and no days is Custom, or [] for none (default Today, Last 7 Days, Last 30 Days, and Custom)
 *   today              : the day presets count back from, as 'YYYY-MM-DD' (default the local date)
 *   min                : the earliest day allowed [optional]
 *   max                : the latest day allowed [optional]
 *   required           : true requires both dates (default false)
 *   fromLabel          : aria-label of the from box (default 'From')
 *   toLabel            : aria-label of the to box (default 'To')
 *   presetsLabel       : aria-label of the preset group (default 'Range')
 *   endBeforeStartText : message for an end before the start (default 'End must be on or after the start.')
 *   size               : 'small', 'medium', or 'large' for its fields (default 'medium')
 *   validate           : function({ from, to }) returning an error sentence, or an empty value when valid [optional]
 *   onChange           : function({ from, to }) after each change [optional]
 * }
 * @returns { element, from, to, getValue, setValue, getPreset, isValid, setSize, destroy }. setValue presses the matching preset and calls no onChange.
 */
export function createDateRangePicker(options?: DateRangePickerOptions): DateRangePickerHandle {
    options = options || {};
    var opts = options;
    var presets: DateRangePreset[] = Array.isArray(opts.presets) ? opts.presets : DATE_RANGE_PRESETS;
    var custom = presets.filter(function (p) { return !p.days; })[0] || null;
    var cleanups: Array<() => void> = [];

    var root = make('div', 'base-date-range');
    applyFieldSize(root, opts.size);
    var pills = make('div', 'base-pill-group base-date-range-presets', { role: 'group', 'aria-label': opts.presetsLabel || 'Range' });
    pills.hidden = !presets.length;
    presets.forEach(function (p) {
        pills.appendChild(make('button', 'base-pill', { type: 'button', 'data-value': p.value, 'aria-pressed': 'false' }, p.label));
    });
    var row = make('div', 'base-date-range-row');
    var from = make('input', 'base-date-range-from', { type: 'date', 'aria-label': opts.fromLabel || 'From' });
    var to = make('input', 'base-date-range-to', { type: 'date', 'aria-label': opts.toLabel || 'To' });
    [from, to].forEach(function (input) {
        if (opts.min) input.setAttribute('min', opts.min);
        if (opts.max) input.setAttribute('max', opts.max);
        row.appendChild(input);
    });
    root.appendChild(pills);
    root.appendChild(row);
    var adornments = [adornField(from), adornField(to)];
    cleanups.push(function () { adornments.forEach(function (a) { a.destroy(); }); });
    var message = createFieldMessage({ input: to });
    root.appendChild(message.element);

    function today(): string { return opts.today || dateKey(new Date()); }

    function value(): DateRangeValue { return { from: from.value || '', to: to.value || '' }; }

    function rangeOf(preset: DateRangePreset): DateRangeValue {
        var end = today();
        return { from: shiftDays(end, 1 - (preset.days as number)), to: end };
    }

    // The preset that matches the dates: a counted one with the same range, else Custom while a date is set.
    function matching(v: DateRangeValue): string | null {
        if (!v.from && !v.to) return null;
        var hit = presets.filter(function (p) {
            if (!p.days) return false;
            var r = rangeOf(p);
            return r.from === v.from && r.to === v.to;
        })[0];
        return hit ? hit.value : custom ? custom.value : null;
    }

    function changed(): void { if (opts.onChange) opts.onChange(value()); }

    var group = bindPressedGroup(pills, {
        selector: '.base-pill',
        clearable: true,
        onChange: function (values) {
            var picked = presets.filter(function (p) { return p.value === values[0]; })[0];
            if (!picked) {
                from.value = '';
                to.value = '';
            } else if (picked.days) {
                var r = rangeOf(picked);
                from.value = r.from;
                to.value = r.to;
            } else {
                from.focus();
                return;
            }
            validation.check();
            changed();
        }
    });
    cleanups.push(group.destroy);

    [from, to].forEach(function (input) {
        cleanups.push(listen(input, 'input', function () { group.setValues([matching(value())]); changed(); }));
    });

    // Why the range is not valid, or '' when it is.
    function problemOf(): string {
        var v = value();
        var rules = { type: 'date', required: !!opts.required, min: opts.min || null, max: opts.max || null };
        var bad = validateValue(v.from, rules) || validateValue(v.to, rules);
        if (bad) return bad;
        if (v.from && v.to && v.to < v.from) return opts.endBeforeStartText || 'End must be on or after the start.';
        return opts.validate ? toText(opts.validate(v)) : '';
    }

    var validation = bindValidation(to, { message: message, inputs: [from], rules: { type: null, min: null, max: null }, value: function () { return value().to; }, validate: problemOf });
    cleanups.push(validation.destroy);

    function setValue(next?: Partial<DateRangeValue> | null): void {
        next = next || {};
        from.value = dateKey(next.from);
        to.value = dateKey(next.to);
        group.setValues([matching(value())]);
        validation.clear();
    }

    setValue(opts.value);

    return {
        element: root,
        from: from,
        to: to,
        getValue: value,
        setValue: setValue,
        getPreset: function () { var v = group.getValues(); return v.length ? v[0] : null; },
        isValid: function () { return validation.check(); },
        setSize: function (size?: 'small' | 'medium' | 'large') { applyFieldSize(root, size); },
        destroy: function () { runAll(cleanups); message.destroy(); }
    };
}
