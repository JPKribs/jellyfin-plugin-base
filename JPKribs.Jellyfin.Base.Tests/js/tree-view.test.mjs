// Behavior tests for createTreeView, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, all } from './fake-dom.mjs';

var dom = installFakeDom();
var { createTreeView } = await import('../../src/js/tree-view.js');

beforeEach(function () {
    dom = installFakeDom();
});

function nodes() {
    return [
        { id: 'tv', label: 'Shows', children: [
            { id: 's1', label: 'Season 1', children: [{ id: 'e1', label: 'Pilot' }, { id: 'e2', label: 'Second' }] },
            { id: 's2', label: 'Season 2', hasChildren: true }
        ] },
        { id: 'mv', label: 'Movies', image: 'm.jpg', imageShape: 'portrait' }
    ];
}

function build(extra) {
    var changes = [];
    var tree = createTreeView(Object.assign({ nodes: nodes(), selectable: true, onChange: function (ids) { changes.push(ids); } }, extra));
    dom.document.body.appendChild(tree.element);
    return { tree: tree, changes: changes };
}

function ids(ui) { return all(ui.tree.element, '.base-tree-row').map(function (r) { return r.getAttribute('data-id'); }); }
function row(ui, id) { return ui.tree.element.querySelector('.base-tree-row[data-id="' + id + '"]'); }

test('it shows the roots as tree items, with levels, and a thumbnail through the thumb core', function () {
    var ui = build();
    assert.equal(ui.tree.element.getAttribute('role'), 'tree');
    assert.deepEqual(ids(ui), ['tv', 'mv']);
    assert.equal(row(ui, 'tv').getAttribute('role'), 'treeitem');
    assert.equal(row(ui, 'tv').getAttribute('aria-expanded'), 'false');
    assert.equal(row(ui, 'tv').getAttribute('aria-level'), '1');
    assert.ok(row(ui, 'mv').querySelector('.base-thumb.base-tree-thumb'));
    assert.equal(row(ui, 'tv').getAttribute('tabindex'), '0');
});

test('the open button expands and collapses a node, turning its chevron by aria-expanded', function () {
    var ui = build();
    var toggle = row(ui, 'tv').querySelector('.base-tree-toggle');
    assert.equal(toggle.getAttribute('aria-label'), 'Expand Shows');
    toggle.click();
    assert.deepEqual(ids(ui), ['tv', 's1', 's2', 'mv']);
    assert.equal(row(ui, 's1').getAttribute('aria-level'), '2');
    assert.equal(row(ui, 'tv').querySelector('.base-tree-toggle').getAttribute('aria-expanded'), 'true');
    row(ui, 'tv').querySelector('.base-tree-toggle').click();
    assert.deepEqual(ids(ui), ['tv', 'mv']);
});

test('lazy children load through a promise, with a loading line while they load', async function () {
    var resolve;
    var ui = build({ expanded: ['tv'], loadChildren: function (node) { assert.equal(node.id, 's2'); return new Promise(function (r) { resolve = r; }); } });
    var done = ui.tree.expand('s2');
    assert.ok(row(ui, 's2').querySelector('.base-tree-loading'));
    resolve([{ id: 'e3', label: 'Return' }]);
    await done;
    assert.deepEqual(ids(ui), ['tv', 's1', 's2', 'e3', 'mv']);
    assert.equal(row(ui, 's2').querySelector('.base-tree-loading'), null);
});

test('checking a parent checks its children, and a parent with some checked children is partly checked', function () {
    var ui = build({ expanded: ['tv', 's1'] });
    var box = row(ui, 's1').querySelector('.base-tree-check');
    box.checked = true;
    box.dispatch('change');
    assert.deepEqual(ui.tree.getValue().sort(), ['e1', 'e2', 's1']);
    assert.equal(row(ui, 'tv').getAttribute('aria-checked'), 'mixed');
    assert.equal(row(ui, 'tv').querySelector('.base-tree-check').indeterminate, true);
    var e1 = row(ui, 'e1').querySelector('.base-tree-check');
    e1.checked = false;
    e1.dispatch('change');
    assert.deepEqual(ui.tree.getValue(), ['e2']);
    assert.equal(row(ui, 's1').getAttribute('aria-checked'), 'mixed');
    assert.equal(ui.changes.length, 2);
});

test('children that load under a checked parent start checked', async function () {
    var ui = build({ value: ['s2'], expanded: ['tv'], loadChildren: function () { return [{ id: 'e3', label: 'Return' }, { id: 'e4', label: 'End' }]; } });
    await ui.tree.expand('s2');
    assert.equal(row(ui, 'e3').getAttribute('aria-checked'), 'true');
    assert.deepEqual(ui.tree.getValue().sort(), ['e3', 'e4', 's2']);
});

test('arrow keys move, open, and close, Space checks, and Enter opens a node', async function () {
    var opened = [];
    var ui = build({ onOpen: function (n) { opened.push(n.id); } });
    row(ui, 'tv').focus();
    dom.document.key('ArrowRight');
    await Promise.resolve();
    assert.deepEqual(ids(ui), ['tv', 's1', 's2', 'mv']);
    dom.document.key('ArrowRight');
    assert.equal(dom.document.activeElement, row(ui, 's1'));
    dom.document.key('ArrowDown');
    assert.equal(dom.document.activeElement, row(ui, 's2'));
    assert.equal(row(ui, 's2').getAttribute('tabindex'), '0');
    assert.equal(row(ui, 'tv').getAttribute('tabindex'), '-1');
    dom.document.key('ArrowLeft');
    assert.equal(dom.document.activeElement, row(ui, 'tv'));
    dom.document.key('ArrowLeft');
    assert.deepEqual(ids(ui), ['tv', 'mv']);
    dom.document.key('End');
    assert.equal(dom.document.activeElement, row(ui, 'mv'));
    dom.document.key(' ');
    assert.deepEqual(ui.tree.getValue(), ['mv']);
    dom.document.key('Enter');
    assert.deepEqual(opened, ['mv']);
});

test('destroy removes the listeners', function () {
    var ui = build();
    ui.tree.destroy();
    assert.equal((ui.tree.element.listeners.keydown || []).length, 0);
});
