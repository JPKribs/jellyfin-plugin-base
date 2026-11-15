import { make, listen, runAll, applyFieldSize, toText } from './lib/dom.js';
import { adornField } from './field-adornments.js';
import { createFieldMessage } from './field-message.js';
import { bindValidation, validateValue } from './lib/validate.js';
import type { ComponentHandle } from './types.js';

/** A start and an end time, each as 'HH:MM', or '' while empty. */
export interface TimeRangeValue {
    start: string;
    end: string;
}

/** What createTimeRangeField takes. step is in minutes, and allowOvernight lets the end come before the start. */
export interface TimeRangeFieldOptions {
    value?: Partial<TimeRangeValue> | null;
    step?: number;
    allowOvernight?: boolean;
    required?: boolean;
    startLabel?: string;
    endLabel?: string;
    endBeforeStartText?: string;
    size?: 'small' | 'medium' | 'large';
    validate?(value: TimeRangeValue): string | null | undefined;
    onChange?(value: TimeRangeValue): void;
}

/** What createTimeRangeField returns. start and end are the two time boxes. */
export interface TimeRangeFieldHandle extends ComponentHandle {
    start: HTMLInputElement;
    end: HTMLInputElement;
    getValue(): TimeRangeValue;
    setValue(next?: Partial<TimeRangeValue> | null): void;
    isValid(): boolean;
    setSize(size?: 'small' | 'medium' | 'large'): void;
    destroy(): void;
}

var TIME = /^(\d{1,2}):(\d{2})/;

function pad(n: number): string { return (n < 10 ? '0' : '') + n; }

/**
 * Reads a time as decimal hours, as Jellyfin stores an access schedule, such as '09:30' as 9.5. With end, '00:00' reads as 24, midnight at the end of the day.
 *
 * @param time the time as 'HH:MM'
 * @param end true for the end of a range [optional]
 * @returns the hours from 0 to 24, or null when the text is not a time
 */
export function toHours(time: string, end?: boolean): number | null {
    var m = TIME.exec(toText(time));
    if (!m) return null;
    var h = parseInt(m[1], 10);
    var min = parseInt(m[2], 10);
    if (h > 23 || min > 59) return null;
    var hours = h + min / 60;
    return end && hours === 0 ? 24 : hours;
}

/**
 * Writes decimal hours as a time, such as 9.5 as '09:30'. 24 is midnight, '00:00', and an hour outside 0 to 24 is clamped.
 *
 * @param hours the hours from 0 to 24
 * @returns the time as 'HH:MM', or '' when hours is not a number
 */
export function fromHours(hours: number): string {
    if (typeof hours !== 'number' || !isFinite(hours)) return '';
    var minutes = Math.round(Math.max(0, Math.min(24, hours)) * 60) % (24 * 60);
    return pad(Math.floor(minutes / 60)) + ':' + pad(minutes % 60);
}

/**
 * Moves a time to the nearest one a step of minutes allows, counted from midnight, such as '09:20' to '09:30' with a step of 30.
 *
 * @param time the time as 'HH:MM'
 * @param step the minutes between allowed times
 * @returns the snapped time, or the text as it was when it is not a time or the step is not positive
 */
export function snapTime(time: string, step: number): string {
    var hours = toHours(time);
    if (hours === null || !(step > 0)) return time;
    var minutes = Math.round(Math.round(hours * 60) / step) * step;
    return fromHours(Math.min(minutes, 24 * 60 - step) / 60);
}

/**
 * Two time boxes, a start and an end, each with the time field's clock icon inside. A typed time moves to the nearest one the
 * step allows, and without allowOvernight an end at or before the start is an error, through the validation core. An end of
 * '00:00' is midnight at the end of the day, so 22:00 to 00:00 is valid. toHours and fromHours convert to and from Jellyfin's decimal hours.
 *
 * @param options {
 *   value              : { start, end } as 'HH:MM' [optional]
 *   step               : minutes between allowed times (default 30)
 *   allowOvernight     : true lets the end come before the start, for a range that runs past midnight (default false)
 *   required           : true requires both times (default false)
 *   startLabel         : aria-label of the start box (default 'Start')
 *   endLabel           : aria-label of the end box (default 'End')
 *   endBeforeStartText : message for an end at or before the start (default 'End must be after the start.')
 *   size               : 'small', 'medium', or 'large' for its fields (default 'medium')
 *   validate           : function({ start, end }) returning an error sentence, or an empty value when valid [optional]
 *   onChange           : function({ start, end }) [optional]
 * }
 * @returns { element, start, end, getValue, setValue, isValid, setSize, destroy }. setValue keeps a time off the step as it is, and isValid checks both times and shows the message.
 */
export function createTimeRangeField(options?: TimeRangeFieldOptions): TimeRangeFieldHandle {
    options = options || {};
    var opts = options;
    var step = typeof opts.step === 'number' && opts.step > 0 && isFinite(opts.step) ? opts.step : 30;
    var cleanups: Array<() => void> = [];

    var root = make('div', 'base-time-range');
    applyFieldSize(root, opts.size);
    var row = make('div', 'base-time-range-row');
    var start = make('input', 'base-time-range-start', { type: 'time', step: String(step * 60), 'aria-label': opts.startLabel || 'Start' });
    var end = make('input', 'base-time-range-end', { type: 'time', step: String(step * 60), 'aria-label': opts.endLabel || 'End' });
    row.appendChild(start);
    row.appendChild(end);
    root.appendChild(row);
    var adornments = [adornField(start), adornField(end)];
    cleanups.push(function () { adornments.forEach(function (a) { a.destroy(); }); });
    var message = createFieldMessage({ input: end });
    root.appendChild(message.element);

    function value(): TimeRangeValue { return { start: start.value || '', end: end.value || '' }; }

    // Why the range is not valid, or '' when it is.
    function problemOf(): string {
        var rules = { type: 'time', required: !!opts.required };
        var v = value();
        var bad = validateValue(v.start, rules) || validateValue(v.end, rules);
        if (bad) return bad;
        var from = toHours(v.start);
        var to = toHours(v.end, true);
        if (!opts.allowOvernight && from !== null && to !== null && to <= from) return opts.endBeforeStartText || 'End must be after the start.';
        return opts.validate ? toText(opts.validate(v)) : '';
    }

    function snap(input: HTMLInputElement): void {
        var snapped = snapTime(input.value, step);
        if (snapped !== input.value) input.value = snapped;
    }

    function changed(): void { if (opts.onChange) opts.onChange(value()); }

    [start, end].forEach(function (input) {
        cleanups.push(listen(input, 'change', function () { snap(input); changed(); }));
        cleanups.push(listen(input, 'input', changed));
    });
    var validation = bindValidation(end, { message: message, inputs: [start], rules: { type: null }, value: function () { return value().end; }, validate: problemOf });
    cleanups.push(validation.destroy);

    function setValue(next?: Partial<TimeRangeValue> | null): void {
        next = next || {};
        start.value = toText(next.start);
        end.value = toText(next.end);
        validation.clear();
    }

    setValue(opts.value);

    return {
        element: root,
        start: start,
        end: end,
        getValue: value,
        setValue: setValue,
        isValid: function () { return validation.check(); },
        setSize: function (size?: 'small' | 'medium' | 'large') { applyFieldSize(root, size); },
        destroy: function () { runAll(cleanups); message.destroy(); }
    };
}
