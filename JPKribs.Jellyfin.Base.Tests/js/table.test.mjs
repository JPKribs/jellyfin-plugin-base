// Behavior tests for createPaginatedTable, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, all } from './fake-dom.mjs';

var dom = installFakeDom();
var { createPaginatedTable, escapeHtml } = await import('../../src/js/index.js');

var observers;
beforeEach(function () {
    dom = installFakeDom();
    observers = [];
    globalThis.IntersectionObserver = class {
        constructor(cb) { this.cb = cb; this.connected = true; observers.push(this); }
        observe() {}
        disconnect() { this.connected = false; }
    };
});

function deferred() {
    var d = {};
    d.promise = new Promise(function (res, rej) { d.resolve = res; d.reject = rej; });
    return d;
}

function tick() { return new Promise(function (r) { setTimeout(r, 0); }); }

// A bag with the members the table reads. statusBadge stands in for the bag's own.
function bag(apiRequest) {
    return {
        escapeHtml: escapeHtml,
        apiRequest: apiRequest,
        statusBadge: function (text, cls) { return '<span class="base-table-status-badge ' + cls + '">' + escapeHtml(text) + '</span>'; }
    };
}

function answerWith(ids) {
    return function () { return Promise.resolve({ Items: ids.map(function (id) { return { id: id, name: 'n' + id }; }), TotalCount: ids.length }); };
}

// Builds a table in a container in the document, answered by apiRequest.
function makeTable(options, apiRequest) {
    var view = dom.el('div');
    dom.document.body.appendChild(view);
    var container = view.appendChild(dom.el('div', { id: 'tbl' }));
    var table = createPaginatedTable(view, bag(apiRequest || answerWith([])), Object.assign({ containerId: 'tbl', endpoint: 'x', columns: [{ key: 'id' }] }, options));
    return { table: table, container: container, body: container.querySelector('.base-table-body') };
}

function rows(t) { return all(t.body, '.base-table-row'); }
function selected(t) { return rows(t).map(function (r) { return r.classList.contains('selected'); }); }
function box(t, i) { return rows(t)[i].querySelector('.base-table-row-checkbox'); }

test('checking a row checkbox adds selected to its row and unchecking removes it', async function () {
    var t = makeTable({ selection: { enabled: true } }, answerWith(['a', 'b']));
    await t.table.load();
    box(t, 0).checked = true;
    box(t, 0).dispatch('change', { bubbles: true });
    assert.deepEqual(selected(t), [true, false]);
    assert.deepEqual(t.table.getSelectedIds(), ['a']);
    box(t, 0).checked = false;
    box(t, 0).dispatch('change', { bubbles: true });
    assert.deepEqual(selected(t), [false, false]);
});

test('the select all row is a checkbox row, marks every row, and goes indeterminate for a partial selection', async function () {
    var heard = [];
    var t = makeTable({ selection: { enabled: true, onSelectionChange: function (ids) { heard.push(ids); } } }, answerWith(['a', 'b', 'c']));
    await t.table.load();
    var selectAll = t.container.querySelector('.base-table-select-all');
    assert.ok(selectAll.closest('.base-check-row'));
    selectAll.checked = true;
    selectAll.dispatch('change');
    assert.deepEqual(selected(t), [true, true, true]);
    assert.equal(t.container.querySelector('.base-table-selected-count').textContent, '3 selected');
    box(t, 1).checked = false;
    box(t, 1).dispatch('change', { bubbles: true });
    assert.equal(selectAll.indeterminate, true);
    assert.equal(selectAll.checked, false);
    t.table.clearSelection();
    assert.deepEqual(selected(t), [false, false, false]);
    assert.deepEqual(heard[heard.length - 1], []);
});

test('refresh keeps the selection on the new rows and reload clears it', async function () {
    var t = makeTable({ selection: { enabled: true } }, answerWith(['a', 'b']));
    await t.table.load();
    box(t, 1).checked = true;
    box(t, 1).dispatch('change', { bubbles: true });
    await t.table.refresh();
    assert.deepEqual(selected(t), [false, true]);
    assert.equal(box(t, 1).checked, true);
    await t.table.reload();
    assert.deepEqual(selected(t), [false, false]);
    assert.deepEqual(t.table.getSelectedIds(), []);
});

