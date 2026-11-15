// Tests the world map: shading by the layers that are on, the layer toggles, and the selection.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fake-dom.mjs';

installFakeDom();
var { createWorldMap, WORLD, COUNTRY_CODES, parseColor } = await import('../../src/js/index.js');

var LAYERS = [{ key: 'people', label: 'People', color: 'green' }, { key: 'failed', label: 'Failed', color: 'red' }, { key: 'blocked', label: 'Blocked', color: '#9b59b6' }];
var COUNTS = { US: { people: 10, failed: 2 }, DE: { failed: 3 }, FR: { blocked: 1 } };

function country(map, code) { return map.element.querySelector('[data-code="' + code + '"]'); }
function layer(map, key) { return map.element.querySelector('.base-world-layer[data-value="' + key + '"]'); }

test('the shapes cover the world and the codes list every country', function () {
    assert.ok(Object.keys(WORLD).length > 150);
    assert.equal(WORLD.US.name, 'United States of America');
    assert.ok(COUNTRY_CODES.length >= Object.keys(WORLD).length);
});

test('every layer starts on, and totals add the layers that are on', function () {
    var map = createWorldMap({ layers: LAYERS, counts: COUNTS });
    assert.deepEqual(map.getActive(), ['people', 'failed', 'blocked']);
    assert.deepEqual(map.totals(), { US: 12, DE: 3, FR: 1 });
    assert.equal(country(map, 'US').classList.contains('counted'), true);
    assert.equal(country(map, 'GB').classList.contains('counted'), false);
    assert.equal(country(map, 'US').getAttribute('tabindex'), '0');
    assert.equal(country(map, 'GB').getAttribute('tabindex'), null);
    assert.match(country(map, 'US').getAttribute('aria-label'), /United States of America, 12 \(People 10, Failed 2\)/);
});

test('a layer button turns its layer off and on, and the map reports it', function () {
    var reported = [];
    var map = createWorldMap({ layers: LAYERS, counts: COUNTS, onLayersChange: function (keys) { reported.push(keys); } });
    layer(map, 'failed').click();
    assert.equal(layer(map, 'failed').getAttribute('aria-pressed'), 'false');
    assert.deepEqual(map.getActive(), ['people', 'blocked']);
    assert.deepEqual(map.totals(), { US: 10, FR: 1 });
    assert.equal(country(map, 'DE').classList.contains('counted'), false);
    assert.deepEqual(reported[0], ['people', 'blocked']);
    map.setActive(['failed']);
    assert.equal(layer(map, 'failed').getAttribute('aria-pressed'), 'true');
    assert.equal(layer(map, 'people').getAttribute('aria-pressed'), 'false');
    assert.deepEqual(map.totals(), { US: 2, DE: 3 });
});

test('a country with one layer takes its color, and with several mixes them as paint by share', function () {
    var map = createWorldMap({ layers: [{ key: 'r', label: 'R', color: '#ff0000' }, { key: 'y', label: 'Y', color: '#ffff00' }, { key: 'b', label: 'B', color: '#0000ff' }],
        counts: { US: { r: 1, y: 1 }, DE: { y: 1, b: 1 }, FR: { b: 4 } } });
    function fill(code) { return country(map, code).style.getPropertyValue('--base-world-fill'); }
    assert.equal(fill('FR'), '#0000ff');
    var us = parseColor(fill('US'));
    assert.ok(us.r > 200 && us.g > 80 && us.g < 200 && us.b < 40, 'red and yellow make orange: ' + fill('US'));
    var de = parseColor(fill('DE'));
    assert.ok(de.g > de.r && de.g > de.b, 'yellow and blue make green: ' + fill('DE'));
    map.setActive(['y']);
    assert.equal(fill('US'), '#ffff00');
});

test('it keeps six layers at most and gives unnamed ones blue, yellow, red, then green, orange, purple', function () {
    var keys = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    var map = createWorldMap({ layers: keys.map(function (k) { return { key: k, label: k.toUpperCase() }; }), counts: { US: { a: 1 } } });
    var buttons = Array.from(map.element.querySelectorAll('.base-world-layer'));
    assert.equal(buttons.length, 6);
    assert.deepEqual(map.getActive(), ['a', 'b', 'c', 'd', 'e', 'f']);
    assert.deepEqual(buttons.map(function (b) { return b.style.getPropertyValue('--base-layer'); }),
        ['blue', 'yellow', 'red', 'green', 'orange', 'purple'].map(function (c) { return 'var(--base-' + c + '-fg)'; }));
    assert.equal(country(map, 'US').style.getPropertyValue('--base-world-fill'), 'var(--base-blue-fg)');
});

test('a layer that names a color keeps it, and the rest keep the default for their place', function () {
    var map = createWorldMap({ layers: [{ key: 'a', label: 'A', color: 'teal' }, { key: 'b', label: 'B' }, { key: 'c', label: 'C', color: '#123456' }] });
    var colors = Array.from(map.element.querySelectorAll('.base-world-layer')).map(function (b) { return b.style.getPropertyValue('--base-layer'); });
    assert.deepEqual(colors, ['var(--base-teal-fg)', 'var(--base-yellow-fg)', '#123456']);
});

test('a click on a counted country selects it and reports it, again clears it, and select() highlights quietly', function () {
    var picked = [];
    var map = createWorldMap({ layers: LAYERS, counts: COUNTS, onSelect: function (code) { picked.push(code); } });
    country(map, 'GB').click();
    assert.deepEqual(picked, []);
    country(map, 'DE').click();
    assert.equal(map.getSelected(), 'DE');
    assert.equal(country(map, 'DE').classList.contains('selected'), true);
    assert.equal(country(map, 'DE').getAttribute('aria-pressed'), 'true');
    country(map, 'DE').click();
    assert.equal(map.getSelected(), null);
    assert.deepEqual(picked, ['DE', null]);
    map.select('US');
    assert.equal(map.getSelected(), 'US');
    assert.deepEqual(picked, ['DE', null]);
});
