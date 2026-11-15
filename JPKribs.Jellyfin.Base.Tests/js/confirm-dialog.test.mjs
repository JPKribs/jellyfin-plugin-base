// Tests for the typed confirm, a confirm dialog that waits for exact text, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fake-dom.mjs';

var dom = installFakeDom();
var { confirmDialog, typedMatches } = await import('../../src/js/confirm-dialog.js');

beforeEach(function () {
    dom = installFakeDom();
});

afterEach(function () {
    for (var i = 0; i < 5 && dom.document.querySelectorAll('.base-dialog').length; i++) dom.document.key('Escape');
});

function type(input, text) {
    input.value = text;
    input.dispatch('input');
}

function confirmButton() {
    var all = dom.document.querySelectorAll('.base-modal-button');
    return all[all.length - 1];
}

test('typedMatches needs the exact text, case and spaces included', function () {
    assert.equal(typedMatches('Database', 'Database'), true);
    assert.equal(typedMatches('database', 'Database'), false);
    assert.equal(typedMatches('Database ', 'Database'), false);
    assert.equal(typedMatches('', ''), false);
});

test('a typed confirm shows a labelled field and keeps the confirm button off until the text matches', function () {
    confirmDialog('Delete the database?', { title: 'Delete Database', confirmText: 'Delete', destructive: true, typeToConfirm: 'Database' });
    var input = dom.document.querySelector('.base-modal-body input');
    var label = dom.document.querySelector('.base-modal-body label');
    assert.equal(label.textContent, 'Type Database to confirm.');
    assert.equal(label.getAttribute('for'), input.id);
    assert.equal(confirmButton().textContent, 'Delete');
    assert.equal(confirmButton().disabled, true);
    type(input, 'Data');
    assert.equal(confirmButton().disabled, true);
    type(input, 'Database');
    assert.equal(confirmButton().disabled, false);
    type(input, 'Databases');
    assert.equal(confirmButton().disabled, true);
});

test('Enter confirms only once the text matches, and a mismatch shows an error under the field', async function () {
    var result = confirmDialog('Delete?', { typeToConfirm: 'Database' });
    var input = dom.document.querySelector('.base-modal-body input');
    input.focus();
    type(input, 'database');
    dom.document.key('Enter');
    assert.equal(dom.document.querySelectorAll('.base-dialog').length, 1);
    assert.equal(input.getAttribute('aria-invalid'), 'true');
    assert.match(dom.document.querySelector('.base-field-message').textContent, /The text does not match\./);
    type(input, 'Database');
    assert.equal(input.hasAttribute('aria-invalid'), false);
    dom.document.key('Enter');
    assert.equal(dom.document.querySelectorAll('.base-dialog').length, 0);
    assert.equal(await result, true);
});

test('the label and the mismatch text can be replaced, and Cancel resolves false', async function () {
    var result = confirmDialog('Delete?', { typeToConfirm: 'den', typeLabel: 'Enter {value} below.', mismatchText: 'Not the same.' });
    var input = dom.document.querySelector('.base-modal-body input');
    assert.equal(dom.document.querySelector('.base-modal-body label').textContent, 'Enter den below.');
    input.focus();
    type(input, 'x');
    dom.document.key('Enter');
    assert.match(dom.document.querySelector('.base-field-message').textContent, /Not the same\./);
    dom.document.querySelectorAll('.base-modal-button')[0].click();
    assert.equal(await result, false);
});

test('a confirm with no typeToConfirm has no field and its button starts on', async function () {
    var result = confirmDialog('Sure?');
    assert.equal(dom.document.querySelector('.base-modal-body input'), null);
    assert.equal(confirmButton().disabled, false);
    confirmButton().click();
    assert.equal(await result, true);
});