test('a column label is written on each cell as data-label, and a hidden column draws no cell', async function () {
    var t = makeTable({ columns: [{ key: 'id', label: 'Item <Id>' }, { key: 'id' }, { key: 'name', label: 'Hidden', hidden: true }] }, answerWith(['a']));
    await t.table.load();
    var cells = all(rows(t)[0], '.base-table-cell');
    assert.equal(cells.length, 2);
    assert.equal(cells[0].getAttribute('data-label'), 'Item <Id>');
    assert.equal(cells[0].textContent, 'a');
    assert.equal(cells[1].hasAttribute('data-label'), false);
});

test('the selection checkbox cell has no data-label', async function () {
    var t = makeTable({ selection: { enabled: true }, columns: [{ key: 'id', label: 'Id' }] }, answerWith(['a']));
    await t.table.load();
    var cell = rows(t)[0].querySelector('.base-table-cell-checkbox');
    assert.equal(cell.hasAttribute('data-label'), false);
});

test('a status column draws the bag status badge inside a button that opens the row once', async function () {
    var opened = [];
    var t = makeTable({ columns: [{ key: 'name', type: 'status' }], getStatusClass: function () { return 'Active'; }, actions: { onRowClick: function (item) { opened.push(item.id); } } }, answerWith(['a']));
    await t.table.load();
    var btn = rows(t)[0].querySelector('.base-table-status-btn');
    assert.match(btn.innerHTML, /^<span class="base-table-status-badge Active">na<\/span>$/);
    btn.dispatch('click', { bubbles: true });
    assert.deepEqual(opened, ['a']);
});

test('a clickable row opens on click and on Enter, and a checkbox click does not open it', async function () {
    var opened = [];
    var t = makeTable({ selection: { enabled: true }, actions: { onRowClick: function (item) { opened.push(item.id); } } }, answerWith(['a']));
    await t.table.load();
    var row = rows(t)[0];
    assert.equal(row.getAttribute('tabindex'), '0');
    assert.ok(row.classList.contains('base-table-row-clickable'));
    box(t, 0).dispatch('click', { bubbles: true });
    assert.deepEqual(opened, []);
    row.dispatch('click', { bubbles: true });
    row.dispatch('keydown', { key: 'Enter', bubbles: true });
    assert.deepEqual(opened, ['a', 'a']);
});

test('a column with image draws a thumbnail of its shape before the cell', async function () {
    var t = makeTable({ columns: [{ key: 'name', image: function (item) { return '/img/' + item.id; }, imageShape: 'round' }] }, answerWith(['a']));
    await t.table.load();
    var cell = rows(t)[0].querySelector('.base-table-cell');
    assert.ok(cell.classList.contains('base-table-cell-with-thumb'));
    var thumb = cell.children[0];
    assert.ok(thumb.classList.contains('base-thumb') && thumb.classList.contains('base-table-thumb') && thumb.classList.contains('round'));
    assert.equal(thumb.querySelector('.base-thumb-image').getAttribute('src'), '/img/a');
});

test('createPaginatedTable puts size small or large on data-base-size of its wrapper, and leaves it off for medium or no size', function () {
    function wrapper(size) { return makeTable({ size: size }).container.querySelector('.base-table-wrapper'); }
    assert.equal(wrapper('small').getAttribute('data-base-size'), 'small');
    assert.equal(wrapper('large').getAttribute('data-base-size'), 'large');
    assert.equal(wrapper('medium').hasAttribute('data-base-size'), false);
    assert.equal(wrapper(undefined).hasAttribute('data-base-size'), false);
});

