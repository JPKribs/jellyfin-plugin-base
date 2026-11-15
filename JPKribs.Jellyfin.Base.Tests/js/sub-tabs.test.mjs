// Behavior tests for createSubTabs, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, all } from './fake-dom.mjs';

var dom = installFakeDom();
var { createSubTabs } = await import('../../src/js/index.js');

beforeEach(function () {
    dom = installFakeDom();
});

function build(extra) {
    var changes = [];
    var rendered = [];
    var tabs = createSubTabs(Object.assign({
        tabs: [{ id: 'a', label: 'General', text: 'General text' }, { id: 'b', label: 'Advanced' }, { id: 'c', label: 'Off', disabled: true }, { id: 'd', label: 'Logs' }],
        render: function (tab) { rendered.push(tab.id); var d = dom.el('span'); d.textContent = 'built ' + tab.id; return d; },
        onChange: function (id) { changes.push(id); }
    }, extra));
    dom.document.body.appendChild(tabs.element);
    return { tabs: tabs, changes: changes, rendered: rendered };
}

function tab(ui, id) { return all(ui.tabs.element, '.base-subtab').filter(function (t) { return t.getAttribute('data-id') === id; })[0]; }
function key(ui, el, k) { return el.dispatch('keydown', { key: k }); }

test('it has a tablist, tabs, and panels with roles and labels wired together', function () {
    var ui = build();
    var list = ui.tabs.element.querySelector('.base-subtab-list');
    assert.equal(list.getAttribute('role'), 'tablist');
    assert.equal(list.getAttribute('aria-label'), 'Sections');
    var panel = ui.tabs.getPanel('a');
    assert.equal(panel.getAttribute('role'), 'tabpanel');
    assert.equal(tab(ui, 'a').getAttribute('role'), 'tab');
    assert.equal(tab(ui, 'a').getAttribute('aria-controls'), panel.id);
    assert.equal(panel.getAttribute('aria-labelledby'), tab(ui, 'a').id);
    assert.equal(createSubTabs({ label: 'Settings', tabs: [{ id: 'x', label: 'X' }] }).element.querySelector('.base-subtab-list').getAttribute('aria-label'), 'Settings');
});

test('the first enabled tab opens first with selected state, roving tabindex, and a visible panel', function () {
    var ui = build();
    assert.equal(ui.tabs.getValue(), 'a');
    assert.equal(tab(ui, 'a').getAttribute('aria-selected'), 'true');
    assert.equal(tab(ui, 'a').getAttribute('tabindex'), '0');
    assert.equal(tab(ui, 'b').getAttribute('tabindex'), '-1');
    assert.equal(ui.tabs.getPanel('a').hidden, false);
    assert.equal(ui.tabs.getPanel('b').hidden, true);
    assert.equal(ui.changes.length, 0);
});

test('panels are built lazily, once, with plain text and the render result', function () {
    var ui = build();
    assert.deepEqual(ui.rendered, ['a']);
    assert.equal(ui.tabs.getPanel('a').textContent, 'General textbuilt a');
    tab(ui, 'b').click();
    tab(ui, 'a').click();
    tab(ui, 'b').click();
    assert.deepEqual(ui.rendered, ['a', 'b']);
    assert.equal(ui.tabs.getPanel('b').children[0].textContent, 'built b');
});

test('a click selects the tab, shows its panel, and reports the change once', function () {
    var ui = build();
    tab(ui, 'b').click();
    assert.equal(ui.tabs.getValue(), 'b');
    assert.equal(ui.tabs.getPanel('b').hidden, false);
    assert.equal(ui.tabs.getPanel('a').hidden, true);
    tab(ui, 'b').click();
    assert.deepEqual(ui.changes, ['b']);
});

test('arrow keys move and select, skip a disabled tab, and wrap', function () {
    var ui = build();
    key(ui, tab(ui, 'a'), 'ArrowRight');
    assert.equal(ui.tabs.getValue(), 'b');
    assert.equal(dom.document.activeElement, tab(ui, 'b'));
    key(ui, tab(ui, 'b'), 'ArrowRight');
    assert.equal(ui.tabs.getValue(), 'd');
    key(ui, tab(ui, 'd'), 'ArrowRight');
    assert.equal(ui.tabs.getValue(), 'a');
    key(ui, tab(ui, 'a'), 'ArrowLeft');
    assert.equal(ui.tabs.getValue(), 'd');
});

test('Home and End jump to the first and last enabled tab', function () {
    var ui = build();
    key(ui, tab(ui, 'a'), 'End');
    assert.equal(ui.tabs.getValue(), 'd');
    key(ui, tab(ui, 'd'), 'Home');
    assert.equal(ui.tabs.getValue(), 'a');
});

test('a disabled tab cannot be selected by click or setValue', function () {
    var ui = build();
    tab(ui, 'c').click();
    ui.tabs.setValue('c');
    assert.equal(ui.tabs.getValue(), 'a');
});

test('setValue selects without a focus move, and the value option opens another tab first', function () {
    var ui = build();
    ui.tabs.setValue('d');
    assert.equal(ui.tabs.getValue(), 'd');
    assert.equal(build({ value: 'b' }).tabs.getValue(), 'b');
});

test('setItems replaces the tabs and opens the first one', function () {
    var ui = build();
    ui.tabs.setItems([{ id: 'x', label: 'X' }, { id: 'y', label: 'Y' }]);
    assert.equal(ui.tabs.element.querySelectorAll('.base-subtab').length, 2);
    assert.equal(ui.tabs.getValue(), 'x');
    assert.equal(ui.tabs.getPanel('a'), null);
});

test('destroy removes the list listeners', function () {
    var ui = build();
    var list = ui.tabs.element.querySelector('.base-subtab-list');
    ui.tabs.destroy();
    assert.equal(list.listeners.click.length, 0);
    assert.equal(list.listeners.keydown.length, 0);
});
