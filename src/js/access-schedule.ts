import { make, iconButton, listen, nextId, has, applyFieldSize } from './lib/dom.js';
import { createTimeRangeField, toHours, fromHours } from './time-range-field.js';
import type { TimeRangeFieldHandle } from './time-range-field.js';
import { createRowSet, rowLabel } from './lib/row-editor.js';
import type { ListHeight } from './list.js';
import type { ComponentHandle } from './types.js';
import { baseText } from './lib/base-text.js';
import type { BASE_TEXT } from './lib/base-text.js';

/** A day choice of a window, as Jellyfin's DynamicDayOfWeek names it. */
export type AccessScheduleDay = 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Everyday' | 'Weekday' | 'Weekend';

/** One time window in Jellyfin's AccessSchedule shape. The hours run from 0 to 24, where 0.5 is 12:30 AM and 24 is midnight at the end of the day. */
export interface AccessScheduleWindow {
    DayOfWeek: AccessScheduleDay;
    StartHour: number;
    EndHour: number;
}

/** A window to load. DayOfWeek may also be the enum number from 0 for Sunday to 9 for Weekend, and an hour may be a numeric string. */
export interface AccessScheduleSource {
    DayOfWeek?: AccessScheduleDay | string | number | null;
    StartHour?: number | string | null;
    EndHour?: number | string | null;
}

/** What createAccessSchedule takes. dayLabels replaces any of the day names by its DayOfWeek key. */
export interface AccessScheduleOptions {
    value?: AccessScheduleSource[] | null;
    label?: string;
    description?: string;
    dayLabel?: string;
    startLabel?: string;
    endLabel?: string;
    addText?: string;
    removeText?: string;
    windowText?: string;
    emptyText?: string;
    endBeforeStartText?: string;
    dayLabels?: Partial<Record<AccessScheduleDay, string>>;
    step?: number;
    maxRows?: number;
    limitText?: string;
    height?: ListHeight;
    maxHeight?: number | string | null;
    minHeight?: number | string | null;
    size?: 'small' | 'medium' | 'large';
    onChange?(value: AccessScheduleWindow[]): void;
}

/** What createAccessSchedule returns. getValue returns every row, and isValid checks every row and shows its error. */
export interface AccessScheduleHandle extends ComponentHandle {
    getValue(): AccessScheduleWindow[];
    setValue(next: AccessScheduleSource[] | null): void;
    isValid(): boolean;
    setHeight(height: ListHeight, maxHeight?: number | string | null): void;
    destroy(): void;
}

// AccessScheduleRow
// The elements and listeners of one window row.
interface AccessScheduleRow {
    element: HTMLDivElement;
    focus: HTMLSelectElement;
    day: HTMLSelectElement;
    range: TimeRangeFieldHandle;
    loaded: { start: string; end: string; startHour: number; endHour: number };
    remove: HTMLButtonElement;
    off: Array<() => void>;
    label(): void;
    destroy(): void;
}

