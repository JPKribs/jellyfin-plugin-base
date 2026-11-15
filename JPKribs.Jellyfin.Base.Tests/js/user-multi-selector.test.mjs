// Behavior tests for createUserMultiSelector, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, all } from './fake-dom.mjs';

var dom = installFakeDom();
var { createUserMultiSelector } = await import('../../src/js/index.js');

beforeEach(function () {
    dom = installFakeDom();
});

var USERS = [{ Id: 'u1', Name: 'alice' }, { Id: 'u2', Name: 'bob', Policy: { IsAdministrator: true } }];

async function build(extra) {
    var changes = [];
    var picker = createUserMultiSelector(Object.assign({ fetchUsers: function () { return USERS; }, showAvatars: false, onChange: function (ids) { changes.push(ids); } }, extra));
    dom.document.body.appendChild(picker.element);
    await picker.ready;
    return { picker: picker, changes: changes, list: picker.element.querySelector('.base-check-list-body') };
}

function names(list) { return all(list, '.base-check-row:not(.base-check-selectall) .base-check-label').map(function (n) { return n.textContent; }); }

test('the rows stay labels directly in the list, with no list role, so the markup is unchanged', async function () {
    var ui = await build();
    assert.deepEqual(names(ui.list), ['alice', 'bob']);
    var rows = all(ui.list, '.base-check-list-body .base-check-row');
    assert.ok(rows.every(function (r) { return r.parentNode === ui.list && r.tagName === 'LABEL' && !r.hasAttribute('role'); }));
    assert.equal(ui.list.hasAttribute('role'), false);
});

test('by default the list grows with its rows and does not scroll inside', async function () {
    var ui = await build();
    assert.equal(ui.list.classList.contains('scrolls'), false);
    assert.equal(ui.list.classList.contains('capped'), false);
    assert.equal(ui.list.classList.contains('fixed'), false);
});

test('height, maxHeight, and minHeight pass to the list, and setHeight switches later', async function () {
    var ui = await build({ maxHeight: 300, minHeight: 100 });
    assert.ok(ui.list.classList.contains('capped'));
    assert.equal(ui.list.style['--base-list-max'], '300px');
    assert.equal(ui.list.style['--base-list-min'], '100px');
    ui.picker.setHeight('12rem');
    assert.ok(ui.list.classList.contains('fixed'));
    assert.equal(ui.list.style['--base-list-height'], '12rem');
    assert.equal(ui.list.classList.contains('capped'), false);
    ui.picker.destroy();
});

test('no users shows the empty message, and setDisabled keeps the selection', async function () {
    var none = await build({ fetchUsers: function () { return []; }, emptyMessage: 'Nobody.' });
    assert.equal(none.list.querySelector('.base-check-empty').textContent, 'Nobody.');

    var ui = await build({ value: ['u1'] });
    ui.picker.setDisabled(['u2']);
    var rows = all(ui.list, '.base-check-list-body .base-check-row');
    assert.ok(rows[1].classList.contains('base-check-row-disabled'));
    assert.deepEqual(ui.picker.getValue(), ['u1']);
});
