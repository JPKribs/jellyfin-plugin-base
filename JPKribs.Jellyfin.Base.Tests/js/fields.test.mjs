// Behavior tests for createNumberUnitField, createSliderField, and createSchedulePicker, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, all, shown } from './fake-dom.mjs';

var dom = installFakeDom();
var { createNumberUnitField, createSliderField, createSchedulePicker } = await import('../../src/js/index.js');

beforeEach(function () {
    dom = installFakeDom();
});

var SIZE_UNITS = [{ value: 'MB', label: 'MB', factor: 1 }, { value: 'GB', label: 'GB', factor: 1024 }];

function unit(extra) {
    var changes = [];
    var field = createNumberUnitField(Object.assign({ units: SIZE_UNITS, value: 512, unit: 'MB', min: 1, max: 4096, onChange: function (v) { changes.push(v); } }, extra));
    dom.document.body.appendChild(field.element);
    return { field: field, changes: changes };
}

function type(field, text) { field.input.value = text; field.input.dispatch('input'); }
function msg(ui) { return ui.field.element.querySelector('.jpk-field-message'); }

test('number unit needs units, and strings become units with no factor', function () {
    assert.throws(function () { createNumberUnitField({}); }, /units/);
    var f = createNumberUnitField({ units: ['ms', 's'], value: 5, unit: 's' });
    assert.deepEqual(f.getValue(), { value: 5, unit: 's', base: null });
});

test('number unit draws the input and select with min, max, step, and default labels that can be replaced', function () {
    var ui = unit({ step: 5 });
    assert.equal(ui.field.input.getAttribute('min'), '1');
    assert.equal(ui.field.input.getAttribute('max'), '4096');
    assert.equal(ui.field.input.getAttribute('step'), '5');
    assert.equal(ui.field.input.getAttribute('aria-label'), 'Value');
    assert.equal(ui.field.select.getAttribute('aria-label'), 'Unit');
    var custom = unit({ valueLabel: 'Size', unitLabel: 'Size Unit' });
    assert.equal(custom.field.input.getAttribute('aria-label'), 'Size');
    assert.equal(custom.field.select.getAttribute('aria-label'), 'Size Unit');
});

test('getValue returns the number, the unit, and the base value', function () {
    var ui = unit({ value: 2, unit: 'GB' });
    assert.deepEqual(ui.field.getValue(), { value: 2, unit: 'GB', base: 2048 });
    type(ui.field, '');
    assert.deepEqual(ui.field.getValue(), { value: null, unit: 'GB', base: null });
});

test('typing and changing the unit report onChange', function () {
    var ui = unit();
    type(ui.field, '10');
    ui.field.select.value = 'GB';
    ui.field.select.dispatch('change');
    assert.deepEqual(ui.changes[0], { value: 10, unit: 'MB', base: 10 });
    assert.deepEqual(ui.changes[1], { value: 10, unit: 'GB', base: 10240 });
});

test('a number out of range shows the error with aria-invalid, and its sentences can be replaced', function () {
    var ui = unit();
    type(ui.field, '5000');
    assert.equal(shown(msg(ui)), true);
    assert.equal(msg(ui).querySelector('.jpk-field-message-text').textContent, 'Enter a number from 1 to 4096.');
    assert.equal(ui.field.input.getAttribute('aria-invalid'), 'true');
    assert.equal(ui.field.isValid(), false);
    type(ui.field, '50');
    assert.equal(shown(msg(ui)), false);
    assert.equal(ui.field.isValid(), true);
    var low = unit({ max: undefined });
    type(low.field, '0');
    assert.equal(msg(low).querySelector('.jpk-field-message-text').textContent, 'Enter 1 or more.');
    var high = unit({ min: undefined, maxText: 'Too large, max {max}.' });
    type(high.field, '9999');
    assert.equal(msg(high).querySelector('.jpk-field-message-text').textContent, 'Too large, max 4096.');
    var ranged = unit({ rangeText: 'Between {min} and {max}.' });
    type(ranged.field, '0');
    assert.equal(msg(ranged).querySelector('.jpk-field-message-text').textContent, 'Between 1 and 4096.');
});

test('setValue sets the number and unit, and setBaseValue picks the largest even unit', function () {
    var ui = unit();
    ui.field.setValue({ value: 3, unit: 'GB' });
    assert.deepEqual(ui.field.getValue(), { value: 3, unit: 'GB', base: 3072 });
    ui.field.setBaseValue(2048);
    assert.deepEqual(ui.field.getValue(), { value: 2, unit: 'GB', base: 2048 });
    ui.field.setBaseValue(1536);
    assert.deepEqual(ui.field.getValue(), { value: 1536, unit: 'MB', base: 1536 });
    assert.equal(ui.changes.length, 0);
});