var DAYS: AccessScheduleDay[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Everyday', 'Weekday', 'Weekend'];
var DAY_NAMES: Record<AccessScheduleDay, keyof typeof BASE_TEXT> = {
    Sunday: 'Sunday', Monday: 'Monday', Tuesday: 'Tuesday', Wednesday: 'Wednesday', Thursday: 'Thursday', Friday: 'Friday', Saturday: 'Saturday',
    Everyday: 'OptionEveryday', Weekday: 'OptionWeekdays', Weekend: 'OptionWeekends'
};

// formatScheduleHour
// Formats an hour from 0 to 24 as the user's locale time, such as "1:30 AM", or as "01:30" where the locale form fails. 24 reads as midnight.
function formatScheduleHour(hour: number): string {
    var minutes = Math.round(hour * 60);
    var h = Math.floor(minutes / 60);
    var m = minutes % 60;
    var text = '';
    try {
        text = new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    } catch (e) {
        text = '';
    }
    return text || (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
}

/**
 * A list of time windows, each a day choice and a start and end time, with Add and Remove, like Jellyfin's parental control access schedule. The value is Jellyfin's AccessSchedule shape, so a plugin can pass it straight through.
 * The start and end are a Time Range Field, so each is a time box with its clock icon, and an end of 00:00 is midnight at the end of the day.
 *
 * @param options {
 *   value              : array of { DayOfWeek, StartHour, EndHour } [optional]
 *   label              : heading above the list [optional]
 *   description        : sentence under the heading, which describes the group [optional]
 *   dayLabel           : column label and aria-label of the day selects (default 'Day')
 *   startLabel         : column label and aria-label of the start boxes (default 'Start')
 *   endLabel           : column label and aria-label of the end boxes (default 'End')
 *   addText            : text of the add button (default 'Add window')
 *   removeText         : aria-label of a remove button, where {value} is the window from windowText (default 'Remove {value}')
 *   windowText         : name of a window, with {day}, {start}, and {end} (default '{day} {start} to {end}')
 *   emptyText          : sentence shown while there is no window (default 'No windows. Access is allowed at any time.')
 *   endBeforeStartText : message for an end at or before the start (default 'The end must be after the start.')
 *   dayLabels          : object that replaces day names by DayOfWeek key, such as { Everyday: 'Daily' } [optional]
 *   step               : hours between allowed times, where a typed time moves to the nearest one (default 0.5)
 *   maxRows            : most windows allowed, after which Add is disabled and the limit message shows [optional]
 *   limitText          : message when maxRows is reached (default 'No more rows can be added.')
 *   height             : height of the rows, as createList takes it (default 'auto')
 *   maxHeight          : height past which the rows scroll [optional]
 *   minHeight          : least height of a filling list [optional]
 *   size               : 'small', 'medium', or 'large' for its fields (default 'medium')
 *   onChange           : function(windows) [optional]
 * }
 * @returns { element, getValue, setValue, isValid, setHeight, destroy }. getValue returns every row, valid or not, as { DayOfWeek, StartHour, EndHour }. isValid() checks every row, shows its error, and returns true when every end is after its start.
 * A new window is Everyday from 0 to 24. An unknown DayOfWeek reads as 'Everyday', and an hour outside 0 to 24 is clamped. A loaded hour reads back exactly until its time is edited.
 */
export function createAccessSchedule(options?: AccessScheduleOptions): AccessScheduleHandle {
    options = options || {};
    var step = typeof options.step === 'number' && options.step > 0 && options.step <= 12 && isFinite(options.step) ? options.step : 0.5;
    var dayLabel = options.dayLabel || baseText('Base.Day');
    var startLabel = options.startLabel || baseText('Base.Start');
    var endLabel = options.endLabel || baseText('Base.End');

    var root = make('div', 'base-access-schedule', { role: 'group' });
    applyFieldSize(root, options.size);
    var heading = make('div', 'base-access-schedule-label', { id: nextId('access') }, options.label || '');
    heading.hidden = !options.label;
    if (options.label) root.setAttribute('aria-labelledby', heading.id);
    var description = make('div', 'base-access-schedule-description', { id: nextId('access-description') }, options.description || '');
    description.hidden = !options.description;
    if (options.description) root.setAttribute('aria-describedby', description.id);
    var head = make('div', 'base-access-schedule-head', { 'aria-hidden': 'true' });
    head.appendChild(make('span', '', null, dayLabel));
    head.appendChild(make('span', '', null, startLabel));
    head.appendChild(make('span', '', null, endLabel));
    var body = make('div', 'base-access-schedule-rows');
    var addButton = make('button', 'raised base-button small base-access-schedule-add', { type: 'button' }, options.addText || baseText('Base.AddWindow'));
    var set = createRowSet<AccessScheduleSource, AccessScheduleRow>({
        body: body,
        build: buildRow,
        addButton: addButton,
        maxRows: options.maxRows,
        limitText: options.limitText,
        emptyText: options.emptyText || baseText('Base.NoWindows'),
        emptyClass: 'base-access-schedule-empty',
        height: options.height,
        maxHeight: options.maxHeight,
        minHeight: options.minHeight,
        onChange: changed,
        onCount: function (count) { head.hidden = !count; }
    });
    root.appendChild(heading);
    root.appendChild(description);
    root.appendChild(head);
    root.appendChild(body);
    root.appendChild(set.empty);
    root.appendChild(addButton);
    root.appendChild(set.limit);

    function dayName(day: AccessScheduleDay): string {
        var custom = options!.dayLabels;
        return custom && has(custom, day) && custom[day] ? String(custom[day]) : baseText(DAY_NAMES[day]);
    }

    function toDay(raw: unknown): AccessScheduleDay {
        if (typeof raw === 'number' && raw % 1 === 0 && raw >= 0 && raw < DAYS.length) return DAYS[raw];
        var text = String(raw == null ? '' : raw).toLowerCase();
        return DAYS.filter(function (d) { return d.toLowerCase() === text; })[0] || 'Everyday';
    }

    function toHour(raw: unknown, fallback: number): number {
        var n = typeof raw === 'number' ? raw : parseFloat(String(raw));
        if (!isFinite(n)) return fallback;
        return Math.max(0, Math.min(24, n));
    }

    // A time still as it was loaded reads back as the loaded hour, so a stored hour such as 9.3333 is kept exactly.
    function read(row: AccessScheduleRow): AccessScheduleWindow {
        var v = row.range.getValue();
        var loaded = row.loaded;
        var startHour = v.start === loaded.start ? loaded.startHour : toHours(v.start);
        var endHour = v.end === loaded.end ? loaded.endHour : toHours(v.end, true);
        return { DayOfWeek: toDay(row.day.value), StartHour: startHour === null ? 0 : startHour, EndHour: endHour === null ? 24 : endHour };
    }

    function snapshot(): AccessScheduleWindow[] { return set.rows().map(read); }

    // Checks the row's times through the validation core, shows its message, and returns whether the row is valid.
    function check(row: AccessScheduleRow): boolean {
        var ok = row.range.isValid();
        row.element.classList.toggle('error', !ok);
        return ok;
    }

    function label(row: AccessScheduleRow): void {
        var w = read(row);
        var name = (options!.windowText || baseText('Base.WindowName'))
            .replace(/\{day\}/g, function () { return dayName(w.DayOfWeek); })
            .replace(/\{start\}/g, function () { return formatScheduleHour(w.StartHour); })
            .replace(/\{end\}/g, function () { return formatScheduleHour(w.EndHour); });
        var text = rowLabel(options!.removeText, baseText('Base.RemoveValue'), name);
        row.remove.title = text;
        row.remove.setAttribute('aria-label', text);
    }

    function changed(): void {
        if (options!.onChange) options!.onChange(snapshot());
    }

    // Builds one window row with its selects and listeners. The row set wires its Remove.
    function buildRow(data: AccessScheduleSource | null | undefined): AccessScheduleRow {
        data = data || {};
        var el = make('div', 'base-access-schedule-row');
        var fields = make('div', 'base-access-schedule-fields');
        var day = make('select', 'base-access-schedule-day', { 'aria-label': dayLabel });
        DAYS.forEach(function (d) { day.appendChild(make('option', '', { value: d }, dayName(d))); });
        day.value = toDay(data.DayOfWeek);
        var startHour = toHour(data.StartHour, 0);
        var endHour = toHour(data.EndHour, 24);
        var loaded = { start: fromHours(startHour), end: fromHours(endHour), startHour: startHour, endHour: endHour };
        var range = createTimeRangeField({
            value: { start: loaded.start, end: loaded.end },
            step: Math.round(step * 60),
            required: true,
            startLabel: startLabel,
            endLabel: endLabel,
            endBeforeStartText: options!.endBeforeStartText || baseText('Base.EndAfterStart')
        });
        range.element.classList.add('base-access-schedule-range');
        range.start.classList.add('base-access-schedule-start');
        range.end.classList.add('base-access-schedule-end');
        var remove = iconButton('base-row-btn base-access-schedule-remove', 'close', '');
        var row: AccessScheduleRow = {
            element: el, focus: day, day: day, range: range, loaded: loaded, remove: remove, off: [],
            label: function () { label(row); },
            destroy: function () { range.destroy(); }
        };
        function edit(): void { check(row); label(row); changed(); }
        row.off.push(listen(day, 'change', edit));
        row.off.push(listen(range.start, 'change', edit));
        row.off.push(listen(range.end, 'change', edit));
        fields.appendChild(day);
        fields.appendChild(range.element);
        fields.appendChild(remove);
        el.appendChild(fields);
        check(row);
        return row;
    }

    function setValue(next: AccessScheduleSource[] | null | undefined): void {
        set.set((Array.isArray(next) ? next : []).filter(function (w) { return !!w && typeof w === 'object'; }));
    }

    setValue(options.value);

    return {
        element: root,
        getValue: snapshot,
        setValue: setValue,
        isValid: function () { return set.rows().map(check).every(Boolean); },
        setHeight: function (height: ListHeight, maxHeight?: number | string | null) { set.setHeight(height, maxHeight); },
        destroy: function () { set.destroy(); }
    };
}
