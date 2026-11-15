// Behavior tests for createSortableCardList, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, all } from './fake-dom.mjs';

var dom = installFakeDom();
var { createSortableCardList } = await import('../../src/js/index.js');

beforeEach(function () {
    dom = installFakeDom();
});

function build(extra) {
    var host = dom.el('div');
    dom.document.body.appendChild(host);
    var listEl = host.appendChild(dom.el('div'));
    var moves = [];
    var cards = createSortableCardList(listEl, Object.assign({
        items: ['a', 'b', 'c'],
        render: function (item) { return { title: item }; },
        onMove: function (from, to) { moves.push([from, to]); }
    }, extra));
    return { listEl: listEl, cards: cards, moves: moves };
}

function cardsOf(ui) { return all(ui.listEl, '.base-card-item'); }
function titles(ui) { return cardsOf(ui).map(function (c) { return c.innerHTML.match(/<span>(.*?)<\/span>/)[1]; }); }

// The stub DOM does not parse innerHTML, so a test adds the head, and an arrow when it needs one, as elements.
function head(card, move) {
    var h = dom.el('div', { class: 'base-card-item-head' });
    if (move) h.appendChild(dom.el('button', { class: 'base-row-btn', 'data-move': String(move) }));
    card.appendChild(h);
    return h;
}

test('the list leaves its element alone until the first render', function () {
    var ui = build();
    ui.listEl.appendChild(dom.el('p'));
    assert.equal(ui.listEl.children.length, 1);
    assert.equal(ui.listEl.classList.contains('base-card-list'), false);
    ui.cards.render();
    assert.deepEqual(titles(ui), ['a', 'b', 'c']);
});

test('by default the cards keep their markup and grow with the page', function () {
    var ui = build();
    ui.cards.render();
    assert.ok(ui.listEl.classList.contains('base-card-list'));
    assert.ok(ui.listEl.classList.contains('base-list'));
    assert.ok(ui.listEl.classList.contains('plain'));
    assert.equal(ui.listEl.classList.contains('scrolls'), false);
    assert.equal(ui.listEl.getAttribute('role'), null);
    var first = cardsOf(ui)[0];
    assert.equal(first.className, 'base-card-item base-list-item');
    assert.equal(first.getAttribute('data-index'), '0');
    assert.equal(first.getAttribute('role'), null);
});

test('an arrow moves a card, keeps the open card on its record, and calls onMove', function () {
    var ui = build();
    ui.cards.setSelected(0);
    head(cardsOf(ui)[0], 1).querySelector('[data-move]').click();
    assert.deepEqual(titles(ui), ['b', 'a', 'c']);
    assert.equal(ui.cards.getSelected(), 1);
    assert.ok(cardsOf(ui)[1].classList.contains('selected'));
    assert.deepEqual(ui.moves, [[0, 1]]);
});

test('dragging a card onto the lower half of another drops it after that card', function () {
    var ui = build();
    ui.cards.render();
    var grip = head(cardsOf(ui)[0]);
    grip.dispatch('dragstart', { dataTransfer: { setData: function () {} } });
    assert.ok(cardsOf(ui)[0].classList.contains('dragging'));
    var target = cardsOf(ui)[2];
    target.dispatch('dragover', { clientY: 115, dataTransfer: {} });
    assert.ok(target.classList.contains('drop-after'));
    target.dispatch('drop', {});
    assert.deepEqual(titles(ui), ['b', 'c', 'a']);
    assert.deepEqual(ui.moves, [[0, 2]]);
});

test('dragging a card onto the upper half of another drops it before that card', function () {
    var ui = build();
    ui.cards.render();
    head(cardsOf(ui)[2]).dispatch('dragstart', { dataTransfer: { setData: function () {} } });
    var target = cardsOf(ui)[0];
    target.dispatch('dragover', { clientY: 102, dataTransfer: {} });
    assert.ok(target.classList.contains('drop-before'));
    target.dispatch('drop', {});
    assert.deepEqual(titles(ui), ['c', 'a', 'b']);
    assert.deepEqual(ui.moves, [[2, 0]]);
});

test('height and maxHeight go to the list, and setHeight changes them before or after the first render', function () {
    var ui = build({ maxHeight: 400 });
    ui.cards.setHeight(300);
    ui.cards.render();
    assert.ok(ui.listEl.classList.contains('fixed'));
    assert.equal(ui.listEl.style['--base-list-height'], '300px');
    assert.equal(ui.listEl.classList.contains('capped'), false);
    ui.cards.setHeight('auto', '50vh');
    assert.ok(ui.listEl.classList.contains('capped'));
    assert.equal(ui.listEl.style['--base-list-max'], '50vh');
    var capped = build({ maxHeight: 400 });
    capped.cards.render();
    assert.equal(capped.listEl.style['--base-list-max'], '400px');
});

test('destroy stops clicks from moving cards', function () {
    var ui = build();
    ui.cards.render();
    var button = head(cardsOf(ui)[0], 1).querySelector('[data-move]');
    ui.cards.destroy();
    button.click();
    assert.deepEqual(titles(ui), ['a', 'b', 'c']);
    assert.equal(ui.moves.length, 0);
});
