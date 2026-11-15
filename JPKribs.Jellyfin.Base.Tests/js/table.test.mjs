// Behavior tests for the selected row class of createPaginatedTable, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fake-dom.mjs';

var dom = installFakeDom();
var { createPaginatedTable, escapeHtml } = await import('../../src/js/index.js');

beforeEach(function () {
    dom = installFakeDom();
});

// A table whose parts are stubs, with a row and a checkbox stub per item standing in for the markup the fake DOM cannot parse.
function makeTable(ids, columns) {
    var view = dom.el('div');
    dom.document.body.appendChild(view);
    var container = view.appendChild(dom.el('div', { id: 'tbl' }));
    var body = container.appendChild(dom.el('div'));
    var selectAll = container.appendChild(dom.el('input', { type: 'checkbox' }));
    var count = container.appendChild(dom.el('span'));
    var parts = {
        '.jpk-table-body': body,
        '.jpk-table-select-all': selectAll,
        '.jpk-table-selected-count': count,
        '.jpk-table-scroll-sentinel': container.appendChild(dom.el('div')),
        '.jpk-table-item-count': container.appendChild(dom.el('div'))
    };
    container.querySelector = function (sel) { return parts[sel] || null; };
    var rows = ids.map(function (id) {
        var box = dom.el('input', { type: 'checkbox', class: 'jpk-table-row-checkbox', 'data-id': id });
        var row = dom.el('div', { class: 'jpk-table-row', 'data-id': id }, [dom.el('div', { class: 'jpk-table-cell' }, [box])]);
        return { row: row, box: box };
    });
    body.querySelectorAll = function (sel) {
        if (sel === '.jpk-table-row') return rows.map(function (r) { return r.row; });
        if (sel === '.jpk-table-row-checkbox') return rows.map(function (r) { return r.box; });
        return [];
    };
    var table = createPaginatedTable(view, { escapeHtml: escapeHtml, apiRequest: function () {
        return Promise.resolve({ Items: ids.map(function (id) { return { id: id }; }), TotalCount: ids.length });
    } }, {
        containerId: 'tbl', endpoint: 'x', columns: columns || [{ key: 'id' }], selection: { enabled: true }
    });
    return { table: table, rows: rows, body: body, selectAll: selectAll };
}

function selected(rows) { return rows.map(function (r) { return r.row.classList.contains('selected'); }); }

test('checking a row checkbox adds selected to its row and unchecking removes it', async function () {
    var t = makeTable(['a', 'b']);
    await t.table.load();
    t.rows[0].box.checked = true;
    t.rows[0].box.dispatch('change');
    assert.deepEqual(selected(t.rows), [true, false]);
    t.rows[0].box.checked = false;
    t.rows[0].box.dispatch('change');
    assert.deepEqual(selected(t.rows), [false, false]);
});

test('select all marks every row and clearSelection unmarks them', async function () {
    var t = makeTable(['a', 'b', 'c']);
    await t.table.load();
    t.selectAll.checked = true;
    t.selectAll.dispatch('change');
    assert.deepEqual(selected(t.rows), [true, true, true]);
    t.table.clearSelection();
    assert.deepEqual(selected(t.rows), [false, false, false]);
});

test('a re-rendered row keeps selected while its id is in the selection', async function () {
    var t = makeTable(['a', 'b']);
    await t.table.load();
    t.rows[1].box.checked = true;
    t.rows[1].box.dispatch('change');
    await t.table.refresh();
    var html = t.body.innerHTML;
    assert.match(html, /class="jpk-table-row selected" data-id="b"/);
    assert.match(html, /class="jpk-table-row" data-id="a"/);
});

test('a reload clears the selection, so the rows render without selected', async function () {
    var t = makeTable(['a', 'b']);
    await t.table.load();
    t.rows[0].box.checked = true;
    t.rows[0].box.dispatch('change');
    await t.table.reload();
    assert.doesNotMatch(t.body.innerHTML, /selected/);
});

test('a column label is written on each cell as data-label, escaped, and a column without one has none', async function () {
    var t = makeTable(['a'], [{ key: 'id', label: 'Item <Id>' }, { key: 'id' }, { key: 'id', label: 'Hidden', hidden: true }]);
    await t.table.load();
    var html = t.body.innerHTML;
    assert.match(html, /<div class="jpk-table-cell" data-label="Item &lt;Id&gt;">a<\/div>/);
    assert.match(html, /<div class="jpk-table-cell">a<\/div>/);
    assert.doesNotMatch(html, /Hidden/);
});

test('the selection checkbox cell has no data-label and a selected id renders its checkbox checked', async function () {
    var t = makeTable(['a', 'b'], [{ key: 'id', label: 'Id' }]);
    await t.table.load();
    t.rows[0].box.checked = true;
    t.rows[0].box.dispatch('change');
    await t.table.refresh();
    var html = t.body.innerHTML;
    assert.match(html, /jpk-table-cell-checkbox"><input type="checkbox" class="jpk-table-row-checkbox" data-id="a" checked/);
    assert.doesNotMatch(html, /jpk-table-cell-checkbox" data-label/);
});
