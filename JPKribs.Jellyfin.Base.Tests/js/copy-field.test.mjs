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
    var button = field.element.querySelector('.jpk-copy-button');
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
    var button = field.element.querySelector('.jpk-copy-button');
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
        var button = field.element.querySelector('.jpk-copy-button');
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
    assert.equal(field.element.querySelector('.jpk-copy-button').title, 'Nope.');
    assert.equal(field.element.querySelector('.jpk-copy-button').getAttribute('aria-label'), 'Copy Link');
    setClipboard(function () { return Promise.resolve(); });
    var custom = createCopyField({ value: 'a', copiedText: 'Done.' });
    await custom.copy();
    assert.equal(custom.element.querySelector('.jpk-copy-button').title, 'Done.');
});

test('a clicked copy button copies the current value, and setValue changes it', async function () {
    var field = createCopyField({ value: 'one' });
    field.setValue('two');
    field.element.querySelector('.jpk-copy-button').click();
    await new Promise(function (r) { setImmediate(r); });
    assert.deepEqual(copied, ['two']);
});

test('a secret is masked, the reveal button toggles it, and its labels can be replaced', function () {
    var field = createCopyField({ value: 's3cret', secret: true, revealLabel: 'Reveal', hideLabel: 'Conceal' });
    var reveal = field.element.querySelector('.jpk-copy-reveal');
    assert.equal(field.input.type, 'password');
    assert.equal(reveal.title, 'Reveal');
    assert.equal(reveal.getAttribute('aria-pressed'), 'false');
    reveal.click();
    assert.equal(field.input.type, 'text');
    assert.equal(reveal.title, 'Conceal');
    assert.equal(reveal.getAttribute('aria-pressed'), 'true');
    reveal.click();
    assert.equal(field.input.type, 'password');
    assert.equal(createCopyField({ value: 'a' }).element.querySelector('.jpk-copy-reveal'), null);
});

test('destroy removes the button listeners', function () {
    var field = createCopyField({ value: 'a', secret: true });
    field.destroy();
    assert.equal(field.element.querySelector('.jpk-copy-button').listeners.click.length, 0);
    assert.equal(field.element.querySelector('.jpk-copy-reveal').listeners.click.length, 0);
});
