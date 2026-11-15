// Behavior tests for createFlowDiagram, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fake-dom.mjs';

var dom = installFakeDom();
var { createFlowDiagram, overflowStart, shortLabel } = await import('../../src/js/flow-diagram.js');

beforeEach(function () {
    dom = installFakeDom();
});

function items(n, prefix) {
    return Array.from({ length: n }, function (_, i) { return { label: (prefix || 'Server ') + (i + 1) }; });
}

function lane(d, key) {
    return d.element.querySelector('.base-flow-diagram-lane[data-key="' + key + '"]');
}

function pillRects(g) {
    return Array.from(g.querySelectorAll('.base-flow-diagram-pill')).map(function (r) {
        return { x: Number(r.getAttribute('x')), y: Number(r.getAttribute('y')), w: Number(r.getAttribute('width')) };
    });
}

var sample = {
    hub: { label: 'Home', title: 'Home, this server' },
    lanes: [
        { key: 'pull', side: 'left', direction: 'in', color: 'green', label: 'Pull', items: items(3, 'Pull ') },
        { key: 'push', side: 'right', direction: 'out', color: 'blue', label: 'Push', items: items(2, 'Push ') },
        { key: 'sync', side: 'below', direction: 'both', color: 'purple', label: 'Sync', items: items(5, 'Sync ') }
    ]
};

test('lanes sit on the left, the right, and below the hub', function () {
    var d = createFlowDiagram(sample);
    pillRects(lane(d, 'pull')).forEach(function (r) { assert.ok(r.x + r.w < -46, 'left pill right of center'); });
    pillRects(lane(d, 'push')).forEach(function (r) { assert.ok(r.x > 46, 'right pill left of center'); });
    pillRects(lane(d, 'sync')).forEach(function (r) { assert.ok(r.y > 23, 'below pill above the hub'); });
    assert.equal(d.element.querySelectorAll('.base-flow-diagram-item').length, 10);
    assert.equal(d.element.querySelector('.base-flow-diagram-hub-label').textContent, 'Home');
    assert.equal(d.element.querySelector('.base-flow-diagram-hub title').textContent, 'Home, this server');
});

test('the lane below starts under the taller side lane', function () {
    var d = createFlowDiagram({ hub: { label: 'Home' }, lanes: [
        { key: 'a', side: 'left', direction: 'in', items: items(6) },
        { key: 'b', side: 'below', direction: 'out', items: items(1) }
    ] });
    var lowestSide = Math.max.apply(null, pillRects(lane(d, 'a')).map(function (r) { return r.y + 26; }));
    assert.ok(pillRects(lane(d, 'b'))[0].y > lowestSide);
});

test('in puts the arrow at the hub, out at each pill, and both at both', function () {
    var d = createFlowDiagram(sample);
    function arrows(key, part) {
        return Array.from(lane(d, key).querySelectorAll('.' + part)).map(function (p) { return p.getAttribute('marker-end'); });
    }
    assert.ok(arrows('pull', 'base-flow-diagram-join')[0]);
    assert.ok(arrows('pull', 'base-flow-diagram-stub').every(function (m) { return m === null; }));
    assert.equal(arrows('push', 'base-flow-diagram-join')[0], null);
    assert.ok(arrows('push', 'base-flow-diagram-stub').every(Boolean));
    assert.ok(arrows('sync', 'base-flow-diagram-join')[0]);
    assert.ok(arrows('sync', 'base-flow-diagram-stub').every(Boolean));
    assert.ok(arrows('sync', 'base-flow-diagram-trunk').every(function (m) { return m === null; }));
    var id = lane(d, 'pull').querySelector('marker').getAttribute('id');
    assert.equal(arrows('pull', 'base-flow-diagram-join')[0], 'url(#' + id + ')');
    assert.notEqual(id, lane(d, 'push').querySelector('marker').getAttribute('id'));
});

