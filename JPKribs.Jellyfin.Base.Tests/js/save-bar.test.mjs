// Tests the save bar: its status line for unsaved, saving, saved, and failed, and its button.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fake-dom.mjs';

installFakeDom();
var { createSaveBar } = await import('../../src/js/index.js');

function line(bar) {
    var text = bar.status.querySelector('.base-status-message');
    var glyph = bar.status.querySelector('.material-icons');
    return { text: text ? text.textContent : '', icon: glyph ? glyph.textContent : '' };
}

test('setDirty shows the pending line with the warning icon, and clearing it removes the line', function () {
    var bar = createSaveBar();
    assert.deepEqual(line(bar), { text: '', icon: '' });
    bar.setDirty(true);
    assert.deepEqual(line(bar), { text: 'Unsaved changes.', icon: 'warning' });
    assert.equal(bar.status.classList.contains('warn'), true);
    bar.setDirty(false);
    assert.equal(bar.getState(), '');
    assert.deepEqual(line(bar), { text: '', icon: '' });
});

test('Save shows Saving, then Changes saved when onSave resolves', async function () {
    var release;
    var bar = createSaveBar({ onSave: function () { return new Promise(function (r) { release = r; }); } });
    bar.setDirty(true);
    bar.button.click();
    await Promise.resolve();
    assert.equal(bar.getState(), 'saving');
    assert.equal(bar.button.disabled, true);
    assert.equal(line(bar).icon, 'info');
    release();
    await new Promise(function (r) { setTimeout(r, 0); });
    assert.equal(bar.getState(), 'saved');
    assert.deepEqual(line(bar), { text: 'Changes saved.', icon: 'check_circle' });
    assert.equal(bar.button.disabled, false);
});

test('a failed save shows Could not save as an alert and stays until the next change', async function () {
    var bar = createSaveBar({ onSave: function () { return Promise.reject(); } });
    var ok = await bar.save();
    assert.equal(ok, false);
    assert.deepEqual(line(bar), { text: 'Could not save.', icon: 'error' });
    assert.equal(bar.status.getAttribute('role'), 'alert');
    bar.setDirty(true);
    assert.equal(bar.getState(), 'pending');
});

test('every line can be replaced, and a state can be set directly', function () {
    var bar = createSaveBar({ pendingText: 'Changes waiting.', state: 'pending', saveText: 'Apply Changes' });
    assert.equal(bar.button.textContent, 'Apply Changes');
    assert.equal(line(bar).text, 'Changes waiting.');
    bar.setState('failed', 'The server said no.');
    assert.equal(line(bar).text, 'The server said no.');
});

test('a save that rejects with an Error or text shows that message as the failed line', async function () {
    var bar = createSaveBar({ onSave: function () { return Promise.reject(new Error('The name is taken.')); } });
    assert.equal(await bar.save(), false);
    assert.equal(line(bar).text, 'The name is taken.');
    var text = createSaveBar({ onSave: function () { throw 'Disk full.'; } });
    await text.save();
    assert.equal(line(text).text, 'Disk full.');
});
