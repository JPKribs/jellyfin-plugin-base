// Behavior tests for the stat card's text status: detail lines, the label-top layout, and the value color, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, all } from './fake-dom.mjs';

var dom = installFakeDom();
var { createStatCard } = await import('../../src/js/stat-card.js');

beforeEach(function () {
    dom = installFakeDom();
});

function parts(card) {
    return Array.prototype.slice.call(card.element.children).map(function (el) { return String(el.className).split(' ')[0]; });
}

test('a stat card keeps the value over the label with no layout, and draws no detail line', function () {
    var s = createStatCard({ value: 4, label: 'Servers' });
    assert.deepEqual(parts(s).slice(0, 2), ['base-card-count', 'base-card-label']);
    assert.equal(s.element.classList.contains('label-top'), false);
    assert.equal(all(s.element, '.base-stat-detail').length, 0);
});

test('detail draws one line, or the first two lines of an array, each titled with its full text', function () {
    var one = createStatCard({ value: 7, label: 'Errors', detail: 'Last at 14:02' });
    var lines = all(one.element, '.base-stat-detail');
    assert.equal(lines.length, 1);
    assert.equal(lines[0].textContent, 'Last at 14:02');
    assert.equal(lines[0].getAttribute('title'), 'Last at 14:02');
    var many = createStatCard({ value: 'Delivered 3m ago', detail: ['Sends files', '', 'Reason one', 'Reason two'] });
    assert.deepEqual(all(many.element, '.base-stat-detail').map(function (el) { return el.textContent; }), ['Sends files', 'Reason one']);
});

test('detail lines sit after the value and label and before the trend', function () {
    var s = createStatCard({ value: 1, label: 'A', detail: ['x', 'y'], trend: 2 });
    assert.deepEqual(parts(s), ['base-card-count', 'base-card-label', 'base-stat-detail', 'base-stat-detail', 'base-stat-trend']);
});

test('label-top puts the label first, then the value, then the details, and setValue can switch back', function () {
    var s = createStatCard({ value: 'Paused until 14:00', label: 'Peer', layout: 'label-top', detail: 'Sends nothing' });
    assert.ok(s.element.classList.contains('label-top'));
    assert.deepEqual(parts(s).slice(0, 3), ['base-card-label', 'base-card-count', 'base-stat-detail']);
    s.setValue({ layout: 'value-top' });
    assert.equal(s.element.classList.contains('label-top'), false);
    assert.deepEqual(parts(s).slice(0, 3), ['base-card-count', 'base-card-label', 'base-stat-detail']);
});

test('valueColor colors the value text by a status name or a hex code through the color core, and clears when removed', function () {
    var s = createStatCard({ value: 'Paused until 14:00', valueColor: 'orange' });
    var value = s.element.querySelector('.base-card-count');
    assert.ok(value.classList.contains('orange'));
    assert.equal(s.element.classList.contains('orange'), false);
    s.setValue({ valueColor: '#e91e63' });
    assert.ok(value.classList.contains('custom'));
    assert.equal(value.classList.contains('orange'), false);
    assert.equal(value.style.getPropertyValue('--base-custom'), '#e91e63');
    s.setValue({ valueColor: undefined });
    assert.equal(value.classList.contains('custom'), false);
    assert.equal(value.style.getPropertyValue('--base-custom'), '');
});

test('setValue replaces the detail lines and getValue returns the new fields as drawn', function () {
    var s = createStatCard({ value: 'Nothing sent yet', label: 'Peer', detail: ['a', 'b'], layout: 'label-top', valueColor: 'green' });
    s.setValue({ value: 'Delivered 1m ago', detail: 'c' });
    assert.deepEqual(all(s.element, '.base-stat-detail').map(function (el) { return el.textContent; }), ['c']);
    assert.equal(s.element.querySelector('.base-card-count').textContent, 'Delivered 1m ago');
    var v = s.getValue();
    assert.equal(v.detail, 'c');
    assert.equal(v.layout, 'label-top');
    assert.equal(v.valueColor, 'green');
    s.setValue({ detail: [] });
    assert.equal(all(s.element, '.base-stat-detail').length, 0);
});

test('a value with letters marks the card as text, and a number, a count with separators, or a clock time does not', function () {
    assert.ok(createStatCard({ value: 'Delivered 3m ago' }).element.classList.contains('text'));
    [1204, '1,204', '12.5%', '14:00', '-3', undefined].forEach(function (value) {
        assert.equal(createStatCard({ value: value }).element.classList.contains('text'), false, String(value));
    });
    var s = createStatCard({ value: 4 });
    s.setValue({ value: 'Never' });
    assert.ok(s.element.classList.contains('text'));
});
