// Tests the data table and its link to the world map.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fake-dom.mjs';

installFakeDom();
var { createDataTable, createWorldMap, linkWorldMap } = await import('../../src/js/index.js');

var ROWS = [
    { id: 1, name: 'Ada', country: 'US', type: 'people', count: 3 },
    { id: 2, name: 'Bob', country: 'DE', type: 'failed', count: 10 },
    { id: 3, name: 'Cy', country: 'US', type: 'blocked', count: 1 }
];
var COLUMNS = [{ key: 'name', label: 'Name' }, { key: 'country', label: 'Country' }, { key: 'count', label: 'Count', align: 'end' }];

function names(table) { return Array.from(table.element.querySelectorAll('.base-data-row')).map(function (r) { return r.querySelector('.base-data-cell').textContent; }); }
function heading(table, key) { return table.element.querySelector('.base-data-sort[data-key="' + key + '"]'); }

test('it draws a heading per column and a row per item, with cells in the column order', function () {
    var table = createDataTable({ columns: COLUMNS, rows: ROWS });
    assert.equal(table.element.querySelectorAll('.base-data-heading').length, 3);
    assert.deepEqual(names(table), ['Ada', 'Bob', 'Cy']);
    assert.equal(table.element.querySelector('.base-data-grid').getAttribute('role'), 'table');
});

test('a sortable heading sorts ascending, then descending, then not at all, and marks aria-sort', function () {
    var table = createDataTable({ columns: COLUMNS, rows: ROWS });
    heading(table, 'count').click();
    assert.deepEqual(names(table), ['Cy', 'Ada', 'Bob']);
    var cell = heading(table, 'count').parentNode;
    assert.equal(cell.getAttribute('aria-sort'), 'ascending');
    heading(table, 'count').click();
    assert.deepEqual(names(table), ['Bob', 'Ada', 'Cy']);
    assert.equal(cell.getAttribute('aria-sort'), 'descending');
    heading(table, 'count').click();
    assert.deepEqual(names(table), ['Ada', 'Bob', 'Cy']);
    assert.equal(cell.getAttribute('aria-sort'), 'none');
});

test('a filter select and setFilter narrow the rows, and the search field matches the columns', function () {
    var table = createDataTable({ columns: COLUMNS, rows: ROWS, search: { placeholder: 'Search' },
        filters: [{ name: 'type', label: 'Types', options: [{ value: 'people', label: 'People' }, { value: 'failed', label: 'Failed' }] }] });
    var select = table.element.querySelector('.base-filtered-select');
    assert.equal(select.options[0].textContent, 'All Types');
    select.value = 'failed';
    select.dispatchEvent(new Event('change'));
    assert.deepEqual(names(table), ['Bob']);
    table.setFilter('type', []);
    assert.equal(select.value, '');
    table.setSearch('cy');
    assert.deepEqual(names(table), ['Cy']);
});

test('a selectable row is picked by click, again clears it, and select() highlights quietly', function () {
    var seen = [];
    var table = createDataTable({ columns: COLUMNS, rows: ROWS, selectable: true, onSelect: function (row, key) { seen.push(key); } });
    var bob = table.element.querySelector('.base-data-row[data-key="2"]');
    bob.click();
    assert.equal(table.getSelected(), '2');
    assert.equal(bob.getAttribute('aria-selected'), 'true');
    bob.click();
    assert.equal(table.getSelected(), null);
    table.select(1);
    assert.equal(table.getSelected(), '1');
    assert.deepEqual(seen, ['2', null]);
});

test('linkWorldMap: a country on the map selects its rows without hiding the rest, and a row highlights its country', function () {
    var table = createDataTable({ columns: COLUMNS, rows: ROWS, selectable: true, filters: [{ name: 'country', label: 'Countries', options: [] }] });
    var map = createWorldMap({ layers: [{ key: 'people', label: 'People' }], counts: { US: { people: 2 }, DE: { people: 1 } } });
    linkWorldMap(map, table, { field: 'country', rowKey: 'id' });
    map.element.querySelector('[data-code="US"]').click();
    assert.deepEqual(names(table), ['Ada', 'Bob', 'Cy']);
    map.element.querySelector('[data-code="US"]').click();
    assert.deepEqual(names(table), ['Ada', 'Bob', 'Cy']);
    table.element.querySelector('.base-data-row[data-key="2"]').click();
    assert.equal(map.getSelected(), 'DE');
});

