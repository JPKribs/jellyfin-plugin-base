// Behavior tests for createCopyField and copyToClipboard, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fake-dom.mjs';

var dom = installFakeDom();
var { createCopyField, copyToClipboard } = await import('../../src/js/index.js');
var copied = [];

function setClipboard(impl) {
    Object.defineProperty(globalThis, 'navigator', { value: impl ? { clipboard: { writeText: impl } } : {}, configurable: true, writable: true });
}

beforeEach(function () {
    dom = installFakeDom();
    copied = [];
    setClipboard(function (text) { copied.push(text); return Promise.resolve(); });
});

test('copyToClipboard writes the text and resolves true, and resolves false when both ways fail', async function () {
    assert.equal(await copyToClipboard('abc'), true);
    assert.deepEqual(copied, ['abc']);
    setClipboard(function () { return Promise.reject(new Error('no')); });
    dom.document.execCommand = function () { return false; };
    var area = null;
    var original = dom.document.createElement;
    dom.document.createElement = function (tag) { area = original(tag); area.select = function () {}; return area; };
    assert.equal(await copyToClipboard('x'), false);
});

test('the field is a read-only input with the value and a copy button with the default labels', function () {
    var field = createCopyField({ value: 'https://example.test/hook' });
    assert.equal(field.input.hasAttribute('readonly'), true);
    assert.equal(field.getValue(), 'https://example.test/hook');
    assert.equal(field.input.getAttribute('aria-label'), 'Value');
    var button = field.element.querySelector('.base-copy-button');
    assert.equal(button.getAttribute('aria-label'), 'Copy');
    assert.equal(button.title, 'Copy');
});

test('a copy sends the value to the clipboard, shows Copied. and calls onCopy', async function () {
    var seen = [];
    var field = createCopyField({ value: 'abc', onCopy: function (v, ok) { seen.push([v, ok]); } });
    var ok = await field.copy();
    assert.equal(ok, true);
    assert.deepEqual(copied, ['abc']);
    assert.deepEqual(seen, [['abc', true]]);
    var button = field.element.querySelector('.base-copy-button');
    assert.equal(button.title, 'Copied.');
    assert.ok(button.classList.contains('success'));
    assert.equal(field.element.querySelector('[role="status"]').textContent, 'Copied.');
});

test('the feedback returns to the copy label after the delay', async function () {
    mock.timers.enable({ apis: ['setTimeout'] });
    try {
        var field = createCopyField({ value: 'abc', feedbackMs: 500 });
        await field.copy();
        mock.timers.tick(500);
        var button = field.element.querySelector('.base-copy-button');
        assert.equal(button.title, 'Copy');
        assert.equal(button.classList.contains('success'), false);
    } finally {
        mock.timers.reset();
    }
});

test('a failed copy shows Copy failed. and every feedback label can be replaced', async function () {
    dom.document.execCommand = function () { return false; };
    var original = dom.document.createElement;
    dom.document.createElement = function (tag) { var e = original(tag); e.select = function () {}; return e; };
    setClipboard(null);
    var field = createCopyField({ value: 'a', failedText: 'Nope.', copyLabel: 'Copy Link' });
    assert.equal(await field.copy(), false);
    assert.equal(field.element.querySelector('.base-copy-button').title, 'Nope.');
    assert.equal(field.element.querySelector('.base-copy-button').getAttribute('aria-label'), 'Copy Link');
    setClipboard(function () { return Promise.resolve(); });
    var custom = createCopyField({ value: 'a', copiedText: 'Done.' });
    await custom.copy();
    assert.equal(custom.element.querySelector('.base-copy-button').title, 'Done.');
});

test('a clicked copy button copies the current value, and setValue changes it', async function () {
    var field = createCopyField({ value: 'one' });
    field.setValue('two');
    field.element.querySelector('.base-copy-button').click();
    await new Promise(function (r) { setImmediate(r); });
    assert.deepEqual(copied, ['two']);
});

