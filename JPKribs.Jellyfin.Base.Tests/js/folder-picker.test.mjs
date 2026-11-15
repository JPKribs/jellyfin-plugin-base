// Behavior tests for createFolderPicker, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, all, shown } from './fake-dom.mjs';

var dom = installFakeDom();
var { createFolderPicker } = await import('../../src/js/index.js');

var TREE = {
    '': [{ Name: '/', Path: '/', Type: 'Directory' }],
    '/': [{ Name: 'media', Path: '/media', Type: 'Directory' }, { Name: 'notes.txt', Path: '/notes.txt', Type: 'File' }],
    '/media': [{ Name: 'movies', Path: '/media/movies', Type: 'Directory' }, { Name: 'nas', Path: '//nas', Type: 'NetworkComputer' }],
    '/media/movies': []
};

beforeEach(function () {
    dom = installFakeDom();
});

afterEach(function () {
    delete globalThis.ApiClient;
});

function flush() { return new Promise(function (resolve) { setImmediate(resolve); }); }

function build(extra) {
    var changes = [];
    var calls = [];
    var picker = createFolderPicker(Object.assign({
        listFolders: function (path, includeFiles) {
            calls.push([path, includeFiles]);
            return Object.prototype.hasOwnProperty.call(TREE, path) ? Promise.resolve(TREE[path]) : Promise.reject(new Error('missing'));
        },
        onChange: function (v) { changes.push(v); }
    }, extra));
    dom.document.body.appendChild(picker.element);
    return { picker: picker, changes: changes, calls: calls, browse: picker.element.querySelector('.base-folder-picker-browse') };
}

function dialog() { return dom.document.querySelector('.base-dialog'); }
function names() { return all(dialog(), '.base-folder-picker-name').map(function (n) { return n.textContent; }); }
function entry(text) { return all(dialog(), '.base-folder-picker-entry').filter(function (b) { return b.textContent.indexOf(text) !== -1 && b.querySelector('.base-folder-picker-name').textContent === text; })[0]; }
function pathField() { return dialog().querySelector('.base-folder-picker-path'); }
function selectButton() { return dialog().querySelector('.base-folder-picker-select'); }
function button(text) { return all(dialog(), '.base-modal-button').filter(function (b) { return b.textContent === text; })[0]; }

test('the field has the default labels, and label, placeholder, and description wire to the input', function () {
    var plain = build();
    assert.equal(plain.browse.textContent, 'Browse');
    assert.equal(plain.picker.input.getAttribute('aria-label'), 'Path');
    assert.equal(plain.picker.element.querySelector('.base-folder-picker-label'), null);
    var ui = build({ label: 'Media Folder', placeholder: '/media/movies', description: 'Where the files live.', value: '/media' });
    var label = ui.picker.element.querySelector('.base-folder-picker-label');
    assert.equal(label.textContent, 'Media Folder');
    assert.equal(label.getAttribute('for'), ui.picker.input.id);
    assert.equal(ui.picker.input.hasAttribute('aria-label'), false);
    assert.equal(ui.picker.input.getAttribute('placeholder'), '/media/movies');
    var description = ui.picker.element.querySelector('.base-folder-picker-description');
    assert.equal(description.textContent, 'Where the files live.');
    assert.equal(ui.picker.input.getAttribute('aria-describedby'), description.id);
    assert.equal(ui.picker.getValue(), '/media');
});

test('Browse with an empty field opens the dialog at the top level with the default title and buttons', async function () {
    var ui = build();
    ui.browse.click();
    assert.ok(dialog());
    assert.equal(dialog().querySelector('.base-modal-title').textContent, 'Select a Folder');
    assert.ok(button('Cancel'));
    assert.equal(selectButton().textContent, 'Select');
    var loading = dialog().querySelector('.base-folder-picker-list .base-list-loading');
    assert.equal(loading.tagName, 'LI');
    assert.equal(loading.getAttribute('role'), 'status');
    assert.equal(loading.textContent, 'Loading');
    assert.equal(dialog().querySelector('.base-folder-picker-empty').hidden, true);
    await flush();
    assert.deepEqual(ui.calls[0], ['', false]);
    assert.equal(dialog().querySelector('.base-list-loading'), null);
    assert.deepEqual(names(), ['/']);
    assert.equal(dialog().querySelector('.base-folder-picker-up'), null);
    assert.equal(entry('/').querySelector('.material-icons').textContent, 'storage');
    assert.equal(selectButton().disabled, true);
});

