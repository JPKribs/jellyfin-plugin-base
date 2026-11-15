// Behavior tests for createMediaPicker, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, all } from './fake-dom.mjs';

var dom = installFakeDom();
var { createMediaPicker } = await import('../../src/js/index.js');

beforeEach(function () {
    dom = installFakeDom();
});

afterEach(function () {
    delete globalThis.ApiClient;
});

var LIBRARY = [
    { Id: 'm1', Name: 'Alpha Movie', Type: 'Movie', ProductionYear: 2010, ImageTags: { Primary: 't1' } },
    { Id: 's1', Name: 'Alpha Series', Type: 'Series', ProductionYear: 2015, ImageTags: {} },
    { Id: 'e1', Name: 'Alpha Episode', Type: 'Episode' },
    { Id: 'm2', Name: 'Beta Movie', Type: 'Movie', ProductionYear: 2020 }
];

function tick() { return new Promise(function (r) { setTimeout(r, 0); }); }

function libraryFn(calls) {
    return function (query) {
        if (calls) calls.push(query);
        return Promise.resolve(LIBRARY.filter(function (i) { return i.Name.toLowerCase().indexOf(query.toLowerCase()) !== -1; }));
    };
}

function build(extra) {
    var changes = [];
    var picker = createMediaPicker(Object.assign({ delay: 0, searchFn: libraryFn(), onChange: function (items) { changes.push(items); } }, extra));
    dom.document.body.appendChild(picker.element);
    var ui = {
        picker: picker,
        changes: changes,
        input: picker.input,
        dropdown: picker.element.querySelector('.base-combo-dropdown'),
        list: picker.element.querySelector('.base-media-picker-items'),
        empty: picker.element.querySelector('.base-media-picker-empty'),
        message: picker.element.querySelector('.base-media-picker-message')
    };
    return ui;
}

async function type(ui, text) {
    ui.input.value = text;
    ui.input.dispatch('input');
    await tick();
    await tick();
}

function options(ui) { return all(ui.dropdown, '.base-combo-option'); }
function names(root) { return all(root, '.base-media-card-name').map(function (n) { return n.textContent; }); }
function open(ui) { return ui.input.getAttribute('aria-expanded') === 'true'; }

test('the defaults show the empty sentence, the placeholder, and a combobox with no label', function () {
    var ui = build();
    assert.equal(ui.empty.textContent, 'No items selected.');
    assert.equal(ui.empty.hidden, false);
    assert.equal(ui.list.hidden, true);
    assert.equal(ui.input.getAttribute('placeholder'), 'Search the library');
    assert.equal(ui.input.getAttribute('aria-label'), 'Search the library');
    assert.equal(ui.input.getAttribute('role'), 'combobox');
    assert.equal(ui.input.getAttribute('aria-controls'), ui.dropdown.id);
    assert.equal(ui.dropdown.getAttribute('role'), 'listbox');
    assert.equal(ui.picker.element.querySelector('label'), null);
    assert.equal(ui.picker.element.querySelector('.fieldDescription'), null);
    assert.equal(ui.picker.element.querySelector('.base-search-clear').getAttribute('aria-label'), 'Clear');
    assert.deepEqual(ui.picker.getValue(), []);
});

test('label and description name and describe the input', function () {
    var ui = build({ label: 'Excluded Titles', description: 'These titles never sync.', placeholder: 'Inception', clearLabel: 'Erase' });
    var label = ui.picker.element.querySelector('label.inputLabel');
    assert.equal(label.textContent, 'Excluded Titles');
    assert.equal(label.getAttribute('for'), ui.input.id);
    var desc = ui.picker.element.querySelector('.fieldDescription');
    assert.equal(desc.textContent, 'These titles never sync.');
    assert.equal(ui.input.getAttribute('aria-describedby'), desc.id);
    assert.equal(ui.input.getAttribute('aria-label'), 'Excluded Titles');
    assert.equal(ui.input.getAttribute('placeholder'), 'Inception');
    assert.equal(ui.picker.element.querySelector('.base-search-clear').getAttribute('aria-label'), 'Erase');
});