test('a secret is masked, allowExpose adds an eye inside the box that toggles it, and its labels can be replaced', function () {
    var field = createCopyField({ value: 's3cret', secret: true, allowExpose: true, revealLabel: 'Reveal', hideLabel: 'Conceal' });
    var reveal = field.element.querySelector('.base-copy-reveal');
    assert.equal(field.input.type, 'password');
    assert.equal(reveal.title, 'Reveal');
    assert.equal(reveal.getAttribute('aria-pressed'), 'false');
    reveal.click();
    assert.equal(field.input.type, 'text');
    assert.equal(reveal.title, 'Conceal');
    assert.equal(reveal.getAttribute('aria-pressed'), 'true');
    reveal.click();
    assert.equal(field.input.type, 'password');
    assert.equal(reveal.parentNode.classList.contains('base-adorned'), true);
    assert.equal(createCopyField({ value: 'a' }).element.querySelector('.base-copy-reveal'), null);
    assert.equal(createCopyField({ value: 'a', secret: true }).element.querySelector('.base-copy-reveal'), null);
});

test('destroy removes the button listeners', function () {
    var field = createCopyField({ value: 'a', secret: true, allowExpose: true });
    var eye = field.element.querySelector('.base-copy-reveal');
    field.destroy();
    assert.equal(field.element.querySelector('.base-copy-button').listeners.click.length, 0);
    assert.equal(eye.listeners.click.length, 0);
    assert.equal(field.input.type, 'password');
});

test('createCopyField puts size small or large on data-base-size, and leaves it off for medium or no size', function () {
    function build(size) { return createCopyField({ size: size }); }
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

test('inline marks the field for a row, with no space below it', function () {
    assert.equal(createCopyField({ value: 'a', inline: true }).element.className, 'base-copy-field inline');
    assert.equal(createCopyField({ value: 'a' }).element.className, 'base-copy-field');
});

test('wrap shows the whole value as read-only text that copies and follows setValue', async function () {
    var url = 'https://jellyfin.example.com/invite/0123456789abcdef0123456789abcdef?code=ABCDEFGH';
    var field = createCopyField({ value: url, wrap: true, label: 'Invite Link' });
    assert.equal(field.element.className, 'base-copy-field wrap');
    var text = field.element.querySelector('.base-copy-field-text');
    assert.equal(text.textContent, url);
    assert.equal(text.getAttribute('role'), 'textbox');
    assert.equal(text.getAttribute('aria-readonly'), 'true');
    assert.equal(text.getAttribute('aria-label'), 'Invite Link');
    assert.equal(text.getAttribute('tabindex'), '0');
    assert.equal(field.input.hidden, true);
    await field.copy();
    assert.deepEqual(copied, [url]);
    field.setValue('https://example.test/b');
    assert.equal(text.textContent, 'https://example.test/b');
    assert.equal(field.getValue(), 'https://example.test/b');
});

test('wrap selects all of the value on focus and on Ctrl+A', function () {
    var picked = [];
    dom.document.createRange = function () { return { selectNodeContents: function (n) { picked.push(n); } }; };
    globalThis.window.getSelection = function () { return { removeAllRanges: function () {}, addRange: function () {} }; };
    var field = createCopyField({ value: 'abc', wrap: true });
    dom.document.body.appendChild(field.element);
    var text = field.element.querySelector('.base-copy-field-text');
    text.dispatch('focus');
    var key = text.dispatch('keydown', { key: 'a', ctrlKey: true });
    assert.equal(key.defaultPrevented, true, 'Ctrl+A selects the value, not the page');
    assert.equal(picked.length, 2);
    assert.ok(picked.every(function (n) { return n === text; }));
});

test('wrap is ignored for a secret, which stays a masked input', function () {
    var field = createCopyField({ value: 'abc', wrap: true, secret: true });
    assert.equal(field.element.className, 'base-copy-field');
    assert.equal(field.element.querySelector('.base-copy-field-text'), null);
    assert.equal(field.input.hidden, false);
});
