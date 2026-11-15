// Behavior tests for createList, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, all } from './fake-dom.mjs';

var dom = installFakeDom();
var { createList } = await import('../../src/js/index.js');

var observers;
var frames;

beforeEach(function () {
    dom = installFakeDom();
    observers = [];
    frames = [];
    globalThis.IntersectionObserver = function (callback, init) {
        var o = { callback: callback, init: init, targets: [], disconnected: false };
        o.observe = function (t) { o.targets.push(t); };
        o.disconnect = function () { o.disconnected = true; };
        observers.push(o);
        return o;
    };
    globalThis.ResizeObserver = function () { return { observe: function () {}, disconnect: function () {} }; };
    globalThis.requestAnimationFrame = function (fn) { frames.push(fn); return frames.length; };
    globalThis.cancelAnimationFrame = function () {};
});

function build(extra) {
    var list = createList(Object.assign({ items: ['alpha', 'beta'], render: function (item) { return item; } }, extra));
    dom.document.body.appendChild(list.element);
    return list;
}

function texts(list) { return all(list.element, '.base-list-item').map(function (r) { return r.textContent; }); }
function liveObserver() { return observers.filter(function (o) { return !o.disconnected; }).pop(); }

test('createList renders each item through render, in order, as list items', function () {
    var list = build();
    assert.deepEqual(texts(list), ['alpha', 'beta']);
    assert.equal(list.element.getAttribute('role'), 'list');
    assert.equal(list.element.querySelector('.base-list-item').getAttribute('role'), 'listitem');
});

test('createList shows text as text, never as markup', function () {
    var list = build({ items: ['<b>bold</b>'] });
    assert.equal(list.element.querySelector('.base-list-item b'), null);
    assert.deepEqual(texts(list), ['<b>bold</b>']);
});

test('createList takes a node or a component handle from render', function () {
    var destroyed = 0;
    var list = build({
        items: [1, 2],
        render: function (n) {
            var el = dom.document.createElement('span');
            el.textContent = 'item ' + n;
            return n === 1 ? el : { element: el, destroy: function () { destroyed++; } };
        }
    });
    assert.deepEqual(texts(list), ['item 1', 'item 2']);
    list.setItems([]);
    assert.equal(destroyed, 1);
});

test('createList skips an item whose render returns nothing but keeps its row', function () {
    var list = build({ render: function () { return null; } });
    assert.equal(all(list.element, '.base-list-item').length, 2);
});

test('createList shows the empty text only while there are no items', function () {
    var list = build({ items: [] });
    assert.equal(list.element.querySelector('.base-list-empty').textContent, 'Nothing to show.');
    assert.equal(list.element.classList.contains('empty'), true);
    list.setItems(['one']);
    assert.equal(list.element.querySelector('.base-list-empty'), null);
    assert.equal(list.element.classList.contains('empty'), false);
});

test('createList takes its own empty and loading text', function () {
    var list = build({ items: [], emptyText: 'No servers.', loadingText: 'Reading servers' });
    assert.equal(list.element.querySelector('.base-list-empty').textContent, 'No servers.');
    list.setLoading(true);
    assert.equal(list.element.querySelector('.base-list-empty'), null);
    assert.equal(list.element.querySelector('.base-list-loading').textContent, 'Reading servers');
    assert.equal(list.element.querySelector('.base-list-loading').getAttribute('role'), 'status');
    list.setLoading(false);
    assert.equal(list.element.querySelector('.base-list-loading'), null);
});

test('a ul list shows its loading line as an item and its empty sentence outside', function () {
    var ul = dom.document.createElement('ul');
    var list = build({ element: ul, items: [], emptyText: 'No files.', loadingText: 'Reading' });
    var empty = list.emptyElement;
    assert.equal(list.element.querySelector('.base-list-empty'), null);
    assert.ok(empty.classList.contains('base-list-empty') && empty.classList.contains('outside'));
    assert.equal(empty.hidden, false);
    list.setLoading(true);
    var busy = list.element.querySelector('.base-list-loading');
    assert.equal(busy.tagName, 'LI');
    assert.equal(busy.textContent, 'Reading');
    assert.equal(empty.hidden, true);
    list.setLoading(false);
    list.setItems(['a']);
    assert.equal(empty.hidden, true);
    assert.equal(list.element.querySelector('.base-list-loading'), null);
});

