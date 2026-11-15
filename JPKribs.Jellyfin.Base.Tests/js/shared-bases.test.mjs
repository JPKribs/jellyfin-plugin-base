// Tests the shared bases a family inherits: the List's keyed redraw and row parts, the check binding, the card,
// the clearable pressed group, the message core, and the media card's compact layout.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, all } from './fake-dom.mjs';

var dom = installFakeDom();
var { createList, createMediaCard, createOrderedList, createBanner, createStatCard } = await import('../../src/js/index.js');
var { fillRowParts } = await import('../../src/js/list.js');
var { createSelection, bindChecks } = await import('../../src/js/lib/selection.js');
var { buildCard } = await import('../../src/js/lib/card.js');
var { bindPressedGroup } = await import('../../src/js/lib/pressed-group.js');
var { MESSAGE_ICONS, dismissButton } = await import('../../src/js/lib/message.js');

beforeEach(function () { dom = installFakeDom(); });

test('a keyed List keeps unchanged cells, draws changed ones, and cellAt gives each cell', function () {
    var drawn = 0;
    var list = createList({ key: 'id', items: [{ id: 1, v: 'a' }, { id: 2, v: 'b' }], render: function (item) { drawn++; return item.v; } });
    var first = list.cellAt(0);
    list.setItems([{ id: 2, v: 'b' }, { id: 1, v: 'a' }, { id: 3, v: 'c' }]);
    assert.equal(list.cellAt(1), first);
    assert.equal(drawn, 3);
    assert.deepEqual(all(list.element, '.base-list-item').map(function (c) { return c.textContent; }), ['b', 'a', 'c']);
    list.setItems([{ id: 2, v: 'B' }, { id: 1, v: 'a' }]);
    assert.equal(drawn, 4);
    assert.equal(list.cellAt(2), null);
});

test('a List without unique keys draws every item again', function () {
    var drawn = 0;
    var list = createList({ key: 'id', items: [{ v: 'a' }], render: function (item) { drawn++; return item.v; } });
    list.setItems([{ v: 'a' }]);
    assert.equal(drawn, 2);
});

test('row parts put a primary and a dimmed secondary in a row, and the List sets the widest primary on itself', function () {
    var list = createOrderedList({ items: ['Intro', 'Chorus'], render: function (item, i) { return { primary: item, secondary: 'Position ' + (i + 1) }; } });
    var parts = all(list.element, '.base-item-row-parts');
    assert.equal(parts.length, 2);
    assert.equal(parts[0].querySelector('.base-item-row-primary').textContent, 'Intro');
    assert.equal(parts[1].querySelector('.base-item-row-secondary').textContent, 'Position 2');
    assert.match(list.element.style['--base-item-primary-width'], /^\d+px$/);
    var text = dom.el('span');
    fillRowParts(text, { primary: 'only' });
    assert.equal(text.querySelector('.base-item-row-secondary'), null);
});

test('bindChecks selects from row boxes, marks rows, skips disabled boxes, and select all acts on the ids given', function () {
    var root = dom.el('div');
    ['1', '2', '3'].forEach(function (id) {
        var row = root.appendChild(dom.el('div', { class: 'row' }));
        var box = row.appendChild(dom.el('input', { type: 'checkbox', class: 'box', 'data-id': id }));
        if (id === '3') box.disabled = true;
    });
    var all3 = dom.el('input', { type: 'checkbox' });
    var selection = createSelection({ onChange: function () { binding.paint(); } });
    var binding = bindChecks(root, { selection: selection, boxClass: 'box', rowClass: 'row', selectAll: all3, ids: function () { return ['1', '2']; } });
    var boxes = all(root, '.box');
    boxes[0].checked = true;
    boxes[0].dispatch('change', { bubbles: true });
    assert.deepEqual(selection.getIds(), ['1']);
    assert.ok(boxes[0].parentNode.classList.contains('selected'));
    assert.equal(all3.indeterminate, true);
    all3.checked = true;
    all3.dispatch('change');
    assert.deepEqual(selection.getIds(), ['1', '2']);
    boxes[2].checked = true;
    boxes[2].dispatch('change', { bubbles: true });
    assert.deepEqual(selection.getIds(), ['1', '2']);
    binding.destroy();
});

