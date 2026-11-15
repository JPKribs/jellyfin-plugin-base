// Behavior tests for createRecordList, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, all } from './fake-dom.mjs';

var dom = installFakeDom();
var { createRecordList } = await import('../../src/js/record-list.js');

beforeEach(function () {
    dom = installFakeDom();
});

var ITEMS = [
    { id: 'a', title: 'Discord', secondary: 'Every event', tags: [{ label: 'Movies', icon: 'movie' }, { label: '4K', off: true }] },
    { id: 'b', title: 'Email' }
];

function rows(list) { return all(list.element, '.base-record-list-row'); }

test('each row shows its title and secondary line as item row parts, and its tags', function () {
    var list = createRecordList({ items: ITEMS });
    var row = rows(list)[0];
    assert.ok(row.classList.contains('base-item-row'));
    assert.equal(row.querySelector('.base-item-row-primary').textContent, 'Discord');
    assert.equal(row.querySelector('.base-item-row-secondary').textContent, 'Every event');
    var tags = all(row, '.base-tag');
    assert.equal(tags.length, 2);
    assert.equal(tags[0].querySelector('.material-icons').textContent, 'movie');
    assert.ok(tags[1].classList.contains('base-tag-off'));
    assert.equal(tags[1].querySelector('.base-sr-only').textContent, ' off');
    assert.equal(rows(list)[1].querySelector('.base-tags'), null);
});

test('with onOpen a row opens by a click, by Enter, and by its chevron', function () {
    var opened = [];
    var list = createRecordList({ items: ITEMS, onOpen: function (item) { opened.push(item.id); } });
    dom.document.body.appendChild(list.element);
    var row = rows(list)[0];
    var chevron = row.querySelector('.base-record-list-open');
    assert.equal(chevron.getAttribute('aria-label'), 'Open Discord');
    assert.equal(chevron.querySelector('.material-icons').textContent, 'chevron_right');
    row.click();
    chevron.click();
    row.focus();
    dom.document.key('Enter');
    assert.deepEqual(opened, ['a', 'a', 'a']);
});

test('an aside control takes the chevron place, and a click on it opens nothing', function () {
    var opened = [];
    var btn = dom.document.createElement('button');
    var list = createRecordList({ items: [{ id: 'x', title: 'X', aside: btn }], onOpen: function (item) { opened.push(item.id); } });
    var row = rows(list)[0];
    assert.equal(row.querySelector('.base-record-list-open'), null);
    assert.equal(row.querySelector('.base-record-list-aside').children[0], btn);
    btn.click();
    assert.deepEqual(opened, []);
});

test('setItems keeps a row whose content did not change and draws the changed one again', function () {
    var list = createRecordList({ items: ITEMS });
    var first = rows(list)[0];
    var second = rows(list)[1];
    list.setItems([ITEMS[0], { id: 'b', title: 'Email', secondary: 'Daily' }]);
    assert.equal(rows(list)[0], first);
    assert.notEqual(rows(list)[1], second);
    assert.equal(rows(list)[1].querySelector('.base-item-row-secondary').textContent, 'Daily');
});

test('an empty list shows its empty sentence', function () {
    var list = createRecordList({ emptyText: 'No destinations.' });
    assert.equal(list.element.querySelector('.base-list-empty').textContent, 'No destinations.');
});
