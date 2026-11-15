import { make, listen, runAll } from './dom-util.js';

var DEFAULT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// createSchedulePicker
// A time of day and, optionally, days of the week as a group of toggle buttons. The value is plain data, a time as "HH:mm" and days as numbers from 0 for Sunday to 6 for Saturday.
//
// Param: options | {
//   value      : { time: 'HH:mm', days: array of 0 to 6 } [optional]
//   showTime   : false hides the time input (default true)
//   showDays   : false hides the day toggles (default true)
//   weekStart  : 0 starts the week on Sunday and 1 on Monday (default 0)
//   timeLabel  : aria-label of the time input (default 'Time')
//   daysLabel  : aria-label of the day group (default 'Days')
//   dayLabels  : array of seven labels from Sunday (default 'Sun' to 'Sat', and a shorter array falls back to the default)
//   onChange   : function({ time, days }) [optional]
// }
// Returns { element, getValue, setValue, destroy }. getValue returns { time, days } with days sorted from 0, and time is '' while the input is empty. setValue keeps each whole number day from 0 to 6 once and ignores the rest.
export function createSchedulePicker(options) {
    options = options || {};
    var labels = Array.isArray(options.dayLabels) && options.dayLabels.length >= 7 ? options.dayLabels : DEFAULT_DAYS;
    var cleanups = [];
    var days = [];

    var root = make('div', 'jpk-schedule');
    var time = make('input', 'jpk-schedule-time', { type: 'time', 'aria-label': options.timeLabel || 'Time' });
    time.hidden = options.showTime === false;
    var group = make('div', 'jpk-toggle-group jpk-schedule-days', { role: 'group', 'aria-label': options.daysLabel || 'Days' });
    group.hidden = options.showDays === false;
    root.appendChild(time);
    root.appendChild(group);

    var order = [];
    for (var i = 0; i < 7; i++) order.push(((options.weekStart === 1 ? 1 : 0) + i) % 7);
    var buttons = order.map(function (day) {
        var btn = make('button', 'jpk-toggle', { type: 'button', 'aria-pressed': 'false', 'data-day': String(day) }, labels[day]);
        group.appendChild(btn);
        return btn;
    });

    function value() { return { time: time.value || '', days: days.slice().sort(function (a, b) { return a - b; }) }; }

    function reflect() {
        buttons.forEach(function (btn) { btn.setAttribute('aria-pressed', days.indexOf(parseInt(btn.getAttribute('data-day'), 10)) === -1 ? 'false' : 'true'); });
    }

    function changed() { if (options.onChange) options.onChange(value()); }

    buttons.forEach(function (btn) {
        cleanups.push(listen(btn, 'click', function () {
            var day = parseInt(btn.getAttribute('data-day'), 10);
            var at = days.indexOf(day);
            if (at === -1) days.push(day); else days.splice(at, 1);
            reflect();
            changed();
        }));
    });
    cleanups.push(listen(time, 'input', changed));

    function setValue(next) {
        next = next || {};
        time.value = next.time || '';
        days = [];
        (Array.isArray(next.days) ? next.days : []).forEach(function (d) {
            if (typeof d === 'number' && d % 1 === 0 && d >= 0 && d <= 6 && days.indexOf(d) === -1) days.push(d);
        });
        reflect();
    }

    setValue(options.value);

    return {
        element: root,
        getValue: value,
        setValue: setValue,
        destroy: function () { runAll(cleanups); }
    };
}
