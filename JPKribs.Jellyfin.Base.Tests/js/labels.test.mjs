// Tests for the default labels that a caller can replace, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, all } from './fake-dom.mjs';

var dom = installFakeDom();
var { openEditorDialog, promptDialog, createCheckboxList, createUserMultiSelector } = await import('../../src/js/index.js');

beforeEach(function () {
    dom = installFakeDom();
});

function buttonTexts() {
    return all(dom.document, '.jpk-modal-button').map(function (b) { return b.textContent; });
}

test('openEditorDialog labels Cancel and Done by default and takes cancelText and doneText', function () {
    var plain = openEditorDialog({ title: 'Edit', isNew: true });
    assert.deepEqual(buttonTexts(), ['Cancel', 'Done']);
    plain.close();

    var custom = openEditorDialog({ title: 'Edit', isNew: true, cancelText: 'Discard', doneText: 'Apply' });
    assert.deepEqual(buttonTexts(), ['Discard', 'Apply']);
    custom.close();
});

test('promptDialog submits with Done by default and submitText overrides it', async function () {
    var first = promptDialog([{ name: 'a', label: 'A' }], { title: 'Name' });
    assert.deepEqual(buttonTexts(), ['Cancel', 'Done']);
    dom.document.querySelectorAll('.jpk-modal-button')[0].click();
    assert.equal(await first, null);

    var second = promptDialog([{ name: 'a', label: 'A' }], { title: 'Name', submitText: 'Create', cancelText: 'Back' });
    assert.deepEqual(buttonTexts(), ['Back', 'Create']);
    dom.document.querySelectorAll('.jpk-modal-button')[0].click();
    await second;
});

test('createCheckboxList labels the select all row and selectAllText replaces it', function () {
    var plain = createCheckboxList({ items: [{ id: 1, name: 'One' }], showSelectAll: true });
    assert.equal(plain.element.querySelector('.jpk-check-selectall .jpk-check-label').textContent, 'Select all');
    var custom = createCheckboxList({ items: [{ id: 1, name: 'One' }], showSelectAll: true, selectAllText: 'Pick everything' });
    assert.equal(custom.element.querySelector('.jpk-check-selectall .jpk-check-label').textContent, 'Pick everything');
});

test('createUserMultiSelector labels the select all row and selectAllText replaces it', function () {
    var fetchUsers = function () { return []; };
    var plain = createUserMultiSelector({ fetchUsers: fetchUsers, showSelectAll: true });
    assert.equal(plain.element.querySelector('.jpk-user-multi-selectall .jpk-user-multi-name').textContent, 'Select all');
    var custom = createUserMultiSelector({ fetchUsers: fetchUsers, showSelectAll: true, selectAllText: 'Everyone' });
    assert.equal(custom.element.querySelector('.jpk-user-multi-selectall .jpk-user-multi-name').textContent, 'Everyone');
});
