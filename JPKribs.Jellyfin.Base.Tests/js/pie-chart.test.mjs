// Behavior tests for createPieChart and its geometry, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, all } from './fake-dom.mjs';

var dom = installFakeDom();
var { createPieChart, pieShares, pieAngles, percentText, slicePath } = await import('../../src/js/pie-chart.js');

beforeEach(function () {
    dom = installFakeDom();
});

function build(opts) {
    var chart = createPieChart(opts);
    dom.document.body.appendChild(chart.element);
    return chart;
}

var LIBRARIES = [{ label: 'Movies', value: 820 }, { label: 'Shows', value: 1240 }, { label: 'Music', value: 96 }, { label: 'Photos', value: 44 }];

test('the slices close the circle in order from twelve o\'clock', function () {
    var angles = pieAngles([1, 2, 3, 4]);
    assert.equal(angles[0].start, 0);
    for (var i = 1; i < angles.length; i++) assert.equal(angles[i].start, angles[i - 1].end);
    assert.ok(Math.abs(angles[3].end - Math.PI * 2) < 1e-9);
    var sum = angles.reduce(function (n, a) { return n + (a.end - a.start); }, 0);
    assert.ok(Math.abs(sum - Math.PI * 2) < 1e-9);
});

test('zero, negative, and missing values take no share, and the rest add up to one', function () {
    var shares = pieShares([3, 0, -5, null, 1]);
    assert.deepEqual(shares, [0.75, 0, 0, 0, 0.25]);
    assert.deepEqual(pieShares([0, 0]), [0, 0]);
});

test('a percent is whole from 10%, one decimal under it, and a sliver reads <0.1%', function () {
    assert.equal(percentText(0.4123), '41%');
    assert.equal(percentText(0.045), '4.5%');
    assert.equal(percentText(0.02), '2%');
    assert.equal(percentText(0.0002), '<0.1%');
    assert.equal(percentText(0), '0%');
    assert.equal(percentText(1), '100%');
});

test('a slice of the whole circle draws a full disc, and a donut cuts its hole', function () {
    var disc = slicePath(50, 50, 40, 0, 0, Math.PI * 2);
    assert.equal((disc.match(/A/g) || []).length, 2);
    assert.doesNotMatch(disc, /L/);
    var ring = slicePath(50, 50, 40, 24, 0, Math.PI * 2);
    assert.equal((ring.match(/A/g) || []).length, 4);
    var half = slicePath(50, 50, 40, 0, 0, Math.PI);
    assert.match(half, /^M50\.00 10\.00 A40 40 0 0 1 50\.00 90\.00 L50\.00 50\.00 Z$/);
    assert.match(slicePath(50, 50, 40, 0, 0, Math.PI * 1.5), / 0 1 1 /);
});

