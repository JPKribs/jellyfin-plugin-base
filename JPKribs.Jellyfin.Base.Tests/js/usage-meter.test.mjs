// Behavior tests for createUsageMeter, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, all } from './fake-dom.mjs';

var dom = installFakeDom();
var { createUsageMeter } = await import('../../src/js/usage-meter.js');

beforeEach(function () {
    dom = installFakeDom();
});

var GB = 1024 * 1024 * 1024;

test('it writes the used line in sizes and fills the bar by its share', function () {
    var meter = createUsageMeter({ label: 'Cache', used: 10 * GB, total: 40 * GB, bytes: true });
    assert.equal(meter.element.querySelector('.base-usage-meter-text').textContent, '10 GB of 40 GB used');
    var fill = meter.element.querySelector('.base-usage-meter-fill');
    assert.equal(fill.style.getPropertyValue('--base-usage-share'), '25%');
    var bar = meter.element.querySelector('[role="meter"]');
    assert.equal(bar.getAttribute('aria-valuetext'), '10 GB of 40 GB used');
    assert.equal(bar.getAttribute('aria-labelledby'), meter.element.querySelector('.base-usage-meter-label').id);
});

test('plain numbers take the unit, and usedText takes the percent', function () {
    var meter = createUsageMeter({ used: 3, total: 4, unit: 'files', usedText: '{percent} full, {used}' });
    assert.equal(meter.element.querySelector('.base-usage-meter-text').textContent, '75% full, 3 files');
});

test('it turns warning past 80 percent and danger past 95 percent, and the thresholds can move', function () {
    var meter = createUsageMeter({ used: 50, total: 100 });
    assert.equal(meter.element.classList.contains('warning'), false);
    meter.setValue({ used: 85 });
    assert.ok(meter.element.classList.contains('warning'));
    meter.setValue({ used: 96 });
    assert.ok(meter.element.classList.contains('danger'));
    assert.equal(meter.element.classList.contains('warning'), false);
    var low = createUsageMeter({ used: 50, total: 100, warning: 40, danger: 60 });
    assert.ok(low.element.classList.contains('warning'));
});

test('parts draw a colored segment each and a legend, and used defaults to their sum', function () {
    var meter = createUsageMeter({ total: 100, parts: [{ label: 'Movies', value: 30 }, { label: 'Music', value: 10, color: 'orange' }] });
    var fills = all(meter.element, '.base-usage-meter-fill');
    assert.equal(fills.length, 2);
    assert.ok(fills[1].classList.contains('orange'));
    assert.equal(fills[0].style.getPropertyValue('--base-usage-share'), '30%');
    assert.equal(meter.element.querySelector('.base-usage-meter-text').textContent, '40 of 100 used');
    var legend = meter.element.querySelector('.base-usage-meter-legend');
    assert.equal(legend.hidden, false);
    assert.equal(all(legend, '.base-usage-meter-key').length, 2);
});

test('a share past the total stays full, and a missing total shows an empty bar', function () {
    var over = createUsageMeter({ used: 150, total: 100 });
    assert.equal(over.element.querySelector('.base-usage-meter-fill').style.getPropertyValue('--base-usage-share'), '100%');
    var empty = createUsageMeter({ used: 5 });
    assert.equal(empty.element.querySelector('.base-usage-meter-fill').style.getPropertyValue('--base-usage-share'), '0%');
});
