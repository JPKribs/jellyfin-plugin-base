// Behavior tests for createKeyValueEditor, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, all } from './fake-dom.mjs';

var dom = installFakeDom();
var { createKeyValueEditor } = await import('../../src/js/index.js');

beforeEach(function () {
    dom = installFakeDom();
});

function build(extra) {
    var changes = [];
    var editor = createKeyValueEditor(Object.assign({ values: [{ key: 'Accept', value: 'json' }, { key: 'Env', value: 'dev' }], onChange: function (v) { changes.push(v); } }, extra));
    dom.document.body.appendChild(editor.element);
    return { editor: editor, changes: changes };
}

function rows(ui) { return all(ui.editor.element, '.base-kv-row'); }
function inputs(row) { return all(row, 'input'); }
function edit(input, value) { input.value = value; input.dispatch('input'); }
function add(ui) { ui.editor.element.querySelector('.base-kv-add').click(); }

test('it draws a row per pair and accepts an object', function () {
    var ui = build();
    assert.equal(rows(ui).length, 2);
    assert.deepEqual(inputs(rows(ui)[0]).map(function (i) { return i.value; }), ['Accept', 'json']);
    ui.editor.setValue({ A: '1', B: 2 });
    assert.deepEqual(ui.editor.getValue(), [{ key: 'A', value: '1' }, { key: 'B', value: '2' }]);
});

test('column labels show by default, label the inputs, and can be hidden or replaced', function () {
    var ui = build();
    var head = ui.editor.element.querySelector('.base-kv-head');
    assert.equal(head.hidden, false);
    assert.deepEqual(all(head, 'span').map(function (s) { return s.textContent; }), ['Key', 'Value']);
    assert.equal(inputs(rows(ui)[0])[0].getAttribute('aria-label'), 'Key');
    var custom = build({ keyLabel: 'Header', valueLabel: 'Content', showLabels: false, addText: 'New Row' });
    assert.equal(custom.editor.element.querySelector('.base-kv-head').hidden, true);
    assert.equal(inputs(rows(custom)[0])[1].getAttribute('aria-label'), 'Content');
    assert.equal(custom.editor.element.querySelector('.base-kv-add').textContent, 'New Row');
});

test('Add appends an empty row and focuses its key, and getValue leaves out an empty row', function () {
    var ui = build();
    add(ui);
    assert.equal(rows(ui).length, 3);
    assert.equal(dom.document.activeElement, inputs(rows(ui)[2])[0]);
    assert.equal(ui.editor.getValue().length, 2);
});

test('editing reports the pairs through onChange', function () {
    var ui = build();
    edit(inputs(rows(ui)[0])[1], 'xml');
    assert.deepEqual(ui.changes[0][0], { key: 'Accept', value: 'xml' });
});

test('remove drops the row, reports it, and moves focus to the next key', function () {
    var ui = build();
    rows(ui)[0].querySelector('.base-kv-remove').click();
    assert.deepEqual(ui.editor.getValue(), [{ key: 'Env', value: 'dev' }]);
    assert.equal(dom.document.activeElement, inputs(rows(ui)[0])[0]);
});

test('the remove label names the key, falls back to the row number, and can be replaced', function () {
    var ui = build();
    assert.equal(rows(ui)[0].querySelector('.base-kv-remove').getAttribute('aria-label'), 'Remove Accept');
    add(ui);
    assert.equal(rows(ui)[2].querySelector('.base-kv-remove').getAttribute('aria-label'), 'Remove Row 3');
    var custom = build({ removeLabel: 'Drop {value}', rowName: 'Line' });
    add(custom);
    assert.equal(rows(custom)[0].querySelector('.base-kv-remove').getAttribute('aria-label'), 'Drop Accept');
    assert.equal(rows(custom)[2].querySelector('.base-kv-remove').getAttribute('aria-label'), 'Drop Line 3');
});

