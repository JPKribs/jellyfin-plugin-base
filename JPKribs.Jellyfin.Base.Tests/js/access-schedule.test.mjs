// Behavior tests for createAccessSchedule, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, all } from './fake-dom.mjs';

var dom = installFakeDom();
var { createAccessSchedule } = await import('../../src/js/index.js');

beforeEach(function () {
    dom = installFakeDom();
});

function build(extra) {
    var changes = [];
    var schedule = createAccessSchedule(Object.assign({
        value: [{ DayOfWeek: 'Monday', StartHour: 1, EndHour: 5.5 }, { DayOfWeek: 'Weekend', StartHour: 20, EndHour: 24 }],
        onChange: function (v) { changes.push(v); }
    }, extra));
    dom.document.body.appendChild(schedule.element);
    return { schedule: schedule, changes: changes };
}

function rows(ui) { return all(ui.schedule.element, '.base-access-schedule-row'); }
function selects(row) { return all(row, 'select'); }
function times(row) { return all(row, 'input[type="time"]'); }
function pick(select, value) { select.value = String(value); select.dispatch('change'); }
function setTime(input, value) { input.value = value; input.dispatch('input'); input.dispatch('change'); }
function add(ui) { ui.schedule.element.querySelector('.base-access-schedule-add').click(); }
function texts(select) { return all(select, 'option').map(function (o) { return o.textContent; }); }
function hour(h, m) { return new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); }

test('it draws a row per window with a day, a start and end time box, and a remove button', function () {
    var ui = build();
    assert.equal(rows(ui).length, 2);
    assert.equal(selects(rows(ui)[0])[0].value, 'Monday');
    assert.deepEqual(times(rows(ui)[0]).map(function (t) { return t.value; }), ['01:00', '05:30']);
    assert.deepEqual(times(rows(ui)[1]).map(function (t) { return t.value; }), ['20:00', '00:00']);
    assert.ok(rows(ui)[0].querySelector('.base-access-schedule-remove'));
    assert.ok(rows(ui)[0].querySelector('.base-time-range .base-adorned-picker .base-access-schedule-start'));
    assert.deepEqual(ui.schedule.getValue(), [{ DayOfWeek: 'Monday', StartHour: 1, EndHour: 5.5 }, { DayOfWeek: 'Weekend', StartHour: 20, EndHour: 24 }]);
});