test('an editable row opens into fields with Save and Cancel, and stays open with its draft across a refresh', async function () {
    var dom = installFakeDom();
    var saved = [];
    var table = createDataTable({ columns: COLUMNS, rows: ROWS, editable: { fields: [{ key: 'name', label: 'Name', required: true }, { key: 'count', label: 'Count', type: 'number' }], onSave: function (row, values) { saved.push([row.id, values]); } } });
    dom.document.body.appendChild(table.element);
    var btn = table.element.querySelector('.base-data-row[data-key="2"] .base-data-edit-btn');
    assert.equal(btn.getAttribute('aria-label'), 'Edit Bob');
    btn.click();
    assert.equal(table.getEditing(), '2');
    var editor = table.element.querySelector('.base-data-row[data-key="2"] .base-data-editor');
    var name = editor.querySelector('input');
    assert.equal(name.value, 'Bob');
    assert.equal(dom.document.activeElement, name);
    name.value = 'Bobby';
    name.dispatch('input');
    table.setRows(ROWS.map(function (r) { return r.id === 2 ? Object.assign({}, r, { count: 11 }) : r; }));
    var again = table.element.querySelector('.base-data-row[data-key="2"] .base-data-editor');
    assert.equal(again, editor);
    assert.equal(again.querySelector('input').value, 'Bobby');
    name.value = '';
    name.dispatch('input');
    again.querySelector('.base-button.primary').click();
    assert.equal(saved.length, 0, 'an invalid field stops the save');
    name.value = 'Bobby';
    name.dispatch('input');
    again.querySelector('.base-button.primary').click();
    await new Promise(function (r) { setTimeout(r, 0); });
    assert.deepEqual(saved, [[2, { name: 'Bobby', count: 10 }]]);
    assert.equal(table.getEditing(), null);
    assert.equal(table.element.querySelector('.base-data-editor'), null);
});

test('Cancel and Escape close the editor without saving, and a failed save keeps it open with a message', async function () {
    var dom = installFakeDom();
    var table = createDataTable({ columns: COLUMNS, rows: ROWS, editable: { fields: [{ key: 'name', label: 'Name' }], onSave: function () { return Promise.reject(new Error('no')); } } });
    dom.document.body.appendChild(table.element);
    table.edit(1);
    table.element.querySelector('.base-data-editor .base-button.secondary').click();
    assert.equal(table.getEditing(), null);
    table.edit(1);
    var editor = table.element.querySelector('.base-data-editor');
    editor.querySelector('.base-button.primary').click();
    await new Promise(function (r) { setTimeout(r, 0); });
    assert.equal(table.getEditing(), '1');
    assert.equal(editor.children[1].querySelector('.base-field-message-text').textContent, 'Could not save.');
    editor.querySelector('input').dispatch('keydown', { key: 'Escape' });
    assert.equal(table.getEditing(), null);
});

test('a hidden column hides its heading and cells and drops its track, and setColumnHidden shows it again', function () {
    var table = createDataTable({ columns: [COLUMNS[0], Object.assign({ hidden: true }, COLUMNS[1]), COLUMNS[2]], rows: ROWS });
    var head = table.element.querySelectorAll('.base-data-heading');
    assert.equal(head[1].hidden, true);
    var cells = table.element.querySelectorAll('.base-data-row')[0].querySelectorAll('.base-data-cell');
    assert.equal(cells[1].hidden, true);
    assert.equal(cells[1].getAttribute('data-column'), 'country');
    assert.equal(table.element.style.getPropertyValue('--base-data-columns'), 'minmax(var(--base-data-min), 1fr) var(--base-data-number)');
    assert.equal(table.element.style.getPropertyValue('--base-data-texts'), '1');
    table.setColumnHidden('country', false);
    assert.equal(head[1].hidden, false);
    assert.equal(cells[1].hidden, false);
    assert.equal(table.element.style.getPropertyValue('--base-data-texts'), '2');
    table.setColumnHidden('count', true);
    assert.equal(table.element.style.getPropertyValue('--base-data-ends'), '0');
    assert.equal(table.element.querySelectorAll('.base-data-row')[2].querySelectorAll('.base-data-cell')[2].hidden, true);
});

test('rowClass marks a data table row from its first draw and on every redraw', function () {
    var picked = 2;
    var table = createDataTable({ columns: COLUMNS, rows: ROWS, rowClass: function (row) { return row.id === picked ? 'selected' : ''; } });
    var marked = function () { return Array.from(table.element.querySelectorAll('.base-data-row')).filter(function (r) { return r.classList.contains('selected'); }).map(function (r) { return r.getAttribute('data-key'); }); };
    assert.deepEqual(marked(), ['2']);
    picked = 1;
    table.setRows(ROWS.slice());
    assert.deepEqual(marked(), ['1']);
});

function columnsTrack(table) { return table.element.style.getPropertyValue('--base-data-columns'); }

