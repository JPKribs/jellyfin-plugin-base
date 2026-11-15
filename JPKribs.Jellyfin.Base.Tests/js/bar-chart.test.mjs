// Behavior tests for createBarChart and the shared chart core, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, all } from './fake-dom.mjs';

var dom = installFakeDom();
var { createBarChart } = await import('../../src/js/bar-chart.js');
var { niceTicks, shortNumber, seriesColor } = await import('../../src/js/lib/chart.js');

beforeEach(function () {
    dom = installFakeDom();
});

function build(opts) {
    var chart = createBarChart(opts);
    dom.document.body.appendChild(chart.element);
    return chart;
}

test('niceTicks covers the range with round steps from zero', function () {
    assert.deepEqual(niceTicks(0, 77, 4), [0, 20, 40, 60, 80]);
    assert.deepEqual(niceTicks(0, 1240, 4), [0, 500, 1000, 1500]);
    assert.deepEqual(niceTicks(-2, 11, 4), [-5, 0, 5, 10, 15]);
    assert.deepEqual(niceTicks(0, 0, 4), [0, 1]);
});

test('shortNumber keeps an axis narrow', function () {
    assert.equal(shortNumber(950), '950');
    assert.equal(shortNumber(12500), '12.5k');
    assert.equal(shortNumber(3400000), '3.4M');
    assert.equal(shortNumber(0.256), '0.26');
});

test('a series without a color takes the next series color, and a named or hex color stays', function () {
    assert.equal(seriesColor({ values: [] }, 0), 'blue');
    assert.equal(seriesColor({ values: [] }, 1), 'green');
    assert.equal(seriesColor({ color: 'red', values: [] }, 0), 'red');
    assert.equal(seriesColor({ color: '#e91e63', values: [] }, 0), '#e91e63');
    assert.equal(seriesColor({ color: 'nope', values: [] }, 2), 'orange');
});

test('it draws one bar per value in its series color, each named with its label and value', function () {
    var chart = build({ label: 'Synced', labels: ['Mon', 'Tue'], series: [{ name: 'A', values: [4, 8] }, { name: 'B', color: '#e91e63', values: [2, null] }] });
    var bars = all(chart.element, 'rect.base-chart-mark');
    assert.equal(bars.length, 3);
    assert.equal(bars[0].getAttribute('aria-label'), 'Mon, A, 4');
    var groups = all(chart.element, '.base-chart-series');
    assert.ok(groups[0].classList.contains('blue'));
    assert.ok(groups[1].classList.contains('custom'));
    assert.match(groups[1].getAttribute('style'), /--base-custom: #e91e63/);
});

test('a taller value draws a taller bar from the same baseline', function () {
    var chart = build({ labels: ['a', 'b'], series: [{ values: [10, 40] }] });
    var bars = all(chart.element, 'rect.base-chart-mark');
    var h0 = parseFloat(bars[0].getAttribute('height'));
    var h1 = parseFloat(bars[1].getAttribute('height'));
    assert.ok(h1 > h0 * 3.5 && h1 < h0 * 4.5);
    assert.equal(Math.round(parseFloat(bars[0].getAttribute('y')) + h0), Math.round(parseFloat(bars[1].getAttribute('y')) + h1));
});

test('the legend shows only with several series', function () {
    var one = build({ labels: ['a'], series: [{ name: 'A', values: [1] }] });
    assert.equal(one.element.querySelector('.base-chart-legend').hidden, true);
    var two = build({ labels: ['a'], series: [{ name: 'A', values: [1] }, { name: 'B', values: [2] }] });
    var legend = two.element.querySelector('.base-chart-legend');
    assert.equal(legend.hidden, false);
    assert.equal(all(legend, '.base-chart-key').length, 2);
});

test('a hidden table holds every number with its unit', function () {
    var chart = build({ label: 'Storage', labels: ['Movies', 'Shows'], unit: 'GB', series: [{ name: 'Den', values: [820, 1240] }] });
    var table = chart.element.querySelector('table');
    assert.ok(table.classList.contains('base-sr-only'));
    assert.equal(table.querySelector('caption').textContent, 'Storage');
    var cells = all(table, 'td').map(function (c) { return c.textContent; });
    assert.deepEqual(cells, ['820 GB', '1240 GB']);
});

test('format replaces the text of every value', function () {
    var chart = build({ labels: ['a'], series: [{ values: [5] }], format: function (v) { return v + ' items'; } });
    assert.equal(chart.element.querySelector('td').textContent, '5 items');
});

test('hovering a bar shows its label and value in the tooltip, and leaving hides it', function () {
    var chart = build({ labels: ['Mon'], series: [{ values: [42] }] });
    var bar = chart.element.querySelector('rect.base-chart-mark');
    var tip = chart.element.querySelector('.base-chart-tip');
    bar.dispatch('mouseenter');
    assert.equal(tip.hidden, false);
    assert.equal(tip.querySelector('.base-chart-tip-label').textContent, 'Mon');
    assert.equal(tip.querySelector('strong').textContent, '42');
    bar.dispatch('mouseleave');
    assert.equal(tip.hidden, true);
});

test('the arrow keys move the tooltip from mark to mark', function () {
    var chart = build({ labels: ['a', 'b'], series: [{ values: [1, 2] }] });
    var plot = chart.element.querySelector('.base-chart-plot');
    var tip = chart.element.querySelector('.base-chart-tip');
    plot.dispatch('keydown', { key: 'ArrowRight' });
    assert.equal(tip.querySelector('.base-chart-tip-label').textContent, 'a');
    plot.dispatch('keydown', { key: 'ArrowRight' });
    assert.equal(tip.querySelector('.base-chart-tip-label').textContent, 'b');
    plot.dispatch('keydown', { key: 'Escape' });
    assert.equal(tip.hidden, true);
});

test('setValue draws new series and getValue returns copies', function () {
    var chart = build({ labels: ['a'], series: [{ values: [1] }] });
    chart.setValue({ labels: ['a', 'b', 'c'], series: [{ values: [1, 2, 3] }] });
    assert.equal(all(chart.element, 'rect.base-chart-mark').length, 3);
    var value = chart.getValue();
    value.series[0].values.push(9);
    assert.equal(chart.getValue().series[0].values.length, 3);
    chart.destroy();
});