test('opening a folder lists its subfolders below an up row, hides files, and moves focus to the first row', async function () {
    var ui = build();
    ui.picker.browse();
    await flush();
    entry('/').click();
    assert.equal(pathField().value, '/');
    await flush();
    assert.deepEqual(names(), ['Go Up', 'media']);
    assert.equal(dom.document.activeElement, dialog().querySelector('.base-folder-picker-up'));
    entry('media').click();
    await flush();
    assert.deepEqual(names(), ['Go Up', 'movies', 'nas']);
    assert.equal(entry('movies').querySelector('.material-icons').textContent, 'folder');
    assert.equal(entry('nas').querySelector('.material-icons').textContent, 'computer');
    assert.equal(pathField().value, '/media');
    assert.equal(selectButton().disabled, false);
});

test('the up row goes to the parent from the path text when only listFolders is given', async function () {
    var ui = build({ value: '/media/movies' });
    ui.browse.click();
    await flush();
    assert.equal(pathField().value, '/media/movies');
    dialog().querySelector('.base-folder-picker-up').click();
    await flush();
    await flush();
    assert.equal(pathField().value, '/media');
    dialog().querySelector('.base-folder-picker-up').click();
    await flush();
    await flush();
    assert.equal(pathField().value, '/');
    dialog().querySelector('.base-folder-picker-up').click();
    await flush();
    await flush();
    assert.equal(pathField().value, '');
    assert.deepEqual(names(), ['/']);
});

test('a parentPath option answers the up row, and null means the top level', async function () {
    var asked = [];
    var ui = build({ value: '/media', parentPath: function (p) { asked.push(p); return null; } });
    ui.browse.click();
    await flush();
    dialog().querySelector('.base-folder-picker-up').click();
    await flush();
    await flush();
    assert.deepEqual(asked, ['/media']);
    assert.equal(pathField().value, '');
});

test('an empty folder shows the empty text, and emptyText replaces it', async function () {
    var ui = build({ value: '/media/movies' });
    ui.browse.click();
    await flush();
    var empty = dialog().querySelector('.base-folder-picker-empty');
    assert.equal(empty.hidden, false);
    assert.equal(empty.textContent, 'This folder is empty.');
    assert.ok(empty.classList.contains('base-list-empty') && empty.classList.contains('outside'));
    var parts = Array.prototype.slice.call(empty.parentNode.children);
    assert.equal(parts[parts.indexOf(empty) - 1], dialog().querySelector('.base-folder-picker-list'));
    dialog().querySelector('.base-dialog-close').click();
    var custom = build({ value: '/media/movies', emptyText: 'Nothing here.' });
    custom.browse.click();
    await flush();
    assert.equal(dialog().querySelector('.base-folder-picker-empty').textContent, 'Nothing here.');
});

test('a folder that cannot be read shows the error under the list and keeps the up row', async function () {
    var ui = build({ value: '/gone' });
    ui.browse.click();
    await flush();
    var message = dialog().querySelector('.base-field-message');
    assert.equal(shown(message), true);
    assert.equal(message.textContent.indexOf('Could not read this folder.') !== -1, true);
    assert.equal(message.classList.contains('error'), true);
    assert.equal(pathField().getAttribute('aria-invalid'), 'true');
    assert.equal(dialog().querySelector('.base-folder-picker-empty').hidden, true);
    assert.deepEqual(names(), ['Go Up']);
    dialog().querySelector('.base-folder-picker-up').click();
    await flush();
    await flush();
    assert.equal(shown(dialog().querySelector('.base-field-message')), false);
});

test('a listFolders that throws shows the error, and errorText replaces it', async function () {
    var ui = build({ listFolders: function () { throw new Error('boom'); }, errorText: 'No access.' });
    ui.browse.click();
    await flush();
    assert.equal(dialog().querySelector('.base-field-message-text').textContent, 'No access.');
});

test('Enter in the path field opens the typed path and keeps focus there', async function () {
    var ui = build();
    ui.browse.click();
    await flush();
    pathField().focus();
    pathField().value = '/media';
    pathField().dispatch('input');
    var e = dom.document.key('Enter');
    assert.equal(e.defaultPrevented, true);
    await flush();
    assert.deepEqual(names(), ['Go Up', 'movies', 'nas']);
    assert.equal(dom.document.activeElement, pathField());
});

test('Select writes the path to the field, calls onChange, closes, and returns focus to Browse', async function () {
    var ui = build();
    ui.browse.focus();
    ui.browse.click();
    await flush();
    entry('/').click();
    await flush();
    entry('media').click();
    await flush();
    selectButton().click();
    assert.equal(dialog(), null);
    assert.equal(ui.picker.getValue(), '/media');
    assert.deepEqual(ui.changes, ['/media']);
    assert.equal(dom.document.activeElement, ui.browse);
});