test('createList appends items after the ones it has, before its end marker', function () {
    var list = build({ onEndReached: function () {} });
    list.append(['gamma']);
    assert.deepEqual(texts(list), ['alpha', 'beta', 'gamma']);
    assert.deepEqual(list.getItems(), ['alpha', 'beta', 'gamma']);
    var last = list.element.children[list.element.children.length - 1];
    assert.equal(last.classList.contains('base-list-sentinel'), true);
});

test('createList appends into an empty list and drops the empty text', function () {
    var list = build({ items: [] });
    list.append(['first']);
    assert.deepEqual(texts(list), ['first']);
    assert.equal(list.element.querySelector('.base-list-empty'), null);
});

test('getItems returns a copy', function () {
    var list = build();
    list.getItems().push('x');
    assert.deepEqual(list.getItems(), ['alpha', 'beta']);
});

test('createList grows with its items by default and does not scroll inside', function () {
    var list = build();
    assert.equal(list.element.classList.contains('rows'), true);
    assert.equal(list.element.classList.contains('scrolls'), false);
});

test('a numeric height is a fixed height that scrolls inside', function () {
    var list = build({ height: 240 });
    assert.equal(list.element.classList.contains('fixed'), true);
    assert.equal(list.element.classList.contains('scrolls'), true);
    assert.equal(list.element.style['--base-list-height'], '240px');
});

test('a CSS length height is kept as written', function () {
    var list = build({ height: '40vh' });
    assert.equal(list.element.style['--base-list-height'], '40vh');
});

test('maxHeight caps a growing list and scrolls past it', function () {
    var list = build({ maxHeight: '20rem' });
    assert.equal(list.element.classList.contains('capped'), true);
    assert.equal(list.element.classList.contains('scrolls'), true);
    assert.equal(list.element.classList.contains('fixed'), false);
    assert.equal(list.element.style['--base-list-max'], '20rem');
});

test('fill measures the list top so it ends at the bottom of the window', function () {
    var list = build({ height: 'fill', minHeight: 200, fillGap: 24 });
    list.element._rect = { top: 180, left: 0, right: 0, bottom: 0, width: 0, height: 0 };
    frames.splice(0).forEach(function (f) { f(); });
    assert.equal(list.element.classList.contains('fill'), true);
    assert.equal(list.element.classList.contains('scrolls'), true);
    assert.equal(list.element.style['--base-list-top'], '180px');
    assert.equal(list.element.style['--base-list-min'], '200px');
    assert.equal(list.element.style['--base-list-gap'], '24px');
});

test('fill starting below the first screen is as tall as the window', function () {
    var list = build({ height: 'fill' });
    list.element._rect = { top: 5000, left: 0, right: 0, bottom: 0, width: 0, height: 0 };
    frames.splice(0).forEach(function (f) { f(); });
    assert.equal(list.element.style['--base-list-top'], '0px');
});

test('fill measures again when the window resizes', function () {
    var list = build({ height: 'fill' });
    frames.splice(0).forEach(function (f) { f(); });
    list.element._rect = { top: 50, left: 0, right: 0, bottom: 0, width: 0, height: 0 };
    dom.dispatchWindow('resize');
    frames.splice(0).forEach(function (f) { f(); });
    assert.equal(list.element.style['--base-list-top'], '50px');
});

test('setHeight switches modes and clears the old one', function () {
    var list = build({ height: 300 });
    list.setHeight('auto');
    assert.equal(list.element.classList.contains('fixed'), false);
    assert.equal(list.element.classList.contains('scrolls'), false);
    assert.equal(list.element.style['--base-list-height'], undefined);
    list.setHeight('fill');
    assert.equal(list.element.classList.contains('fill'), true);
});

test('the grid layout takes a minimum column width', function () {
    var list = build({ layout: 'grid', minColumn: 180 });
    assert.equal(list.element.classList.contains('grid'), true);
    assert.equal(list.element.style['--base-list-column'], '180px');
});

test('an unknown layout falls back to rows', function () {
    var list = build({ layout: 'table' });
    assert.equal(list.element.classList.contains('rows'), true);
});

test('createList can take over an element a page already has', function () {
    var host = dom.document.createElement('div');
    host.className = 'myplugin-list';
    var list = build({ element: host, label: 'Servers' });
    assert.equal(list.element, host);
    assert.equal(host.classList.contains('myplugin-list'), true);
    assert.equal(host.classList.contains('base-list'), true);
    assert.equal(host.getAttribute('aria-label'), 'Servers');
});

