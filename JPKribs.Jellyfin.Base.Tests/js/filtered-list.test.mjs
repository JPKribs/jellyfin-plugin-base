// Tests the filtered list: search, select, pill, and card filters with counts, sort, and the summary.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fake-dom.mjs';

installFakeDom();
var { createFilteredList } = await import('../../src/js/index.js');

var ITEMS = [
    { id: 1, name: 'Alien', type: 'Movie', state: 'Synced', year: 1979 },
    { id: 2, name: 'Brazil', type: 'Movie', state: 'Queued', year: 1985 },
    { id: 3, name: 'Cosmos', type: 'Series', state: 'Synced', year: 1980 },
    { id: 4, name: 'Dune', type: 'Movie', state: 'Errored', year: 2021 }
];
var FILTERS = [
    { name: 'state', label: 'States', kind: 'cards', options: [{ value: 'Synced', label: 'Synced', color: 'green' }, { value: 'Queued', label: 'Queued', color: 'orange' }, { value: 'Errored', label: 'Errored', color: 'red' }] },
    { name: 'type', label: 'Types', kind: 'pills', options: [{ value: 'Movie', label: 'Movies' }, { value: 'Series', label: 'Series' }] }
];

function names(list) { return Array.from(list.list.element.querySelectorAll('.base-list-item')).map(function (el) { return el.textContent; }); }
function make(extra) {
    return createFilteredList(Object.assign({ items: ITEMS, render: function (item) { return item.name; }, search: { keys: ['name'] }, filters: FILTERS }, extra || {}));
}
function card(list, value) { return list.element.querySelector('.base-filtered-card[data-value="' + value + '"]'); }
function pill(list, value) { return list.element.querySelector('.base-filtered-pills .base-pill[data-value="' + value + '"]'); }

test('it is a List with the items, and the summary says how many show', function () {
    var list = make();
    assert.deepEqual(names(list), ['Alien', 'Brazil', 'Cosmos', 'Dune']);
    assert.equal(list.element.querySelector('.base-filtered-summary').textContent, 'Showing 4 of 4.');
    assert.ok(list.list.element.classList.contains('base-list'));
});

test('count cards show their counts and turn their choice on and off', function () {
    var list = make();
    assert.equal(card(list, 'Synced').querySelector('.base-card-count').textContent, '2');
    card(list, 'Synced').click();
    assert.deepEqual(names(list), ['Alien', 'Cosmos']);
    card(list, 'Errored').click();
    assert.deepEqual(names(list), ['Alien', 'Cosmos', 'Dune']);
    assert.equal(list.element.querySelector('.base-filtered-summary').textContent, 'Showing 3 of 4.');
    card(list, 'Synced').click();
    card(list, 'Errored').click();
    assert.equal(names(list).length, 4);
});

test('pills pick one choice or All, and every count follows the other filters and the search', function () {
    var list = make();
    pill(list, 'Movie').click();
    assert.deepEqual(names(list), ['Alien', 'Brazil', 'Dune']);
    assert.equal(card(list, 'Synced').querySelector('.base-card-count').textContent, '1');
    list.setSearch('co');
    assert.deepEqual(names(list), []);
    assert.equal(pill(list, 'Series').querySelector('.base-filtered-pill-count').textContent, '1');
    pill(list, '').click();
    assert.deepEqual(names(list), ['Cosmos']);
});

test('a select filter and a sort select narrow and order the items', function () {
    var list = make({ filters: [{ name: 'type', label: 'Types', options: [{ value: 'Movie', label: 'Movies' }, { value: 'Series', label: 'Series' }] }],
        sorts: [{ key: 'name', label: 'Name' }, { key: 'year', label: 'Newest', dir: 'desc' }] });
    var select = list.element.querySelector('.base-filtered-select');
    assert.equal(select.options[1].textContent, 'Movies (3)');
    select.value = 'Series';
    select.dispatchEvent(new Event('change'));
    assert.deepEqual(names(list), ['Cosmos']);
    list.setFilter('type', []);
    var sort = list.element.querySelector('.base-filtered-sort');
    sort.value = '1';
    sort.dispatchEvent(new Event('change'));
    assert.deepEqual(names(list), ['Dune', 'Brazil', 'Cosmos', 'Alien']);
});
