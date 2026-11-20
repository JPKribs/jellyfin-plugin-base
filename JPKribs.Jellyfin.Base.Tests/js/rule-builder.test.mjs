// Behavior tests for createRuleBuilder, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, all, shown } from './fake-dom.mjs';

var dom = installFakeDom();
var { createRuleBuilder } = await import('../../src/js/rule-builder.js');

beforeEach(function () {
    dom = installFakeDom();
});

var FIELDS = [
    { key: 'title', label: 'Title' },
    { key: 'year', label: 'Year', type: 'number' },
    { key: 'type', label: 'Type', type: 'select', options: ['Movie', 'Series'] },
    { key: 'genres', label: 'Genres', type: 'chips' }
];

function build(extra) {
    var changes = [];
    var b = createRuleBuilder(Object.assign({ fields: FIELDS, value: { match: 'any', rules: [{ field: 'year', operator: 'gt', value: 2000 }] }, onChange: function (v) { changes.push(v); } }, extra));
    dom.document.body.appendChild(b.element);
    return { b: b, changes: changes };
}

function rows(ui) { return all(ui.b.element, '.base-repeater-rows > .base-list-item'); }
function cell(row, key) { return row.querySelector('.base-field-cell[data-key="' + key + '"]'); }

test('it draws each rule with its field, the field type operators, and a value control of that type', function () {
    var ui = build();
    var row = rows(ui)[0];
    assert.equal(cell(row, 'field').querySelector('select').value, 'year');
    assert.deepEqual(all(cell(row, 'operator'), 'option').map(function (o) { return o.value; }), ['eq', 'ne', 'gt', 'lt']);
    assert.equal(cell(row, 'operator').querySelector('select').value, 'gt');
    assert.equal(cell(row, 'value').querySelector('input').getAttribute('type'), 'number');
    assert.deepEqual(ui.b.getValue(), { match: 'any', rules: [{ field: 'year', operator: 'gt', value: 2000 }] });
});

test('changing the field swaps the operators and the value control', function () {
    var ui = build();
    var row = rows(ui)[0];
    var select = cell(row, 'field').querySelector('select');
    select.value = 'type';
    select.dispatch('change');
    assert.deepEqual(all(cell(row, 'operator'), 'option').map(function (o) { return o.value; }), ['is', 'not']);
    assert.equal(cell(row, 'value').querySelector('select').value, 'Movie');
    select.value = 'genres';
    select.dispatch('change');
    assert.ok(cell(row, 'value').querySelector('.base-tag-input'));
    assert.deepEqual(ui.changes[ui.changes.length - 1].rules[0], { field: 'genres', operator: 'any', value: [] });
});

test('the match choice switches between all and any', function () {
    var ui = build();
    var pills = all(ui.b.element, '.base-rule-match .base-pill');
    assert.equal(pills[1].getAttribute('aria-pressed'), 'true');
    pills[0].click();
    assert.equal(ui.b.getValue().match, 'all');
});

test('warn shows a warning row under the rules, and setWarning sets one', function () {
    var ui = build({ warn: function (v) { return v.rules.length > 1 && v.match === 'all' ? 'These rules can never all match.' : ''; } });
    var warning = ui.b.element.querySelector('.base-rule-warning .base-field-message');
    assert.equal(shown(warning), false);
    ui.b.setWarning('Check the year.');
    assert.equal(shown(warning), true);
    assert.ok(warning.classList.contains('warn'));
    ui.b.setWarning('');
    assert.equal(shown(warning), false);
});

test('Add Rule adds a rule on the first field, and an empty value fails isValid', function () {
    var ui = build();
    var add = ui.b.element.querySelector('.base-repeater-add');
    assert.equal(add.textContent, 'Add rule');
    add.click();
    var row = rows(ui)[1];
    assert.equal(cell(row, 'field').querySelector('select').value, 'title');
    assert.equal(cell(row, 'value').querySelector('input').getAttribute('type'), 'text');
    assert.equal(ui.b.isValid(), false);
    var input = cell(row, 'value').querySelector('input');
    assert.equal(input.getAttribute('aria-invalid'), 'true');
    assert.equal(cell(row, 'value').querySelector('label').getAttribute('for'), input.id);
});
