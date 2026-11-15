// Behavior tests for createStringList, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, all, shown } from './fake-dom.mjs';

var dom = installFakeDom();
var { createStringList } = await import('../../src/js/index.js');

beforeEach(function () {
    dom = installFakeDom();
});

function build(extra) {
    var changes = [];
    var list = createStringList(Object.assign({ values: ['alpha', 'beta'], onChange: function (v) { changes.push(v); } }, extra));
    dom.document.body.appendChild(list.element);
    return { list: list, changes: changes };
}

function rows(ui) { return all(ui.list.element, '.jpk-string-item'); }
function texts(ui) { return rows(ui).map(function (r) { return r.querySelector('.jpk-string-text').textContent; }); }
function addButton(ui) { return ui.list.element.querySelector('.jpk-string-add button'); }
function message(ui) { return ui.list.element.querySelector('.jpk-field-message'); }
function type(ui, text) { ui.list.input.value = text; ui.list.input.dispatch('input'); }

test('it draws a row per value and getValue returns them as strings', function () {
    var ui = build({ values: ['a', 2] });
    assert.deepEqual(texts(ui), ['a', '2']);
    assert.deepEqual(ui.list.getValue(), ['a', '2']);
});

test('the add button adds the trimmed input, clears it, reports onChange, and keeps focus on the input', function () {
    var ui = build();
    type(ui, '  gamma ');
    addButton(ui).click();
    assert.deepEqual(ui.list.getValue(), ['alpha', 'beta', 'gamma']);
    assert.equal(ui.list.input.value, '');
    assert.deepEqual(ui.changes[0], ['alpha', 'beta', 'gamma']);
    assert.equal(dom.document.activeElement, ui.list.input);
});

test('Enter adds and Escape clears the input', function () {
    var ui = build();
    type(ui, 'gamma');
    var enter = ui.list.input.dispatch('keydown', { key: 'Enter' });
    assert.equal(enter.defaultPrevented, true);
    assert.equal(ui.list.getValue().length, 3);
    type(ui, 'partial');
    ui.list.input.dispatch('keydown', { key: 'Escape' });
    assert.equal(ui.list.input.value, '');
});

test('an empty value adds nothing', function () {
    var ui = build();
    type(ui, '   ');
    addButton(ui).click();
    assert.equal(ui.list.getValue().length, 2);
    assert.equal(shown(message(ui)), false);
});

test('a duplicate is refused with a message and wires aria-invalid, and the duplicates option allows it', function () {
    var ui = build();
    type(ui, 'alpha');
    addButton(ui).click();
    assert.equal(ui.list.getValue().length, 2);
    assert.equal(shown(message(ui)), true);
    assert.equal(message(ui).querySelector('.jpk-field-message-text').textContent, 'Already in the list.');
    assert.equal(ui.list.input.getAttribute('aria-invalid'), 'true');
    var allowed = build({ duplicates: true });
    type(allowed, 'alpha');
    addButton(allowed).click();
    assert.equal(allowed.list.getValue().length, 3);
});

test('typing again clears the message', function () {
    var ui = build();
    type(ui, 'alpha');
    addButton(ui).click();
    type(ui, 'alph');
    assert.equal(shown(message(ui)), false);
});

test('validate refuses a value with its sentence, and add returns false', function () {
    var ui = build({ validate: function (v) { return /^[a-z]+$/.test(v) ? '' : 'Use letters only.'; } });
    assert.equal(ui.list.add('x1'), false);
    assert.equal(message(ui).querySelector('.jpk-field-message-text').textContent, 'Use letters only.');
    assert.equal(ui.list.add('xy'), true);
});

test('maxItems stops the list with the limit message', function () {
    var ui = build({ maxItems: 2 });
    assert.equal(ui.list.add('gamma'), false);
    assert.equal(message(ui).querySelector('.jpk-field-message-text').textContent, 'The list is full.');
});

test('remove takes the row out, reports it, and returns focus to the input', function () {
    var ui = build();
    rows(ui)[0].querySelector('.jpk-string-remove').click();
    assert.deepEqual(ui.list.getValue(), ['beta']);
    assert.deepEqual(ui.changes[0], ['beta']);
    assert.equal(dom.document.activeElement, ui.list.input);
});

test('reorder adds up and down buttons that move rows, with the first up and last down disabled', function () {
    var ui = build({ values: ['a', 'b', 'c'], reorder: true });
    assert.equal(rows(ui)[0].querySelector('.jpk-string-up').disabled, true);
    assert.equal(rows(ui)[2].querySelector('.jpk-string-down').disabled, true);
    rows(ui)[0].querySelector('.jpk-string-down').click();
    assert.deepEqual(ui.list.getValue(), ['b', 'a', 'c']);
    assert.equal(dom.document.activeElement, rows(ui)[1].querySelector('.jpk-string-down'));
    assert.equal(createStringList({ values: ['a'] }).element.querySelector('.jpk-string-up'), null);
});

test('every default label can be replaced', function () {
    var ui = build({
        reorder: true, inputLabel: 'New Host', addText: 'Plus', removeLabel: 'Drop {value}', moveUpLabel: 'Raise {value}', moveDownLabel: 'Lower {value}',
        emptyText: 'Nothing here.', placeholder: 'host.example.test'
    });
    var row = rows(ui)[0];
    assert.equal(ui.list.input.getAttribute('aria-label'), 'New Host');
    assert.equal(ui.list.input.getAttribute('placeholder'), 'host.example.test');
    assert.equal(addButton(ui).textContent, 'Plus');
    assert.equal(row.querySelector('.jpk-string-remove').getAttribute('aria-label'), 'Drop alpha');
    assert.equal(row.querySelector('.jpk-string-up').getAttribute('aria-label'), 'Raise alpha');
    assert.equal(row.querySelector('.jpk-string-down').getAttribute('aria-label'), 'Lower alpha');
    var defaults = build();
    assert.equal(rows(defaults)[0].querySelector('.jpk-string-remove').getAttribute('aria-label'), 'Remove alpha');
    assert.equal(defaults.list.input.getAttribute('aria-label'), 'New Item');
    assert.equal(addButton(defaults).textContent, 'Add');
});

test('the empty text shows only while the list is empty, and setValue replaces the rows without onChange', function () {
    var ui = build({ values: [], emptyText: 'Nothing here.' });
    assert.equal(ui.list.element.querySelector('.jpk-string-empty').hidden, false);
    ui.list.setValue(['x']);
    assert.equal(ui.list.element.querySelector('.jpk-string-empty').hidden, true);
    assert.equal(ui.changes.length, 0);
    ui.list.setItems(['y', 'z']);
    assert.deepEqual(texts(ui), ['y', 'z']);
});

test('destroy removes the input and button listeners', function () {
    var ui = build();
    ui.list.destroy();
    assert.equal(addButton(ui).listeners.click.length, 0);
    assert.equal(ui.list.input.listeners.keydown.length, 0);
});
