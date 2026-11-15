// Behavior tests for createTimeRangeField and its hour helpers, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fake-dom.mjs';

var dom = installFakeDom();
var { createTimeRangeField, toHours, fromHours, snapTime } = await import('../../src/js/time-range-field.js');

beforeEach(function () {
    dom = installFakeDom();
});

function build(extra) {
    var changes = [];
    var field = createTimeRangeField(Object.assign({ onChange: function (v) { changes.push(v); } }, extra));
    dom.document.body.appendChild(field.element);
    return { field: field, changes: changes };
}

function setTime(input, value) { input.value = value; input.dispatch('input'); input.dispatch('change'); }
function message(field) { return field.element.querySelector('.base-field-message-text').textContent; }

test('toHours and fromHours convert between times and decimal hours, with 00:00 as the end of the day', function () {
    assert.equal(toHours('09:30'), 9.5);
    assert.equal(toHours('00:00'), 0);
    assert.equal(toHours('00:00', true), 24);
    assert.equal(toHours('nope'), null);
    assert.equal(fromHours(9.5), '09:30');
    assert.equal(fromHours(24), '00:00');
    assert.equal(fromHours(1 / 3), '00:20');
    assert.equal(fromHours(NaN), '');
});

test('snapTime moves a time to the nearest step from midnight', function () {
    assert.equal(snapTime('09:20', 30), '09:30');
    assert.equal(snapTime('09:14', 30), '09:00');
    assert.equal(snapTime('23:50', 30), '23:30');
    assert.equal(snapTime('bad', 30), 'bad');
});

test('it draws two time boxes with the clock icon and the step in seconds', function () {
    var ui = build({ value: { start: '08:00', end: '17:00' } });
    var boxes = ui.field.element.querySelectorAll('.base-adorned-picker');
    assert.equal(boxes.length, 2);
    assert.equal(boxes[0].querySelector('.base-adorned-icon').textContent, 'schedule');
    assert.equal(ui.field.start.getAttribute('step'), '1800');
    assert.equal(ui.field.start.getAttribute('aria-label'), 'Start');
    assert.equal(ui.field.end.getAttribute('aria-label'), 'End');
    assert.deepEqual(ui.field.getValue(), { start: '08:00', end: '17:00' });
});

test('a typed time snaps to the step and reports the change', function () {
    var ui = build({ step: 15 });
    setTime(ui.field.start, '08:07');
    assert.equal(ui.field.start.value, '08:00');
    assert.deepEqual(ui.changes[ui.changes.length - 1], { start: '08:00', end: '' });
});

test('an end at or before the start is an error unless allowOvernight, and 00:00 ends the day', function () {
    var ui = build({ value: { start: '10:00', end: '09:00' } });
    assert.equal(ui.field.isValid(), false);
    assert.equal(message(ui.field), 'End must be after the start.');
    assert.equal(ui.field.end.getAttribute('aria-invalid'), 'true');
    assert.equal(ui.field.start.getAttribute('aria-invalid'), 'true');
    setTime(ui.field.end, '00:00');
    assert.equal(ui.field.end.getAttribute('aria-invalid'), null);
    var night = build({ value: { start: '22:00', end: '06:00' }, allowOvernight: true });
    assert.equal(night.field.isValid(), true);
    var custom = build({ value: { start: '10:00', end: '10:00' }, endBeforeStartText: 'Too short.' });
    custom.field.isValid();
    assert.equal(message(custom.field), 'Too short.');
});

test('required and validate check through the core', function () {
    var ui = build({ required: true, validate: function (v) { return v.start < '06:00' ? 'Start at six or later.' : ''; } });
    assert.equal(ui.field.isValid(), false);
    assert.equal(message(ui.field), 'Fill this in.');
    ui.field.setValue({ start: '05:00', end: '07:00' });
    assert.equal(ui.field.isValid(), false);
    assert.equal(message(ui.field), 'Start at six or later.');
    ui.field.setValue({ start: '06:00', end: '07:00' });
    assert.equal(ui.field.isValid(), true);
});

test('setValue keeps a time off the step and calls no onChange, and destroy removes the listeners', function () {
    var ui = build();
    ui.field.setValue({ start: '09:15', end: '10:00' });
    assert.equal(ui.field.start.value, '09:15');
    assert.equal(ui.changes.length, 0);
    ui.field.destroy();
    assert.equal(ui.field.start.listeners.change.length, 0);
});
