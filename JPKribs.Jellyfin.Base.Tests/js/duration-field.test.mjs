// Behavior tests for createDurationField and durationText, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fake-dom.mjs';

var dom = installFakeDom();
var { createDurationField, durationText } = await import('../../src/js/duration-field.js');

beforeEach(function () {
    dom = installFakeDom();
});

function build(extra) {
    var changes = [];
    var field = createDurationField(Object.assign({ onChange: function (v) { changes.push(v); } }, extra));
    dom.document.body.appendChild(field.element);
    return { field: field, changes: changes };
}

function type(input, text) { input.value = text; input.dispatch('input'); }
function message(field) { return field.element.querySelector('.base-field-message-text').textContent; }

test('durationText writes seconds in the units given', function () {
    assert.equal(durationText(5400), '1h 30m');
    assert.equal(durationText(90, ['m', 's']), '1m 30s');
    assert.equal(durationText(0, ['h', 'm']), '0m');
    assert.equal(durationText(3600, ['h', 'm'], { h: ' hr' }), '1 hr');
});

test('it draws a number box per unit, each with its unit inside and its label', function () {
    var ui = build({ value: 3725 });
    assert.equal(ui.field.inputs.length, 3);
    assert.deepEqual(ui.field.inputs.map(function (i) { return i.value; }), ['1', '2', '5']);
    assert.deepEqual(ui.field.inputs.map(function (i) { return i.parentNode.querySelector('.base-adorned-unit').textContent; }), ['h', 'm', 's']);
    assert.deepEqual(ui.field.inputs.map(function (i) { return i.getAttribute('aria-label'); }), ['Hours', 'Minutes', 'Seconds']);
    assert.equal(ui.field.inputs[0].getAttribute('max'), null);
    assert.equal(ui.field.inputs[1].getAttribute('max'), '59');
    assert.equal(ui.field.getValue(), 3725);
});

test('units picks the boxes, and setValue rounds to the smallest', function () {
    var ui = build({ units: ['h', 'm'], unitText: { h: 'hr' } });
    assert.equal(ui.field.inputs.length, 2);
    ui.field.setValue(5430);
    assert.deepEqual(ui.field.inputs.map(function (i) { return i.value; }), ['1', '31']);
    assert.equal(ui.field.inputs[0].parentNode.querySelector('.base-adorned-unit').textContent, 'hr');
    ui.field.setValue(null);
    assert.equal(ui.field.getValue(), null);
});

test('typing reports the total in seconds', function () {
    var ui = build();
    type(ui.field.inputs[1], '2');
    assert.equal(ui.changes[0], 120);
});

test('a box out of its own range, and a total outside min and max, show one message under the boxes', function () {
    var ui = build({ min: 60, max: 7200 });
    ui.field.setValue(30);
    assert.equal(ui.field.isValid(), false);
    assert.equal(message(ui.field), 'Enter a duration from 1m to 2h.');
    assert.equal(ui.field.inputs[2].getAttribute('aria-invalid'), 'true');
    ui.field.setValue(600);
    type(ui.field.inputs[1], '75');
    assert.equal(ui.field.isValid(), false);
    assert.equal(message(ui.field), 'Enter a number from 0 to 59.');
    type(ui.field.inputs[1], '20');
    assert.equal(ui.field.inputs[1].getAttribute('aria-invalid'), null);
    var low = build({ min: 60, minText: 'At least {min}.' });
    low.field.setValue(5);
    low.field.isValid();
    assert.equal(message(low.field), 'At least 1m.');
});

test('required and validate check through the core, and destroy removes the listeners', function () {
    var ui = build({ required: true, validate: function (s) { return s % 300 ? 'Use five minute steps.' : ''; } });
    assert.equal(ui.field.isValid(), false);
    assert.equal(message(ui.field), 'Fill this in.');
    ui.field.setValue(400);
    assert.equal(ui.field.isValid(), false);
    assert.equal(message(ui.field), 'Use five minute steps.');
    ui.field.setValue(600);
    assert.equal(ui.field.isValid(), true);
    ui.field.destroy();
    assert.equal(ui.field.inputs[0].listeners.input.length, 0);
});
