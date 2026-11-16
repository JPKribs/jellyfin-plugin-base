// Tests for the dialog sizes, small, medium, and large, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fake-dom.mjs';

var dom = installFakeDom();
var { openDialog, confirmDialog, promptDialog, openEditorDialog } = await import('../../src/js/index.js');

beforeEach(function () {
    dom = installFakeDom();
});

function panel() { return dom.document.body.querySelector('.base-dialog-content'); }
function overlay() { return dom.document.body.querySelector('.base-dialog'); }

test('a dialog is medium by default, on the panel and the overlay', function () {
    var d = openDialog({ title: 'Edit' });
    assert.equal(panel().classList.contains('medium'), true);
    assert.equal(overlay().classList.contains('medium'), true);
    d.close();
});

test('size picks small or large, and an unknown size is medium', function () {
    var small = openDialog({ title: 'A', size: 'small' });
    assert.equal(panel().classList.contains('small'), true);
    small.close();
    var large = openDialog({ title: 'B', size: 'large' });
    assert.equal(panel().classList.contains('large'), true);
    assert.equal(overlay().classList.contains('large'), true);
    large.close();
    var odd = openDialog({ title: 'C', size: 'huge' });
    assert.equal(panel().classList.contains('medium'), true);
    odd.close();
});

test('confirm and prompt dialogs are small, and an editor dialog is large unless sized', function () {
    confirmDialog('Remove it?');
    assert.equal(panel().classList.contains('small'), true);
    dom.document.key('Escape');
    promptDialog([{ name: 'name', value: '' }]);
    assert.equal(panel().classList.contains('small'), true);
    dom.document.key('Escape');
    var editor = openEditorDialog({ title: 'Edit' });
    assert.equal(panel().classList.contains('large'), true);
    editor.close();
    var medium = openEditorDialog({ title: 'Edit', size: 'medium' });
    assert.equal(panel().classList.contains('medium'), true);
    medium.close();
});

test('a dialog given the page closes when the page cleans up', function () {
    var cleanups = [];
    var closed = [];
    openDialog({ title: 'Edit', page: { addCleanup: function (fn) { cleanups.push(fn); return fn; } }, onClose: function (v) { closed.push(v); } });
    assert.equal(cleanups.length, 1);
    cleanups[0]();
    assert.equal(closed.length, 1);
    cleanups[0]();
    assert.equal(closed.length, 1);
});