test('Select with an unchanged path closes without onChange', async function () {
    var ui = build({ value: '/media' });
    ui.browse.click();
    await flush();
    selectButton().click();
    assert.equal(dialog(), null);
    assert.deepEqual(ui.changes, []);
});

test('Escape and Cancel close without changing the field and return focus to Browse', async function () {
    var ui = build({ value: '/media' });
    ui.browse.focus();
    ui.browse.click();
    await flush();
    entry('movies').click();
    await flush();
    dom.document.key('Escape');
    assert.equal(dialog(), null);
    assert.equal(ui.picker.getValue(), '/media');
    assert.equal(dom.document.activeElement, ui.browse);
    ui.browse.click();
    await flush();
    button('Cancel').click();
    assert.equal(dialog(), null);
    assert.equal(dom.document.activeElement, ui.browse);
    assert.deepEqual(ui.changes, []);
});

test('includeFiles lists files, and picking one fills the path for Select', async function () {
    var ui = build({ includeFiles: true, value: '/' });
    ui.browse.click();
    await flush();
    assert.deepEqual(ui.calls[0], ['/', true]);
    assert.deepEqual(names(), ['Go Up', 'media', 'notes.txt']);
    var file = entry('notes.txt');
    assert.equal(file.querySelector('.material-icons').textContent, 'insert_drive_file');
    assert.equal(file.getAttribute('aria-pressed'), 'false');
    file.click();
    assert.equal(file.classList.contains('selected'), true);
    assert.equal(file.getAttribute('aria-pressed'), 'true');
    assert.equal(pathField().value, '/notes.txt');
    selectButton().click();
    assert.equal(ui.picker.getValue(), '/notes.txt');
});

test('picking a file marks it alone as pressed, and picking it again after an edit fills the path again', async function () {
    var ui = build({ includeFiles: true, value: '/docs', listFolders: function () { return Promise.resolve([{ Name: 'a.txt', Path: '/docs/a.txt', Type: 'File' }, { Name: 'b.txt', Path: '/docs/b.txt', Type: 'File' }]); } });
    ui.browse.click();
    await flush();
    entry('a.txt').click();
    entry('b.txt').click();
    assert.equal(entry('a.txt').getAttribute('aria-pressed'), 'false');
    assert.equal(entry('a.txt').classList.contains('selected'), false);
    assert.equal(entry('b.txt').getAttribute('aria-pressed'), 'true');
    assert.equal(pathField().value, '/docs/b.txt');
    pathField().value = '/docs/other';
    entry('b.txt').click();
    assert.equal(pathField().value, '/docs/b.txt');
    assert.equal(entry('b.txt').getAttribute('aria-pressed'), 'true');
});

test('a late answer for a folder the user already left is ignored', async function () {
    var pending = {};
    var ui = build({ listFolders: function (path) { return new Promise(function (resolve) { pending[path] = resolve; }); } });
    ui.browse.click();
    pathField().value = '/a';
    dom.document.key('Enter');
    pathField().focus();
    dom.document.key('Enter');
    pending['/a']([{ Name: 'b', Path: '/a/b', Type: 'Directory' }]);
    await flush();
    pending['']([{ Name: 'late', Path: '/late', Type: 'Directory' }]);
    await flush();
    assert.deepEqual(names(), ['Go Up', 'b']);
});

test('every dialog label can be replaced', async function () {
    var ui = build({ value: '/media', browseText: 'Find', title: 'Pick a Folder', selectText: 'Use', cancelText: 'Back', upText: 'Parent Folder', pathLabel: 'Folder Path', loadingText: 'Reading' });
    assert.equal(ui.browse.textContent, 'Find');
    assert.equal(ui.picker.input.getAttribute('aria-label'), 'Folder Path');
    ui.browse.click();
    assert.equal(dialog().querySelector('.base-modal-title').textContent, 'Pick a Folder');
    assert.equal(dialog().querySelector('.base-list-loading').textContent, 'Reading');
    assert.equal(pathField().getAttribute('aria-label'), 'Folder Path');
    assert.equal(selectButton().textContent, 'Use');
    assert.ok(button('Back'));
    await flush();
    assert.equal(names()[0], 'Parent Folder');
});

test('typing in the field calls onChange, and setValue does not', function () {
    var ui = build();
    ui.picker.input.value = '/srv';
    ui.picker.input.dispatch('input');
    assert.deepEqual(ui.changes, ['/srv']);
    ui.picker.setValue('/other');
    assert.equal(ui.picker.getValue(), '/other');
    ui.picker.setValue(null);
    assert.equal(ui.picker.getValue(), '');
    assert.deepEqual(ui.changes, ['/srv']);
});

