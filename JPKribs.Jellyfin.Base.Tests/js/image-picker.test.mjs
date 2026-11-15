// Behavior tests for createImagePicker, run on the stub DOM in fake-dom.mjs with a stub FileReader.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, shown } from './fake-dom.mjs';

var dom = installFakeDom();
var { createImagePicker } = await import('../../src/js/index.js');

// A FileReader stand-in that the test finishes by hand, so each read can succeed, fail, or arrive late.
var readers = [];
class StubReader {
    constructor() { this.result = null; this.aborted = false; readers.push(this); }
    readAsDataURL(file) { this.file = file; }
    abort() { this.aborted = true; }
    finish(dataUrl) { this.result = dataUrl; if (this.onload) this.onload(); }
    fail() { if (this.onerror) this.onerror(); }
}

beforeEach(function () {
    dom = installFakeDom();
    readers = [];
    globalThis.FileReader = StubReader;
});

afterEach(function () {
    delete globalThis.FileReader;
});

function file(name, type, size) {
    var f = new File(['x'], name, { type: type });
    Object.defineProperty(f, 'size', { value: size === undefined ? 10 : size });
    return f;
}

function build(extra) {
    var changes = [];
    var picker = createImagePicker(Object.assign({ onChange: function (v) { changes.push(v); } }, extra));
    dom.document.body.appendChild(picker.element);
    var q = function (sel) { return picker.element.querySelector(sel); };
    return { picker: picker, changes: changes, q: q, choose: q('.base-image-picker-choose'), remove: q('.base-image-picker-remove'), image: q('.base-image-picker-image') };
}

function pick(ui, f) {
    ui.picker.input.files = [f];
    ui.picker.input.dispatch('change');
}

function messageText(ui) { return ui.q('.base-field-message-text').textContent; }

test('an empty picker shows the placeholder, the default texts, and a square frame', function () {
    var ui = build();
    assert.equal(ui.picker.element.classList.contains('square'), true);
    assert.equal(ui.picker.element.classList.contains('filled'), false);
    assert.equal(ui.picker.element.getAttribute('role'), 'group');
    assert.equal(ui.image.hidden, true);
    assert.equal(ui.q('.base-image-picker-placeholder').hidden, false);
    assert.equal(ui.q('.base-image-picker-placeholder .material-icons').textContent, 'image');
    assert.equal(ui.q('.base-image-picker-empty').textContent, 'No image.');
    assert.equal(ui.choose.textContent, 'Select Image');
    assert.equal(ui.remove.textContent, 'Remove');
    assert.equal(ui.remove.hidden, true);
    assert.equal(ui.picker.input.getAttribute('accept'), 'image/*');
    assert.equal(ui.picker.input.getAttribute('type'), 'file');
    assert.equal(ui.picker.getValue(), null);
});

test('shape takes portrait and wide, and an unknown shape falls back to square', function () {
    assert.equal(build({ shape: 'portrait' }).picker.element.classList.contains('portrait'), true);
    assert.equal(build({ shape: 'wide' }).picker.element.classList.contains('wide'), true);
    assert.equal(build({ shape: 'round' }).picker.element.classList.contains('square'), true);
});

test('label and description name and describe the group', function () {
    var ui = build({ label: 'Poster', description: 'Shown on the card.' });
    var label = ui.q('.base-image-picker-label');
    assert.equal(label.textContent, 'Poster');
    assert.equal(ui.picker.element.getAttribute('aria-labelledby'), label.id);
    var description = ui.q('.base-image-picker-description');
    assert.equal(description.textContent, 'Shown on the card.');
    assert.equal(ui.picker.element.getAttribute('aria-describedby'), description.id);
    assert.equal(build().q('.base-image-picker-label'), null);
});

test('value shows a URL at first, with Replace and Remove, and getValue returns the URL', function () {
    var ui = build({ value: '/Items/1/Images/Primary', label: 'Poster' });
    assert.equal(ui.image.hidden, false);
    assert.equal(ui.image.getAttribute('src'), '/Items/1/Images/Primary');
    assert.equal(ui.image.getAttribute('alt'), 'Poster');
    assert.equal(ui.q('.base-image-picker-placeholder').hidden, true);
    assert.equal(ui.choose.textContent, 'Replace');
    assert.equal(ui.remove.hidden, false);
    assert.equal(ui.picker.element.classList.contains('filled'), true);
    assert.equal(ui.picker.getValue(), '/Items/1/Images/Primary');
});

test('the choose button opens the file chooser', function () {
    var ui = build();
    var opened = 0;
    ui.picker.input.click = function () { opened++; };
    ui.choose.click();
    assert.equal(opened, 1);
});