test('an auto column sizes to its widest value up to its limit, and the others share what is left', function () {
    var table = createDataTable({ columns: [{ key: 'name', label: 'Name', width: 'auto' }, { key: 'country', label: 'Country' }], rows: [{ id: 1, name: 'A much longer name here', country: 'US' }] });
    var track = columnsTrack(table);
    assert.match(track, /^max\(var\(--base-data-min\), min\(24ch, var\(--base-data-auto-max\)\)\) minmax\(var\(--base-data-min\), 1fr\)/);
    var limited = createDataTable({ columns: [{ key: 'name', label: 'Name', width: 'auto', maxWidth: '12rem' }], rows: [{ id: 1, name: 'x' }] });
    assert.match(columnsTrack(limited), /min\(\d+ch, 12rem\)/);
});

test('the least width counts fixed widths, so columns wider than the table scroll instead of spilling out', function () {
    var table = createDataTable({ columns: [{ key: 'name', label: 'Name', width: '20rem' }, { key: 'count', label: 'Count', align: 'end' }, { key: 'country', label: 'Country', width: '2fr' }], rows: ROWS });
    assert.equal(table.element.style.getPropertyValue('--base-data-span'), 'calc(20rem + var(--base-data-number) + var(--base-data-min))');
});

test('the header follows the rows when they scroll sideways inside the frame', function () {
    var table = createDataTable({ columns: COLUMNS, rows: ROWS });
    var body = table.element.querySelector('.base-data-body');
    var head = table.element.querySelector('.base-data-head');
    body.scrollLeft = 40;
    body.dispatchEvent(new Event('scroll'));
    assert.equal(head.style.transform, 'translateX(-40px)');
    body.scrollLeft = 0;
    body.dispatchEvent(new Event('scroll'));
    assert.equal(head.style.transform, '');
});

test('a resize handle on each heading resizes from the keyboard, fits on double-click, and remembers widths under widthKey', function () {
    var store = {};
    globalThis.localStorage = { getItem: function (k) { return store[k] === undefined ? null : store[k]; }, setItem: function (k, v) { store[k] = String(v); }, removeItem: function (k) { delete store[k]; } };
    try {
        var table = createDataTable({ columns: COLUMNS, rows: ROWS, widthKey: 'activity' });
        var handle = table.element.querySelector('.base-data-resize');
        assert.equal(handle.getAttribute('role'), 'separator');
        assert.equal(handle.getAttribute('aria-label'), 'Resize Name');
        handle.dispatch('keydown', { key: 'ArrowRight', altKey: true });
        assert.equal(table.getColumnWidths().name, 76);
        assert.match(columnsTrack(table), /^max\(var\(--base-size-medium\), 76px\)/);
        assert.deepEqual(JSON.parse(store['base-data-widths:activity']), { name: 76 });
        heading(table, 'name').dispatch('keydown', { key: 'ArrowLeft', altKey: true });
        assert.equal(table.getColumnWidths().name, 60);
        handle.dispatch('dblclick');
        assert.equal(table.getColumnWidths().name, 'fit');
        var again = createDataTable({ columns: COLUMNS, rows: ROWS, widthKey: 'activity' });
        assert.equal(again.getColumnWidths().name, 'fit');
        assert.match(columnsTrack(again), /^max\(var\(--base-data-min\), min\(\d+ch/);
        again.setColumnWidth('name', null);
        assert.equal(store['base-data-widths:activity'], undefined);
    } finally {
        delete globalThis.localStorage;
    }
});

test('dragging a handle sets the column width in pixels, and resizable false leaves the handles out', function () {
    var table = createDataTable({ columns: COLUMNS, rows: ROWS });
    var handle = table.element.querySelector('.base-data-resize');
    handle.dispatch('pointerdown', { button: 0, clientX: 100 });
    document.dispatch('pointermove', { clientX: 140 });
    document.dispatch('pointerup', {});
    assert.equal(table.getColumnWidths().name, 100);
    document.dispatch('pointermove', { clientX: 400 });
    assert.equal(table.getColumnWidths().name, 100);
    var plain = createDataTable({ columns: COLUMNS, rows: ROWS, resizable: false });
    assert.equal(plain.element.querySelector('.base-data-resize'), null);
});

test('a clipped cell shows its full text on hover, and loses it once it fits', function () {
    var table = createDataTable({ columns: COLUMNS, rows: ROWS });
    var cell = table.element.querySelector('.base-data-row[data-key="1"] .base-data-cell');
    cell.scrollWidth = 200;
    cell.clientWidth = 50;
    cell.dispatch('mouseover');
    assert.equal(cell.title, 'Ada');
    cell.scrollWidth = 50;
    cell.dispatch('mouseover');
    assert.equal(cell.hasAttribute('title'), false);
});