test('nothing loads until load, and the list says it is loading until the first answer', async function () {
    var urls = [];
    var t = makeTable({ emptyState: { message: 'Nothing.' } }, function (url) { urls.push(url); return Promise.resolve({ Items: [], TotalCount: 0 }); });
    await tick();
    assert.equal(urls.length, 0);
    assert.ok(t.body.querySelector('.base-list-loading'));
    await t.table.load();
    assert.equal(t.body.querySelector('.base-list-loading'), null);
    assert.equal(t.body.querySelector('.base-list-empty').textContent, 'Nothing.');
});

test('a superseded load resolves to null and leaves the newer result in place', async function () {
    var pending = [];
    var t = makeTable({}, function () { var d = deferred(); pending.push(d); return d.promise; }).table;
    var first = t.load();
    var second = t.setSearch('b');
    await tick();
    pending[1].resolve({ Items: [{ id: 2, name: 'b' }], TotalCount: 1 });
    pending[0].resolve({ Items: [{ id: 1, name: 'a' }], TotalCount: 1 });
    assert.equal(await first, null);
    assert.deepEqual((await second).Items, [{ id: 2, name: 'b' }]);
    assert.deepEqual(t.getItems(), [{ id: 2, name: 'b' }]);
});

test('a failed load rejects and the table stops loading', async function () {
    var t = makeTable({}, function () { return Promise.reject(new Error('down')); });
    await assert.rejects(t.table.load(), /down/);
    assert.equal(t.container.classList.contains('base-table-loading'), false);
});

test('the request carries skip, take, search, and the filter, or buildParams for it', async function () {
    var urls = [];
    function api(url) { urls.push(url); return Promise.resolve({ Items: [], TotalCount: 0 }); }
    var t = makeTable({ pagination: { pageSize: 10 }, filters: { options: [{ value: 'Queued', label: 'Queued' }], initialValue: 'Queued' } }, api).table;
    await t.load();
    await t.setSearch('a b');
    assert.deepEqual(urls, ['x?skip=0&take=10&filter=Queued', 'x?skip=0&take=10&search=a%20b&filter=Queued']);
    var u = makeTable({ filters: { options: [{ value: 'Q', label: 'Q' }], buildParams: function (v) { return { status: v, none: null }; } } }, api).table;
    await u.setFilter('Q');
    assert.equal(urls[urls.length - 1], 'x?skip=0&take=50&status=Q');
});

test('filters: null does not crash and loads without a filter', async function () {
    var urls = [];
    var t = makeTable({ filters: null }, function (url) { urls.push(url); return Promise.resolve({ Items: [], TotalCount: 0 }); }).table;
    await t.load();
    assert.equal(urls.length, 1);
    assert.doesNotMatch(urls[0], /filter=/);
});

test('setFilterValue sets the select without loading, the next load carries it, and setFilterOptionVisible hides an option', async function () {
    var urls = [];
    var t = makeTable({ filters: { options: [{ value: 'A', label: 'A' }, { value: 'B', label: 'B', id: 'optB', hidden: true }] } }, function (url) { urls.push(url); return Promise.resolve({ Items: [], TotalCount: 0 }); });
    var select = t.container.querySelector('.base-table-filter');
    assert.equal(select.options[2].hidden, true);
    t.table.setFilterOptionVisible('optB', true);
    assert.equal(select.options[2].hidden, false);
    t.table.setFilterValue('B');
    assert.equal(select.value, 'B');
    await tick();
    assert.equal(urls.length, 0);
    await t.table.load();
    assert.match(urls[0], /filter=B$/);
});

test('the item count says 1 item, N items, and Showing X of N items while more remain', async function () {
    var total = 1;
    var t = makeTable({ pagination: { pageSize: 2 } }, function () {
        return Promise.resolve({ Items: Array.from({ length: Math.min(total, 2) }, function (_, i) { return { id: i }; }), TotalCount: total });
    });
    var count = t.container.querySelector('.base-table-item-count');
    await t.table.load();
    assert.equal(count.textContent, '1 item');
    total = 2;
    await t.table.reload();
    assert.equal(count.textContent, '2 items');
    total = 3;
    await t.table.reload();
    assert.equal(count.textContent, 'Showing 2 of 3 items');
});