test('without listFolders it reads the Jellyfin Environment routes through ApiClient', async function () {
    var urls = [];
    globalThis.ApiClient = {
        getUrl: function (path, params) { return path + (params ? '?' + Object.keys(params).map(function (k) { return k + '=' + params[k]; }).join('&') : ''); },
        getJSON: function (url) {
            urls.push(url);
            if (url === 'Environment/Drives') return Promise.resolve([{ Name: 'C:\\', Path: 'C:\\', Type: 'Directory' }]);
            return Promise.resolve([{ Name: 'Media', Path: 'C:\\Media', Type: 'Directory' }]);
        },
        fetch: function (opts) { urls.push(opts.url + ' ' + opts.dataType); return Promise.resolve('"C:\\\\"'); }
    };
    var picker = createFolderPicker({ includeFiles: true });
    dom.document.body.appendChild(picker.element);
    picker.browse();
    await flush();
    assert.deepEqual(urls, ['Environment/Drives']);
    entry('C:\\').click();
    await flush();
    assert.equal(urls[1], 'Environment/DirectoryContents?path=C:\\&includeDirectories=true&includeFiles=true');
    entry('Media').click();
    await flush();
    dialog().querySelector('.base-folder-picker-up').click();
    await flush();
    await flush();
    assert.equal(urls[3], 'Environment/ParentPath?path=C:\\Media text');
    assert.equal(pathField().value, 'C:\\');
});

test('without listFolders or ApiClient the dialog shows the error', async function () {
    var picker = createFolderPicker();
    dom.document.body.appendChild(picker.element);
    picker.browse();
    await flush();
    assert.equal(dialog().querySelector('.base-field-message-text').textContent, 'Could not read this folder.');
});

test('the parent from the path text handles Windows drives and network paths', async function () {
    var ui = build({ value: 'C:\\Media\\Movies', listFolders: function () { return []; } });
    ui.browse.click();
    await flush();
    dialog().querySelector('.base-folder-picker-up').click();
    await flush(); await flush();
    assert.equal(pathField().value, 'C:\\Media');
    dialog().querySelector('.base-folder-picker-up').click();
    await flush(); await flush();
    assert.equal(pathField().value, 'C:\\');
    dialog().querySelector('.base-folder-picker-up').click();
    await flush(); await flush();
    assert.equal(pathField().value, '');
});

test('browse twice opens one dialog', async function () {
    var ui = build();
    ui.picker.browse();
    ui.picker.browse();
    assert.equal(dom.document.querySelectorAll('.base-dialog').length, 1);
});

test('destroy removes the listeners and closes an open dialog', async function () {
    var ui = build();
    ui.browse.click();
    await flush();
    var path = pathField();
    ui.picker.destroy();
    assert.equal(dialog(), null);
    assert.equal(ui.browse.listeners.click.length, 0);
    assert.equal(ui.picker.input.listeners.input.length, 0);
    assert.equal((path.listeners.keydown || []).length, 0);
    assert.equal((dom.document.listeners.keydown || []).length, 0);
});

test('the dialog list keeps its ul and li rows, and caps at 50vh by default as the stylesheet did', async function () {
    var ui = build();
    ui.browse.click();
    await flush();
    entry('/').click();
    await flush();
    var list = dialog().querySelector('.base-folder-picker-list');
    assert.equal(list.tagName, 'UL');
    assert.equal(list.hasAttribute('role'), false);
    var items = list.children;
    assert.ok(items.length === 2 && items.every(function (li) { return li.tagName === 'LI' && !li.hasAttribute('role'); }));
    assert.ok(items[0].querySelector('.base-folder-picker-up'));
    assert.ok(list.classList.contains('capped'));
    assert.ok(list.classList.contains('scrolls'));
    assert.equal(list.style['--base-list-max'], '50vh');
});

test('height and maxHeight size the dialog list, and setHeight reaches an open one', async function () {
    var ui = build({ height: 240, maxHeight: null });
    ui.browse.click();
    await flush();
    var list = dialog().querySelector('.base-folder-picker-list');
    assert.ok(list.classList.contains('fixed'));
    assert.equal(list.style['--base-list-height'], '240px');
    assert.equal(list.classList.contains('capped'), false);
    ui.picker.setHeight('auto', 300);
    assert.equal(list.classList.contains('fixed'), false);
    assert.equal(list.style['--base-list-max'], '300px');
    button('Cancel').click();
    ui.browse.click();
    await flush();
    assert.equal(dialog().querySelector('.base-folder-picker-list').style['--base-list-max'], '300px');
});

test('createFolderPicker puts size small or large on data-base-size, and leaves it off for medium or no size', function () {
    function build(size) { return createFolderPicker({ size: size }); }
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