test('number unit destroy removes the listeners', function () {
    var ui = unit();
    ui.field.destroy();
    assert.equal(ui.field.input.listeners.input.length, 0);
    assert.equal(ui.field.select.listeners.change.length, 0);
});

test('the slider is a range input with a readout, prefix, suffix, and aria-valuetext', function () {
    var changes = [];
    var s = createSliderField({ min: 0, max: 255, value: 128, suffix: ' of 255', onChange: function (v) { changes.push(v); } });
    assert.equal(s.input.type, 'range');
    assert.equal(s.input.getAttribute('max'), '255');
    assert.equal(s.input.getAttribute('aria-label'), 'Value');
    assert.equal(s.element.querySelector('output').textContent, '128 of 255');
    assert.equal(s.input.getAttribute('aria-valuetext'), '128 of 255');
    s.input.value = '200';
    s.input.dispatch('input');
    assert.deepEqual(changes, [200]);
    assert.equal(s.getValue(), 200);
    assert.equal(s.element.querySelector('output').textContent, '200 of 255');
});

test('the slider setValue updates the readout without onChange, and the label, prefix, and readout can be set', function () {
    var changes = [];
    var s = createSliderField({ label: 'Opacity', prefix: '~', suffix: '%', showValue: false, onChange: function (v) { changes.push(v); } });
    assert.equal(s.input.getAttribute('aria-label'), 'Opacity');
    assert.equal(s.element.querySelector('output').hidden, true);
    s.setValue(40);
    assert.equal(s.getValue(), 40);
    assert.equal(s.element.querySelector('output').textContent, '~40%');
    assert.deepEqual(changes, []);
    assert.equal(createSliderField().getValue(), 0);
});

test('the slider destroy removes the listener', function () {
    var s = createSliderField();
    s.destroy();
    assert.equal(s.input.listeners.input.length, 0);
});

function schedule(extra) {
    var changes = [];
    var picker = createSchedulePicker(Object.assign({ value: { time: '02:30', days: [1, 3] }, onChange: function (v) { changes.push(v); } }, extra));
    dom.document.body.appendChild(picker.element);
    return { picker: picker, changes: changes, days: all(picker.element, '.jpk-toggle'), time: picker.element.querySelector('input') };
}

test('the schedule shows the time and seven day toggles from Sunday with aria-pressed', function () {
    var ui = schedule();
    assert.equal(ui.time.value, '02:30');
    assert.equal(ui.time.getAttribute('aria-label'), 'Time');
    assert.deepEqual(ui.days.map(function (d) { return d.textContent; }), ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
    assert.deepEqual(ui.days.map(function (d) { return d.getAttribute('aria-pressed'); }), ['false', 'true', 'false', 'true', 'false', 'false', 'false']);
    assert.equal(ui.picker.element.querySelector('[role="group"]').getAttribute('aria-label'), 'Days');
});

test('clicking a day toggles it and reports plain data with sorted days', function () {
    var ui = schedule();
    ui.days[0].click();
    ui.days[3].click();
    assert.deepEqual(ui.changes[0], { time: '02:30', days: [0, 1, 3] });
    assert.deepEqual(ui.picker.getValue(), { time: '02:30', days: [0, 1] });
    assert.equal(ui.days[3].getAttribute('aria-pressed'), 'false');
});

test('changing the time reports it, and an empty time is an empty string', function () {
    var ui = schedule();
    ui.time.value = '';
    ui.time.dispatch('input');
    assert.deepEqual(ui.changes[0], { time: '', days: [1, 3] });
});

test('weekStart 1 starts on Monday, and labels and group names can be replaced', function () {
    var ui = schedule({ weekStart: 1, dayLabels: ['S', 'M', 'T', 'W', 'T', 'F', 'S'], timeLabel: 'Starts At', daysLabel: 'Run On' });
    assert.equal(ui.days[0].getAttribute('data-day'), '1');
    assert.equal(ui.days[6].getAttribute('data-day'), '0');
    assert.equal(ui.time.getAttribute('aria-label'), 'Starts At');
    assert.equal(ui.picker.element.querySelector('[role="group"]').getAttribute('aria-label'), 'Run On');
});

test('showTime and showDays can hide a part, and setValue ignores days out of range without onChange', function () {
    var ui = schedule({ showDays: false, showTime: false });
    assert.equal(ui.time.hidden, true);
    assert.equal(ui.picker.element.querySelector('[role="group"]').hidden, true);
    ui.picker.setValue({ time: '05:00', days: [2, 9, -1] });
    assert.deepEqual(ui.picker.getValue(), { time: '05:00', days: [2] });
    assert.equal(ui.changes.length, 0);
});

test('the schedule destroy removes the listeners', function () {
    var ui = schedule();
    ui.picker.destroy();
    assert.equal(ui.time.listeners.input.length, 0);
    assert.equal(ui.days[0].listeners.click.length, 0);
});
