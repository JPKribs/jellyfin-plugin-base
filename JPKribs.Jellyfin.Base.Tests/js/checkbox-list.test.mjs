// Behavior tests for createCheckboxList, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, all } from './fake-dom.mjs';

var dom = installFakeDom();
var { createCheckboxList } = await import('../../src/js/index.js');

beforeEach(function () {
    dom = installFakeDom();
});

var ITEMS = [{ id: 1, name: 'One' }, { id: 2, name: 'Two' }, { id: 3, name: 'Three' }];

async function build(extra) {
    var changes = [];
    var list = createCheckboxList(Object.assign({ items: ITEMS, onChange: function (ids) { changes.push(ids); } }, extra));
    dom.document.body.appendChild(list.element);
    await list.ready;
    return { list: list, changes: changes, body: list.element.querySelector('.base-check-list-body') };
}

function labels(body) { return all(body, '.base-check-label').map(function (l) { return l.textContent; }); }

test('the rows stay labels directly in the body, with no list role, so the markup is unchanged', async function () {
    var ui = await build();
    assert.deepEqual(labels(ui.body), ['One', 'Two', 'Three']);
    var rows = all(ui.body, '.base-check-row');
    assert.ok(rows.every(function (r) { return r.parentNode === ui.body && r.tagName === 'LABEL'; }));
    assert.ok(rows.every(function (r) { return !r.hasAttribute('role'); }));
    assert.equal(ui.body.hasAttribute('role'), false);
    assert.ok(ui.body.classList.contains('base-check-list-body'));
});

test('by default the body caps at 320px and scrolls, as the stylesheet did', async function () {
    var ui = await build();
    assert.ok(ui.body.classList.contains('capped'));
    assert.ok(ui.body.classList.contains('scrolls'));
    assert.equal(ui.body.classList.contains('fixed'), false);
    assert.equal(ui.body.style['--base-list-max'], '320px');
});

test('height and maxHeight pass to the list, and null removes the cap', async function () {
    var fixed = await build({ height: 200, maxHeight: null });
    assert.ok(fixed.body.classList.contains('fixed'));
    assert.equal(fixed.body.style['--base-list-height'], '200px');
    assert.equal(fixed.body.classList.contains('capped'), false);

    var grows = await build({ maxHeight: null });
    assert.equal(grows.body.classList.contains('scrolls'), false);

    var capped = await build({ maxHeight: '40vh', minHeight: 120 });
    assert.equal(capped.body.style['--base-list-max'], '40vh');
    assert.equal(capped.body.style['--base-list-min'], '120px');
});

test('setHeight switches the height later', async function () {
    var ui = await build();
    ui.list.setHeight(240);
    assert.ok(ui.body.classList.contains('fixed'));
    assert.equal(ui.body.style['--base-list-height'], '240px');
    assert.equal(ui.body.classList.contains('capped'), false);
});

test('a search with no match shows the empty message in the body, and the selection survives it', async function () {
    var ui = await build({ value: [2], emptyMessage: 'Nothing here.' });
    var search = ui.list.element.querySelector('.base-check-list-search');
    search.value = 'zzz';
    search.dispatch('input');
    await new Promise(function (r) { setTimeout(r, 250); });
    assert.equal(all(ui.body, '.base-check-row').length, 0);
    assert.equal(ui.body.querySelector('.base-check-empty').textContent, 'Nothing here.');
    assert.deepEqual(ui.list.getValue(), ['2']);
    ui.list.destroy();
});

test('checking a row calls onChange, and setDisabled draws the rows again', async function () {
    var ui = await build({ showSelectAll: true });
    var box = ui.body.querySelector('.base-check-row-input');
    box.checked = true;
    box.dispatch('change');
    assert.deepEqual(ui.changes, [['1']]);
    ui.list.setDisabled([3]);
    var rows = all(ui.body, '.base-check-row');
    assert.equal(rows.length, 3);
    assert.ok(rows[2].classList.contains('base-check-row-disabled'));
    assert.equal(rows[0].querySelector('.base-check-row-input').checked, true);
    assert.equal(ui.list.element.querySelector('.base-check-selectall').classList.contains('hidden'), false);
});

test('createCheckboxList puts size small or large on data-base-size, and leaves it off for medium or no size', function () {
    function build(size) { return createCheckboxList({ items: [], size: size }); }
    assert.equal(build('small').element.getAttribute('data-base-size'), 'small');
    assert.equal(build('large').element.getAttribute('data-base-size'), 'large');
    assert.equal(build('medium').element.hasAttribute('data-base-size'), false);
    assert.equal(build(undefined).element.hasAttribute('data-base-size'), false);
});

test('select all picks only the rows in view that can be picked, and is checked once they all are', async function () {
    var ui = await build({ showSelectAll: true, disabledIds: [3], value: [9] });
    var selectAll = ui.list.element.querySelector('.base-check-selectall input');
    selectAll.checked = true;
    selectAll.dispatch('change');
    assert.deepEqual(ui.list.getValue(), ['9', '1', '2']);
    assert.equal(selectAll.checked, true);
    assert.equal(selectAll.indeterminate, false);
    var box = ui.body.querySelector('.base-check-row-input');
    box.checked = false;
    box.dispatch('change', { bubbles: true });
    assert.equal(selectAll.indeterminate, true);
    assert.deepEqual(ui.changes[ui.changes.length - 1], ['9', '2']);
});

test('the search matches searchKeys, and the list says it is loading while fetchItems is pending', async function () {
    var release;
    var list = createCheckboxList({ fetchItems: function () { return new Promise(function (r) { release = r; }); }, searchKeys: ['name', 'code'] });
    var body = list.element.querySelector('.base-check-list-body');
    assert.ok(body.querySelector('.base-list-loading'));
    release([{ id: 1, name: 'One', code: 'x1' }, { id: 2, name: 'Two', code: 'y2' }]);
    await list.ready;
    assert.equal(body.querySelector('.base-list-loading'), null);
    var search = list.element.querySelector('.base-check-list-search');
    search.value = 'Y2';
    search.dispatch('input');
    await new Promise(function (r) { setTimeout(r, 250); });
    assert.deepEqual(labels(body), ['Two']);
    list.destroy();
});

test('a search function asks the server for each search text, and the selection stays across searches', async function () {
    var asked = [];
    var ui = await build({ items: undefined, value: [1], search: function (text) {
        asked.push(text);
        return Promise.resolve({ Items: ITEMS.filter(function (i) { return i.name.toLowerCase().indexOf(text.toLowerCase()) !== -1; }) });
    } });
    assert.deepEqual(asked, ['']);
    assert.deepEqual(labels(ui.body), ['One', 'Two', 'Three']);
    var input = ui.list.element.querySelector('.base-check-list-search');
    input.value = 'tw';
    input.dispatch('input');
    await new Promise(function (r) { setTimeout(r, 260); });
    assert.deepEqual(asked, ['', 'tw']);
    assert.deepEqual(labels(ui.body), ['Two']);
    ui.body.querySelector('input[type="checkbox"]').checked = true;
    ui.body.querySelector('input[type="checkbox"]').dispatch('change');
    assert.deepEqual(ui.list.getValue(), ['1', '2']);
    var items = await ui.list.refresh();
    assert.deepEqual(items.map(function (i) { return i.id; }), [2]);
    assert.deepEqual(asked, ['', 'tw', 'tw']);
});