test('value draws a media row per item with a Remove button, and drops repeats', function () {
    var ui = build({ value: [LIBRARY[0], LIBRARY[2], LIBRARY[0]] });
    assert.deepEqual(names(ui.list), ['Alpha Movie', 'Alpha Episode']);
    assert.equal(ui.list.hidden, false);
    assert.equal(ui.empty.hidden, true);
    var rows = all(ui.list, '.base-media-card');
    assert.ok(rows[0].classList.contains('base-media-card-row'));
    assert.ok(rows[0].querySelector('.base-media-card-thumb').classList.contains('portrait'));
    assert.ok(rows[1].querySelector('.base-media-card-thumb').classList.contains('wide'));
    assert.equal(rows[0].querySelector('.base-media-card-suffix').textContent, '2010');
    assert.equal(rows[0].querySelector('.base-media-card-subtitle').textContent, 'Movie');
    assert.equal(rows[0].querySelector('.base-media-card-action').getAttribute('aria-label'), 'Remove Alpha Movie');
    assert.deepEqual(ui.picker.getValue()[0], { Id: 'm1', Name: 'Alpha Movie', Type: 'Movie', ProductionYear: 2010, ImageTags: { Primary: 't1' } });
});

test('removeText and typeLabels replace the default labels', function () {
    var ui = build({ value: [LIBRARY[0], { Id: 'b1', Name: 'Set', Type: 'BoxSet' }, { Id: 'x', Name: 'Odd', Type: 'Custom' }], removeText: 'Drop {value}', typeLabels: { Movie: 'Film' } });
    var rows = all(ui.list, '.base-media-card');
    assert.equal(rows[0].querySelector('.base-media-card-action').getAttribute('aria-label'), 'Drop Alpha Movie');
    assert.equal(rows[0].querySelector('.base-media-card-subtitle').textContent, 'Film');
    assert.equal(rows[1].querySelector('.base-media-card-subtitle').textContent, 'Collection');
    assert.equal(rows[2].querySelector('.base-media-card-subtitle').textContent, 'Custom');
});

test('the artwork comes from ApiClient.getImageUrl unless ImageTags has no Primary tag', function () {
    globalThis.ApiClient = { getImageUrl: function (id) { return 'img/' + id; } };
    var ui = build({ value: [LIBRARY[0], LIBRARY[1], LIBRARY[3]] });
    var rows = all(ui.list, '.base-media-card');
    assert.equal(rows[0].querySelector('img').getAttribute('src'), 'img/m1');
    assert.equal(rows[1].querySelector('img'), null);
    assert.equal(rows[2].querySelector('img').getAttribute('src'), 'img/m2');
});

test('typing fewer than minChars does not search', async function () {
    var calls = [];
    var ui = build({ searchFn: libraryFn(calls) });
    await type(ui, 'a');
    assert.equal(calls.length, 0);
    assert.equal(open(ui), false);
    var lower = build({ searchFn: libraryFn(calls), minChars: 1 });
    await type(lower, 'a');
    assert.deepEqual(calls, ['a']);
});

test('typing searches and opens the listbox with a media row per result', async function () {
    var ui = build();
    await type(ui, 'alpha');
    var opts = options(ui);
    assert.equal(opts.length, 3);
    assert.equal(open(ui), true);
    assert.equal(ui.dropdown.classList.contains('hidden'), false);
    opts.forEach(function (o) { assert.equal(o.getAttribute('role'), 'option'); assert.ok(o.id); });
    assert.deepEqual(names(ui.dropdown), ['Alpha Movie', 'Alpha Series', 'Alpha Episode']);
    assert.equal(opts[0].querySelector('.base-media-card-action'), null);
});

