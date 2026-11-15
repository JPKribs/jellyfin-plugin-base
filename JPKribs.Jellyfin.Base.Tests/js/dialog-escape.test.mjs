// Tests for how a dialog names itself and shares Escape with the components inside it, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fake-dom.mjs';

var dom = installFakeDom();
var { openDialog, confirmDialog, createOverflowMenu, createHelpHint, createSearchField, createStringList, createChipSelect, createShared } = await import('../../src/js/index.js');

beforeEach(function () {
    dom = installFakeDom();
});

function open() {
    return dom.document.querySelectorAll('.jpk-dialog').length > 0;
}

// Opens a dialog around the element and runs prepare so the component is in its open state with focus inside.
function around(element, prepare) {
    var handle = openDialog({ title: 'Edit', body: element });
    prepare();
    return handle;
}

test('Escape inside an open overflow menu closes the menu only, and a second Escape closes the dialog', function () {
    var menu = createOverflowMenu({ items: [{ label: 'Edit' }, { label: 'Copy' }] });
    around(menu.element, function () { menu.element.querySelector('.jpk-menu-button').click(); });
    assert.equal(menu.isOpen(), true);
    assert.equal(dom.document.activeElement.className.indexOf('jpk-menu-item') !== -1, true);
    dom.document.key('Escape');
    assert.equal(menu.isOpen(), false);
    assert.equal(open(), true);
    dom.document.key('Escape');
    assert.equal(open(), false);
});

test('Escape inside an open help hint closes the bubble only', function () {
    var hint = createHelpHint({ text: 'Explains.' });
    around(hint.element, function () { hint.element.querySelector('button').click(); hint.element.querySelector('button').focus(); });
    assert.equal(hint.element.classList.contains('open'), true);
    dom.document.key('Escape');
    assert.equal(hint.element.classList.contains('open'), false);
    assert.equal(open(), true);
    dom.document.key('Escape');
    assert.equal(open(), false);
});

test('Escape in a search field that has text clears it, and the next Escape closes the dialog', function () {
    var field = createSearchField({ delay: 0 });
    around(field.element, function () { field.input.focus(); field.input.value = 'abc'; field.input.dispatch('input'); });
    dom.document.key('Escape');
    assert.equal(field.getValue(), '');
    assert.equal(open(), true);
    dom.document.key('Escape');
    assert.equal(open(), false);
});

test('Escape in an empty search field closes the dialog at once', function () {
    var field = createSearchField();
    around(field.element, function () { field.input.focus(); });
    dom.document.key('Escape');
    assert.equal(open(), false);
});

test('Escape in a string list input with text clears it, and the next Escape closes the dialog', function () {
    var list = createStringList({});
    around(list.element, function () { list.input.focus(); list.input.value = 'abc'; list.input.dispatch('input'); });
    dom.document.key('Escape');
    assert.equal(list.input.value, '');
    assert.equal(open(), true);
    dom.document.key('Escape');
    assert.equal(open(), false);
});

test('Escape in a string list input that shows an error clears the message first', function () {
    var list = createStringList({ values: ['a'] });
    around(list.element, function () { list.input.focus(); list.add('a'); });
    assert.equal(list.element.querySelector('.jpk-field-message-text').textContent, 'Already in the list.');
    dom.document.key('Escape');
    assert.equal(list.element.querySelector('.jpk-field-message-text').textContent, '');
    assert.equal(open(), true);
    dom.document.key('Escape');
    assert.equal(open(), false);
});

test('Escape in an open chip select dropdown closes the dropdown only', function () {
    var select = createChipSelect({ options: ['Alpha', 'Beta'] });
    around(select.element, function () { select.element.querySelector('input').focus(); });
    var input = select.element.querySelector('input');
    assert.equal(input.getAttribute('aria-expanded'), 'true');
    dom.document.key('Escape');
    assert.equal(input.getAttribute('aria-expanded'), 'false');
    assert.equal(open(), true);
    dom.document.key('Escape');
    assert.equal(open(), false);
});

