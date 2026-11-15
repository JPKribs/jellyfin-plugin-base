// Behavior tests for createMappingTable, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, all } from './fake-dom.mjs';

var dom = installFakeDom();
var { createMappingTable } = await import('../../src/js/index.js');

beforeEach(function () {
    dom = installFakeDom();
});

var SOURCES = [{ value: 'a', label: 'Movies', description: 'source-a' }, { value: 'b', label: 'Shows' }, { value: 'c' }];
var TARGETS = [{ value: 'm', label: 'Local Movies' }, { value: 's', label: 'Local Shows' }];

function build(extra) {
    var changes = [];
    var table = createMappingTable(Object.assign({ rows: SOURCES, targets: TARGETS, value: { a: 'm' }, onChange: function (v) { changes.push(v); } }, extra));
    dom.document.body.appendChild(table.element);
    return { table: table, changes: changes };
}

function rows(ui) { return all(ui.table.element, 'tbody tr'); }
function selects(ui) { return all(ui.table.element, 'tbody select'); }
function pick(select, value) { select.value = value; select.dispatch('change'); }
function disabled(select) { return all(select, 'option').filter(function (o) { return o.disabled; }).map(function (o) { return o.value; }); }

test('it draws a row per source with its label, description, and a target select', function () {
    var ui = build();
    assert.equal(rows(ui).length, 3);
    var first = rows(ui)[0];
    assert.equal(first.querySelector('.base-mapping-table-name').textContent, 'Movies');
    assert.equal(first.querySelector('.base-mapping-table-description').textContent, 'source-a');
    assert.equal(rows(ui)[1].querySelector('.base-mapping-table-description'), null);
    assert.equal(rows(ui)[2].querySelector('.base-mapping-table-name').textContent, 'c');
    assert.deepEqual(all(selects(ui)[0], 'option').map(function (o) { return o.value; }), ['', 'm', 's']);
    assert.deepEqual(selects(ui).map(function (s) { return s.value; }), ['m', '', '']);
});

test('it uses the static table styling with a header row', function () {
    var ui = build();
    var table = ui.table.element.querySelector('table');
    assert.ok(table.className.indexOf('base-static-table') !== -1);
    assert.ok(ui.table.element.querySelector('.base-static-table-scroll'));
    assert.deepEqual(all(table, 'thead th').map(function (th) { return th.textContent; }), ['Source', 'Target']);
    assert.equal(rows(ui)[0].querySelector('th').getAttribute('scope'), 'row');
});

test('the default labels show, and each option replaces its label', function () {
    var ui = build();
    assert.equal(all(selects(ui)[0], 'option')[0].textContent, 'None');
    assert.equal(selects(ui)[0].getAttribute('aria-label'), 'Target for Movies');
    var custom = build({ sourceHeader: 'Remote Library', targetHeader: 'Local Library', noneLabel: 'Skip', targetLabel: 'Local library for {value}', emptyText: 'No libraries.' });
    assert.deepEqual(all(custom.table.element, 'thead th').map(function (th) { return th.textContent; }), ['Remote Library', 'Local Library']);
    assert.equal(all(selects(custom)[0], 'option')[0].textContent, 'Skip');
    assert.equal(selects(custom)[1].getAttribute('aria-label'), 'Local library for Shows');
    custom.table.setRows([]);
    assert.equal(custom.table.element.querySelector('.base-mapping-table-empty').textContent, 'No libraries.');
});

test('picking a target reports the pairs through onChange, and None unmaps the row', function () {
    var ui = build();
    pick(selects(ui)[1], 's');
    assert.deepEqual(ui.changes[0], { a: 'm', b: 's' });
    pick(selects(ui)[0], '');
    assert.deepEqual(ui.changes[1], { b: 's' });
    assert.deepEqual(ui.table.getValue(), { b: 's' });
});

