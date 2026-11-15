// Behavior tests for createFilePicker, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, all, shown } from './fake-dom.mjs';

var dom = installFakeDom();
var { createFilePicker } = await import('../../src/js/index.js');

beforeEach(function () {
    dom = installFakeDom();
});

function file(name, type, size) {
    var f = new File(['x'], name, { type: type });
    Object.defineProperty(f, 'size', { value: size === undefined ? 10 : size });
    return f;
}

function build(extra) {
    var changes = [];
    var errors = [];
    var picker = createFilePicker(Object.assign({ onChange: function (f) { changes.push(f); }, onError: function (m) { errors.push(m); } }, extra));
    dom.document.body.appendChild(picker.element);
    return { picker: picker, changes: changes, errors: errors, zone: picker.element.querySelector('.jpk-file-zone') };
}

function drop(ui, files) { return ui.zone.dispatch('drop', { dataTransfer: { files: files } }); }
function names(ui) { return all(ui.picker.element, '.jpk-file-name').map(function (n) { return n.textContent; }); }
function messageText(ui) { return ui.picker.element.querySelector('.jpk-field-message-text').textContent; }

test('the zone is a button with the drop text as its label, and the input carries accept and multiple', function () {
    var ui = build({ accept: 'image/*', multiple: true });
    assert.equal(ui.zone.getAttribute('role'), 'button');
    assert.equal(ui.zone.getAttribute('tabindex'), '0');
    assert.equal(ui.zone.getAttribute('aria-label'), 'Drop files here or click to choose.');
    assert.equal(ui.picker.input.getAttribute('accept'), 'image/*');
    assert.equal(ui.picker.input.hasAttribute('multiple'), true);
    assert.equal(build({ dropText: 'Choose a logo.' }).zone.getAttribute('aria-label'), 'Choose a logo.');
});

test('a click, Enter, and Space open the file chooser', function () {
    var ui = build();
    var opened = 0;
    ui.picker.input.click = function () { opened++; };
    ui.zone.click();
    var enter = ui.zone.dispatch('keydown', { key: 'Enter' });
    ui.zone.dispatch('keydown', { key: ' ' });
    ui.zone.dispatch('keydown', { key: 'a' });
    assert.equal(opened, 3);
    assert.equal(enter.defaultPrevented, true);
});

test('dragging over marks the zone, and dropping a file returns File objects through onChange and getValue', function () {
    var ui = build();
    var over = ui.zone.dispatch('dragover');
    assert.equal(over.defaultPrevented, true);
    assert.ok(ui.zone.classList.contains('dragover'));
    var png = file('logo.png', 'image/png');
    drop(ui, [png]);
    assert.equal(ui.zone.classList.contains('dragover'), false);
    assert.equal(ui.picker.getValue()[0], png);
    assert.equal(ui.changes.length, 1);
    assert.deepEqual(names(ui), ['logo.png']);
});

test('choosing through the input takes the files and resets the input', function () {
    var ui = build();
    ui.picker.input.files = [file('a.txt', 'text/plain')];
    ui.picker.input.dispatch('change');
    assert.equal(ui.picker.getValue().length, 1);
    assert.equal(ui.picker.input.value, '');
});

test('accept filters by mime wildcard, extension, and exact type, and names the refused file', function () {
    var ui = build({ accept: 'image/*,.json,application/pdf', multiple: true });
    drop(ui, [file('a.png', 'image/png'), file('b.JSON', ''), file('c.pdf', 'application/pdf'), file('d.exe', 'application/x-msdownload')]);
    assert.deepEqual(names(ui), ['a.png', 'b.JSON', 'c.pdf']);
    assert.equal(messageText(ui), 'd.exe is not an accepted type.');
    assert.deepEqual(ui.errors[0], ['d.exe is not an accepted type.']);
    assert.equal(ui.picker.element.querySelector('.jpk-field-message').classList.contains('error'), true);
});

