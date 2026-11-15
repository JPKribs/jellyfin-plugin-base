// Behavior tests for the data view in lib/data-view.ts, and how a filter panel and a pager drive one.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, all } from './fake-dom.mjs';

var dom = installFakeDom();
var { createDataView } = await import('../../src/js/lib/data-view.js');
var { createFilterPanel, createPagination } = await import('../../src/js/index.js');

beforeEach(function () {
    dom = installFakeDom();
});

var ROWS = [
    { id: 1, name: 'Alpha', kind: 'movie' },
    { id: 2, name: 'Beta', kind: 'show' },
    { id: 3, name: 'Gamma', kind: 'movie' },
    { id: 4, name: 'Delta', kind: 'show' },
    { id: 5, name: 'Epsilon', kind: 'movie' }
];

function ids(view) { return view.getState().items.map(function (r) { return r.id; }); }

test('local items are searched by searchKeys and filtered by field, and more adds the next page', function () {
    var view = createDataView({ items: ROWS, searchKeys: ['name'], filters: [{ name: 'kind' }], pageSize: 2 });
    assert.deepEqual(ids(view), [1, 2]);
    assert.equal(view.getState().hasMore, true);
    view.more();
    assert.deepEqual(ids(view), [1, 2, 3, 4]);
    view.setFilters({ kind: ['movie'] });
    assert.deepEqual(ids(view), [1, 3]);
    view.setSearch('ep');
    assert.deepEqual(ids(view), [5]);
});

test('paging pages shows one page at a time and setPage moves it, within the last page', function () {
    var view = createDataView({ items: ROWS, pageSize: 2, paging: 'pages' });
    assert.deepEqual(ids(view), [1, 2]);
    view.setPage(3);
    assert.deepEqual(ids(view), [5]);
    assert.equal(view.getState().hasMore, false);
    view.setPage(9);
    assert.equal(view.getState().query.page, 3);
    view.setPageSize(4);
    assert.deepEqual(ids(view), [1, 2, 3, 4]);
});

test('a remote view with immediate false waits for the first reload, and setQuery changes several parts with one fetch', async function () {
    var asked = [];
    var view = createDataView({ fetch: function (q) { asked.push(q); return { Items: [{ id: 1 }], TotalCount: 1 }; }, immediate: false });
    await Promise.resolve();
    assert.equal(asked.length, 0);
    var result = await view.setQuery({ search: 'a', filters: { kind: ['movie'] } });
    assert.equal(asked.length, 1);
    assert.equal(asked[0].search, 'a');
    assert.deepEqual(asked[0].filters, { kind: ['movie'] });
    assert.deepEqual(result, { answer: { Items: [{ id: 1 }], TotalCount: 1 }, error: null, stale: false });
});

test('a change settles stale when a newer one replaced it, and with the error when its fetch fails', async function () {
    var pending = [];
    var view = createDataView({ fetch: function () { return new Promise(function (res, rej) { pending.push({ res: res, rej: rej }); }); }, immediate: false });
    var first = view.reload();
    var second = view.setSearch('b');
    await new Promise(function (r) { setTimeout(r, 0); });
    pending[0].res([]);
    pending[1].rej(new Error('down'));
    assert.equal((await first).stale, true);
    var late = await second;
    assert.equal(late.stale, false);
    assert.match(late.error.message, /down/);
    assert.equal(view.getState().loading, false);
});

test('a filter panel onChange maps onto setFilters', function () {
    var view = createDataView({ items: ROWS, filters: [{ name: 'kind' }] });
    var panel = createFilterPanel({
        groups: [{ name: 'kind', label: 'Kind', options: [{ value: 'movie', label: 'Movie' }, { value: 'show', label: 'Show' }] }],
        onChange: view.setFilters
    });
    dom.document.body.appendChild(panel.element);
    panel.open();
    var boxes = all(dom.document.body, '.base-filter-input');
    boxes[1].checked = true;
    boxes[1].dispatch('change', { bubbles: true });
    assert.deepEqual(ids(view), [2, 4]);
    panel.destroy();
});

test('a pager drives a paged data view and reads its total back', function () {
    var pager;
    var view = createDataView({
        items: ROWS, pageSize: 2, paging: 'pages',
        onChange: function (state) { if (pager) pager.setValue({ page: state.query.page, pageSize: state.query.pageSize, total: state.total }); }
    });
    pager = createPagination({
        pageSize: 2, total: view.getState().total,
        onChange: function (v) { if (v.pageSize !== view.getState().query.pageSize) view.setPageSize(v.pageSize); else view.setPage(v.page); }
    });
    all(pager.element, '.base-pager-next')[0].click();
    assert.deepEqual(ids(view), [3, 4]);
    view.setFilters({});
    assert.equal(pager.getValue().page, 1);
    assert.equal(pager.getValue().total, 5);
});