test('a repeated key is an error with aria-invalid, and the duplicateKeys option allows it', function () {
    var ui = build();
    edit(inputs(rows(ui)[1])[0], 'Accept');
    var key = inputs(rows(ui)[1])[0];
    assert.equal(key.getAttribute('aria-invalid'), 'true');
    assert.equal(rows(ui)[1].querySelector('.base-field-message-text').textContent, 'Key is already used.');
    assert.equal(ui.editor.isValid(), false);
    var allowed = build({ duplicateKeys: true });
    edit(inputs(rows(allowed)[1])[0], 'Accept');
    assert.equal(allowed.editor.isValid(), true);
});

test('a value with no key is an error, and validate adds its own sentence', function () {
    var ui = build({ validate: function (key) { return key.indexOf(' ') !== -1 ? 'No spaces.' : ''; } });
    add(ui);
    edit(inputs(rows(ui)[2])[1], 'x');
    assert.equal(rows(ui)[2].querySelector('.base-field-message-text').textContent, 'Enter a key.');
    edit(inputs(rows(ui)[2])[0], 'a b');
    assert.equal(rows(ui)[2].querySelector('.base-field-message-text').textContent, 'No spaces.');
    edit(inputs(rows(ui)[2])[0], 'ab');
    assert.equal(ui.editor.isValid(), true);
});

test('maxRows stops Add', function () {
    var ui = build({ maxRows: 2 });
    add(ui);
    assert.equal(rows(ui).length, 2);
});

test('destroy removes the listeners', function () {
    var ui = build();
    var first = inputs(rows(ui)[0])[0];
    ui.editor.destroy();
    assert.equal(first.listeners.input.length, 0);
    assert.equal(ui.editor.element.querySelector('.base-kv-add').listeners.click.length, 0);
});

test('by default the rows keep their markup and grow with the page', function () {
    var ui = build();
    var body = ui.editor.element.querySelector('.base-kv-rows');
    assert.ok(body.classList.contains('base-list'));
    assert.ok(body.classList.contains('plain'));
    assert.equal(body.classList.contains('scrolls'), false);
    assert.equal(body.getAttribute('role'), null);
    assert.equal(rows(ui)[0].className, 'base-kv-row base-list-item');
    assert.equal(rows(ui)[0].getAttribute('role'), null);
});

test('removing a row keeps the other rows and what they hold', function () {
    var ui = build({ values: [{ key: 'a', value: '1' }, { key: 'b', value: '2' }, { key: 'c', value: '3' }] });
    var last = rows(ui)[2];
    edit(inputs(last)[1], '33');
    rows(ui)[0].querySelector('.base-kv-remove').click();
    assert.equal(rows(ui)[1], last);
    assert.deepEqual(ui.editor.getValue(), [{ key: 'b', value: '2' }, { key: 'c', value: '33' }]);
    assert.equal(dom.document.activeElement, inputs(rows(ui)[0])[0]);
});

test('height and maxHeight go to the list, and setHeight changes them', function () {
    var ui = build({ maxHeight: '18rem' });
    var body = ui.editor.element.querySelector('.base-kv-rows');
    assert.ok(body.classList.contains('capped'));
    assert.equal(body.style['--base-list-max'], '18rem');
    ui.editor.setHeight(260);
    assert.ok(body.classList.contains('fixed'));
    assert.equal(body.style['--base-list-height'], '260px');
    assert.equal(body.classList.contains('capped'), false);
});

test('createKeyValueEditor puts size small or large on data-base-size, and leaves it off for medium or no size', function () {
    function build(size) { return createKeyValueEditor({ size: size }); }
    assert.equal(build('small').element.getAttribute('data-base-size'), 'small');
    assert.equal(build('large').element.getAttribute('data-base-size'), 'large');
    assert.equal(build('medium').element.hasAttribute('data-base-size'), false);
    assert.equal(build(undefined).element.hasAttribute('data-base-size'), false);
});