test('a target that no longer exists shows as unmapped, is left out of getValue, and returns with its target', function () {
    var ui = build({ value: { a: 'gone', b: 's' } });
    assert.equal(selects(ui)[0].value, '');
    assert.deepEqual(ui.table.getValue(), { b: 's' });
    ui.table.setTargets(TARGETS.concat([{ value: 'gone', label: 'Back Again' }]));
    assert.equal(selects(ui)[0].value, 'gone');
    assert.deepEqual(ui.table.getValue(), { a: 'gone', b: 's' });
});

test('setTargets keeps the pairs and redraws the choices', function () {
    var ui = build();
    ui.table.setTargets([{ value: 'm', label: 'Renamed' }, { value: 'x' }]);
    assert.deepEqual(all(selects(ui)[0], 'option').map(function (o) { return o.textContent; }), ['None', 'Renamed', 'x']);
    assert.equal(selects(ui)[0].value, 'm');
    ui.table.setTargets(null);
    assert.deepEqual(all(selects(ui)[0], 'option').map(function (o) { return o.value; }), ['']);
    assert.deepEqual(ui.table.getValue(), {});
});

test('setRows redraws the sources and keeps a pair for a source that comes back', function () {
    var ui = build();
    ui.table.setRows([{ value: 'b', label: 'Shows' }]);
    assert.equal(rows(ui).length, 1);
    assert.deepEqual(ui.table.getValue(), {});
    ui.table.setRows(SOURCES);
    assert.deepEqual(ui.table.getValue(), { a: 'm' });
});

test('setValue replaces the pairs without calling onChange', function () {
    var ui = build();
    ui.table.setValue({ b: 'm', c: 's', z: 'm' });
    assert.deepEqual(selects(ui).map(function (s) { return s.value; }), ['', 'm', 's']);
    assert.deepEqual(ui.table.getValue(), { b: 'm', c: 's' });
    assert.equal(ui.changes.length, 0);
    ui.table.setValue(null);
    assert.deepEqual(ui.table.getValue(), {});
});

test('unique disables a picked target in the other rows', function () {
    var ui = build({ unique: true });
    assert.deepEqual(disabled(selects(ui)[0]), []);
    assert.deepEqual(disabled(selects(ui)[1]), ['m']);
    pick(selects(ui)[1], 's');
    assert.deepEqual(disabled(selects(ui)[0]), ['s']);
    assert.deepEqual(disabled(selects(ui)[2]), ['m', 's']);
    pick(selects(ui)[0], '');
    assert.deepEqual(disabled(selects(ui)[2]), ['s']);
});

test('without unique every target stays enabled in every row', function () {
    var ui = build({ value: { a: 'm', b: 'm' } });
    assert.deepEqual(selects(ui).map(disabled), [[], [], []]);
    assert.deepEqual(ui.table.getValue(), { a: 'm', b: 'm' });
});

test('with unique a target held twice stays with the first row', function () {
    var ui = build({ unique: true, value: { a: 'm', b: 'm' } });
    assert.deepEqual(selects(ui).map(function (s) { return s.value; }), ['m', '', '']);
    assert.deepEqual(ui.table.getValue(), { a: 'm' });
});

test('an empty table shows the empty sentence in place of the table', function () {
    var ui = build({ rows: [] });
    var empty = ui.table.element.querySelector('.base-mapping-table-empty');
    assert.equal(empty.hidden, false);
    assert.equal(empty.textContent, 'Nothing to map.');
    assert.equal(ui.table.element.querySelector('.base-static-table-scroll').hidden, true);
    ui.table.setRows(SOURCES);
    assert.equal(empty.hidden, true);
    assert.equal(ui.table.element.querySelector('.base-static-table-scroll').hidden, false);
});

test('it works with no options, and skips rows and targets with no value or a repeated value', function () {
    var table = createMappingTable();
    assert.deepEqual(table.getValue(), {});
    table.setRows([{ value: 'a' }, { value: 'a', label: 'Again' }, null, { label: 'No value' }, { value: 1, label: 'One' }]);
    table.setTargets([{ value: 't' }, { value: 't' }, { value: '' }, null]);
    assert.equal(all(table.element, 'tbody tr').length, 2);
    assert.deepEqual(all(table.element, 'tbody select')[0].querySelectorAll('option').length, 2);
    table.setValue({ 1: 't' });
    assert.deepEqual(table.getValue(), { 1: 't' });
    table.destroy();
});

