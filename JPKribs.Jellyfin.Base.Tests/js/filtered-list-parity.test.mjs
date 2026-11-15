// Tests the Filtered List features every list variation inherits: selection, bulk and toolbar actions, opening an item,
// runtime filter choices, clearable pills, a live refresh that keeps what did not change, and a cap with its note.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, all } from './fake-dom.mjs';

var dom = installFakeDom();
var { createFilteredList, createDataTable, createCheckboxList, createPaginatedTable, createUserMultiSelector } = await import('../../src/js/index.js');

beforeEach(function () { dom = installFakeDom(); });

var ITEMS = [
    { id: 'a', name: 'Alien', state: 'Synced', peer: 'den' },
    { id: 'b', name: 'Brazil', state: 'Queued', peer: 'cabin' },
    { id: 'c', name: 'Cosmos', state: 'Errored', peer: 'den' }
];

function cells(list) { return all(list.list.element, '.base-list-item'); }
function boxes(list) { return all(list.list.element, '.base-filtered-check'); }
function check(box, on) { box.checked = on; box.dispatch('change', { bubbles: true }); }
function build(extra) {
    var list = createFilteredList(Object.assign({ items: ITEMS, rowKey: 'id', render: function (item) { var el = dom.el('div'); el.textContent = item.name; return el; } }, extra || {}));
    dom.document.body.appendChild(list.element);
    return list;
}

test('multiple selection draws a checkbox on each item and a select all that is checked, partly checked, or clear', function () {
    var heard = [];
    var list = build({ selectable: 'multiple', onSelectionChange: function (ids, items) { heard.push([ids, items.map(function (i) { return i.name; })]); } });
    assert.equal(boxes(list).length, 3);
    assert.ok(boxes(list).every(function (b) { return b.classList.contains('base-check-row-input'); }));
    check(boxes(list)[1], true);
    assert.deepEqual(heard[heard.length - 1], [['b'], ['Brazil']]);
    assert.ok(cells(list)[1].classList.contains('selected'));
    var selectAll = list.selectBar.querySelector('.base-filtered-selectall-box');
    assert.equal(selectAll.indeterminate, true);
    check(selectAll, true);
    assert.deepEqual(list.getSelected(), ['b', 'a', 'c']);
    assert.equal(selectAll.checked, true);
    list.clearSelection();
    assert.equal(selectAll.checked, false);
    assert.deepEqual(list.getSelectedItems(), []);
    list.setSelected(['c']);
    assert.equal(boxes(list)[2].checked, true);
    assert.equal(heard[heard.length - 1][0].length, 0);
});

test('bulk actions say how many are selected, stay disabled while none are, and get the selected items', function () {
    var got = null;
    var list = build({ selectable: 'multiple', bulkActions: [{ id: 'ignore', label: 'Ignore', icon: 'block', onClick: function (items) { got = items.map(function (i) { return i.id; }); } }] });
    var btn = list.bulkBar.querySelector('[data-action="ignore"]');
    var count = list.selectBar.querySelector('.base-filtered-selected');
    assert.ok(btn.classList.contains('base-button') && btn.classList.contains('small'));
    assert.equal(btn.disabled, true);
    assert.equal(count.textContent, '0 selected');
    check(boxes(list)[0], true);
    check(boxes(list)[2], true);
    assert.equal(count.textContent, '2 selected');
    assert.equal(btn.disabled, false);
    assert.ok(list.selectBar.classList.contains('active'));
    btn.click();
    assert.deepEqual(got, ['a', 'c']);
});

test('onOpen runs on a click and on Enter or Space, and not from the checkbox', function () {
    var opened = [];
    var list = build({ selectable: 'multiple', onOpen: function (item) { opened.push(item.id); } });
    var cell = cells(list)[0];
    assert.equal(cell.getAttribute('tabindex'), '0');
    assert.ok(cell.classList.contains('openable'));
    boxes(list)[0].dispatch('click', { bubbles: true });
    assert.deepEqual(opened, []);
    cell.dispatch('click', { bubbles: true });
    cell.dispatch('keydown', { key: 'Enter', bubbles: true });
    cell.dispatch('keydown', { key: ' ', bubbles: true });
    assert.deepEqual(opened, ['a', 'a', 'a']);
});

test('single selection picks an item on a click, clears it on a second, and marks aria-selected', function () {
    var heard = [];
    var list = build({ selectable: 'single', onSelectionChange: function (ids) { heard.push(ids); } });
    cells(list)[1].dispatch('click', { bubbles: true });
    assert.equal(cells(list)[1].getAttribute('aria-selected'), 'true');
    cells(list)[0].dispatch('click', { bubbles: true });
    assert.deepEqual(list.getSelected(), ['a']);
    cells(list)[0].dispatch('click', { bubbles: true });
    assert.deepEqual(heard[heard.length - 1], []);
});

test('setFilterOptions swaps pill, card, and select choices and keeps a picked value that still exists', function () {
    var list = build({ filters: [
        { name: 'peer', label: 'Servers', kind: 'pills', clearable: true, options: [] },
        { name: 'state', label: 'States', kind: 'cards', options: [{ value: 'Synced', label: 'Synced' }] },
        { name: 'kind', label: 'Kinds', field: 'state', options: [{ value: 'Queued', label: 'Queued' }] }
    ] });
    list.setFilterOptions('peer', [{ value: 'den', label: 'Den' }, { value: 'cabin', label: 'Cabin' }]);
    var pills = list.element.querySelector('.base-filtered-pills');
    assert.equal(all(pills, '.base-pill').length, 3);
    list.setFilter('peer', ['den']);
    assert.equal(cells(list).length, 2);
    list.setFilterOptions('peer', [{ value: 'den', label: 'Den' }, { value: 'office', label: 'Office' }]);
    assert.equal(cells(list).length, 2);
    assert.equal(pills.querySelector('[data-value="den"]').getAttribute('aria-pressed'), 'true');
    list.setFilterOptions('peer', [{ value: 'office', label: 'Office' }]);
    assert.equal(cells(list).length, 3);
    list.setFilterOptions('state', [{ value: 'Synced', label: 'Synced' }, { value: 'Errored', label: 'Errored' }]);
    assert.equal(all(list.element, '.base-filtered-card').length, 2);
    list.setFilterOptions('kind', [{ value: 'Queued', label: 'Queued' }, { value: 'Synced', label: 'Synced' }]);
    assert.equal(list.element.querySelector('.base-filtered-select').options.length, 3);
});

