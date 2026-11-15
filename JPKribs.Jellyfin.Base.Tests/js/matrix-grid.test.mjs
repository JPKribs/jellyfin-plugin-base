// Behavior tests for createMatrixGrid, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, all } from './fake-dom.mjs';

var dom = installFakeDom();
var { createMatrixGrid } = await import('../../src/js/matrix-grid.js');

beforeEach(function () {
    dom = installFakeDom();
});

var ROWS = [{ key: 'movies', label: 'Movies', hint: '1,204 items' }, { key: 'shows', label: 'Shows' }];
var COLUMNS = [
    { key: 'sync', label: 'Sync', icon: 'sync' },
    { key: 'mode', label: 'Mode', type: 'select', options: ['copy', 'link'] },
    { key: 'limit', label: 'Limit', type: 'number', min: 0, max: 10 }
];

function build(extra) {
    var changes = [];
    var grid = createMatrixGrid(Object.assign({ rows: ROWS, columns: COLUMNS, value: { movies: { sync: true, mode: 'link', limit: 3 } }, onChange: function (v, r, c) { changes.push([r, c]); } }, extra));
    dom.document.body.appendChild(grid.element);
    return { grid: grid, changes: changes };
}

function row(ui, key) { return ui.grid.element.querySelector('.base-data-row[data-key="' + key + '"]'); }

test('it is a Data Table with a label column and a header per column, and a row per row with its hint', function () {
    var ui = build();
    assert.ok(ui.grid.element.classList.contains('base-data-table'));
    assert.ok(ui.grid.element.classList.contains('base-matrix-grid'));
    assert.deepEqual(all(ui.grid.element, '.base-data-heading .base-data-label').map(function (h) { return h.textContent; }).slice(1), ['Sync', 'Mode', 'Limit']);
    assert.equal(row(ui, 'movies').querySelector('.base-matrix-hint').textContent, '1,204 items');
    assert.equal(row(ui, 'shows').querySelector('.base-matrix-hint'), null);
});

test('each cell holds its column control with the row value, named by column and row', function () {
    var ui = build();
    var cells = all(row(ui, 'movies'), '.base-data-cell');
    var toggle = cells[1].querySelector('input[type="checkbox"]');
    assert.equal(toggle.checked, true);
    assert.equal(toggle.getAttribute('aria-label'), 'Sync for Movies');
    assert.equal(cells[2].querySelector('select').value, 'link');
    assert.equal(cells[3].querySelector('input').value, '3');
});

test('a change updates the value by row and column and reports it', function () {
    var ui = build();
    var toggle = all(row(ui, 'shows'), '.base-data-cell')[1].querySelector('input[type="checkbox"]');
    toggle.checked = true;
    toggle.dispatch('change');
    assert.equal(ui.grid.getValue().shows.sync, true);
    assert.deepEqual(ui.changes[0], ['shows', 'sync']);
    assert.equal(ui.grid.getValue().movies.mode, 'link');
});

test('a number out of range fails isValid and shows its message in the cell', function () {
    var ui = build({ value: { movies: { limit: 20 } } });
    assert.equal(ui.grid.isValid(), false);
    var input = all(row(ui, 'movies'), '.base-data-cell')[3].querySelector('input');
    assert.equal(input.getAttribute('aria-invalid'), 'true');
});

test('setRows draws other rows and keeps the values, and setValue replaces them', function () {
    var ui = build();
    ui.grid.setRows([{ key: 'music', label: 'Music' }, { key: 'movies', label: 'Movies' }]);
    assert.ok(row(ui, 'music'));
    assert.equal(all(row(ui, 'movies'), '.base-data-cell')[2].querySelector('select').value, 'link');
    ui.grid.setValue({ music: { mode: 'link' } });
    assert.equal(all(row(ui, 'music'), '.base-data-cell')[2].querySelector('select').value, 'link');
    assert.equal(all(row(ui, 'movies'), '.base-data-cell')[1].querySelector('input[type="checkbox"]').checked, false);
});