test('maxResults caps the results and picked items are not offered', async function () {
    var ui = build({ maxResults: 2, value: [LIBRARY[0]] });
    await type(ui, 'alpha');
    assert.deepEqual(names(ui.dropdown), ['Alpha Series', 'Alpha Episode']);
});

test('the arrow keys move the active option and Enter picks it, clears the input, and closes', async function () {
    var ui = build();
    await type(ui, 'alpha');
    var opts = options(ui);
    ui.input.dispatch('keydown', { key: 'ArrowDown' });
    assert.equal(ui.input.getAttribute('aria-activedescendant'), opts[0].id);
    ui.input.dispatch('keydown', { key: 'ArrowDown' });
    ui.input.dispatch('keydown', { key: 'ArrowUp' });
    ui.input.dispatch('keydown', { key: 'ArrowUp' });
    assert.equal(ui.input.getAttribute('aria-activedescendant'), opts[2].id);
    var e = ui.input.dispatch('keydown', { key: 'Enter' });
    assert.equal(e.defaultPrevented, true);
    assert.deepEqual(ui.picker.getValue().map(function (i) { return i.Id; }), ['e1']);
    assert.equal(ui.changes.length, 1);
    assert.equal(ui.changes[0][0].Name, 'Alpha Episode');
    assert.equal(ui.input.value, '');
    assert.equal(open(ui), false);
    assert.equal(ui.input.hasAttribute('aria-activedescendant'), false);
});

test('Enter with no active option picks nothing', async function () {
    var ui = build();
    await type(ui, 'alpha');
    ui.input.dispatch('keydown', { key: 'Enter' });
    assert.deepEqual(ui.picker.getValue(), []);
});

test('a mousedown on a result picks it and keeps focus in the input', async function () {
    var ui = build();
    ui.input.focus();
    await type(ui, 'beta');
    var e = options(ui)[0].dispatch('mousedown');
    assert.equal(e.defaultPrevented, true);
    assert.deepEqual(names(ui.list), ['Beta Movie']);
    assert.equal(dom.document.activeElement, ui.input);
});

test('single keeps one item and replaces it on the next pick', async function () {
    var ui = build({ single: true, value: [LIBRARY[0], LIBRARY[3]] });
    assert.deepEqual(names(ui.list), ['Alpha Movie']);
    await type(ui, 'beta');
    options(ui)[0].dispatch('mousedown');
    assert.deepEqual(names(ui.list), ['Beta Movie']);
    assert.equal(ui.changes[0].length, 1);
});

test('Escape closes the results and keeps the text, and the next Escape clears it', async function () {
    var ui = build();
    await type(ui, 'alpha');
    ui.input.dispatch('keydown', { key: 'ArrowDown' });
    var first = ui.input.dispatch('keydown', { key: 'Escape' });
    assert.equal(first.defaultPrevented, true);
    assert.equal(open(ui), false);
    assert.ok(ui.dropdown.classList.contains('hidden'));
    assert.equal(ui.input.hasAttribute('aria-activedescendant'), false);
    assert.equal(ui.input.value, 'alpha');
    assert.equal(ui.input.getAttribute('data-base-escape'), 'true');
    ui.input.dispatch('keydown', { key: 'Escape' });
    assert.equal(ui.input.value, '');
});

test('a click outside closes the results and a click inside does not', async function () {
    var ui = build();
    await type(ui, 'alpha');
    ui.input.dispatch('click');
    assert.equal(open(ui), true);
    var outside = dom.document.createElement('div');
    dom.document.body.appendChild(outside);
    outside.dispatch('click');
    assert.equal(open(ui), false);
});