test('a clearable pill row clears back to All on a second click of the picked pill', function () {
    var list = build({ filters: [{ name: 'peer', label: 'Servers', kind: 'pills', clearable: true, options: [{ value: 'den', label: 'Den' }] }] });
    var pill = list.element.querySelector('.base-filtered-pills [data-value="den"]');
    pill.click();
    assert.equal(cells(list).length, 2);
    pill.click();
    assert.equal(cells(list).length, 3);
    assert.equal(list.element.querySelector('.base-filtered-pills [data-value=""]').getAttribute('aria-pressed'), 'true');
});

test('setItems keeps the cells of unchanged items, draws only the changed one, and keeps the selection', function () {
    var list = build({ selectable: 'multiple' });
    check(boxes(list)[0], true);
    var before = cells(list);
    list.setItems(ITEMS.map(function (item) { return item.id === 'b' ? Object.assign({}, item, { state: 'Synced' }) : Object.assign({}, item); }));
    var after = cells(list);
    assert.equal(after[0], before[0]);
    assert.equal(after[2], before[2]);
    assert.notEqual(after[1], before[1]);
    assert.equal(boxes(list)[0].checked, true);
    assert.ok(after[0].classList.contains('selected'));
});

test('a limit caps the items shown and puts limitText in the summary, even with the summary off', function () {
    var many = Array.from({ length: 5 }, function (_, i) { return { id: i, name: 'n' + i }; });
    var list = build({ items: many, limit: 3, summary: false, limitText: 'Showing the latest {shown} of {total}.' });
    assert.equal(cells(list).length, 3);
    var summary = list.element.querySelector('.base-filtered-summary');
    assert.equal(summary.textContent, 'Showing the latest 3 of 5.');
    assert.equal(summary.hidden, false);
    list.setItems(many.slice(0, 2));
    assert.equal(summary.hidden, true);
});

test('a toolbar action shows only while visible says so, and gets the state', function () {
    var data = ITEMS.slice();
    var seen = null;
    var list = build({ actions: [{ id: 'retry', label: 'Retry Errors', icon: 'refresh', onClick: function (state) { seen = state.items.length; }, visible: function (state) { return state.items.some(function (i) { return i.state === 'Errored'; }); } }] });
    var btn = list.toolbar.querySelector('[data-action="retry"]');
    assert.ok(btn.classList.contains('field'));
    assert.equal(btn.hidden, false);
    btn.click();
    assert.equal(seen, 3);
    list.setItems(data.filter(function (i) { return i.state !== 'Errored'; }));
    assert.equal(btn.hidden, true);
});

test('every variation builds with items, a sort, filters, and a selection set from the start', async function () {
    var rows = ITEMS.map(function (i) { return Object.assign({ n: i.name.length }, i); });
    var table = createDataTable({ columns: [{ key: 'name', label: 'Name' }, { key: 'n', label: 'N', align: 'end' }], rows: rows, sort: { key: 'name', dir: 'desc' }, filters: [{ name: 'state', label: 'States', options: [{ value: 'Synced', label: 'Synced' }] }], filterValues: { state: ['Synced'] }, selectable: 'multiple', selected: ['a'] });
    assert.equal(all(table.element, '.base-data-row').length, 1);
    assert.equal(table.element.querySelector('.base-data-check input').checked, true);
    assert.deepEqual(table.getSelectedKeys(), ['a']);
    var single = createDataTable({ columns: [{ key: 'name', label: 'Name' }], rows: rows, sort: { key: 'name', dir: 'asc' }, selectable: true, selected: 'b' });
    assert.equal(single.getSelected(), 'b');
    var filtered = build({ sort: { key: 'name', dir: 'desc' }, filters: [{ name: 'state', label: 'States', kind: 'cards', options: [{ value: 'Synced', label: 'Synced' }] }], filterValues: { state: ['Synced'] }, selectable: 'multiple', selected: ['a'], limit: 2, actions: [{ id: 'x', label: 'X', onClick: function () {}, visible: function () { return true; } }] });
    assert.equal(cells(filtered).length, 1);
    var checks = createCheckboxList({ items: ITEMS, value: ['a'], showSelectAll: true });
    await checks.ready;
    assert.deepEqual(checks.getValue(), ['a']);
    var users = createUserMultiSelector({ fetchUsers: function () { return Promise.resolve([{ Id: 'u1', Name: 'Ada' }]); }, value: ['u1'] });
    await users.ready;
    var view = dom.el('div');
    view.appendChild(dom.el('div', { id: 'tbl' }));
    var paged = createPaginatedTable(view, { apiRequest: function () { return Promise.resolve({ Items: ITEMS, TotalCount: 3 }); }, statusBadge: function (t) { return t; } }, { containerId: 'tbl', endpoint: 'x', columns: [{ key: 'name' }], selection: { enabled: true }, filters: { options: [{ value: 'A', label: 'A' }], initialValue: 'A' } });
    await paged.load();
    assert.equal(paged.getItems().length, 3);
});
