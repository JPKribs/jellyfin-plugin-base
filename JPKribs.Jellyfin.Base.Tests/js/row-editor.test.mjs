// Behavior tests for the row editor core in lib/row-editor.ts, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fake-dom.mjs';

var dom = installFakeDom();
var { moveButtons, rowLabel, refocusAfterMove, focusAfterRemove, createRowSet } = await import('../../src/js/lib/row-editor.js');

beforeEach(function () {
    dom = installFakeDom();
});

function icon(btn) { return btn.querySelector('.material-icons').textContent; }

test('moveButtons builds an up and a down row button with the default titles, labels, and chevrons', function () {
    var [up, down] = moveButtons({ index: 1, count: 3, name: 'Verse' });
    assert.ok(up.classList.contains('base-row-btn') && up.classList.contains('move'));
    assert.equal(up.getAttribute('data-move'), '-1');
    assert.equal(down.getAttribute('data-move'), '1');
    assert.equal(up.title, 'Move up');
    assert.equal(down.title, 'Move down');
    assert.equal(up.getAttribute('aria-label'), 'Move Verse up');
    assert.equal(down.getAttribute('aria-label'), 'Move Verse down');
    assert.equal(icon(up), 'keyboard_arrow_up');
    assert.equal(icon(down), 'keyboard_arrow_down');
    assert.equal(up.type, 'button');
    assert.equal(up.disabled, false);
    assert.equal(down.disabled, false);
});

test('moveButtons disables the first up and the last down, and adds the class prefix', function () {
    var first = moveButtons({ index: 0, count: 2, name: 'a', className: 'base-x' });
    var last = moveButtons({ index: 1, count: 2, name: 'b', className: 'base-x' });
    assert.equal(first[0].disabled, true);
    assert.equal(first[1].disabled, false);
    assert.equal(last[0].disabled, false);
    assert.equal(last[1].disabled, true);
    assert.ok(first[0].classList.contains('base-x-up'));
    assert.ok(first[1].classList.contains('base-x-down'));
});

test('moveButtons takes replacement titles and labels, and calls onMove with the indexes', function () {
    var moves = [];
    var [up, down] = moveButtons({
        index: 1, count: 3, name: 'Verse', upTitle: 'Up', downTitle: 'Down',
        upLabel: 'Raise {value}', downLabel: function (n) { return 'Lower ' + n; },
        onMove: function (from, to) { moves.push([from, to]); }
    });
    assert.equal(up.title, 'Up');
    assert.equal(down.title, 'Down');
    assert.equal(up.getAttribute('aria-label'), 'Raise Verse');
    assert.equal(down.getAttribute('aria-label'), 'Lower Verse');
    up.click();
    down.click();
    assert.deepEqual(moves, [[1, 0], [1, 2]]);
});

test('rowLabel fills a template, calls a function, and falls back', function () {
    assert.equal(rowLabel('Drop {value}', 'Remove {value}', 'a'), 'Drop a');
    assert.equal(rowLabel(function (n) { return n + '!'; }, 'Remove {value}', 'a'), 'a!');
    assert.equal(rowLabel(null, 'Remove {value}', 'a'), 'Remove a');
});

test('refocusAfterMove focuses the pressed button, or the other one when the pressed one is disabled', function () {
    var list = dom.el('div');
    dom.document.body.appendChild(list);
    function rows(count) {
        list.innerHTML = '';
        for (var i = 0; i < count; i++) {
            var row = dom.el('div');
            moveButtons({ index: i, count: count, name: String(i) }).forEach(function (b) { row.appendChild(b); });
            list.appendChild(row);
        }
    }
    rows(3);
    refocusAfterMove(list, 0, 1);
    assert.equal(dom.document.activeElement, list.children[1].querySelector('[data-move="1"]'));
    rows(3);
    refocusAfterMove(list, 1, 0);
    assert.equal(dom.document.activeElement, list.children[0].querySelector('[data-move="1"]'));
});

test('focusAfterRemove focuses the row that took the place, the one before, or the fallback', function () {
    var a = dom.el('input');
    var b = dom.el('input');
    var add = dom.el('button');
    [a, b, add].forEach(function (el) { dom.document.body.appendChild(el); });
    focusAfterRemove([a, b], 1, add);
    assert.equal(dom.document.activeElement, b);
    focusAfterRemove([a], 1, add);
    assert.equal(dom.document.activeElement, a);
    focusAfterRemove([], 0, add);
    assert.equal(dom.document.activeElement, add);
});

function rowSet(extra) {
    var changes = 0;
    var body = dom.el('div');
    var addButton = dom.el('button', { type: 'button' });
    var built = [];
    var set = createRowSet(Object.assign({
        body: body,
        addButton: addButton,
        build: function (data) {
            var input = dom.el('input');
            input.value = data || '';
            var remove = dom.el('button', { type: 'button' });
            var el = dom.el('div', {}, [input, remove]);
            var row = { element: el, focus: input, remove: remove, off: [], destroyed: false, destroy: function () { row.destroyed = true; } };
            built.push(row);
            return row;
        },
        onChange: function () { changes++; }
    }, extra));
    dom.document.body.appendChild(body);
    dom.document.body.appendChild(set.empty);
    dom.document.body.appendChild(addButton);
    dom.document.body.appendChild(set.limit);
    return { set: set, body: body, addButton: addButton, built: built, changes: function () { return changes; } };
}

test('createRowSet adds a row on Add, focuses it, and reports the change', function () {
    var ui = rowSet();
    ui.addButton.click();
    assert.equal(ui.set.rows().length, 1);
    assert.equal(dom.document.activeElement, ui.set.rows()[0].focus);
    assert.equal(ui.changes(), 1);
});

test('createRowSet removes a row, tears it down, focuses the next row, and reports the change', function () {
    var ui = rowSet();
    ui.set.set(['a', 'b', 'c']);
    assert.equal(ui.changes(), 0);
    var removed = ui.set.rows()[1];
    removed.remove.click();
    assert.equal(removed.destroyed, true);
    assert.deepEqual(ui.set.rows().map(function (r) { return r.focus.value; }), ['a', 'c']);
    assert.equal(dom.document.activeElement, ui.set.rows()[1].focus);
    assert.equal(ui.changes(), 1);
});

test('createRowSet stops at maxRows with the limit message and shows the empty sentence', function () {
    var ui = rowSet({ maxRows: 1, emptyText: 'None.', emptyClass: 'base-kv-empty' });
    assert.equal(ui.set.empty.hidden, false);
    assert.equal(ui.set.empty.textContent, 'None.');
    assert.equal(ui.set.empty.className, 'base-list-empty outside base-kv-empty');
    assert.equal(ui.body.querySelector('.base-list-empty'), null);
    ui.addButton.click();
    assert.equal(ui.set.empty.hidden, true);
    assert.equal(ui.addButton.disabled, true);
    assert.equal(ui.set.limit.querySelector('.base-field-message-text').textContent, 'No more rows can be added.');
    assert.equal(ui.set.add('x'), null);
});

test('createRowSet destroy tears down the rows and removes the Add and Remove listeners', function () {
    var ui = rowSet();
    ui.set.set(['a']);
    var row = ui.set.rows()[0];
    ui.set.destroy();
    assert.equal(row.destroyed, true);
    assert.equal((ui.addButton.listeners.click || []).length, 0);
    assert.equal((row.remove.listeners.click || []).length, 0);
});