test('picking an image reads it and hands onChange the name, type, size, data URL, and base64', function () {
    var ui = build();
    var png = file('logo.png', 'image/png', 1234);
    pick(ui, png);
    assert.equal(ui.picker.input.value, '');
    assert.equal(readers.length, 1);
    assert.equal(readers[0].file, png);
    assert.equal(ui.changes.length, 0);
    readers[0].finish('data:image/png;base64,QUJD');
    var expected = { name: 'logo.png', type: 'image/png', size: 1234, dataUrl: 'data:image/png;base64,QUJD', base64: 'QUJD' };
    assert.deepEqual(ui.changes, [expected]);
    assert.deepEqual(ui.picker.getValue(), expected);
    assert.equal(ui.image.getAttribute('src'), 'data:image/png;base64,QUJD');
    assert.equal(ui.image.getAttribute('alt'), 'logo.png');
    assert.equal(ui.choose.textContent, 'Replace');
});

test('getValue returns a copy, so a caller cannot change the stored value', function () {
    var ui = build();
    pick(ui, file('a.png', 'image/png'));
    readers[0].finish('data:image/png;base64,QQ==');
    ui.picker.getValue().name = 'changed';
    assert.equal(ui.picker.getValue().name, 'a.png');
});

test('a file that is not an image is refused with the default message under the field', function () {
    var ui = build();
    pick(ui, file('notes.txt', 'text/plain'));
    assert.equal(readers.length, 0);
    assert.equal(messageText(ui), 'This file is not an image.');
    assert.equal(ui.q('.base-field-message').classList.contains('error'), true);
    assert.equal(ui.choose.getAttribute('aria-describedby'), ui.q('.base-field-message').id);
    assert.equal(ui.changes.length, 0);
});

test('accept narrows the types by extension or mime type', function () {
    var ui = build({ accept: '.png,image/jpeg' });
    assert.equal(ui.picker.input.getAttribute('accept'), '.png,image/jpeg');
    pick(ui, file('a.gif', 'image/gif'));
    assert.equal(readers.length, 0);
    pick(ui, file('b.PNG', ''));
    pick(ui, file('c.jpg', 'image/jpeg'));
    assert.equal(readers.length, 2);
});

test('maxBytes refuses a larger file with the limit in the message', function () {
    var ui = build({ maxBytes: 2097152 });
    pick(ui, file('big.png', 'image/png', 3000000));
    assert.equal(readers.length, 0);
    assert.equal(messageText(ui), 'The image is larger than 2 MB.');
    pick(ui, file('ok.png', 'image/png', 2097152));
    readers[0].finish('data:image/png;base64,AA==');
    assert.equal(shown(ui.q('.base-field-message')), false);
});

test('a read that fails shows the read error and keeps the old image', function () {
    var ui = build({ value: 'old.png' });
    pick(ui, file('a.png', 'image/png'));
    readers[0].fail();
    assert.equal(messageText(ui), 'Could not read this file.');
    assert.equal(ui.picker.getValue(), 'old.png');
    assert.equal(ui.changes.length, 0);
});

test('a second pick abandons the first read, so only the last file arrives', function () {
    var ui = build();
    pick(ui, file('a.png', 'image/png'));
    pick(ui, file('b.png', 'image/png'));
    assert.equal(readers[0].aborted, true);
    readers[1].finish('data:image/png;base64,Qg==');
    readers[0].finish('data:image/png;base64,QQ==');
    assert.equal(ui.changes.length, 1);
    assert.equal(ui.picker.getValue().name, 'b.png');
});

test('Remove empties the frame, calls onChange with null, and moves focus to the choose button', function () {
    var ui = build();
    pick(ui, file('a.png', 'image/png'));
    readers[0].finish('data:image/png;base64,QQ==');
    ui.remove.focus();
    ui.remove.click();
    assert.equal(ui.picker.getValue(), null);
    assert.equal(ui.changes[1], null);
    assert.equal(ui.image.hidden, true);
    assert.equal(ui.image.hasAttribute('src'), false);
    assert.equal(ui.remove.hidden, true);
    assert.equal(ui.choose.textContent, 'Select Image');
    assert.equal(dom.document.activeElement, ui.choose);
});

test('setValue shows a URL or empties the frame without onChange, and clears a message', function () {
    var ui = build();
    pick(ui, file('notes.txt', 'text/plain'));
    ui.picker.setValue('data:image/png;base64,QQ==');
    assert.equal(ui.picker.getValue(), 'data:image/png;base64,QQ==');
    assert.equal(ui.image.getAttribute('src'), 'data:image/png;base64,QQ==');
    assert.equal(shown(ui.q('.base-field-message')), false);
    ui.picker.setValue(null);
    assert.equal(ui.picker.getValue(), null);
    assert.equal(ui.image.hidden, true);
    assert.equal(ui.changes.length, 0);
});

