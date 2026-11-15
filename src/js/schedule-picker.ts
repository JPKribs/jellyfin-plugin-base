import { make, listen, runAll, applyFieldSize } from './lib/dom.js';
import { bindPressedGroup } from './lib/pressed-group.js';
import { bindValidation } from './lib/validate.js';
import { createFieldMessage } from './field-message.js';
import type { ComponentHandle } from './types.js';

/** A time as "HH:mm", or '' while empty, and days as numbers from 0 for Sunday to 6 for Saturday. */
export interface SchedulePickerValue {
    time: string;
    days: number[];
}

/** What createSchedulePicker takes. weekStart 1 starts the week on Monday. */
export interface SchedulePickerOptions {
    value?: Partial<SchedulePickerValue> | null;
    showTime?: boolean;
    showDays?: boolean;
    weekStart?: number;
    timeLabel?: string;
    daysLabel?: string;
    dayLabels?: string[];
    size?: 'small' | 'medium' | 'large';
    required?: boolean;
    validate?(value: SchedulePickerValue): string | null | undefined;
    onChange?(value: SchedulePickerValue): void;
}

/** What createSchedulePicker returns. */
export interface SchedulePickerHandle extends ComponentHandle {
    getValue(): SchedulePickerValue;
    setValue(next?: Partial<SchedulePickerValue> | null): void;
    setSize(size?: 'small' | 'medium' | 'large'): void;
    isValid(): boolean;
    destroy(): void;
}

var DEFAULT_DAYS: string[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * A time of day and, optionally, days of the week as a group of toggle buttons. The value is plain data, a time as "HH:mm" and days as numbers from 0 for Sunday to 6 for Saturday.
 *
 * @param options {
 *   value      : { time: 'HH:mm', days: array of 0 to 6 } [optional]
 *   showTime   : false hides the time input (default true)
 *   showDays   : false hides the day toggles (default true)
 *   weekStart  : 0 starts the week on Sunday and 1 on Monday (default 0)
 *   timeLabel  : aria-label of the time input (default 'Time')
 *   daysLabel  : aria-label of the day group (default 'Days')
 *   dayLabels  : array of seven labels from Sunday (default 'Sun' to 'Sat', and a shorter array falls back to the default)
 *   size       : 'small', 'medium', or 'large' for its fields (default 'medium')
 *   required   : true makes the time required, checked through the validation core (default false)
 *   validate   : function({ time, days }) returning an error sentence, or an empty value when valid, shown under the time [optional]
 *   onChange   : function({ time, days }) [optional]
 * }
 * @returns { element, getValue, setValue, setSize, isValid, destroy }. isValid checks the time and shows its message. getValue returns { time, days } with days sorted from 0, and time is '' while the input is empty. setValue keeps each whole number day from 0 to 6 once and ignores the rest.
 */
export function createSchedulePicker(options?: SchedulePickerOptions): SchedulePickerHandle {
    options = options || {};
    var labels: string[] = Array.isArray(options.dayLabels) && options.dayLabels.length >= 7 ? options.dayLabels : DEFAULT_DAYS;
    var cleanups: Array<() => void> = [];

    var root = make('div', 'base-schedule');
    applyFieldSize(root, options.size);
    var time = make('input', 'base-schedule-time', { type: 'time', 'aria-label': options.timeLabel || 'Time' });
    time.hidden = options.showTime === false;
    var group = make('div', 'base-toggle-group base-schedule-days', { role: 'group', 'aria-label': options.daysLabel || 'Days' });
    group.hidden = options.showDays === false;
    root.appendChild(time);
    root.appendChild(group);

    var order: number[] = [];
    for (var i = 0; i < 7; i++) order.push(((options.weekStart === 1 ? 1 : 0) + i) % 7);
    order.forEach(function (day) {
        group.appendChild(make('button', 'base-toggle', { type: 'button', 'aria-pressed': 'false', 'data-day': String(day) }, labels[day]));
    });
    var toggles = bindPressedGroup(group, {
        selector: '.base-toggle',
        multiple: true,
        readValue: function (btn: HTMLElement) { return btn.getAttribute('data-day'); },
        onChange: changed
    });
    cleanups.push(toggles.destroy);

    function value(): SchedulePickerValue {
        var days = toggles.getValues().map(function (d) { return parseInt(d!, 10); });
        return { time: time.value || '', days: days.sort(function (a, b) { return a - b; }) };
    }

    function changed(): void { if (options!.onChange) options!.onChange(value()); }

    cleanups.push(listen(time, 'input', changed));
    if (options.required) time.setAttribute('required', '');
    var message = createFieldMessage({ input: time });
    root.appendChild(message.element);
    var validation = bindValidation(time, { message: message, validate: function () { return options!.validate ? options!.validate(value()) : ''; } });
    cleanups.push(validation.destroy);

    function setValue(next?: Partial<SchedulePickerValue> | null): void {
        next = next || {};
        time.value = next.time || '';
        var days: Array<string | null> = [];
        (Array.isArray(next.days) ? next.days : []).forEach(function (d) {
            if (typeof d === 'number' && d % 1 === 0 && d >= 0 && d <= 6) days.push(String(d));
        });
        toggles.setValues(days);
    }

    setValue(options.value);

    return {
        element: root,
        getValue: value,
        setValue: setValue,
        setSize: function (size?: 'small' | 'medium' | 'large') { applyFieldSize(root, size); },
        isValid: function () { return validation.check(); },
        destroy: function () { runAll(cleanups); message.destroy(); }
    };
}
