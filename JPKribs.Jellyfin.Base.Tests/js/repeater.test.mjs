// Behavior tests for createRepeater, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, all, shown } from './fake-dom.mjs';

var dom = installFakeDom();
var { createRepeater } = await import('../../src/js/repeater.js');
var { SECRET_KEPT } = await import('../../src/js/secret-field.js');

beforeEach(function () {
    dom = installFakeDom();
});

var FIELDS = [
    { key: 'name', label: 'Name', required: true },
    { key: 'kind', label: 'Kind', type: 'select', options: ['movie', { value: 'show', label: 'Show' }] },
    { key: 'port', label: 'Port', type: 'number', min: 1, max: 65535 },
    { key: 'on', label: 'Enabled', type: 'toggle' }
];

function build(extra) {
    var changes = [];
    var r = createRepeater(Object.assign({ fields: FIELDS, value: [{ name: 'a', kind: 'show', port: 80, on: true }], onChange: function (v) { changes.push(v); } }, extra));
    dom.document.body.appendChild(r.element);
    return { r: r, changes: changes };
}

function rows(ui) { return all(ui.r.element, '.base-repeater-rows > .base-list-item'); }
function field(row, key) { return row.querySelector('.base-field-cell[data-key="' + key + '"]'); }

test('it draws a row of fields per item and reads every field back', function () {
    var ui = build();
    assert.equal(rows(ui).length, 1);
    var row = rows(ui)[0];
    assert.equal(field(row, 'name').querySelector('input').value, 'a');
    assert.equal(field(row, 'kind').querySelector('select').value, 'show');
    assert.equal(field(row, 'port').querySelector('input').getAttribute('type'), 'number');
    assert.equal(field(row, 'on').querySelector('input[type="checkbox"]').checked, true);
    assert.deepEqual(ui.r.getValue(), [{ name: 'a', kind: 'show', port: 80, on: true }]);
});

test('the column labels match the fields, and each input is named by its field', function () {
    var ui = build();
    assert.deepEqual(all(ui.r.element, '.base-repeater-head span').map(function (s) { return s.textContent; }), ['Name', 'Kind', 'Port', 'Enabled']);
    assert.equal(field(rows(ui)[0], 'name').querySelector('input').getAttribute('aria-label'), 'Name');
});

test('Add appends a row and focuses its first field, and an empty row is left out of the value', function () {
    var ui = build();
    ui.r.element.querySelector('.base-repeater-add').click();
    assert.equal(rows(ui).length, 2);
    assert.equal(dom.document.activeElement, field(rows(ui)[1], 'name').querySelector('input'));
    assert.equal(ui.r.getValue().length, 2, 'the select starts on its first choice, so the row is not empty');
});

test('a toggle turns on and off and reports the change', function () {
    var ui = build();
    var toggle = field(rows(ui)[0], 'on').querySelector('input[type="checkbox"]');
    assert.equal(toggle.checked, true);
    assert.ok(toggle.classList.contains('base-check-row-input'), 'the toggle is the shared checkbox');
    toggle.checked = false;
    toggle.dispatch('change');
    assert.equal(ui.changes[ui.changes.length - 1][0].on, false);
});

test('a required field shows its message once left, and isValid shows every message and focuses the first', function () {
    var ui = build({ value: [{ name: 'a' }, { name: '' , kind: 'movie' }] });
    var input = field(rows(ui)[1], 'name').querySelector('input');
    var message = field(rows(ui)[1], 'name').querySelector('.base-field-message');
    assert.equal(shown(message), false);
    input.focus();
    input.blur();
    assert.equal(shown(message), true);
    assert.equal(input.getAttribute('aria-invalid'), 'true');
    input.value = 'b';
    input.dispatch('input');
    assert.equal(shown(message), false);
    input.value = '';
    input.dispatch('input');
    dom.document.body.focus();
    assert.equal(ui.r.isValid(), false);
    assert.equal(dom.document.activeElement, input);
});

test('a number out of range and validate give their sentences through the validation core', function () {
    var fields = FIELDS.concat([{ key: 'code', label: 'Code', validate: function (v, item, i) { return v === 'x' ? 'Not x in row ' + (i + 1) + '.' : ''; } }]);
    var ui = build({ fields: fields, value: [{ name: 'a', port: 0, code: 'x' }] });
    assert.equal(ui.r.isValid(), false);
    var row = rows(ui)[0];
    assert.equal(field(row, 'port').querySelector('.base-field-message-text').textContent, 'Enter a port from 1 to 65535.');
    assert.equal(field(row, 'code').querySelector('.base-field-message-text').textContent, 'Not x in row 1.');
});

