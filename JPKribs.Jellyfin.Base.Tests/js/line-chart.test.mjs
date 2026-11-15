// Behavior tests for createLineChart, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, all } from './fake-dom.mjs';

var dom = installFakeDom();
var { createLineChart } = await import('../../src/js/line-chart.js');

beforeEach(function () {
    dom = installFakeDom();
});

function build(opts) {
    var chart = createLineChart(opts);
    dom.document.body.appendChild(chart.element);
    return chart;
}

test('each series draws a line and a focusable dot per value', function () {
    var chart = build({ labels: ['a', 'b', 'c'], series: [{ name: 'A', values: [1, 2, 3] }, { name: 'B', values: [3, 2, 1] }] });
    assert.equal(all(chart.element, '.base-chart-line').length, 2);
    assert.equal(all(chart.element, 'circle.base-chart-mark').length, 6);
});

test('a missing value breaks the line into two runs and draws no dot', function () {
    var chart = build({ labels: ['a', 'b', 'c', 'd'], series: [{ values: [1, 2, null, 4] }] });
    assert.equal(all(chart.element, '.base-chart-line').length, 2);
    assert.equal(all(chart.element, 'circle.base-chart-mark').length, 3);
});

test('area shades under the line, and dots false makes the chart quiet', function () {
    var chart = build({ labels: ['a', 'b'], area: true, dots: false, series: [{ values: [1, 2] }] });
    assert.equal(all(chart.element, '.base-chart-area').length, 1);
    assert.ok(chart.element.classList.contains('quiet'));
});

test('a higher value sits higher on the plot', function () {
    var chart = build({ labels: ['a', 'b'], series: [{ values: [1, 9] }] });
    var dots = all(chart.element, 'circle.base-chart-mark');
    assert.ok(parseFloat(dots[1].getAttribute('cy')) < parseFloat(dots[0].getAttribute('cy')));
    assert.ok(parseFloat(dots[1].getAttribute('cx')) > parseFloat(dots[0].getAttribute('cx')));
});

test('a line chart draws no value labels over its points', function () {
    var chart = build({ labels: ['a'], series: [{ values: [5] }] });
    assert.equal(chart.element.querySelector('.base-chart-value'), null);
});
