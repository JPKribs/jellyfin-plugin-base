// Behavior tests for createOrderedList, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, all } from './fake-dom.mjs';

var dom = installFakeDom();
var { createOrderedList } = await import('../../src/js/index.js');

beforeEach(function () {
    dom = installFakeDom();
});

function build(extra) {
    var moves = [];
    var list = createOrderedList(Object.assign({
        items: ['Intro', 'Verse', 'Outro'],
        render: function (item) { var d = dom.el('span'); d.textContent = item; return d; },
        label: function (item) { return item; },
        onMove: function (from, to, items) { moves.push({ from: from, to: to, items: items }); }
    }, extra));
    dom.document.body.appendChild(list.element);
    return { list: list, moves: moves };
}

function rows(list) { return all(list.element, '.base-ordered-item'); }
function names(list) { return rows(list).map(function (r) { return r.querySelector('.base-ordered-main').children[0].textContent; }); }
function up(list, i) { return rows(list)[i].querySelector('.base-ordered-up'); }
function down(list, i) { return rows(list)[i].querySelector('.base-ordered-down'); }

test('it is an ordered list with one row per item drawn by render', function () {
    var ui = build();
    assert.equal(ui.list.element.tagName, 'OL');
    assert.ok(ui.list.element.classList.contains('base-ordered-list'));
    assert.deepEqual(names(ui.list), ['Intro', 'Verse', 'Outro']);
});

test('render may return an HTML string', function () {
    var ui = build({ render: function (item) { return '<b>' + item + '</b>'; } });
    assert.equal(rows(ui.list)[0].querySelector('.base-ordered-main').innerHTML, '<b>Intro</b>');
});

test('the first up and the last down buttons are disabled', function () {
    var ui = build();
    assert.equal(up(ui.list, 0).disabled, true);
    assert.equal(down(ui.list, 0).disabled, false);
    assert.equal(up(ui.list, 2).disabled, false);
    assert.equal(down(ui.list, 2).disabled, true);
});

test('the buttons have Title Case titles and Move X up and Move X down labels', function () {
    var ui = build();
    assert.equal(up(ui.list, 1).title, 'Move up');
    assert.equal(down(ui.list, 1).title, 'Move down');
    assert.equal(up(ui.list, 1).getAttribute('aria-label'), 'Move Verse up');
    assert.equal(down(ui.list, 1).getAttribute('aria-label'), 'Move Verse down');
    assert.equal(up(ui.list, 1).type, 'button');
});

test('the labels fall back to Item N, and every default can be replaced', function () {
    var plain = build({ label: undefined });
    assert.equal(up(plain.list, 0).getAttribute('aria-label'), 'Move Item 1 up');

    var custom = build({
        moveUpTitle: 'Higher', moveDownTitle: 'Lower',
        moveUpLabel: function (name) { return 'Raise ' + name; },
        moveDownLabel: function (name) { return 'Lower ' + name; }
    });
    assert.equal(up(custom.list, 1).title, 'Higher');
    assert.equal(down(custom.list, 1).title, 'Lower');
    assert.equal(up(custom.list, 1).getAttribute('aria-label'), 'Raise Verse');
    assert.equal(down(custom.list, 1).getAttribute('aria-label'), 'Lower Verse');
});

test('moving down reorders the items and calls onMove with the indexes and the new order', function () {
    var ui = build();
    down(ui.list, 0).click();
    assert.deepEqual(names(ui.list), ['Verse', 'Intro', 'Outro']);
    assert.deepEqual(ui.list.getItems(), ['Verse', 'Intro', 'Outro']);
    assert.equal(ui.moves.length, 1);
    assert.equal(ui.moves[0].from, 0);
    assert.equal(ui.moves[0].to, 1);
    assert.deepEqual(ui.moves[0].items, ['Verse', 'Intro', 'Outro']);
});

test('after a move the pressed button of the moved row keeps focus', function () {
    var ui = build({ items: ['A', 'B', 'C', 'D'] });
    down(ui.list, 1).click();
    assert.equal(dom.document.activeElement, down(ui.list, 2));
    up(ui.list, 2).click();
    assert.equal(dom.document.activeElement, up(ui.list, 1));
});

test('a move that disables the pressed button moves focus to the other one in the row', function () {
    var ui = build();
    down(ui.list, 1).click();
    assert.equal(down(ui.list, 2).disabled, true);
    assert.equal(dom.document.activeElement, up(ui.list, 2));
    up(ui.list, 2).click();
    up(ui.list, 1).click();
    assert.equal(up(ui.list, 0).disabled, true);
    assert.equal(dom.document.activeElement, down(ui.list, 0));
});

test('a disabled button moves nothing', function () {
    var ui = build();
    up(ui.list, 0).click();
    assert.deepEqual(ui.list.getItems(), ['Intro', 'Verse', 'Outro']);
    assert.equal(ui.moves.length, 0);
});

test('setItems replaces the rows, and getItems returns a copy', function () {
    var ui = build();
    ui.list.setItems(['One', 'Two']);
    assert.deepEqual(names(ui.list), ['One', 'Two']);
    var copy = ui.list.getItems();
    copy.push('Three');
    assert.deepEqual(ui.list.getItems(), ['One', 'Two']);
});

test('destroy empties the list and stops moves', function () {
    var ui = build();
    var button = down(ui.list, 0);
    ui.list.destroy();
    assert.equal(rows(ui.list).length, 0);
    button.click();
    assert.equal(ui.moves.length, 0);
});

test('a missing render function throws', function () {
    assert.throws(function () { createOrderedList({}); }, /render/);
});

test('by default the list keeps its markup and grows with the page', function () {
    var ui = build();
    var list = ui.list.element;
    assert.ok(list.classList.contains('base-ordered-list'));
    assert.ok(list.classList.contains('base-list'));
    assert.ok(list.classList.contains('plain'));
    assert.equal(list.classList.contains('scrolls'), false);
    assert.equal(list.getAttribute('role'), null);
    assert.equal(rows(ui.list)[0].className, 'base-ordered-item base-item-row base-list-item');
    assert.equal(rows(ui.list)[0].getAttribute('role'), null);
    ui.list.setItems([]);
    assert.equal(list.children.length, 0);
});

test('height and maxHeight go to the list, and setHeight changes them', function () {
    var ui = build({ height: 240 });
    assert.ok(ui.list.element.classList.contains('fixed'));
    assert.equal(ui.list.element.style['--base-list-height'], '240px');
    ui.list.setHeight('auto', '20rem');
    assert.equal(ui.list.element.classList.contains('fixed'), false);
    assert.ok(ui.list.element.classList.contains('capped'));
    assert.equal(ui.list.element.style['--base-list-max'], '20rem');
});

test('a move in a list that scrolls keeps focus on the pressed button', function () {
    var ui = build({ items: ['A', 'B', 'C', 'D'], maxHeight: 120 });
    down(ui.list, 1).click();
    assert.deepEqual(names(ui.list), ['A', 'C', 'B', 'D']);
    assert.equal(dom.document.activeElement, down(ui.list, 2));
});
