// Tests for the default labels that a caller can replace, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, all } from './fake-dom.mjs';

var dom = installFakeDom();
var { openEditorDialog, promptDialog, createCheckboxList, createUserMultiSelector, createSearchField, createPagination, createTranslations, createStringList } = await import('../../src/js/index.js');
var { setCurrentTranslations } = await import('../../src/js/lib/base-text.js');

beforeEach(function () {
    dom = installFakeDom();
    setCurrentTranslations(null);
});

function buttonTexts() {
    return all(dom.document, '.base-modal-button').map(function (b) { return b.textContent; });
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
    dom.document.querySelectorAll('.base-modal-button')[0].click();
    assert.equal(await first, null);

    var second = promptDialog([{ name: 'a', label: 'A' }], { title: 'Name', submitText: 'Create', cancelText: 'Back' });
    assert.deepEqual(buttonTexts(), ['Back', 'Create']);
    dom.document.querySelectorAll('.base-modal-button')[0].click();
    await second;
});

test('createCheckboxList labels the select all row and selectAllText replaces it', function () {
    var plain = createCheckboxList({ items: [{ id: 1, name: 'One' }], showSelectAll: true });
    assert.equal(plain.element.querySelector('.base-check-selectall .base-check-label').textContent, 'Select all');
    var custom = createCheckboxList({ items: [{ id: 1, name: 'One' }], showSelectAll: true, selectAllText: 'Pick everything' });
    assert.equal(custom.element.querySelector('.base-check-selectall .base-check-label').textContent, 'Pick everything');
});

test('createUserMultiSelector labels the select all row and selectAllText replaces it', function () {
    var fetchUsers = function () { return []; };
    var plain = createUserMultiSelector({ fetchUsers: fetchUsers, showSelectAll: true });
    assert.equal(plain.element.querySelector('.base-check-selectall .base-check-label').textContent, 'Select all');
    var custom = createUserMultiSelector({ fetchUsers: fetchUsers, showSelectAll: true, selectAllText: 'Everyone' });
    assert.equal(custom.element.querySelector('.base-check-selectall .base-check-label').textContent, 'Everyone');
});

test('a default label is read from the page\'s current translations when the component is built, and an option still replaces it', function () {
    var before = createSearchField({});
    setCurrentTranslations(createTranslations({ Search: 'Suchen', 'Base.Clear': 'Leeren', 'Base.PageSize': 'Seitengröße' }, 'de'));
    var after = createSearchField({});
    var own = createSearchField({ label: 'Find' });
    assert.equal(before.element.querySelector('input').getAttribute('aria-label'), 'Search');
    assert.equal(after.element.querySelector('input').getAttribute('aria-label'), 'Suchen');
    assert.equal(after.element.querySelector('.base-search-clear').getAttribute('aria-label'), 'Leeren');
    assert.equal(own.element.querySelector('input').getAttribute('aria-label'), 'Find');
    var pager = createPagination({ pageSizes: [10, 20] });
    assert.ok(pager.element.textContent.indexOf('Seitengröße') !== -1);
});

test('a default label with no translation stays in US English, in sentence case', function () {
    setCurrentTranslations(createTranslations({ Search: 'Suchen' }, 'de'));
    var list = createStringList({});
    assert.equal(list.element.querySelector('input').getAttribute('aria-label'), 'New item');
    var dialog = openEditorDialog({ title: 'Edit', isNew: true });
    assert.deepEqual(buttonTexts(), ['Cancel', 'Done']);
    dialog.close();
});

test('a Jellyfin string Base uses reads from the translations, such as Cancel', function () {
    setCurrentTranslations(createTranslations({ ButtonCancel: 'Abbrechen', 'Base.Done': 'Fertig' }, 'de'));
    var dialog = openEditorDialog({ title: 'Edit', isNew: true });
    assert.deepEqual(buttonTexts(), ['Abbrechen', 'Fertig']);
    dialog.close();
});