test('the end of the list loads the next page and appends it, and disconnectObserver stops that until reconnectObserver', async function () {
    var urls = [];
    var t = makeTable({ pagination: { pageSize: 2 } }, function (url) {
        urls.push(url);
        var skip = Number(/skip=(\d+)/.exec(url)[1]);
        return Promise.resolve({ Items: [{ id: skip }, { id: skip + 1 }].filter(function (x) { return x.id < 5; }), TotalCount: 5 });
    });
    assert.equal(observers.length, 0);
    await t.table.load();
    assert.ok(observers.length > 0);
    observers[observers.length - 1].cb([{ isIntersecting: true }]);
    await tick();
    assert.equal(rows(t).length, 4);
    assert.match(urls[1], /skip=2&take=2/);
    t.table.disconnectObserver();
    observers[observers.length - 1].cb([{ isIntersecting: true }]);
    await tick();
    assert.equal(urls.length, 2);
    t.table.reconnectObserver();
    observers[observers.length - 1].cb([{ isIntersecting: true }]);
    await tick();
    assert.equal(rows(t).length, 5);
});

test('loadMore mode shows Load More and Load All as secondary buttons, and Load All reads every page', async function () {
    var t = makeTable({ pagination: { pageSize: 2, loadMore: true } }, function (url) {
        var skip = Number(/skip=(\d+)/.exec(url)[1]);
        return Promise.resolve({ Items: [{ id: skip }, { id: skip + 1 }].filter(function (x) { return x.id < 5; }), TotalCount: 5 });
    });
    var more = t.container.querySelector('.base-table-load-more');
    var actions = t.container.querySelector('.base-table-footer-actions');
    assert.ok(more.classList.contains('base-button') && more.classList.contains('secondary'));
    assert.equal(observers.length, 0);
    await t.table.load();
    assert.equal(actions.hidden, false);
    assert.equal(t.container.querySelector('.base-table-item-count').textContent, '2/5 items');
    more.click();
    await tick();
    assert.equal(rows(t).length, 4);
    t.container.querySelector('.base-table-load-all').click();
    await tick();
    await tick();
    assert.equal(rows(t).length, 5);
    assert.equal(actions.hidden, true);
});

test('the reload button is a row button that reloads and then calls onReload', async function () {
    var reloaded = 0;
    var t = makeTable({ selection: { enabled: true }, actions: { onReload: function () { reloaded++; } } }, answerWith(['a']));
    var btn = t.container.querySelector('.base-table-reload-btn');
    assert.ok(btn.classList.contains('base-row-btn'));
    assert.equal(btn.getAttribute('aria-label'), 'Reload');
    btn.click();
    assert.ok(btn.classList.contains('spinning'));
    await tick();
    await tick();
    assert.equal(btn.classList.contains('spinning'), false);
    assert.equal(reloaded, 1);
});

test('filters as an array draw a select each, and every picked value goes on the request under its name', async function () {
    var urls = [];
    var changed = [];
    var t = makeTable({ filters: [
        { name: 'status', label: 'Status', options: [{ value: 'Queued', label: 'Queued' }], initialValue: 'Queued' },
        { name: 'type', label: 'Type', options: [{ value: 'Movie', label: 'Movie' }], onChange: function (v) { changed.push(v); } },
        { label: 'Year', options: [{ value: '2020', label: '2020' }], buildParams: function (v) { return { minYear: v }; } }
    ] }, function (url) { urls.push(url); return Promise.resolve({ Items: [], TotalCount: 0 }); });
    var selects = Array.from(t.container.querySelectorAll('.base-table-filter'));
    assert.equal(selects.length, 3);
    assert.deepEqual(selects.map(function (s) { return s.getAttribute('aria-label'); }), ['Status', 'Type', 'Year']);
    await t.table.load();
    assert.equal(urls[0], 'x?skip=0&take=50&status=Queued');
    selects[1].value = 'Movie';
    selects[1].dispatch('change');
    await tick();
    assert.equal(urls[urls.length - 1], 'x?skip=0&take=50&status=Queued&type=Movie');
    assert.deepEqual(changed, ['Movie']);
    await t.table.setFilter('2020', 'filter3');
    assert.equal(selects[2].value, '2020');
    assert.equal(urls[urls.length - 1], 'x?skip=0&take=50&status=Queued&type=Movie&minYear=2020');
    t.table.setFilterValue('', 'status');
    await t.table.load();
    assert.equal(urls[urls.length - 1], 'x?skip=0&take=50&type=Movie&minYear=2020');
});

