// Behavior tests for createOverflowMenu, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, all } from './fake-dom.mjs';

var dom = installFakeDom();
var { createOverflowMenu } = await import('../../src/js/index.js');

beforeEach(function () {
    dom = installFakeDom();
});

function build(extra) {
    var picked = [];
    var menu = createOverflowMenu(Object.assign({
        items: [{ label: 'Edit', value: 'edit' }, { label: 'Copy', value: 'copy', disabled: true }, { label: 'Remove', value: 'remove', destructive: true }, { label: 'Plain' }],
        onSelect: function (value, item) { picked.push([value, item.label]); }
    }, extra));
    dom.document.body.appendChild(menu.element);
    return { menu: menu, picked: picked, button: menu.element.querySelector('.jpk-menu-button'), list: menu.element.querySelector('.jpk-menu-list') };
}

function items(ui) { return all(ui.list, '.jpk-menu-item'); }

test('the button has the menu roles and the list starts closed', function () {
    var ui = build();
    assert.equal(ui.button.getAttribute('aria-haspopup'), 'menu');
    assert.equal(ui.button.getAttribute('aria-expanded'), 'false');
    assert.equal(ui.button.getAttribute('aria-controls'), ui.list.id);
    assert.equal(ui.list.getAttribute('role'), 'menu');
    assert.equal(ui.list.hidden, true);
    assert.deepEqual(items(ui).map(function (i) { return i.getAttribute('role'); }), ['menuitem', 'menuitem', 'menuitem', 'menuitem']);
});

test('the default label names the button and the menu, and the label and icon can be replaced', function () {
    var ui = build();
    assert.equal(ui.button.getAttribute('aria-label'), 'More Actions');
    assert.equal(ui.button.title, 'More Actions');
    assert.equal(ui.button.querySelector('.material-icons').textContent, 'more_vert');
    var custom = build({ label: 'Row Actions', icon: 'settings' });
    assert.equal(custom.button.getAttribute('aria-label'), 'Row Actions');
    assert.equal(custom.list.getAttribute('aria-label'), 'Row Actions');
    assert.equal(custom.button.querySelector('.material-icons').textContent, 'settings');
});

test('items carry destructive and disabled state from the data', function () {
    var ui = build();
    assert.ok(items(ui)[2].classList.contains('destructive'));
    assert.equal(items(ui)[1].disabled, true);
    assert.equal(items(ui)[1].getAttribute('aria-disabled'), 'true');
});

test('a click opens the menu and focuses the first enabled item, and a second click closes it', function () {
    var ui = build();
    ui.button.click();
    assert.equal(ui.menu.isOpen(), true);
    assert.equal(ui.list.hidden, false);
    assert.equal(ui.button.getAttribute('aria-expanded'), 'true');
    assert.equal(dom.document.activeElement, items(ui)[0]);
    ui.button.click();
    assert.equal(ui.menu.isOpen(), false);
    assert.equal(ui.list.hidden, true);
    assert.equal(dom.document.activeElement, ui.button);
});

test('ArrowDown on the button opens it and ArrowUp opens it on the last item', function () {
    var ui = build();
    ui.button.dispatch('keydown', { key: 'ArrowDown' });
    assert.equal(dom.document.activeElement, items(ui)[0]);
    ui.menu.close();
    ui.button.dispatch('keydown', { key: 'ArrowUp' });
    assert.equal(dom.document.activeElement, items(ui)[3]);
});

test('arrow keys skip a disabled item and wrap, and Home and End jump', function () {
    var ui = build();
    ui.button.click();
    items(ui)[0].dispatch('keydown', { key: 'ArrowDown' });
    assert.equal(dom.document.activeElement, items(ui)[2]);
    items(ui)[2].dispatch('keydown', { key: 'ArrowDown' });
    assert.equal(dom.document.activeElement, items(ui)[3]);
    items(ui)[3].dispatch('keydown', { key: 'ArrowDown' });
    assert.equal(dom.document.activeElement, items(ui)[0]);
    items(ui)[0].dispatch('keydown', { key: 'ArrowUp' });
    assert.equal(dom.document.activeElement, items(ui)[3]);
    items(ui)[3].dispatch('keydown', { key: 'Home' });
    assert.equal(dom.document.activeElement, items(ui)[0]);
    items(ui)[0].dispatch('keydown', { key: 'End' });
    assert.equal(dom.document.activeElement, items(ui)[3]);
});

test('Escape closes the menu and returns focus to the button', function () {
    var ui = build();
    ui.button.click();
    items(ui)[0].dispatch('keydown', { key: 'Escape' });
    assert.equal(ui.menu.isOpen(), false);
    assert.equal(dom.document.activeElement, ui.button);
});

test('choosing an item reports its value and the item, closes the menu, and an item with no value reports its label', function () {
    var ui = build();
    ui.button.click();
    items(ui)[2].click();
    assert.deepEqual(ui.picked, [['remove', 'Remove']]);
    assert.equal(ui.menu.isOpen(), false);
    ui.button.click();
    items(ui)[3].click();
    assert.deepEqual(ui.picked[1], ['Plain', 'Plain']);
});

test('a disabled item reports nothing', function () {
    var ui = build();
    ui.button.click();
    items(ui)[1].click();
    assert.deepEqual(ui.picked, []);
});

test('a click outside closes the menu and a click inside does not', function () {
    var ui = build();
    ui.button.click();
    dom.document.dispatch('click', { target: ui.list });
    assert.equal(ui.menu.isOpen(), true);
    dom.document.dispatch('click', { target: dom.document.body });
    assert.equal(ui.menu.isOpen(), false);
});

test('Tab closes the menu without moving focus back', function () {
    var ui = build();
    ui.button.click();
    items(ui)[0].dispatch('keydown', { key: 'Tab' });
    assert.equal(ui.menu.isOpen(), false);
});

test('setItems replaces the items and getItems returns a copy', function () {
    var ui = build();
    ui.menu.setItems([{ label: 'Only' }]);
    assert.equal(items(ui).length, 1);
    var copy = ui.menu.getItems();
    copy.push({});
    assert.equal(ui.menu.getItems().length, 1);
});

test('the start alignment adds a modifier class', function () {
    assert.ok(build({ align: 'start' }).menu.element.classList.contains('jpk-menu-start'));
    assert.equal(build().menu.element.classList.contains('jpk-menu-start'), false);
});

test('destroy removes the document listener and the button listeners', function () {
    var ui = build();
    ui.button.click();
    var before = dom.document.listeners.click.length;
    ui.menu.destroy();
    assert.equal(dom.document.listeners.click.length, before - 1);
    assert.equal(ui.button.listeners.click.length, 0);
    assert.equal(ui.button.listeners.keydown.length, 0);
});
