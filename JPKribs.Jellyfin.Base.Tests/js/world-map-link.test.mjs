// Tests that a world map and a data table share one selection through linkWorldMap.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fake-dom.mjs';

installFakeDom();
var { createDataTable, createWorldMap, linkWorldMap } = await import('../../src/js/index.js');

function setup(options) {
    var rows = [{ country: 'US', name: 'United States' }, { country: 'DE', name: 'Germany' }, { country: 'FR', name: 'France' }];
    var table = createDataTable({ columns: [{ key: 'name', label: 'Country' }], rows: rows, rowKey: 'country', selectable: true,
        filters: [{ name: 'country', label: 'Countries', options: rows.map(function (r) { return { value: r.country, label: r.name }; }) }] });
    var map = createWorldMap({ layers: [{ key: 'people', label: 'People' }], counts: { US: { people: 3 }, DE: { people: 1 }, FR: { people: 2 } } });
    linkWorldMap(map, table, options || 'country');
    return { table: table, map: map };
}
function shown(table) { return Array.from(table.element.querySelectorAll('.base-data-row')).map(function (r) { return r.getAttribute('data-key'); }); }
function country(map, code) { return map.element.querySelector('[data-code="' + code + '"]'); }

test('a country picked on the map selects its row and keeps every other row in view, and clearing it clears both', function () {
    var s = setup();
    country(s.map, 'DE').click();
    assert.equal(shown(s.table).length, 3);
    assert.equal(s.table.getSelected(), 'DE');
    country(s.map, 'DE').click();
    assert.equal(s.map.getSelected(), null);
    assert.equal(s.table.getSelected(), null);
});

test('with filter true, a country picked on the map narrows the table, and clearing it shows every row again', function () {
    var s = setup({ field: 'country', filter: true });
    country(s.map, 'DE').click();
    assert.deepEqual(shown(s.table), ['DE']);
    assert.equal(s.table.getSelected(), 'DE');
    country(s.map, 'DE').click();
    assert.equal(s.map.getSelected(), null);
    assert.equal(s.table.getSelected(), null);
    assert.equal(shown(s.table).length, 3);
});

test('a row picked in the table highlights its country, and clearing the row clears the map and the filter', function () {
    var s = setup();
    var fr = s.table.element.querySelector('.base-data-row[data-key="FR"]');
    fr.click();
    assert.equal(s.map.getSelected(), 'FR');
    assert.equal(country(s.map, 'FR').classList.contains('selected'), true);
    s.table.element.querySelector('.base-data-row[data-key="FR"]').click();
    assert.equal(s.map.getSelected(), null);
    assert.equal(country(s.map, 'FR').classList.contains('selected'), false);
    assert.equal(shown(s.table).length, 3);
});

test('with filter true, clearing the row in the table lifts the filter', function () {
    var s = setup({ field: 'country', filter: true });
    country(s.map, 'FR').click();
    assert.deepEqual(shown(s.table), ['FR']);
    s.table.element.querySelector('.base-data-row[data-key="FR"]').click();
    assert.equal(s.map.getSelected(), null);
    assert.equal(shown(s.table).length, 3);
});
