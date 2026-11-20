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

var { spacedLabels } = await import('../../src/js/lib/chart.js');

// Thirty days of labels, such as Oct 22 to Nov 20, as a 30 day statistics chart draws them.
function days() {
    var out = [];
    var start = Date.UTC(2026, 9, 22);
    for (var i = 0; i < 30; i++) {
        var d = new Date(start + i * 86400000);
        out.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }));
    }
    return out;
}

// The x extent of each drawn axis label, from its x, its anchor, and the width the chart estimates without a canvas.
function drawnLabels(chart) {
    return all(chart.element, '.base-chart-label').map(function (t) {
        var x = parseFloat(t.getAttribute('x'));
        var w = t.textContent.length * 12 * 0.58;
        var anchor = t.getAttribute('text-anchor');
        var from = anchor === 'start' ? x : (anchor === 'end' ? x - w : x - w / 2);
        return { text: t.textContent, from: from, to: from + w };
    });
}

function atWidth(width, labels) {
    var chart = build({ labels: labels, series: [{ values: labels.map(function (l, i) { return i; }) }] });
    chart.element.querySelector('.base-chart-plot').clientWidth = width;
    chart.redraw();
    return chart;
}

function assertApart(shown) {
    for (var i = 1; i < shown.length; i++) {
        assert.ok(shown[i].from - shown[i - 1].to >= 8, shown[i - 1].text + ' and ' + shown[i].text + ' are ' + (shown[i].from - shown[i - 1].to).toFixed(1) + 'px apart');
    }
}

test('a 30 day chart at 800px draws no two date labels closer than the gap, and keeps the first and last', function () {
    var labels = days();
    var shown = drawnLabels(atWidth(800, labels));
    assertApart(shown);
    assert.equal(shown[0].text, 'Oct 22');
    assert.equal(shown[shown.length - 1].text, 'Nov 20');
    assert.ok(shown.length >= 6);
});

test('a 30 day chart at a 375px phone width still draws apart labels, with the first and last', function () {
    var shown = drawnLabels(atWidth(375, days()));
    assertApart(shown);
    assert.equal(shown[0].text, 'Oct 22');
    assert.equal(shown[shown.length - 1].text, 'Nov 20');
    assert.ok(shown.every(function (l) { return l.from >= 0 && l.to <= 375; }));
});

test('labels that fit draw every one', function () {
    var shown = drawnLabels(atWidth(800, ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']));
    assert.deepEqual(shown.map(function (l) { return l.text; }), ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    assertApart(shown);
});

test('spacedLabels skips labels so each pair has the gap, and keeps the last in place of one that crowds it', function () {
    var x = [0, 25, 50, 75, 100, 125, 150];
    var widths = x.map(function () { return 40; });
    // The first starts at its point and the second is centered, so every second label still crowds the first.
    assert.deepEqual(spacedLabels(x, widths, 8), [0, 3, 6]);
    assert.deepEqual(spacedLabels([0, 30, 60, 90, 120], [40, 40, 40, 40, 40], 8), [0, 4]);
    assert.deepEqual(spacedLabels([0, 30, 60, 90], [40, 40, 40, 40], 8), [0, 3]);
});

test('spacedLabels keeps the first alone when the last does not fit beside it, and handles one or no label', function () {
    assert.deepEqual(spacedLabels([0, 50], [60, 60], 8), [0]);
    assert.deepEqual(spacedLabels([10], [60], 8), [0]);
    assert.deepEqual(spacedLabels([], [], 8), []);
});