test('a line with an arrow ends where the arrow points', function () {
    var d = createFlowDiagram(sample);
    var join = lane(d, 'pull').querySelector('.base-flow-diagram-join').getAttribute('d');
    assert.match(join, /H-49\.0$/);
    var stub = lane(d, 'push').querySelector('.base-flow-diagram-stub').getAttribute('d');
    assert.match(stub, /^M92\.0 -17\.0 H111\.0$/);
    var below = lane(d, 'sync').querySelector('.base-flow-diagram-join').getAttribute('d');
    assert.match(below, /V26\.0$/);
});

test('an empty lane is not drawn, and no lanes shows the hub alone', function () {
    var d = createFlowDiagram({ hub: { label: 'Home' }, lanes: [
        { key: 'a', side: 'left', direction: 'in', items: [] },
        { key: 'b', side: 'right', direction: 'out', items: items(1) }
    ] });
    assert.equal(lane(d, 'a'), null);
    assert.ok(lane(d, 'b'));
    var alone = createFlowDiagram({ hub: { label: 'Home' } });
    assert.equal(alone.element.querySelectorAll('.base-flow-diagram-lane').length, 0);
    assert.equal(alone.element.querySelector('svg').getAttribute('viewBox'), '-52 -29 104 58');
    assert.equal(alone.element.getAttribute('aria-label'), 'Home');
});

test('a side lane past eight pills wraps into a second column offset into the gaps', function () {
    var d = createFlowDiagram({ hub: { label: 'Home' }, lanes: [{ key: 'a', side: 'right', direction: 'out', items: items(11) }] });
    var rects = pillRects(lane(d, 'a'));
    var columns = Array.from(new Set(rects.map(function (r) { return r.x; })));
    assert.equal(columns.length, 2);
    var first = rects.filter(function (r) { return r.x === columns[0]; }).map(function (r) { return r.y; });
    var second = rects.filter(function (r) { return r.x === columns[1]; }).map(function (r) { return r.y; });
    assert.equal(first.length, 8);
    assert.equal(second.length, 3);
    second.forEach(function (y) { assert.ok(first.indexOf(y) === -1, 'overflow pill sits in a gap'); });
});

test('never more than two columns or rows, however many pills', function () {
    var d = createFlowDiagram({ hub: { label: 'Home' }, lanes: [
        { key: 'a', side: 'left', direction: 'in', items: items(30) },
        { key: 'b', side: 'below', direction: 'out', items: items(20) }
    ] });
    assert.equal(new Set(pillRects(lane(d, 'a')).map(function (r) { return r.x; })).size, 2);
    assert.equal(new Set(pillRects(lane(d, 'b')).map(function (r) { return r.y; })).size, 2);
});

test('a row below past four pills wraps into a second row offset into the gaps', function () {
    var d = createFlowDiagram({ hub: { label: 'Home' }, lanes: [{ key: 'a', side: 'below', direction: 'both', items: items(6) }] });
    var rects = pillRects(lane(d, 'a'));
    var rows = Array.from(new Set(rects.map(function (r) { return r.y; })));
    assert.equal(rows.length, 2);
    var top = rects.filter(function (r) { return r.y === rows[0]; }).map(function (r) { return r.x; });
    var under = rects.filter(function (r) { return r.y === rows[1]; }).map(function (r) { return r.x; });
    assert.deepEqual([top.length, under.length], [4, 2]);
    under.forEach(function (x) { assert.ok(top.indexOf(x) === -1); });
});

test('an overflow line moves off the line through the middle when it can', function () {
    assert.equal(overflowStart(-119, 34, 8, 1), -34);
    assert.equal(overflowStart(-51, 34, 4, 2), -68);
    assert.equal(overflowStart(-51, 34, 4, 1), -34);
    assert.equal(overflowStart(-51, 34, 4, 3), -34, 'no place avoids the middle, so it stays centered');
});

