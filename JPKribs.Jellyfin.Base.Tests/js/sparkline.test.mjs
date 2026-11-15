// Behavior tests for createSparkline and the stat card's sparkline, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fake-dom.mjs';

var dom = installFakeDom();
var { createSparkline } = await import('../../src/js/sparkline.js');
var { createStatCard } = await import('../../src/js/stat-card.js');

beforeEach(function () {
    dom = installFakeDom();
});

test('the name gives the first, last, lowest, and highest values', function () {
    var spark = createSparkline({ label: 'Syncs', values: [3, 5, 2, 9], unit: 'GB' });
    assert.equal(spark.element.getAttribute('role'), 'img');
    assert.equal(spark.element.getAttribute('aria-label'), 'Syncs, from 3 GB to 9 GB, low 2 GB, high 9 GB');
});

test('summaryText and format replace the name and the values', function () {
    var spark = createSparkline({ values: [1, 4], summaryText: '{first} then {last}', format: function (v) { return v + '%'; } });
    assert.equal(spark.element.getAttribute('aria-label'), 'Trend, 1% then 4%');
});

test('it draws a line and an area, and skips missing values', function () {
    var spark = createSparkline({ values: [1, null, 3] });
    var line = spark.element.querySelector('.base-sparkline-line');
    assert.equal(line.getAttribute('d').split('L').length, 2);
    assert.ok(spark.element.querySelector('.base-sparkline-area'));
    assert.deepEqual(spark.getValue(), [1, 3]);
    assert.equal(createSparkline({ values: [1, 2], area: false }).element.querySelector('.base-sparkline-area'), null);
});

test('no values draws nothing and keeps the label', function () {
    var spark = createSparkline({ label: 'Empty' });
    assert.equal(spark.element.querySelector('svg'), null);
    assert.equal(spark.element.getAttribute('aria-label'), 'Empty');
});

test('a color takes the color core', function () {
    assert.ok(createSparkline({ values: [1], color: 'red' }).element.classList.contains('red'));
    assert.ok(createSparkline({ values: [1], color: '#123456' }).element.classList.contains('custom'));
});

test('a stat card with sparkline draws one under its trend, named by its label, and setValue replaces it', function () {
    var card = createStatCard({ value: 4, label: 'Syncs', trend: 2, sparkline: [1, 2, 4] });
    var spark = card.element.querySelector('.base-stat-sparkline');
    assert.ok(spark);
    assert.match(spark.getAttribute('aria-label'), /^Syncs, from 1 to 4/);
    card.setValue({ sparkline: [5, 1] });
    assert.equal(card.element.querySelectorAll('.base-stat-sparkline').length, 1);
    card.setValue({ sparkline: null });
    assert.equal(card.element.querySelector('.base-stat-sparkline'), null);
});