test('a search that finds nothing shows noResultsText, and a failed one shows errorText', async function () {
    var ui = build({ searchFn: function () { return Promise.resolve([]); } });
    await type(ui, 'zz');
    assert.equal(open(ui), false);
    assert.equal(ui.message.hidden, false);
    assert.equal(ui.message.textContent, 'No matches.');
    assert.equal(ui.message.getAttribute('role'), 'status');
    await type(ui, '');
    assert.equal(ui.message.hidden, true);

    var failing = build({ searchFn: function () { return Promise.reject(new Error('down')); } });
    await type(failing, 'zz');
    assert.equal(failing.message.textContent, 'Could not search the library.');
    assert.equal(open(failing), false);

    var throwing = build({ searchFn: function () { throw new Error('sync'); }, errorText: 'Search is down.', noResultsText: 'Nothing.' });
    await type(throwing, 'zz');
    assert.equal(throwing.message.textContent, 'Search is down.');

    var nulls = build({ searchFn: function () { return Promise.resolve(null); }, noResultsText: 'Nothing.' });
    await type(nulls, 'zz');
    assert.equal(nulls.message.textContent, 'Nothing.');
});

test('an answer that is not the latest is dropped', async function () {
    var resolvers = {};
    var ui = build({ searchFn: function (q) { return new Promise(function (r) { resolvers[q] = r; }); } });
    await type(ui, 'alp');
    await type(ui, 'bet');
    resolvers.bet([LIBRARY[3]]);
    await tick();
    resolvers.alp([LIBRARY[0]]);
    await tick();
    assert.deepEqual(names(ui.dropdown), ['Beta Movie']);
});

test('an answer that comes after the input blurs does not open the results', async function () {
    var resolve;
    var ui = build({ searchFn: function () { return new Promise(function (r) { resolve = r; }); } });
    await type(ui, 'alp');
    ui.input.dispatch('blur');
    resolve([LIBRARY[0]]);
    await tick();
    assert.equal(open(ui), false);
});

test('the Remove button removes the item, reports it, and moves focus to the next Remove button or the input', function () {
    var ui = build({ value: [LIBRARY[0], LIBRARY[3]] });
    all(ui.list, '.base-media-card-action')[0].click();
    assert.deepEqual(names(ui.list), ['Beta Movie']);
    assert.deepEqual(ui.changes[0].map(function (i) { return i.Id; }), ['m2']);
    assert.equal(dom.document.activeElement, all(ui.list, '.base-media-card-action')[0]);
    all(ui.list, '.base-media-card-action')[0].click();
    assert.deepEqual(ui.picker.getValue(), []);
    assert.equal(ui.empty.hidden, false);
    assert.equal(dom.document.activeElement, ui.input);
});

test('setValue replaces the items without calling onChange, and null clears them', function () {
    var ui = build({ value: [LIBRARY[0]] });
    ui.picker.setValue([LIBRARY[3], { Id: null, Name: 'bad' }]);
    assert.deepEqual(names(ui.list), ['Beta Movie']);
    ui.picker.setValue(null);
    assert.deepEqual(ui.picker.getValue(), []);
    assert.equal(ui.changes.length, 0);
});

test('getValue returns copies the caller cannot change', function () {
    var ui = build({ value: [LIBRARY[0]] });
    ui.picker.getValue()[0].Name = 'changed';
    assert.equal(ui.picker.getValue()[0].Name, 'Alpha Movie');
});

test('the default source asks the Items endpoint through ApiClient and reads Items', async function () {
    var urls = [];
    globalThis.ApiClient = {
        getUrl: function (path, params) { return { path: path, params: params }; },
        getJSON: function (url) { urls.push(url); return Promise.resolve({ Items: [LIBRARY[0]] }); },
        getImageUrl: function (id) { return 'img/' + id; }
    };
    var ui = build({ searchFn: undefined, itemTypes: ['Movie', 'BoxSet'], maxResults: 5 });
    await type(ui, 'alp');
    assert.deepEqual(urls[0], {
        path: 'Items',
        params: { searchTerm: 'alp', IncludeItemTypes: 'Movie,BoxSet', Recursive: true, Limit: 5, Fields: 'ProductionYear,PrimaryImageAspectRatio', EnableImageTypes: 'Primary' }
    });
    assert.deepEqual(names(ui.dropdown), ['Alpha Movie']);
    assert.equal(options(ui)[0].querySelector('img').getAttribute('src'), 'img/m1');
});