test('buildCard draws a colored count card that a stat card and count cards share', function () {
    var card = buildCard({ tag: 'button', count: 4, label: 'Synced', color: 'green', className: 'x', attrs: { type: 'button' } });
    assert.equal(card.element.tagName, 'BUTTON');
    assert.equal(card.element.className, 'base-card x green');
    assert.equal(card.count.textContent, '4');
    assert.equal(card.label.textContent, 'Synced');
    var hex = buildCard({ count: 1, color: '#123456' });
    assert.ok(hex.element.classList.contains('custom'));
    var stat = createStatCard({ value: 2, label: 'Items' });
    assert.equal(stat.element.children[0].className, 'base-card-count');
});

test('a clearable pressed group turns the one button off on a second click', function () {
    var root = dom.el('div');
    var a = root.appendChild(dom.el('button', { class: 'p', 'data-value': 'a' }));
    var heard = [];
    var group = bindPressedGroup(root, { selector: '.p', clearable: true, onChange: function (values) { heard.push(values); } });
    a.click();
    a.click();
    assert.deepEqual(heard, [['a'], []]);
    var plain = bindPressedGroup(dom.el('div'), { selector: '.p' });
    assert.deepEqual(plain.getValues(), []);
    group.destroy();
});

test('the message core gives each state one icon and builds the dismiss button every message pins', function () {
    assert.equal(MESSAGE_ICONS.warn, 'warning');
    assert.equal(MESSAGE_ICONS.neutral, 'info');
    var btn = dismissButton('base-toast-close', 'Dismiss');
    assert.ok(btn.classList.contains('base-row-btn') && btn.classList.contains('base-toast-close'));
    assert.equal(btn.getAttribute('aria-label'), 'Dismiss');
    var banner = createBanner({ kind: 'warn', text: 'Back up first.' });
    assert.ok(banner.element.classList.contains('dismissible'));
    assert.equal(createBanner({ dismissible: false }).element.classList.contains('dismissible'), false);
});

test('a row media card narrower than its wide layout draws one compact text column', function () {
    var watchers = [];
    globalThis.ResizeObserver = class { constructor(cb) { this.cb = cb; watchers.push(this); } observe(el) { this.el = el; } disconnect() {} };
    var card = createMediaCard({ title: 'Example Show', titleSuffix: 'S1, E1', subtitle: 'watch history', user: { name: 'Alice' }, badges: [{ label: 'History', color: 'blue' }], status: { label: 'Pending', color: 'orange' }, meta: 'waiting', actions: [{ label: 'Remove', icon: 'close', value: 'x' }] });
    var watch = watchers.filter(function (w) { return w.el === card.element; })[0];
    Object.defineProperty(card.element, 'clientWidth', { value: 360, configurable: true });
    watch.cb([]);
    var root = card.element;
    assert.ok(root.classList.contains('compact'));
    assert.equal(root.querySelector('.base-media-card-suffix'), null);
    var sub = root.querySelector('.base-media-card-sub');
    assert.deepEqual(Array.from(sub.children).map(function (c) { return c.className; }), ['base-media-card-episode', 'base-media-card-user', 'base-media-card-subtitle']);
    var chips = root.querySelector('.base-media-card-chips');
    assert.deepEqual(Array.from(chips.children).map(function (c) { return c.textContent; }), ['History', 'Pending', 'waiting']);
    assert.equal(root.querySelector('.base-media-card-side'), null);
    assert.equal(root.querySelector('.base-media-card-actions').parentNode, root);
    Object.defineProperty(card.element, 'clientWidth', { value: 900, configurable: true });
    watch.cb([]);
    assert.equal(root.classList.contains('compact'), false);
    assert.ok(root.querySelector('.base-media-card-side'));
    delete globalThis.ResizeObserver;
});