test('the hub stays centered whichever lanes are drawn', function () {
    var d = createFlowDiagram({ hub: { label: 'Home' }, lanes: [{ key: 'a', side: 'right', direction: 'out', items: items(2) }] });
    var box = d.element.querySelector('svg').getAttribute('viewBox').split(' ').map(Number);
    assert.equal(box[0], -box[2] / 2);
    assert.equal(d.element.querySelector('svg').getAttribute('width'), String(box[2]));
});

test('a long label ends in an ellipsis at maxLabel, and the title keeps it whole', function () {
    var long = 'A very long server name indeed';
    var d = createFlowDiagram({ hub: { label: 'Home' }, lanes: [{ key: 'a', side: 'right', direction: 'out', label: 'Push', items: [{ label: long }] }] });
    var text = d.element.querySelector('.base-flow-diagram-label').textContent;
    assert.equal(text.length, 18);
    assert.equal(text.slice(-1), '…');
    assert.equal(d.element.querySelector('.base-flow-diagram-item title').textContent, long + ', Push');
    var short = createFlowDiagram({ maxLabel: 8, hub: { label: 'Home' }, lanes: [{ key: 'a', side: 'right', direction: 'out', items: [{ label: long, title: 'Custom' }] }] });
    assert.equal(short.element.querySelector('.base-flow-diagram-label').textContent, 'A very …');
    assert.equal(short.element.querySelector('.base-flow-diagram-item title').textContent, 'Custom');
    assert.equal(shortLabel('abc', 3), 'abc');
});

test('lane and dot colors come from color names, and a hex sets --base-custom', function () {
    var d = createFlowDiagram({ hub: { label: 'Home' }, lanes: [
        { key: 'a', side: 'left', direction: 'in', color: '#e91e63', items: [{ label: 'A', status: '#00ff00' }, { label: 'B', status: 'red' }, { label: 'C' }] },
        { key: 'b', side: 'right', direction: 'out', color: 'blue', items: [{ label: 'D' }] },
        { key: 'c', side: 'below', direction: 'out', items: [{ label: 'E' }] }
    ] });
    var a = lane(d, 'a');
    assert.ok(a.classList.contains('custom'));
    assert.equal(a.style['--base-custom'], '#e91e63');
    var dots = a.querySelectorAll('.base-flow-diagram-dot');
    assert.equal(dots.length, 2);
    assert.ok(dots[0].classList.contains('custom'));
    assert.equal(dots[0].style['--base-custom'], '#00ff00');
    assert.ok(dots[1].classList.contains('red'));
    assert.ok(lane(d, 'b').classList.contains('blue'));
    assert.ok(lane(d, 'c').classList.contains('gray'));
    assert.equal(lane(d, 'b').querySelectorAll('.base-flow-diagram-dot').length, 0);
});

test('the aria-label lists the prefix, the hub, and each item with its lane label', function () {
    var d = createFlowDiagram(Object.assign({ label: 'Servers this one is set up with' }, sample));
    assert.equal(d.element.getAttribute('role'), 'img');
    assert.equal(d.element.getAttribute('aria-label'),
        'Servers this one is set up with, Home, Pull 1 Pull, Pull 2 Pull, Pull 3 Pull, Push 1 Push, Push 2 Push, Sync 1 Sync, Sync 2 Sync, Sync 3 Sync, Sync 4 Sync, Sync 5 Sync');
    assert.equal(d.element.querySelector('[role="button"]'), null);
    assert.equal(d.element.querySelector('[tabindex]'), null);
});