test('the day select lists every Jellyfin day choice with the default names', function () {
    var ui = build();
    var day = selects(rows(ui)[0])[0];
    assert.deepEqual(all(day, 'option').map(function (o) { return o.value; }), ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Everyday', 'Weekday', 'Weekend']);
    assert.deepEqual(texts(day).slice(7), ['Every day', 'Weekdays', 'Weekends']);
});

test('dayLabels replaces some day names and keeps the rest', function () {
    var ui = build({ dayLabels: { Everyday: 'Daily', Monday: 'Mon' } });
    var day = selects(rows(ui)[0])[0];
    assert.equal(texts(day)[1], 'Mon');
    assert.equal(texts(day)[7], 'Daily');
    assert.equal(texts(day)[0], 'Sunday');
});

test('the time boxes step by the step in hours, and a bad step falls back to half an hour', function () {
    var ui = build();
    assert.equal(times(rows(ui)[0])[0].getAttribute('step'), '1800');
    var hourly = build({ step: 1 });
    assert.equal(times(rows(hourly)[0])[0].getAttribute('step'), '3600');
    var bad = build({ step: -2 });
    assert.equal(times(rows(bad)[0])[0].getAttribute('step'), '1800');
});

test('a typed time moves to the nearest step and reads back as decimal hours', function () {
    var ui = build();
    setTime(times(rows(ui)[0])[1], '07:20');
    assert.equal(times(rows(ui)[0])[1].value, '07:30');
    assert.equal(ui.schedule.getValue()[0].EndHour, 7.5);
});

test('a loaded hour off the step is kept exactly until it is edited', function () {
    var ui = build({ value: [{ DayOfWeek: 'Friday', StartHour: 9.25, EndHour: 10 }, { DayOfWeek: 'Friday', StartHour: 1 / 3, EndHour: 2 }] });
    assert.equal(times(rows(ui)[0])[0].value, '09:15');
    assert.deepEqual(ui.schedule.getValue(), [{ DayOfWeek: 'Friday', StartHour: 9.25, EndHour: 10 }, { DayOfWeek: 'Friday', StartHour: 1 / 3, EndHour: 2 }]);
});

test('setValue reads enum numbers, any case, and numeric strings, and clamps and defaults the rest', function () {
    var ui = build();
    ui.schedule.setValue([{ DayOfWeek: 1, StartHour: '2', EndHour: '30' }, { DayOfWeek: 'weekday', StartHour: -1, EndHour: 3 }, { DayOfWeek: 'Someday' }, null]);
    assert.deepEqual(ui.schedule.getValue(), [
        { DayOfWeek: 'Monday', StartHour: 2, EndHour: 24 },
        { DayOfWeek: 'Weekday', StartHour: 0, EndHour: 3 },
        { DayOfWeek: 'Everyday', StartHour: 0, EndHour: 24 }
    ]);
});

test('editing a day or a time reports every window through onChange', function () {
    var ui = build();
    pick(selects(rows(ui)[0])[0], 'Tuesday');
    setTime(times(rows(ui)[0])[1], '08:00');
    assert.deepEqual(ui.changes[ui.changes.length - 1][0], { DayOfWeek: 'Tuesday', StartHour: 1, EndHour: 8 });
    assert.equal(ui.changes[1].length, 2);
});

test('an end at or before the start is an error on that row, and getValue still returns the row', function () {
    var ui = build();
    var end = times(rows(ui)[0])[1];
    setTime(times(rows(ui)[0])[0], '06:00');
    assert.equal(end.getAttribute('aria-invalid'), 'true');
    assert.equal(rows(ui)[0].querySelector('.base-field-message-text').textContent, 'The end must be after the start.');
    assert.ok(rows(ui)[0].className.indexOf('error') !== -1);
    assert.equal(ui.schedule.isValid(), false);
    assert.equal(ui.schedule.getValue()[0].StartHour, 6);
    setTime(end, '07:00');
    assert.equal(end.getAttribute('aria-invalid'), null);
    assert.equal(ui.schedule.isValid(), true);
});

test('a loaded window that ends at its start shows the error at once, and endBeforeStartText replaces it', function () {
    var ui = build({ value: [{ DayOfWeek: 'Sunday', StartHour: 3, EndHour: 3 }], endBeforeStartText: 'Too short.' });
    assert.equal(rows(ui)[0].querySelector('.base-field-message-text').textContent, 'Too short.');
    assert.equal(ui.schedule.isValid(), false);
});

test('Add appends an Every Day window from midnight to midnight, reports it, and focuses its day', function () {
    var ui = build();
    add(ui);
    assert.equal(rows(ui).length, 3);
    assert.deepEqual(ui.schedule.getValue()[2], { DayOfWeek: 'Everyday', StartHour: 0, EndHour: 24 });
    assert.equal(ui.changes.length, 1);
    assert.equal(dom.document.activeElement, selects(rows(ui)[2])[0]);
});

test('remove drops the row, reports it, and moves focus to the next day, then to Add', function () {
    var ui = build({ value: [{ DayOfWeek: 'Monday', StartHour: 1, EndHour: 2 }] });
    rows(ui)[0].querySelector('.base-access-schedule-remove').click();
    assert.deepEqual(ui.schedule.getValue(), []);
    assert.deepEqual(ui.changes[0], []);
    assert.equal(dom.document.activeElement, ui.schedule.element.querySelector('.base-access-schedule-add'));
    var two = build();
    rows(two)[0].querySelector('.base-access-schedule-remove').click();
    assert.equal(dom.document.activeElement, selects(rows(two)[0])[0]);
});

test('the remove label names the window and follows edits', function () {
    var ui = build();
    var remove = rows(ui)[0].querySelector('.base-access-schedule-remove');
    assert.equal(remove.getAttribute('aria-label'), 'Remove Monday ' + hour(1, 0) + ' to ' + hour(5, 30));
    assert.equal(remove.title, remove.getAttribute('aria-label'));
    pick(selects(rows(ui)[0])[0], 'Everyday');
    assert.equal(remove.getAttribute('aria-label'), 'Remove Every day ' + hour(1, 0) + ' to ' + hour(5, 30));
});

test('removeText and windowText replace the remove label', function () {
    var ui = build({ removeText: 'Drop {value}', windowText: '{day} from {start} until {end}' });
    assert.equal(rows(ui)[0].querySelector('.base-access-schedule-remove').getAttribute('aria-label'), 'Drop Monday from ' + hour(1, 0) + ' until ' + hour(5, 30));
});

test('an empty list shows the empty sentence and hides the column labels', function () {
    var ui = build({ value: null });
    var empty = ui.schedule.element.querySelector('.base-access-schedule-empty');
    assert.equal(empty.hidden, false);
    assert.equal(empty.textContent, 'No windows. Access is allowed at any time.');
    assert.equal(ui.schedule.element.querySelector('.base-access-schedule-head').hidden, true);
    assert.deepEqual(ui.schedule.getValue(), []);
    assert.equal(ui.schedule.isValid(), true);
    add(ui);
    assert.equal(empty.hidden, true);
    assert.equal(ui.schedule.element.querySelector('.base-access-schedule-head').hidden, false);
});

test('the default labels show, and each option replaces its label', function () {
    var ui = build();
    var el = ui.schedule.element;
    assert.equal(el.querySelector('.base-access-schedule-add').textContent, 'Add window');
    assert.deepEqual(all(el, '.base-access-schedule-head span').map(function (s) { return s.textContent; }), ['Day', 'Start', 'End']);
    assert.deepEqual(selects(rows(ui)[0]).concat(times(rows(ui)[0])).map(function (s) { return s.getAttribute('aria-label'); }), ['Day', 'Start', 'End']);
    assert.equal(el.querySelector('.base-access-schedule-label').hidden, true);
    assert.equal(el.querySelector('.base-access-schedule-description').hidden, true);
    assert.equal(el.getAttribute('aria-labelledby'), null);
    assert.equal(el.getAttribute('aria-describedby'), null);
    var custom = build({ value: [], label: 'Access Schedule', description: 'Times when the user may sign in.', addText: 'New Window', emptyText: 'Always open.', dayLabel: 'When', startLabel: 'From', endLabel: 'To' });
    var c = custom.schedule.element;
    var heading = c.querySelector('.base-access-schedule-label');
    assert.equal(heading.hidden, false);
    assert.equal(heading.textContent, 'Access Schedule');
    assert.equal(c.getAttribute('aria-labelledby'), heading.id);
    assert.equal(c.getAttribute('role'), 'group');
    var description = c.querySelector('.base-access-schedule-description');
    assert.equal(description.textContent, 'Times when the user may sign in.');
    assert.equal(description.hidden, false);
    assert.equal(c.getAttribute('aria-describedby'), description.id);
    assert.notEqual(description.id, heading.id);
    assert.equal(c.querySelector('.base-access-schedule-add').textContent, 'New Window');
    assert.equal(c.querySelector('.base-access-schedule-empty').textContent, 'Always open.');
    add(custom);
    assert.deepEqual(selects(rows(custom)[0]).concat(times(rows(custom)[0])).map(function (s) { return s.getAttribute('aria-label'); }), ['When', 'From', 'To']);
});

test('it works with no options at all', function () {
    var schedule = createAccessSchedule();
    assert.deepEqual(schedule.getValue(), []);
    schedule.element.querySelector('.base-access-schedule-add').click();
    assert.equal(schedule.getValue().length, 1);
    schedule.destroy();
});

test('setValue replaces the rows without calling onChange', function () {
    var ui = build();
    ui.schedule.setValue([{ DayOfWeek: 'Saturday', StartHour: 10, EndHour: 12 }]);
    assert.equal(rows(ui).length, 1);
    assert.equal(ui.changes.length, 0);
    ui.schedule.setValue(null);
    assert.equal(rows(ui).length, 0);
});

test('destroy removes the listeners', function () {
    var ui = build();
    var day = selects(rows(ui)[0])[0];
    var remove = rows(ui)[0].querySelector('.base-access-schedule-remove');
    var addButton = ui.schedule.element.querySelector('.base-access-schedule-add');
    ui.schedule.destroy();
    assert.equal(day.listeners.change.length, 0);
    assert.equal(remove.listeners.click.length, 0);
    assert.equal(addButton.listeners.click.length, 0);
});

test('createAccessSchedule puts size small or large on data-base-size, and leaves it off for medium or no size', function () {
    function build(size) { return createAccessSchedule({ size: size }); }
    assert.equal(build('small').element.getAttribute('data-base-size'), 'small');
    assert.equal(build('large').element.getAttribute('data-base-size'), 'large');
    assert.equal(build('medium').element.hasAttribute('data-base-size'), false);
    assert.equal(build(undefined).element.hasAttribute('data-base-size'), false);
});