test('slices take the series colors in order, and a named or hex color stays', function () {
    var chart = build({ slices: [{ label: 'a', value: 1 }, { label: 'b', value: 1 }, { label: 'c', value: 1, color: 'red' }, { label: 'd', value: 1, color: '#e91e63' }, { label: 'e', value: 1, color: 'nope' }] });
    var paths = all(chart.element, 'path.base-chart-mark');
    assert.equal(paths.length, 5);
    assert.ok(paths[0].classList.contains('blue'));
    assert.ok(paths[1].classList.contains('green'));
    assert.ok(paths[2].classList.contains('red'));
    assert.ok(paths[3].classList.contains('custom'));
    assert.match(paths[3].getAttribute('style'), /--base-custom: #e91e63/);
    assert.ok(paths[4].classList.contains('red'));
    var swatches = all(chart.element, '.base-pie-chart-key .base-chart-swatch');
    assert.ok(swatches[0].classList.contains('blue'));
    assert.ok(swatches[3].classList.contains('custom'));
});

test('each slice is a button named with its label, value, and percent', function () {
    var chart = build({ label: 'Storage', unit: 'GB', slices: LIBRARIES });
    var path = chart.element.querySelector('path.base-chart-mark');
    assert.equal(path.getAttribute('role'), 'button');
    assert.equal(path.getAttribute('aria-label'), 'Movies, 820 GB, 37%');
    assert.equal(path.getAttribute('aria-pressed'), 'false');
});

test('hovering a slice shows its label, value, and percent in the tooltip', function () {
    var chart = build({ slices: [{ label: 'Done', value: 3 }, { label: 'Left', value: 1 }] });
    var tip = chart.element.querySelector('.base-chart-tip');
    all(chart.element, 'path.base-chart-mark')[1].dispatch('mouseenter');
    assert.equal(tip.hidden, false);
    assert.equal(tip.querySelector('.base-chart-tip-label').textContent, 'Left');
    assert.equal(tip.querySelector('strong').textContent, '1');
    assert.equal(tip.querySelector('.base-chart-tip-detail').textContent, '25%');
});

test('the legend keeps a row for every slice with its value and percent, and a zero row cannot be selected', function () {
    var chart = build({ format: function (v) { return v + ' items'; }, slices: [{ label: 'A', value: 3 }, { label: 'B', value: 0 }, { label: 'C', value: -2 }, { label: 'D', value: 1 }] });
    var rows = all(chart.element, '.base-pie-chart-key');
    assert.equal(rows.length, 4);
    assert.equal(rows[0].querySelector('.base-pie-chart-key-label').textContent, 'A');
    assert.equal(rows[0].querySelector('.base-pie-chart-key-value').textContent, '3 items');
    assert.equal(rows[0].querySelector('.base-pie-chart-key-share').textContent, '75%');
    assert.equal(rows[1].querySelector('.base-pie-chart-key-share').textContent, '0%');
    assert.equal(rows[1].disabled, true);
    assert.equal(rows[2].querySelector('.base-pie-chart-key-value').textContent, '-2 items');
    assert.equal(all(chart.element, 'path.base-chart-mark').length, 2);
});

test('showLegend false leaves no legend', function () {
    var chart = build({ showLegend: false, slices: LIBRARIES });
    assert.equal(all(chart.element, '.base-pie-chart-key').length, 0);
    assert.equal(chart.element.querySelector('.base-chart-legend').hidden, true);
});

test('one slice draws a full circle', function () {
    var chart = build({ slices: [{ label: 'All', value: 5 }, { label: 'None', value: 0 }] });
    var paths = all(chart.element, 'path.base-chart-mark');
    assert.equal(paths.length, 1);
    assert.equal((paths[0].getAttribute('d').match(/A/g) || []).length, 2);
    assert.match(paths[0].getAttribute('aria-label'), /100%/);
});

test('a donut cuts a hole and writes its center text', function () {
    var chart = build({ donut: true, centerText: '2.2k GB', centerLabel: 'Total', slices: LIBRARIES });
    assert.ok(chart.element.classList.contains('donut'));
    var d = chart.element.querySelector('path.base-chart-mark').getAttribute('d');
    assert.equal((d.match(/A/g) || []).length, 2);
    assert.doesNotMatch(d, /L[\d.]+ [\d.]+ Z$/);
    assert.equal(chart.element.querySelector('.base-pie-chart-center').textContent, '2.2k GB');
    assert.equal(chart.element.querySelector('.base-pie-chart-center-label').textContent, 'Total');
});

test('with nothing positive it shows the empty sentence in place of the pie and the legend', function () {
    var chart = build({ slices: [{ label: 'A', value: 0 }] });
    var empty = chart.element.querySelector('.base-chart-empty');
    assert.equal(empty.hidden, false);
    assert.equal(empty.textContent, 'Nothing to show.');
    assert.equal(chart.element.querySelector('.base-chart-plot').hidden, true);
    assert.equal(chart.element.querySelector('.base-chart-legend').hidden, true);
    var named = build({ emptyText: 'No storage used.' });
    assert.equal(named.element.querySelector('.base-chart-empty').textContent, 'No storage used.');
    chart.setSlices(LIBRARIES);
    assert.equal(empty.hidden, true);
    assert.equal(all(chart.element, 'path.base-chart-mark').length, 4);
});

test('a click on a slice or its legend row selects it, and a second click clears it', function () {
    var seen = [];
    var chart = build({ slices: LIBRARIES, onSelect: function (slice, index) { seen.push([slice && slice.label, index]); } });
    var paths = all(chart.element, 'path.base-chart-mark');
    var rows = all(chart.element, '.base-pie-chart-key');
    paths[1].dispatch('click');
    assert.equal(chart.getSelected(), 1);
    assert.ok(chart.element.classList.contains('has-selection'));
    assert.ok(paths[1].classList.contains('selected'));
    assert.equal(rows[1].getAttribute('aria-pressed'), 'true');
    rows[1].dispatch('click');
    assert.equal(chart.getSelected(), -1);
    assert.equal(chart.element.classList.contains('has-selection'), false);
    rows[2].dispatch('click');
    assert.equal(paths[2].getAttribute('aria-pressed'), 'true');
    assert.deepEqual(seen, [['Shows', 1], [null, -1], ['Music', 2]]);
});

test('Enter on the plot selects the slice the arrow keys reached', function () {
    var chart = build({ slices: LIBRARIES });
    var plot = chart.element.querySelector('.base-chart-plot');
    plot.dispatch('keydown', { key: 'ArrowRight' });
    plot.dispatch('keydown', { key: 'ArrowRight' });
    plot.dispatch('keydown', { key: 'Enter' });
    assert.equal(chart.getSelected(), 1);
    plot.dispatch('keydown', { key: ' ' });
    assert.equal(chart.getSelected(), -1);
});

test('select picks and clears by index, and new slices drop a selection that no longer fits', function () {
    var chart = build({ slices: LIBRARIES });
    chart.select(3);
    assert.equal(chart.getSelected(), 3);
    chart.select(null);
    assert.equal(chart.getSelected(), -1);
    chart.select(3);
    chart.setValue(LIBRARIES.slice(0, 2));
    assert.equal(chart.getSelected(), -1);
});

test('the hidden table holds each value with its percent, and getValue returns copies', function () {
    var chart = build({ label: 'Storage', unit: 'GB', slices: [{ label: 'Movies', value: 3 }, { label: 'Shows', value: 1 }] });
    var table = chart.element.querySelector('table');
    assert.equal(table.querySelector('caption').textContent, 'Storage');
    assert.deepEqual(all(table, 'td').map(function (c) { return c.textContent; }), ['3 GB, 75%', '1 GB, 25%']);
    assert.equal(all(table, 'th')[1].textContent, 'Value');
    var value = chart.getValue();
    value[0].value = 99;
    assert.equal(chart.getValue()[0].value, 3);
    chart.destroy();
});

test('size adds its modifier, medium adds none', function () {
    assert.ok(build({ size: 'small', slices: LIBRARIES }).element.classList.contains('small'));
    assert.ok(build({ size: 'large', slices: LIBRARIES }).element.classList.contains('large'));
    var medium = build({ slices: LIBRARIES }).element;
    assert.equal(medium.classList.contains('small') || medium.classList.contains('large'), false);
});