test('a source named __proto__ is an own key and never touches the prototype', function () {
    var ui = build({ rows: [{ value: '__proto__', label: 'Odd' }], value: null });
    pick(selects(ui)[0], 'm');
    var value = ui.table.getValue();
    assert.deepEqual(Object.keys(value), ['__proto__']);
    assert.equal(Object.getPrototypeOf(value), Object.prototype);
    assert.equal(({}).m, undefined);
});

test('label text is set as text, never as markup', function () {
    var ui = build({ rows: [{ value: 'x', label: '<b>bold</b>' }] });
    assert.equal(rows(ui)[0].querySelector('.base-mapping-table-name').textContent, '<b>bold</b>');
    assert.equal(rows(ui)[0].querySelector('b'), null);
});

test('destroy removes the listeners', function () {
    var ui = build();
    var select = selects(ui)[0];
    ui.table.destroy();
    assert.equal(select.listeners.change.length, 0);
});

test('createMappingTable puts size small or large on data-base-size, and leaves it off for medium or no size', function () {
    function build(size) { return createMappingTable({ size: size }); }
    assert.equal(build('small').element.getAttribute('data-base-size'), 'small');
    assert.equal(build('large').element.getAttribute('data-base-size'), 'large');
    assert.equal(build('medium').element.hasAttribute('data-base-size'), false);
    assert.equal(build(undefined).element.hasAttribute('data-base-size'), false);
});

test('extra fields add a column each, and their values come back in getDetails', function () {
    var ui = build({ fields: [{ key: 'mode', label: 'Mode', type: 'select', options: ['copy', 'link'] }, { key: 'note', label: 'Note' }], details: { a: { mode: 'link', note: 'x' } } });
    assert.deepEqual(all(ui.table.element, 'thead th').map(function (t) { return t.textContent; }), ['Source', 'Target', 'Mode', 'Note']);
    var note = rows(ui)[1].querySelector('.base-field-cell[data-key="note"] input');
    assert.equal(note.getAttribute('aria-label'), 'Note for Shows');
    note.value = 'y';
    note.dispatch('input');
    var details = ui.table.getDetails();
    assert.deepEqual(details.a, { target: 'm', enabled: true, mode: 'link', note: 'x' });
    assert.equal(details.b.note, 'y');
    assert.equal(ui.changes.length, 1);
});

test('a row switched off is left out of getValue and comes back when switched on', function () {
    var ui = build({ toggle: true });
    var toggle = rows(ui)[0].querySelector('.base-control-switch');
    assert.equal(toggle.getAttribute('aria-label'), 'Enable Movies');
    toggle.checked = false;
    toggle.dispatch('change');
    assert.deepEqual(ui.table.getValue(), {});
    assert.ok(rows(ui)[0].classList.contains('off'));
    assert.equal(ui.table.getDetails().a.enabled, false);
    toggle.checked = true;
    toggle.dispatch('change');
    assert.deepEqual(ui.table.getValue(), { a: 'm' });
});

test('remove drops a source and its pair, reports it, and moves focus to the next remove button', function () {
    var removed = [];
    var ui = build({ removable: true, onRemove: function (s) { removed.push(s); } });
    var btn = rows(ui)[0].querySelector('.base-mapping-table-remove-btn');
    assert.equal(btn.getAttribute('aria-label'), 'Remove Movies');
    btn.click();
    assert.equal(rows(ui).length, 2);
    assert.deepEqual(removed, ['a']);
    assert.deepEqual(ui.table.getValue(), {});
    assert.equal(dom.document.activeElement, rows(ui)[0].querySelector('.base-mapping-table-remove-btn'));
});

test('a required extra field makes isValid false and shows its message', function () {
    var ui = build({ fields: [{ key: 'note', label: 'Note', required: true }] });
    assert.equal(ui.table.isValid(), false);
    assert.equal(rows(ui)[0].querySelector('.base-field-message-text').textContent, 'Enter a note.');
});