test('onEndReached runs when the end comes into view, measured in the window for a growing list', function () {
    var calls = 0;
    var list = build({ onEndReached: function () { calls++; } });
    var o = liveObserver();
    assert.equal(o.init.root, null);
    assert.equal(o.targets[0].classList.contains('base-list-sentinel'), true);
    o.callback([{ isIntersecting: true }]);
    assert.equal(calls, 1);
    o.callback([{ isIntersecting: false }]);
    assert.equal(calls, 1);
});

test('onEndReached is measured in the list itself when it scrolls inside', function () {
    var list = build({ height: 300, onEndReached: function () {} });
    assert.equal(liveObserver().init.root, list.element);
});

test('onEndReached waits while the list is loading', function () {
    var calls = 0;
    var list = build({ onEndReached: function () { calls++; } });
    list.setLoading(true);
    liveObserver().callback([{ isIntersecting: true }]);
    assert.equal(calls, 0);
});

test('onEndReached does not watch an empty list', function () {
    build({ items: [], onEndReached: function () {} });
    assert.equal(liveObserver(), undefined);
});

test('destroy stops the end watch, the resize listener, and every item', function () {
    var destroyed = 0;
    var list = build({
        height: 'fill',
        onEndReached: function () {},
        render: function (t) { var el = dom.document.createElement('span'); el.textContent = t; return { element: el, destroy: function () { destroyed++; } }; }
    });
    list.destroy();
    assert.equal(destroyed, 2);
    assert.equal(observers.every(function (o) { return o.disconnected; }), true);
    frames.splice(0);
    list.element._rect = { top: 999, left: 0, right: 0, bottom: 0, width: 0, height: 0 };
    dom.dispatchWindow('resize');
    assert.equal(frames.length, 0);
});

test('wrap false makes each rendered row the item itself, keeping its own classes', function () {
    var list = build({
        wrap: false,
        render: function (t) { var row = dom.document.createElement('div'); row.className = 'myplugin-row'; row.textContent = t; return row; }
    });
    var first = list.element.children[0];
    assert.equal(first.classList.contains('myplugin-row'), true);
    assert.equal(first.classList.contains('base-list-item'), true);
    assert.equal(first.getAttribute('role'), 'listitem');
    assert.equal(list.element.querySelector('.myplugin-row .myplugin-row'), null);
});

test('wrap false still wraps text, which has no element of its own', function () {
    var list = build({ wrap: false });
    assert.deepEqual(texts(list), ['alpha', 'beta']);
});

test('role keeps a list element its own meaning, and items take no listitem role', function () {
    var list = build({ role: 'log' });
    assert.equal(list.element.getAttribute('role'), 'log');
    assert.equal(list.element.querySelector('.base-list-item').hasAttribute('role'), false);
    var bare = build({ role: null });
    assert.equal(bare.element.hasAttribute('role'), false);
});

test('emptyText null leaves the empty state to the component around the list', function () {
    var list = build({ items: [], emptyText: null });
    assert.equal(list.element.querySelector('.base-list-empty'), null);
    assert.equal(list.element.classList.contains('empty'), true);
});

test('a list that does not load more has no end marker, so its last child is its last item', function () {
    var list = build();
    assert.equal(list.element.querySelector('.base-list-sentinel'), null);
    list.append(['gamma']);
    assert.equal(list.element.children[list.element.children.length - 1].textContent, 'gamma');
});

test('removeFirst drops items from the start without redrawing the rest, and tears down their handles', function () {
    var destroyed = [];
    var list = build({
        items: ['a', 'b', 'c', 'd'],
        render: function (t) { var el = dom.document.createElement('span'); el.textContent = t; return { element: el, destroy: function () { destroyed.push(t); } }; }
    });
    var kept = list.element.children[2];
    list.removeFirst(2);
    assert.deepEqual(texts(list), ['c', 'd']);
    assert.deepEqual(list.getItems(), ['c', 'd']);
    assert.deepEqual(destroyed, ['a', 'b']);
    assert.equal(list.element.children[0], kept);
    list.removeFirst(10);
    assert.deepEqual(list.getItems(), []);
    assert.equal(list.element.querySelector('.base-list-empty').textContent, 'Nothing to show.');
});