test('remove drops the row and names it, and minRows keeps Remove disabled and fills empty rows', function () {
    var ui = build({ value: [{ name: 'a' }, { name: 'b' }] });
    assert.equal(rows(ui)[1].querySelector('.base-repeater-remove').getAttribute('aria-label'), 'Remove b');
    rows(ui)[0].querySelector('.base-repeater-remove').click();
    assert.equal(ui.r.getValue()[0].name, 'b');
    var min = build({ minRows: 2, value: [{ name: 'a' }] });
    assert.equal(rows(min).length, 2);
    assert.equal(rows(min)[0].querySelector('.base-repeater-remove').disabled, true);
});

test('maxRows disables Add and shows the limit', function () {
    var ui = build({ maxRows: 1 });
    assert.equal(ui.r.element.querySelector('.base-repeater-add').disabled, true);
    assert.equal(ui.r.addRow({ name: 'z' }), false);
});

test('reorder moves a row up and down, keeps focus on its arrow, and disables the ends', function () {
    var ui = build({ reorder: true, value: [{ name: 'a' }, { name: 'b' }] });
    var down = rows(ui)[0].querySelector('[data-move="1"]');
    assert.equal(rows(ui)[0].querySelector('[data-move="-1"]').disabled, true);
    assert.equal(down.getAttribute('aria-label'), 'Move a down');
    down.focus();
    down.click();
    assert.deepEqual(ui.r.getValue().map(function (r) { return r.name; }), ['b', 'a']);
    assert.equal(dom.document.activeElement, rows(ui)[1].querySelector('[data-move="-1"]'));
});

test('card layout draws a titled card per item from the title template', function () {
    var ui = build({ layout: 'card', titleText: 'Server {index}: {name}' });
    assert.ok(ui.r.element.classList.contains('card'));
    assert.equal(ui.r.element.querySelector('.base-repeater-head'), null);
    assert.equal(rows(ui)[0].querySelector('.base-repeater-card-title').textContent, 'Server 1: a');
    assert.equal(rows(ui)[0].querySelector('.base-repeater-remove').getAttribute('aria-label'), 'Remove Server 1: a');
});

test('a secret field keeps a stored secret off the page and reads back the kept sentinel', function () {
    var ui = build({ fields: [{ key: 'name', label: 'Name' }, { key: 'token', label: 'Token', type: 'secret', allowExpose: true }], value: [{ name: 'a', token: SECRET_KEPT }, { name: 'b', token: 'typed' }] });
    var stored = field(rows(ui)[0], 'token').querySelector('input');
    assert.equal(stored.value, '');
    assert.ok(stored.classList.contains('base-secret-stored'));
    assert.ok(field(rows(ui)[0], 'token').querySelector('.base-adorned-eye'));
    assert.deepEqual(ui.r.getValue().map(function (r) { return r.token; }), [SECRET_KEPT, 'typed']);
});

test('a tags field uses the tag input, and a custom field draws its own control', function () {
    var custom = { key: 'c', label: 'Custom', type: 'custom', render: function (v, change) {
        var el = dom.document.createElement('input');
        el.value = v || '';
        el.addEventListener('input', change);
        return { element: el, input: el, getValue: function () { return el.value; }, setValue: function (x) { el.value = x; } };
    } };
    var ui = build({ fields: [{ key: 'tags', label: 'Tags', type: 'tags' }, custom], value: [{ tags: ['x', 'y'], c: 'q' }] });
    assert.ok(field(rows(ui)[0], 'tags').querySelector('.base-tag-input'));
    assert.deepEqual(ui.r.getValue(), [{ tags: ['x', 'y'], c: 'q' }]);
});

test('destroy removes the listeners', function () {
    var ui = build();
    var input = field(rows(ui)[0], 'name').querySelector('input');
    ui.r.destroy();
    assert.equal((input.listeners.input || []).length, 0);
});

test('validateAll on a form around a repeater checks its fields and shows the message of an empty required one', async function () {
    var { validateAll } = await import('../../src/js/lib/validate.js');
    var form = dom.document.createElement('form');
    var ui = build({ value: [{ name: '' }] });
    form.appendChild(ui.r.element);
    dom.document.body.appendChild(form);
    var input = field(rows(ui)[0], 'name').querySelector('input');
    assert.equal(validateAll(form), false);
    assert.equal(field(rows(ui)[0], 'name').querySelector('.base-field-message-text').textContent, 'Enter a name.');
    assert.equal(input.getAttribute('aria-invalid'), 'true');
    assert.equal(dom.document.activeElement, input);
});
