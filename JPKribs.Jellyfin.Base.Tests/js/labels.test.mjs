// Tests for the default labels that a caller can replace, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, all } from './fake-dom.mjs';

var dom = installFakeDom();
var { openEditorDialog, promptDialog, createCheckboxList, createUserMultiSelector, createSearchField, createPagination, createTranslations, createStringList, createNotifyPreview } = await import('../../src/js/index.js');
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

var { createDataTable, createMatrixGrid, createMappingTable, createRepeater } = await import('../../src/js/index.js');
var { fillLabel, labelText } = await import('../../src/js/lib/base-text.js');
var { nounOf } = await import('../../src/js/lib/field-control.js');
var { validateValue, readRules } = await import('../../src/js/lib/validate.js');

function allChoice(filterLabel, extra) {
    var table = createDataTable(Object.assign({ columns: [{ key: 'name', label: 'Name' }], rows: [{ id: 1, name: 'a', kind: 'x' }],
        filters: [{ name: 'kind', label: filterLabel, field: 'kind', options: [{ value: 'x', label: 'X' }] }] }, extra));
    return table.element.querySelector('.base-filtered-select').options[0].textContent;
}

test('the All choice of a filter reads in sentence case, keeping casing list words and acronyms', function () {
    assert.equal(allChoice('Runs'), 'All runs');
    assert.equal(allChoice('Countries'), 'All countries');
    assert.equal(allChoice('DNS Records'), 'All DNS records');
    assert.equal(allChoice('Jellyfin Servers'), 'All Jellyfin servers');
    assert.equal(allChoice('iPhone Models'), 'All iPhone models');
});

test('the All choice keeps a word from the page casing list, and allText keeps its own words', function () {
    setCurrentTranslations(createTranslations({}, 'en-us', ['Plex']));
    assert.equal(allChoice('Plex Servers'), 'All Plex servers');
    assert.equal(allChoice('Run Types', { allText: 'Every' }), 'Every run types');
    assert.equal(allChoice('Run Types', { allText: 'Show All' }), 'Show All run types');
});

test('a label filled into text in another language stays as written', function () {
    setCurrentTranslations(createTranslations({ 'Base.AllOf': 'Alle {value}', 'Base.ResizeValue': '{value} anpassen' }, 'de'));
    assert.equal(allChoice('Läufe'), 'Alle Läufe');
    var table = createDataTable({ columns: [{ key: 'name', label: 'Letzte Synchronisierung' }], rows: [], widthKey: '' });
    assert.equal(table.element.querySelector('.base-data-resize').getAttribute('aria-label'), 'Letzte Synchronisierung anpassen');
});

test('a resize handle and a Clear button name their label in sentence case', function () {
    var table = createDataTable({ columns: [{ key: 'last', label: 'Last Sync' }, { key: 'dns', label: 'DNS Name' }], rows: [] });
    assert.deepEqual(all(table.element, '.base-data-resize').map(function (h) { return h.getAttribute('aria-label'); }), ['Resize last sync', 'Resize DNS name']);
    var repeater = createRepeater({ fields: [{ key: 'key', label: 'API Key', type: 'secret', clearable: true }], value: [{ key: '__kept__' }] });
    dom.document.body.appendChild(repeater.element);
    var clear = repeater.element.querySelector('.base-control-clear');
    assert.equal(clear.getAttribute('aria-label'), 'Clear API key');
});

test('a cell named by its column and row writes the column in sentence case and keeps the row as written', function () {
    var grid = createMatrixGrid({ rows: [{ key: 'm', label: 'My Movies' }], columns: [{ key: 'dl', label: 'Can Download' }] });
    assert.equal(grid.element.querySelector('.base-data-row input[type="checkbox"]').getAttribute('aria-label'), 'Can download for My Movies');
    var custom = createMatrixGrid({ rows: [{ key: 'm', label: 'My Movies' }], columns: [{ key: 'dl', label: 'Can Download' }], cellLabel: 'Allow {column} in {row}' });
    assert.equal(custom.element.querySelector('.base-data-row input[type="checkbox"]').getAttribute('aria-label'), 'Allow can download in My Movies');
    var mapping = createMappingTable({ rows: [{ value: 'a', label: 'Home Videos' }], targets: [{ value: 't', label: 'T' }], fields: [{ key: 'path', label: 'Local Path' }] });
    assert.equal(mapping.element.querySelector('.base-field-cell[data-key="path"] input').getAttribute('aria-label'), 'Local path for Home Videos');
});

test('a validation message names a field label in sentence case inside the sentence', function () {
    assert.equal(nounOf('Server URL'), 'server URL');
    assert.equal(nounOf('Jellyfin Server Address'), 'Jellyfin server address');
    var label = dom.el('label', { for: 'w' });
    label.textContent = 'Worker Count';
    dom.document.body.appendChild(label);
    var input = dom.el('input', { id: 'w', required: '' });
    dom.document.body.appendChild(input);
    assert.equal(validateValue('', readRules(input), { noun: true }, input), 'Enter a worker count.');
    setCurrentTranslations(createTranslations({}, 'de'));
    assert.equal(nounOf('Server URL'), 'Server URL');
});

test('fillLabel cases a label for its place and keeps the other placeholders', function () {
    assert.equal(fillLabel('All {value}', 'value', 'Run Types'), 'All run types');
    assert.equal(fillLabel('{value} filters on', 'value', 'Run Types'), 'Run types filters on');
    assert.equal(fillLabel('{column} for {row}', 'column', 'Last Sync'), 'Last sync for {row}');
    assert.equal(fillLabel('Done. {value} next', 'value', 'Run Types'), 'Done. Run types next');
    assert.equal(fillLabel('No label here', 'value', 'X'), 'No label here');
    assert.equal(labelText(null), '');
    assert.equal(labelText('TV Shows', true), 'TV shows');
});

test('createNotifyPreview names the stored address "Saved address" and the Discord name "Jellyfin" by default, and takes addressText and username', function () {
    var hook = { Channel: 'Webhook', ContentType: 'application/json', Body: '{}' };
    assert.equal(createNotifyPreview({ preview: hook }).element.querySelector('.base-notify-preview-address').textContent, 'Saved address');
    assert.equal(createNotifyPreview({ preview: hook, addressText: 'Home Assistant' }).element.querySelector('.base-notify-preview-address').textContent, 'Home Assistant');
    var post = { Channel: 'Discord', Body: '{"embeds":[]}' };
    assert.match(createNotifyPreview({ preview: post }).element.children[0].innerHTML, /discord-name">Jellyfin</);
    assert.match(createNotifyPreview({ preview: post, username: 'Media bot' }).element.children[0].innerHTML, /discord-name">Media bot</);
});