test('a column unit is drawn dimmed inside each number box', function () {
    var ui = build({ columns: [{ key: 'speed', label: 'Speed', type: 'number', min: 0, unit: 'Mbps' }], value: {} });
    var box = row(ui, 'movies').querySelector('.base-adorned');
    assert.ok(box.classList.contains('base-adorned-with-unit'));
    assert.equal(box.querySelector('.base-adorned-unit').textContent, 'Mbps');
    assert.equal(box.querySelector('input').getAttribute('data-base-unit'), 'Mbps');
    assert.equal(box.style.getPropertyValue('--base-adorned-unit-room'), 'calc(4ch + 0.5em)');
});

test('a hidden column skips isValid, and setColumnHidden hides its heading and cells', function () {
    var ui = build({ columns: COLUMNS.slice(0, 2).concat([Object.assign({ hidden: true }, COLUMNS[2])]), value: { movies: { limit: 20 } } });
    assert.equal(ui.grid.isValid(), true);
    var heading = all(ui.grid.element, '.base-data-heading')[3];
    assert.equal(heading.hidden, true);
    ui.grid.setColumnHidden('limit', false);
    assert.equal(heading.hidden, false);
    assert.equal(all(row(ui, 'movies'), '.base-data-cell')[3].hidden, false);
    assert.equal(ui.grid.isValid(), false);
    ui.grid.setColumnHidden('mode', true);
    assert.equal(all(row(ui, 'shows'), '.base-data-cell')[2].hidden, true);
});

test('a row cell override changes that cell type and unit, and null leaves it empty', function () {
    var columns = [{ key: 'normal', label: 'Normal', type: 'number', min: 0, unit: 'Mbps' }, { key: 'scheduled', label: 'Scheduled', type: 'number', min: 0, unit: 'Mbps' }];
    var rows = [
        { key: 'down', label: 'Downloads' },
        { key: 'hours', label: 'Hours', cells: { normal: { type: 'time', unit: undefined }, scheduled: null } }
    ];
    var ui = build({ rows: rows, columns: columns, value: { hours: { normal: '22:00' } } });
    var downCells = all(row(ui, 'down'), '.base-data-cell');
    assert.equal(downCells[1].querySelector('input').getAttribute('type'), 'number');
    var hourCells = all(row(ui, 'hours'), '.base-data-cell');
    var time = hourCells[1].querySelector('input');
    assert.equal(time.getAttribute('type'), 'time');
    assert.equal(time.value, '22:00');
    assert.equal(time.getAttribute('aria-label'), 'Normal for Hours');
    assert.equal(hourCells[1].querySelector('.base-adorned-unit'), null);
    assert.ok(hourCells[2].querySelector('.base-matrix-empty'));
    assert.equal(hourCells[2].querySelector('input'), null);
    assert.equal(Object.prototype.hasOwnProperty.call(ui.grid.getValue().hours, 'scheduled'), false);
});

test('badge and static cells show their value with no input, keep it, and skip isValid', function () {
    var columns = [
        { key: 'user', label: 'User', type: 'badge' },
        { key: 'admin', label: 'Admin', type: 'badge' },
        { key: 'note', label: 'Note', type: 'static' }
    ];
    var value = { movies: { user: { label: 'Limited', color: 'orange' }, admin: 'Yes', note: 'Only some' } };
    var ui = build({ columns: columns, value: value });
    var cells = all(row(ui, 'movies'), '.base-data-cell');
    var limited = cells[1].querySelector('.base-badge');
    assert.equal(limited.textContent, 'Limited');
    assert.ok(limited.classList.contains('orange'));
    assert.ok(cells[2].querySelector('.base-badge').classList.contains('gray'));
    assert.equal(cells[3].querySelector('.base-matrix-text').textContent, 'Only some');
    assert.equal(row(ui, 'movies').querySelector('input, select'), null);
    assert.equal(row(ui, 'shows').querySelector('.base-badge'), null);
    assert.deepEqual(ui.grid.getValue(), value);
    assert.equal(ui.grid.isValid(), true);
});

test('a note is a dimmed line under the grid', function () {
    var ui = build({ note: '0 is no limit.' });
    var note = ui.grid.element.querySelector('.base-matrix-note');
    assert.equal(note.textContent, '0 is no limit.');
    assert.ok(note.classList.contains('fieldDescription'));
    assert.equal(build().grid.element.querySelector('.base-matrix-note'), null);
});