test('maxSize refuses a larger file with the limit in the message', function () {
    var ui = build({ maxSize: 2097152 });
    drop(ui, [file('big.bin', '', 3000000)]);
    assert.equal(ui.picker.getValue().length, 0);
    assert.equal(messageText(ui), 'big.bin is larger than the size limit. (2 MB)');
    drop(ui, [file('ok.bin', '', 100)]);
    assert.equal(ui.picker.getValue().length, 1);
    assert.equal(shown(ui.picker.element.querySelector('.jpk-field-message')), false);
});

test('single mode keeps the first of several dropped files and says so, and a new file replaces the old one', function () {
    var ui = build();
    drop(ui, [file('a.txt', 'text/plain'), file('b.txt', 'text/plain')]);
    assert.deepEqual(names(ui), ['a.txt']);
    assert.equal(messageText(ui), 'Choose one file.');
    drop(ui, [file('c.txt', 'text/plain')]);
    assert.deepEqual(names(ui), ['c.txt']);
});

test('multiple mode adds to the list, and the remove button takes one out with the default label', function () {
    var ui = build({ multiple: true });
    drop(ui, [file('a.txt', 'text/plain')]);
    drop(ui, [file('b.txt', 'text/plain')]);
    assert.deepEqual(names(ui), ['a.txt', 'b.txt']);
    var remove = ui.picker.element.querySelectorAll('.jpk-file-remove')[0];
    assert.equal(remove.getAttribute('aria-label'), 'Remove a.txt');
    remove.click();
    assert.deepEqual(names(ui), ['b.txt']);
    assert.equal(ui.changes.length, 3);
});

test('every refusal and remove label can be replaced', function () {
    var ui = build({ accept: '.png', maxSize: 5, multiple: true, typeText: '{value} cannot be used.', sizeLimitText: '{value} is too big.', removeLabel: 'Drop {value}' });
    drop(ui, [file('a.txt', 'text/plain'), file('b.png', 'image/png', 50)]);
    assert.equal(messageText(ui), 'a.txt cannot be used. b.png is too big. (5 B)');
    drop(ui, [file('c.png', 'image/png', 1)]);
    assert.equal(ui.picker.element.querySelectorAll('.jpk-file-remove')[0].getAttribute('aria-label'), 'Drop c.png');
    var single = build({ singleText: 'Only one.' });
    drop(single, [file('a', ''), file('b', '')]);
    assert.equal(messageText(single), 'Only one.');
});

test('setValue and clear change the files without and with onChange', function () {
    var ui = build({ multiple: true });
    ui.picker.setValue([file('a.txt', 'text/plain')]);
    assert.deepEqual(names(ui), ['a.txt']);
    assert.equal(ui.changes.length, 0);
    ui.picker.clear();
    assert.deepEqual(ui.picker.getValue(), []);
    assert.equal(ui.changes.length, 1);
});

test('destroy removes the zone and input listeners', function () {
    var ui = build();
    ui.picker.destroy();
    assert.equal(ui.zone.listeners.click.length, 0);
    assert.equal(ui.zone.listeners.drop.length, 0);
    assert.equal(ui.picker.input.listeners.change.length, 0);
});

test('removing a file moves focus to the next remove button, then to the one before it, and last to the zone', function () {
    var ui = build({ multiple: true });
    drop(ui, [file('a.txt', 'text/plain'), file('b.txt', 'text/plain'), file('c.txt', 'text/plain')]);
    function buttons() { return ui.picker.element.querySelectorAll('.jpk-file-remove'); }
    buttons()[1].focus();
    buttons()[1].click();
    assert.deepEqual(names(ui), ['a.txt', 'c.txt']);
    assert.equal(dom.document.activeElement, buttons()[1]);
    buttons()[1].click();
    assert.deepEqual(names(ui), ['a.txt']);
    assert.equal(dom.document.activeElement, buttons()[0]);
    buttons()[0].click();
    assert.deepEqual(names(ui), []);
    assert.equal(dom.document.activeElement, ui.zone);
    assert.notEqual(dom.document.activeElement, dom.document.body);
});
