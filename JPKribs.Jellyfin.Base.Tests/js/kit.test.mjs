// Behavior tests for the kit JavaScript, run with the node test runner and a stub DOM with no dependencies:
//   node --import ./JPKribs.Jellyfin.Base.Tests/js/register.mjs --test 'JPKribs.Jellyfin.Base.Tests/js/*.test.mjs'
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, all } from './fake-dom.mjs';

var dom = installFakeDom();
var { openDialog } = await import('../../src/js/dialog.js');
var { bindDialog } = await import('../../src/js/bound-dialog.js');
var { openEditorDialog } = await import('../../src/js/editor-dialog.js');
var { generateGuid } = await import('../../src/js/browser-helpers.js');
var { escapeHtml } = await import('../../src/js/index.js');

beforeEach(function () {
    dom = installFakeDom();
});

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
            { text: 'Remove', className: 'base-button destructive' },
            { text: 'Cancel', className: 'base-button secondary' }
        ]
    });
    assert.equal(dom.document.activeElement.textContent, 'Cancel');
    handle.close();
});

test('focusFirst skips a destructive button in the body too', function () {
    var keep = dom.el('button', { type: 'button' });
    var handle = openDialog({ body: bodyWith([dom.el('button', { type: 'button', class: 'base-button destructive' }), keep]) });
    assert.equal(dom.document.activeElement, keep);
    handle.close();
});

test('on a touch screen a text field is not focused; the panel is', function () {
    dom.setCoarse(true);
    var handle = openDialog({ title: 'Edit', body: bodyWith([dom.el('input', { type: 'text' })]), size: 'large' });
    var panel = handle.element.querySelector('.base-dialog-content');
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
    assert.equal(dom.document.activeElement, handle.element.querySelector('.base-dialog-content'));
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
    var panel = handle.element.querySelector('.base-dialog-content');
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
    var content = dom.el('div', { class: 'base-dialog-content' }, [dom.el('h2', { class: 'base-modal-title' }), dom.el('input', { type: 'text' })]);
    var overlay = dom.document.body.appendChild(dom.el('div', { class: 'base-dialog hidden', id: 'ed' }, [content]));
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
    var done = all(handle.element, '.base-modal-button').filter(function (b) { return b.textContent === 'Done'; })[0];
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

test('openEditorDialog draws extra actions in the footer between Remove and Cancel, in button order', function () {
    var seen = [];
    var handle = openEditorDialog({
        title: 'Edit Invite',
        onRemove: function () {},
        actions: [
            { text: 'Duplicate', icon: 'content_copy', onClick: function (h, btn) { seen.push([h, btn]); } },
            { text: 'Send', variant: 'primary', onClick: function () {} },
            { text: 'Revoke', variant: 'destructive', onClick: function () {} }
        ]
    });
    var row = handle.element.querySelector('.base-modal-button-row');
    var buttons = all(row, '.base-modal-button');
    assert.deepEqual(buttons.map(function (b) { return b.textContent; }), ['Remove', 'Revoke', 'content_copyDuplicate', 'Send', 'Cancel', 'Done']);
    var duplicate = buttons[2];
    assert.ok(duplicate.classList.contains('base-button'));
    assert.ok(duplicate.classList.contains('secondary'), 'an action is secondary by default');
    assert.ok(duplicate.classList.contains('raised'));
    assert.equal(duplicate.querySelector('.material-icons').textContent, 'content_copy');
    assert.equal(duplicate.querySelector('.material-icons').getAttribute('aria-hidden'), 'true');
    assert.ok(buttons[1].classList.contains('destructive'));
    assert.ok(buttons[3].classList.contains('primary'));
    duplicate.click();
    assert.equal(seen.length, 1);
    assert.equal(seen[0][0], handle, 'onClick gets the editor handle');
    assert.equal(seen[0][1], duplicate);
    assert.equal(handle.element.classList.contains('hidden'), false, 'an action leaves the editor open');
    handle.close();
});

test('openEditorDialog with no actions keeps Remove, Cancel, and Done', function () {
    var handle = openEditorDialog({ title: 'Edit', onRemove: function () {} });
    assert.deepEqual(all(handle.element, '.base-modal-button').map(function (b) { return b.textContent; }), ['Remove', 'Cancel', 'Done']);
    handle.close();
});

test('bindDialog leaves semantics alone when the overlay already carries the role', function () {
    var content = dom.el('div', { class: 'base-dialog-content' });
    dom.document.body.appendChild(dom.el('div', { class: 'base-dialog hidden', id: 'm', role: 'dialog', 'aria-modal': 'true' }, [content]));
    bindDialog('m');
    assert.equal(content.hasAttribute('role'), false);
});

test('an in-page dialog hidden by style does not count as the top one', function () {
    var content = dom.el('div', { class: 'base-dialog-content' }, [dom.el('input', { type: 'text' })]);
    dom.document.body.appendChild(dom.el('div', { class: 'base-dialog hidden', id: 'a' }, [content]));
    dom.document.body.appendChild(dom.el('div', { class: 'base-dialog', style: { display: 'none' } }));
    var bound = bindDialog('a');
    bound.open();
    dom.document.key('Escape');
    assert.equal(bound.isOpen(), false);
});
