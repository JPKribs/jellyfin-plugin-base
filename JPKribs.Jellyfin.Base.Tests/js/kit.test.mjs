// Behaviour tests for the kit's JavaScript, run with node's built-in test runner and a stub DOM (no dependencies):
//   node --test 'JPKribs.Jellyfin.Base.Tests/js/*.test.mjs'
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fake-dom.mjs';

var dom = installFakeDom();
var { openDialog, bindDialog, openEditorDialog } = await import('../../src/js/dialog.js');
var { createPaginatedTable } = await import('../../src/js/table.js');
var { generateGuid } = await import('../../src/js/core.js');
var { escapeHtml } = await import('../../src/js/index.js');

beforeEach(function () {
    dom = installFakeDom();
});

// ---- generateGuid ----

test('generateGuid gives a dashed v4 GUID by default and 32 hex digits when compact', function () {
    for (var i = 0; i < 50; i++) {
        assert.match(generateGuid(), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
        assert.match(generateGuid({ compact: true }), /^[0-9a-f]{12}4[0-9a-f]{3}[89ab][0-9a-f]{15}$/);
    }
});

test('escapeHtml is exported from the bundle entry', function () {
    assert.equal(escapeHtml('<a href="x">\'&'), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;');
    assert.equal(escapeHtml(null), '');
});

// ---- dialog focus ----

function bodyWith(children) {
    return dom.el('div', {}, children);
}

test('focusFirst skips hidden controls and lands on the first visible field', function () {
    var visible = dom.el('input', { type: 'text' });
    var body = bodyWith([
        dom.el('input', { type: 'hidden' }),
        dom.el('div', { class: 'hidden' }, [dom.el('input', { type: 'text' })]),
        dom.el('div', { hidden: true }, [dom.el('input', { type: 'text' })]),
        dom.el('input', { type: 'text', style: { display: 'none' } }),
        visible
    ]);
    var handle = openDialog({ title: 'Edit', body: body });
    assert.equal(dom.document.activeElement, visible);
    handle.close();
});

test('focusFirst never picks a destructive button, preferring Cancel in the footer', function () {
    var handle = openDialog({
        title: 'Remove?',
        body: '<p>Sure?</p>',
        buttons: [
            { text: 'Remove', className: 'jpk-button-destructive' },
            { text: 'Cancel', className: 'jpk-secondary' }
        ]
    });
    assert.equal(dom.document.activeElement.textContent, 'Cancel');
    handle.close();
});

test('focusFirst skips a destructive button in the body too', function () {
    var keep = dom.el('button', { type: 'button' });
    var handle = openDialog({ body: bodyWith([dom.el('button', { type: 'button', class: 'jpk-button-destructive' }), keep]) });
    assert.equal(dom.document.activeElement, keep);
    handle.close();
});

test('on a touch screen a text field is not focused; the panel is', function () {
    dom.setCoarse(true);
    var handle = openDialog({ title: 'Edit', body: bodyWith([dom.el('input', { type: 'text' })]), wide: true });
    var panel = handle.element.querySelector('.jpk-dialog-content');
    assert.equal(dom.document.activeElement, panel);
    assert.equal(panel.getAttribute('tabindex'), '-1');
    handle.close();
});

test('autofocus picks the element asked for, and false focuses the panel', function () {
    var second = dom.el('input', { type: 'text', class: 'second' });
    var handle = openDialog({ body: bodyWith([dom.el('input', { type: 'text' }), second]), autofocus: '.second' });
    assert.equal(dom.document.activeElement, second);
    handle.close();

    handle = openDialog({ body: bodyWith([dom.el('input', { type: 'text' })]), autofocus: false });
    assert.equal(dom.document.activeElement, handle.element.querySelector('.jpk-dialog-content'));
    handle.close();
});

test('the Tab trap ignores hidden controls, so Tab from the last visible one wraps to the first', function () {
    var first = dom.el('input', { type: 'text' });
    var last = dom.el('input', { type: 'text' });
    var handle = openDialog({ body: bodyWith([first, last, dom.el('input', { type: 'text', class: 'hidden' })]), closeButton: false });
    last.focus();
    var e = dom.document.key('Tab');
    assert.ok(e.defaultPrevented);
    assert.equal(dom.document.activeElement, first);
    handle.close();
});

test('aria-labelledby is set only while a title is shown', function () {
    var handle = openDialog({ body: '<p>x</p>' });
    var panel = handle.element.querySelector('.jpk-dialog-content');
    assert.equal(panel.hasAttribute('aria-labelledby'), false);
    handle.setTitle('Named');
    assert.ok(panel.getAttribute('aria-labelledby'));
    handle.setTitle('');
    assert.equal(panel.hasAttribute('aria-labelledby'), false);
    handle.close();
});

test('focus goes to returnFocus when the opener is gone at close', function () {
    var opener = dom.document.body.appendChild(dom.el('button', { type: 'button' }));
    var fallback = dom.document.body.appendChild(dom.el('button', { type: 'button', id: 'add' }));
    opener.focus();
    var handle = openDialog({ body: '<p>x</p>', returnFocus: '#add' });
    dom.document.body.removeChild(opener);
    handle.close();
    assert.equal(dom.document.activeElement, fallback);
});

test('bindDialog adds dialog semantics and Escape on a confirm above it closes only the confirm', function () {
    var content = dom.el('div', { class: 'jpk-dialog-content' }, [dom.el('h2', { class: 'jpk-modal-title' }), dom.el('input', { type: 'text' })]);
    var overlay = dom.document.body.appendChild(dom.el('div', { class: 'jpk-dialog hidden', id: 'ed' }, [content]));
    var closes = 0;
    var bound = bindDialog('ed', { onClose: function () { closes++; } });
    assert.equal(content.getAttribute('role'), 'dialog');
    assert.equal(content.getAttribute('aria-modal'), 'true');
    assert.ok(content.getAttribute('aria-labelledby'));

    bound.open();
    var confirmClosed = false;
    openDialog({ body: '<p>Sure?</p>', onClose: function () { confirmClosed = true; } });
    dom.document.key('Escape');
    assert.equal(confirmClosed, true);
    assert.equal(bound.isOpen(), true);
    assert.equal(closes, 0);

    dom.document.key('Escape');
    assert.equal(bound.isOpen(), false);
    assert.equal(closes, 1);
    assert.ok(overlay.classList.contains('hidden'));
});

test('openEditorDialog disables Done while onDone is pending and re-enables it on failure', async function () {
    var reject;
    var calls = 0;
    var unhandled = 0;
    function onUnhandled() { unhandled++; }
    process.on('unhandledRejection', onUnhandled);
    var handle = openEditorDialog({
        title: 'Edit',
        isNew: true,
        onDone: function () { calls++; return new Promise(function (res, rej) { reject = rej; }); }
    });
    var done = handle.element.querySelectorAll('.jpk-modal-button').filter(function (b) { return b.textContent === 'Done'; })[0];
    done.click();
    assert.equal(done.disabled, true);
    done.click();
    assert.equal(calls, 1, 'a second click while saving must not call onDone again');
    reject(new Error('save failed'));
    await new Promise(function (r) { setTimeout(r, 0); });
    assert.equal(done.disabled, false);
    assert.equal(unhandled, 0);
    process.off('unhandledRejection', onUnhandled);
    handle.close();
});

// ---- table ----

// A table whose container hands back stub elements for the parts the controller caches.
function makeTable(options, shared) {
    var view = dom.el('div');
    dom.document.body.appendChild(view);
    var container = view.appendChild(dom.el('div', { id: 'tbl' }));
    var parts = {};
    ['.jpk-table-body', '.jpk-table-scroll-sentinel', '.jpk-table-item-count', '.jpk-table-loading-more'].forEach(function (sel) {
        parts[sel] = container.appendChild(dom.el('div'));
    });
    container.querySelector = function (sel) { return parts[sel] || null; };
    var table = createPaginatedTable(view, Object.assign({ escapeHtml: escapeHtml }, shared), Object.assign({ containerId: 'tbl', endpoint: 'x', columns: [{ key: 'name' }] }, options));
    return { table: table, parts: parts };
}

function deferred() {
    var d = {};
    d.promise = new Promise(function (res, rej) { d.resolve = res; d.reject = rej; });
    return d;
}

var observers;
beforeEach(function () {
    observers = [];
    globalThis.IntersectionObserver = class {
        constructor(cb) { this.cb = cb; this.connected = true; observers.push(this); }
        observe() {}
        disconnect() { this.connected = false; }
    };
});

test('a superseded load resolves to null and leaves the newer result in place', async function () {
    var pending = [];
    var t = makeTable({}, { apiRequest: function () { var d = deferred(); pending.push(d); return d.promise; } }).table;
    var first = t.load();
    var second = t.setSearch('b');
    pending[1].resolve({ Items: [{ id: 2, name: 'b' }], TotalCount: 1 });
    pending[0].resolve({ Items: [{ id: 1, name: 'a' }], TotalCount: 1 });
    assert.equal(await first, null);
    assert.deepEqual((await second).Items, [{ id: 2, name: 'b' }]);
    assert.deepEqual(t.getItems(), [{ id: 2, name: 'b' }]);
});

test('the scroll observer starts only after the first page is in', async function () {
    var d = deferred();
    var t = makeTable({}, { apiRequest: function () { return d.promise; } }).table;
    var loading = t.load();
    assert.equal(observers.length, 0);
    d.resolve({ Items: [], TotalCount: 0 });
    await loading;
    assert.equal(observers.length, 1);
});

test('a first load landing after disconnectObserver does not start the observer; reconnectObserver does', async function () {
    var d = deferred();
    var t = makeTable({}, { apiRequest: function () { return d.promise; } }).table;
    var loading = t.load();
    t.disconnectObserver();
    d.resolve({ Items: [], TotalCount: 0 });
    await loading;
    assert.equal(observers.length, 0);
    t.reconnectObserver();
    assert.equal(observers.length, 1);
});

test('filters: null does not crash and loads without a filter', async function () {
    var urls = [];
    var t = makeTable({ filters: null }, { apiRequest: function (url) { urls.push(url); return Promise.resolve({ Items: [], TotalCount: 0 }); } }).table;
    await t.load();
    assert.equal(urls.length, 1);
    assert.doesNotMatch(urls[0], /filter=/);
});

test('the item count says 1 item and N items', async function () {
    var total = 1;
    var made = makeTable({}, { apiRequest: function () { return Promise.resolve({ Items: Array.from({ length: total }, function (_, i) { return { id: i }; }), TotalCount: total }); } });
    await made.table.load();
    assert.equal(made.parts['.jpk-table-item-count'].textContent, '1 item');
    total = 3;
    await made.table.reload();
    assert.equal(made.parts['.jpk-table-item-count'].textContent, '3 items');
});

test('bindDialog leaves semantics alone when the overlay already carries the role', function () {
    var content = dom.el('div', { class: 'jpk-dialog-content' });
    dom.document.body.appendChild(dom.el('div', { class: 'jpk-dialog hidden', id: 'm', role: 'dialog', 'aria-modal': 'true' }, [content]));
    bindDialog('m');
    assert.equal(content.hasAttribute('role'), false);
});

test('an in-page dialog hidden by style does not count as the top one', function () {
    var content = dom.el('div', { class: 'jpk-dialog-content' }, [dom.el('input', { type: 'text' })]);
    dom.document.body.appendChild(dom.el('div', { class: 'jpk-dialog hidden', id: 'a' }, [content]));
    dom.document.body.appendChild(dom.el('div', { class: 'jpk-dialog', style: { display: 'none' } }));
    var bound = bindDialog('a');
    bound.open();
    dom.document.key('Escape');
    assert.equal(bound.isOpen(), false);
});