test('the default source searches Movie and Series, 20 at most', async function () {
    var seen = null;
    globalThis.ApiClient = {
        getUrl: function (path, params) { seen = params; return path; },
        getJSON: function () { return Promise.resolve({}); }
    };
    var ui = build({ searchFn: undefined });
    await type(ui, 'alp');
    assert.equal(seen.IncludeItemTypes, 'Movie,Series');
    assert.equal(seen.Limit, 20);
    assert.equal(ui.message.textContent, 'No matches.');
});

test('without ApiClient or searchFn a search finds nothing', async function () {
    var ui = build({ searchFn: undefined });
    await type(ui, 'alp');
    assert.equal(open(ui), false);
    assert.equal(ui.message.textContent, 'No matches.');
});

test('destroy removes the document listener and drops a pending answer', async function () {
    var resolve;
    var before = (dom.document.listeners.click || []).length;
    var ui = build({ searchFn: function () { return new Promise(function (r) { resolve = r; }); } });
    assert.equal((dom.document.listeners.click || []).length, before + 1);
    await type(ui, 'alp');
    ui.picker.destroy();
    assert.equal((dom.document.listeners.click || []).length, before);
    resolve([LIBRARY[0]]);
    await tick();
    assert.equal(open(ui), false);
    var keydowns = (ui.input.listeners.keydown || []).length + (ui.picker.element.listeners.keydown || []).length;
    assert.equal(keydowns, 0);
});

test('the picked items are a bordered list of rows, one list item per card', function () {
    var ui = build({ value: [LIBRARY[0], LIBRARY[2]] });
    assert.ok(ui.list.classList.contains('base-list'));
    assert.ok(ui.list.classList.contains('rows'));
    assert.equal(ui.list.getAttribute('role'), 'list');
    var items = ui.list.children;
    assert.equal(items.length, 2);
    assert.ok(items.every(function (item) {
        return item.classList.contains('base-list-item') && item.getAttribute('role') === 'listitem' && item.children[0].classList.contains('base-media-picker-item');
    }));
    assert.equal(ui.list.querySelector('.base-list-empty'), null);
});

test('by default the picked list grows with its items, and height, maxHeight, and setHeight pass to it', function () {
    var plain = build({ value: [LIBRARY[0]] });
    assert.equal(plain.list.classList.contains('scrolls'), false);
    var ui = build({ value: [LIBRARY[0]], maxHeight: 280, minHeight: 90 });
    assert.ok(ui.list.classList.contains('capped'));
    assert.equal(ui.list.style['--base-list-max'], '280px');
    assert.equal(ui.list.style['--base-list-min'], '90px');
    ui.picker.setHeight('fill');
    assert.ok(ui.list.classList.contains('fill'));
    assert.equal(ui.list.classList.contains('capped'), false);
    ui.picker.destroy();
});

test('createMediaPicker puts size small or large on data-base-size, and leaves it off for medium or no size', function () {
    function build(size) { return createMediaPicker({ size: size }); }
    assert.equal(build('small').element.getAttribute('data-base-size'), 'small');
    assert.equal(build('large').element.getAttribute('data-base-size'), 'large');
    assert.equal(build('medium').element.hasAttribute('data-base-size'), false);
    assert.equal(build(undefined).element.hasAttribute('data-base-size'), false);
    var handle = build('small');
    handle.setSize('large');
    assert.equal(handle.element.getAttribute('data-base-size'), 'large');
    handle.setSize('medium');
    assert.equal(handle.element.hasAttribute('data-base-size'), false);
});
