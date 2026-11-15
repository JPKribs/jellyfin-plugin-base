// Behavior tests for createPillGroup, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fake-dom.mjs';

var dom = installFakeDom();
var { createPillGroup } = await import('../../src/js/index.js');

beforeEach(function () {
    dom = installFakeDom();
});

function group(selectedIndex) {
    var pills = ['Daily', 'Weekly', 'Monthly'].map(function (label, i) {
        var p = dom.el('button', { type: 'button', class: 'jpk-pill' + (i === selectedIndex ? ' selected' : ''), 'data-value': label.toLowerCase() });
        p.textContent = label;
        return p;
    });
    var el = dom.document.body.appendChild(dom.el('div', { class: 'jpk-pill-group', role: 'group' }, pills));
    return { el: el, pills: pills };
}

test('it reads the pill that starts selected and sets aria-pressed on every pill', function () {
    var g = group(1);
    var handle = createPillGroup(g.el);
    assert.equal(handle.get(), 'weekly');
    assert.deepEqual(g.pills.map(function (p) { return p.getAttribute('aria-pressed'); }), ['false', 'true', 'false']);
});

test('get is null when nothing is chosen', function () {
    var g = group(-1);
    assert.equal(createPillGroup(g.el).get(), null);
});

test('a click chooses the pill, moves the selected state, and calls onChange once', function () {
    var g = group(0);
    var seen = [];
    var handle = createPillGroup(g.el, { onChange: function (v) { seen.push(v); } });
    g.pills[2].click();
    assert.equal(handle.get(), 'monthly');
    assert.equal(g.pills[2].getAttribute('aria-pressed'), 'true');
    assert.ok(g.pills[2].classList.contains('selected'));
    assert.equal(g.pills[0].getAttribute('aria-pressed'), 'false');
    assert.equal(g.pills[0].classList.contains('selected'), false);
    g.pills[2].click();
    assert.deepEqual(seen, ['monthly']);
});

test('set chooses a pill by value without calling onChange, and an unknown value clears it', function () {
    var g = group(0);
    var calls = 0;
    var handle = createPillGroup(g.el, { onChange: function () { calls++; } });
    handle.set('weekly');
    assert.equal(handle.get(), 'weekly');
    handle.set('nothing');
    assert.equal(handle.get(), null);
    assert.equal(calls, 0);
});

test('a pill without data-value uses its text, and a pre-pressed pill counts as chosen', function () {
    var pill = dom.el('button', { type: 'button', class: 'jpk-pill', 'aria-pressed': 'true' });
    pill.textContent = 'Plain';
    var el = dom.document.body.appendChild(dom.el('div', { class: 'jpk-pill-group' }, [pill]));
    assert.equal(createPillGroup(el).get(), 'Plain');
});

test('a disabled pill cannot be chosen', function () {
    var g = group(0);
    g.pills[1].disabled = true;
    var handle = createPillGroup(g.el);
    g.pills[1].click();
    assert.equal(handle.get(), 'daily');
});

test('destroy stops the clicks, and a missing element throws', function () {
    var g = group(0);
    var handle = createPillGroup(g.el);
    handle.destroy();
    g.pills[1].click();
    assert.equal(handle.get(), 'daily');
    assert.throws(function () { createPillGroup(null); }, /group element/);
});