test('Escape in an open searchable combo box closes the dropdown only', function () {
    var shared = createShared(dom.el('div'), 'p');
    var combo = shared.createSearchableComboBox({ searchFn: function (q, cb) { cb(['one']); } });
    around(combo.element, function () { combo.element.querySelector('input').focus(); combo.element.querySelector('input').dispatch('input'); });
    var input = combo.element.querySelector('input');
    assert.equal(input.getAttribute('aria-expanded'), 'true');
    dom.document.key('Escape');
    assert.equal(input.getAttribute('aria-expanded'), 'false');
    assert.equal(open(), true);
    dom.document.key('Escape');
    assert.equal(open(), false);
});

test('a focused control that is merely expanded does not stop Escape from closing the dialog', function () {
    var toggle = dom.el('button', { type: 'button', 'aria-expanded': 'true' });
    around(toggle, function () { toggle.focus(); });
    dom.document.key('Escape');
    assert.equal(open(), false);
});

test('a dialog with a title is named by it, and a dialog with no title is named by ariaLabel', function () {
    var titled = openDialog({ title: 'Edit', body: '<p>Body.</p>' });
    var panel = titled.element.querySelector('.jpk-dialog-content');
    assert.equal(panel.getAttribute('aria-labelledby'), titled.element.querySelector('.jpk-modal-title').id);
    assert.equal(panel.hasAttribute('aria-label'), false);
    titled.close();
    var named = openDialog({ ariaLabel: 'Pick a server', body: '<p>Body.</p>' });
    assert.equal(named.element.querySelector('.jpk-dialog-content').getAttribute('aria-label'), 'Pick a server');
    named.close();
});

test('a dialog with no title and no ariaLabel is named by its body text, else Dialog', function () {
    var textual = openDialog({ body: dom.el('p', {}, []) });
    assert.equal(textual.element.querySelector('.jpk-dialog-content').getAttribute('aria-label'), 'Dialog');
    textual.close();
    var p = dom.el('p');
    p.textContent = 'Remove the server from the pool.';
    var withText = openDialog({ body: p });
    assert.equal(withText.element.querySelector('.jpk-dialog-content').getAttribute('aria-label'), 'Remove the server from the pool.');
    withText.close();
});

test('confirmDialog with no title is named by its message, truncated, and with a title by the title', async function () {
    var promise = confirmDialog('Remove this server and every link it holds from the pool right now, with no way to undo that later on?');
    var panel = dom.document.querySelector('.jpk-dialog-content');
    var name = panel.getAttribute('aria-label');
    assert.equal(name.length, 80);
    assert.equal(name.indexOf('Remove this server'), 0);
    assert.equal(panel.getAttribute('role'), 'dialog');
    dom.document.querySelectorAll('.jpk-modal-button')[1].click();
    assert.equal(await promise, true);
    var titled = confirmDialog('Sure?', { title: 'Remove Server' });
    var titledPanel = dom.document.querySelector('.jpk-dialog-content');
    assert.equal(titledPanel.hasAttribute('aria-label'), false);
    assert.ok(titledPanel.getAttribute('aria-labelledby'));
    dom.document.querySelectorAll('.jpk-modal-button')[0].click();
    assert.equal(await titled, false);
});

test('confirmDialog with html strips the tags for its name', function () {
    confirmDialog('<p>Remove <b>this</b> server.</p>', { html: true });
    assert.equal(dom.document.querySelector('.jpk-dialog-content').getAttribute('aria-label'), 'Remove this server.');
});

test('confirmDialog buttons default to Cancel and Confirm, are replaceable, and Escape resolves false', async function () {
    var p = confirmDialog('Sure?');
    var labels = dom.document.querySelectorAll('.jpk-modal-button');
    assert.equal(labels[0].textContent, 'Cancel');
    assert.equal(labels[1].textContent, 'Confirm');
    dom.document.key('Escape');
    assert.equal(await p, false);
    var q = confirmDialog('Sure?', { confirmText: 'Remove', cancelText: 'Keep', destructive: true });
    var custom = dom.document.querySelectorAll('.jpk-modal-button');
    assert.equal(custom[0].textContent, 'Keep');
    assert.equal(custom[1].textContent, 'Remove');
    assert.ok(custom[1].classList.contains('jpk-button-destructive'));
    custom[1].click();
    assert.equal(await q, true);
});