test('onSelect makes each pill a focusable button that answers a click, Enter, and Space', function () {
    var calls = [];
    var d = createFlowDiagram(Object.assign({ onSelect: function (item, l) { calls.push(item.label + '/' + l.key); } }, sample));
    dom.document.body.appendChild(d.element);
    assert.equal(d.element.getAttribute('role'), 'group');
    var pills = d.element.querySelectorAll('.base-flow-diagram-item');
    pills.forEach(function (g) {
        assert.equal(g.getAttribute('role'), 'button');
        assert.equal(g.getAttribute('tabindex'), '0');
    });
    var push = lane(d, 'push').querySelector('.base-flow-diagram-item');
    assert.equal(push.getAttribute('aria-label'), 'Push 1, Push');
    push.click();
    push.focus();
    assert.equal(dom.document.activeElement, push);
    var enter = dom.document.key('Enter');
    assert.equal(enter.defaultPrevented, true);
    dom.document.key(' ');
    var other = dom.document.key('a');
    assert.equal(other.defaultPrevented, false);
    assert.deepEqual(calls, ['Push 1/push', 'Push 1/push', 'Push 1/push']);
    d.element.querySelector('.base-flow-diagram-hub').click();
    assert.equal(calls.length, 3);
});

test('setValue redraws and getValue returns what is drawn', function () {
    var d = createFlowDiagram(sample);
    d.setValue({ hub: { label: 'Other' }, lanes: [{ key: 'x', side: 'right', direction: 'out', items: items(1) }] });
    assert.equal(d.element.querySelector('.base-flow-diagram-hub-label').textContent, 'Other');
    assert.equal(d.element.querySelectorAll('.base-flow-diagram-item').length, 1);
    assert.equal(d.element.querySelectorAll('svg').length, 1);
    assert.equal(d.getValue().hub.label, 'Other');
    assert.equal(d.getValue().lanes[0].key, 'x');
    assert.equal(d.element.getAttribute('aria-label'), 'Other, Server 1');
});

test('only the first lane on a side is drawn', function () {
    var d = createFlowDiagram({ hub: { label: 'Home' }, lanes: [
        { key: 'a', side: 'left', direction: 'in', items: items(1) },
        { key: 'b', side: 'left', direction: 'out', items: items(1) }
    ] });
    assert.ok(lane(d, 'a'));
    assert.equal(lane(d, 'b'), null);
});

test('destroy removes the listeners and empties the diagram', function () {
    var calls = 0;
    var d = createFlowDiagram(Object.assign({ onSelect: function () { calls++; } }, sample));
    var root = d.element;
    var pill = root.querySelector('.base-flow-diagram-item');
    d.destroy();
    assert.equal(root.children.length, 0);
    assert.equal((root.listeners.click || []).length, 0);
    assert.equal((root.listeners.keydown || []).length, 0);
    root.appendChild(pill);
    pill.click();
    assert.equal(calls, 0);
});

test('too wide for its box it is drawn again as a stack at full size, and a wide box keeps the hub layout', function () {
    var d = createFlowDiagram(sample);
    assert.equal(d.element.classList.contains('stacked'), false);
    Object.defineProperty(d.element, 'clientWidth', { value: 240, configurable: true });
    d.setValue(sample);
    assert.equal(d.element.classList.contains('stacked'), true);
    var svg = d.element.querySelector('svg');
    assert.equal(svg.getAttribute('width'), '240');
    var rects = Array.from(d.element.querySelectorAll('.base-flow-diagram-pill'));
    assert.equal(rects.length, 10);
    // Every pill sits in one column, in lane order, at the same x and within the box.
    var xs = rects.map(function (r) { return Number(r.getAttribute('x')); });
    assert.equal(new Set(xs).size, 1);
    rects.forEach(function (r) { assert.ok(Number(r.getAttribute('x')) + Number(r.getAttribute('width')) <= 240); });
    var ys = rects.map(function (r) { return Number(r.getAttribute('y')); });
    assert.deepEqual(ys.slice().sort(function (a, b) { return a - b; }), ys);
    // An in lane's arrow is on its upright line, toward the hub, and an out lane's on each stub.
    assert.ok(lane(d, 'pull').querySelector('.base-flow-diagram-trunk[marker-end]'));
    assert.equal(lane(d, 'push').querySelectorAll('.base-flow-diagram-stub[marker-end]').length, 2);
    Object.defineProperty(d.element, 'clientWidth', { value: 2000, configurable: true });
    d.setValue(sample);
    assert.equal(d.element.classList.contains('stacked'), false);
});
