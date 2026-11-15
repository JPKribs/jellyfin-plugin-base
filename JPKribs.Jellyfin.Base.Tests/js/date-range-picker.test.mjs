// Behavior tests for createDateRangePicker, its day helpers, and the Filtered List's daterange filter, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, all } from './fake-dom.mjs';

var dom = installFakeDom();
var { createDateRangePicker, dateKey, shiftDays } = await import('../../src/js/date-range-picker.js');
var { createFilteredList } = await import('../../src/js/filtered-list.js');

beforeEach(function () {
    dom = installFakeDom();
});

function build(extra) {
    var changes = [];
    var picker = createDateRangePicker(Object.assign({ today: '2026-03-10', onChange: function (v) { changes.push(v); } }, extra));
    dom.document.body.appendChild(picker.element);
    return { picker: picker, changes: changes };
}

function pills(ui) { return all(ui.picker.element, '.base-pill'); }
function pressed(ui) { return pills(ui).filter(function (p) { return p.getAttribute('aria-pressed') === 'true'; }).map(function (p) { return p.textContent; }); }
function setDate(input, value) { input.value = value; input.dispatch('input'); input.dispatch('change'); }
function message(ui) { return ui.picker.element.querySelector('.base-field-message-text').textContent; }

test('dateKey reads a day in local time, and shiftDays moves it across months', function () {
    assert.equal(dateKey('2026-03-10'), '2026-03-10');
    assert.equal(dateKey(new Date(2026, 0, 5, 23, 0)), '2026-01-05');
    assert.equal(dateKey('nope'), '');
    assert.equal(dateKey(null), '');
    assert.equal(shiftDays('2026-03-01', -1), '2026-02-28');
    assert.equal(shiftDays('bad', 1), '');
});

test('it draws the default presets over two date boxes with the calendar icon', function () {
    var ui = build();
    assert.deepEqual(pills(ui).map(function (p) { return p.textContent; }), ['Today', 'Last 7 Days', 'Last 30 Days', 'Custom']);
    var boxes = all(ui.picker.element, '.base-adorned-picker');
    assert.equal(boxes.length, 2);
    assert.equal(boxes[0].querySelector('.base-adorned-icon').textContent, 'calendar_today');
    assert.deepEqual(pressed(ui), []);
    assert.deepEqual(ui.picker.getValue(), { from: '', to: '' });
});

test('a preset fills the range back from today, and a second click clears it', function () {
    var ui = build();
    pills(ui)[1].click();
    assert.deepEqual(ui.picker.getValue(), { from: '2026-03-04', to: '2026-03-10' });
    assert.deepEqual(ui.changes[0], { from: '2026-03-04', to: '2026-03-10' });
    assert.equal(ui.picker.getPreset(), '7d');
    pills(ui)[1].click();
    assert.deepEqual(ui.picker.getValue(), { from: '', to: '' });
    pills(ui)[0].click();
    assert.deepEqual(ui.picker.getValue(), { from: '2026-03-10', to: '2026-03-10' });
});

test('typing dates presses the matching preset, or Custom', function () {
    var ui = build();
    setDate(ui.picker.from, '2026-02-09');
    setDate(ui.picker.to, '2026-03-10');
    assert.deepEqual(pressed(ui), ['Last 30 Days']);
    setDate(ui.picker.from, '2026-01-01');
    assert.deepEqual(pressed(ui), ['Custom']);
    ui.picker.setValue({ from: '2026-03-10', to: '2026-03-10' });
    assert.deepEqual(pressed(ui), ['Today']);
});

test('an end before the start is an error through the core, and presets can be replaced or removed', function () {
    var ui = build({ value: { from: '2026-03-05', to: '2026-03-01' } });
    assert.equal(ui.picker.isValid(), false);
    assert.equal(message(ui), 'End must be on or after the start.');
    assert.equal(ui.picker.to.getAttribute('aria-invalid'), 'true');
    var custom = build({ presets: [{ value: 'q', label: 'Last 90 Days', days: 90 }] });
    assert.deepEqual(pills(custom).map(function (p) { return p.textContent; }), ['Last 90 Days']);
    var none = build({ presets: [] });
    assert.equal(none.picker.element.querySelector('.base-date-range-presets').hidden, true);
});

test('required, min, and max check both dates', function () {
    var ui = build({ required: true, min: '2026-01-01' });
    assert.equal(ui.picker.isValid(), false);
    assert.equal(message(ui), 'Fill this in.');
    ui.picker.setValue({ from: '2025-12-01', to: '2026-01-02' });
    assert.equal(ui.picker.isValid(), false);
    assert.equal(message(ui), 'Enter 2026-01-01 or later.');
});

test('a daterange filter keeps the items whose date falls in the picked range', function () {
    var items = [
        { id: 1, name: 'a', added: '2026-03-01' },
        { id: 2, name: 'b', added: '2026-03-08T10:00:00' },
        { id: 3, name: 'c', added: '2026-03-10' }
    ];
    var list = createFilteredList({
        items: items,
        render: function (item) { return item.name; },
        filters: [{ name: 'added', label: 'Added', kind: 'daterange' }]
    });
    dom.document.body.appendChild(list.element);
    var picker = list.element.querySelector('.base-filtered-daterange');
    assert.ok(picker);
    assert.equal(list.getState().items.length, 3);
    setDate(picker.querySelector('.base-date-range-from'), '2026-03-05');
    assert.deepEqual(list.getState().items.map(function (i) { return i.id; }), [2, 3]);
    list.setFilter('added', ['2026-03-01', '2026-03-08']);
    assert.deepEqual(list.getState().items.map(function (i) { return i.id; }), [1, 2]);
    assert.equal(picker.querySelector('.base-date-range-to').value, '2026-03-08');
    list.setFilter('added', []);
    assert.equal(list.getState().items.length, 3);
});