// Swaps in an IntersectionObserver that records what it watches, so a test can bring one thumbnail into view.
function watchThumbs() {
    var watched = [];
    globalThis.IntersectionObserver = class {
        constructor(cb) { this.cb = cb; this.targets = []; watched.push(this); }
        observe(el) { this.targets.push(el); }
        disconnect() { this.targets = []; }
    };
    return {
        show: function (thumb) {
            watched.forEach(function (o) { if (o.targets.indexOf(thumb) !== -1) o.cb([{ isIntersecting: true, target: thumb }]); });
        }
    };
}

function fakeObjectUrls() {
    var saved = { create: URL.createObjectURL, revoke: URL.revokeObjectURL };
    var urls = { made: [], revoked: [] };
    URL.createObjectURL = function () { var u = 'blob:' + urls.made.length; urls.made.push(u); return u; };
    URL.revokeObjectURL = function (u) { urls.revoked.push(u); };
    urls.restore = function () { URL.createObjectURL = saved.create; URL.revokeObjectURL = saved.revoke; };
    return urls;
}

test('a column image that returns a loader shows the shape placeholder and calls the loader only when its row nears the screen', async function () {
    var io = watchThumbs();
    var calls = [];
    var t = makeTable({ columns: [{ key: 'name', imageShape: 'square', image: function (item) {
        return function () { calls.push(item.id); return Promise.resolve('/proxy/' + item.id); };
    } }] }, answerWith(['a', 'b']));
    await t.table.load();
    var thumbs = all(t.body, '.base-table-thumb');
    assert.equal(thumbs.length, 2);
    assert.equal(thumbs[0].querySelector('.base-thumb-placeholder .material-icons').textContent, 'album');
    assert.equal(thumbs[0].querySelector('.base-thumb-image'), null);
    assert.deepEqual(calls, []);
    io.show(thumbs[1]);
    await tick();
    assert.deepEqual(calls, ['b']);
    assert.equal(thumbs[1].querySelector('.base-thumb-image').getAttribute('src'), '/proxy/b');
    assert.equal(thumbs[0].querySelector('.base-thumb-image'), null);
});

test('a column image loader that answers a Blob shows an object URL that is revoked when its row leaves and on destroy', async function () {
    var io = watchThumbs();
    var urls = fakeObjectUrls();
    try {
        var answers = [['a', 'b'], ['b']];
        var t = makeTable({ columns: [{ key: 'name', image: function () {
            return function () { return Promise.resolve(new Blob(['x'])); };
        } }] }, function () {
            var ids = answers.shift();
            return Promise.resolve({ Items: ids.map(function (id) { return { id: id, name: 'n' + id }; }), TotalCount: ids.length });
        });
        await t.table.load();
        all(t.body, '.base-table-thumb').forEach(io.show);
        await tick();
        assert.deepEqual(urls.made, ['blob:0', 'blob:1']);
        assert.equal(rows(t)[0].querySelector('.base-thumb-image').getAttribute('src'), 'blob:0');
        await t.table.load();
        assert.deepEqual(urls.revoked, ['blob:0']);
        t.table.destroy();
        assert.deepEqual(urls.revoked, ['blob:0', 'blob:1']);
    } finally {
        urls.restore();
    }
});

test('a column image that returns an empty value keeps only the placeholder', async function () {
    var t = makeTable({ columns: [{ key: 'name', image: function () { return null; } }] }, answerWith(['a']));
    await t.table.load();
    var thumb = rows(t)[0].querySelector('.base-table-thumb');
    assert.ok(thumb.querySelector('.base-thumb-placeholder'));
    assert.equal(thumb.querySelector('.base-thumb-image'), null);
});