test('every label and message can be replaced', function () {
    var ui = build({ chooseText: 'Add Logo', replaceText: 'Change Logo', removeText: 'Clear', emptyText: 'No logo.', tooLargeText: 'Over {value}.', wrongTypeText: 'Not a picture.', readErrorText: 'Unreadable.', maxBytes: 1024 });
    assert.equal(ui.choose.textContent, 'Add Logo');
    assert.equal(ui.remove.textContent, 'Clear');
    assert.equal(ui.q('.base-image-picker-empty').textContent, 'No logo.');
    pick(ui, file('a.txt', 'text/plain'));
    assert.equal(messageText(ui), 'Not a picture.');
    pick(ui, file('a.png', 'image/png', 5000));
    assert.equal(messageText(ui), 'Over 1 KB.');
    pick(ui, file('a.png', 'image/png', 5));
    readers[0].fail();
    assert.equal(messageText(ui), 'Unreadable.');
    pick(ui, file('a.png', 'image/png', 5));
    readers[1].finish('data:image/png;base64,QQ==');
    assert.equal(ui.choose.textContent, 'Change Logo');
});

test('a change with no file does nothing', function () {
    var ui = build();
    ui.picker.input.files = [];
    ui.picker.input.dispatch('change');
    assert.equal(readers.length, 0);
    assert.equal(ui.changes.length, 0);
});

test('destroy removes the listeners and abandons a read in progress', function () {
    var ui = build();
    pick(ui, file('a.png', 'image/png'));
    ui.picker.destroy();
    assert.equal(readers[0].aborted, true);
    readers[0].finish('data:image/png;base64,QQ==');
    assert.equal(ui.changes.length, 0);
    assert.equal(ui.choose.listeners.click.length, 0);
    assert.equal(ui.remove.listeners.click.length, 0);
    assert.equal(ui.picker.input.listeners.change.length, 0);
});

test('initials take the first letters of the first and last words', async function () {
    var { initials } = await import('../../src/js/image-picker.js');
    assert.equal(initials('Ada Lovelace'), 'AL');
    assert.equal(initials('  grace  brewster hopper '), 'GH');
    assert.equal(initials('Ada'), 'A');
    assert.equal(initials(''), '');
});

test('a fallback fills the empty frame with initials or an icon on a color, and hides while an image shows', function () {
    var ui = build({ fallback: { text: 'Ada Lovelace', color: 'purple' } });
    var fb = ui.q('.base-image-picker-fallback');
    assert.equal(fb.textContent, 'AL');
    assert.ok(fb.classList.contains('purple'));
    assert.equal(fb.hidden, false);
    ui.picker.setValue('logo.png');
    assert.equal(fb.hidden, true);
    var icon = build({ fallback: { icon: 'dns' } }).q('.base-image-picker-fallback');
    assert.equal(icon.textContent, 'dns');
    assert.ok(icon.classList.contains('blue'));
    assert.equal(build({}).q('.base-image-picker-fallback'), null);
});

test('crop and maxSize draw the picked image on a canvas at the fitted size', function () {
    var drawn = null;
    var savedImage = globalThis.Image;
    var savedCreate = dom.document.createElement;
    globalThis.Image = class { set src(v) { this.naturalWidth = 400; this.naturalHeight = 200; var self = this; setImmediate(function () { self.onload(); }); } };
    dom.document.createElement = function (tag) {
        var el = savedCreate.call(dom.document, tag);
        if (tag === 'canvas') {
            el.getContext = function () { return { drawImage: function () { drawn = Array.prototype.slice.call(arguments, 1); } }; };
            el.toDataURL = function (type) { return 'data:' + type + ';base64,QUJD'; };
        }
        return el;
    };
    var restore = function () { globalThis.Image = savedImage; dom.document.createElement = savedCreate; };
    var ui = build({ crop: true, maxSize: 100 });
    pick(ui, file('wide.png', 'image/png'));
    readers[0].finish('data:image/png;base64,WFla');
    return new Promise(function (resolve) { setImmediate(resolve); }).then(function () {
        restore();
        assert.deepEqual(drawn, [100, 0, 200, 200, 0, 0, 100, 100]);
        var v = ui.changes[0];
        assert.equal(v.width, 100);
        assert.equal(v.height, 100);
        assert.equal(v.dataUrl, 'data:image/png;base64,QUJD');
        assert.equal(v.base64, 'QUJD');
    }, function (e) { restore(); throw e; });
});
