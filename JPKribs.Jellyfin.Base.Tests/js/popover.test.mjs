// Tests for anchorPopover, the core under the overflow menu, the filter panel, the help hint, and the tooltip, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fake-dom.mjs';

var dom = installFakeDom();
var { anchorPopover, popoverGap } = await import('../../src/js/lib/popover.js');

beforeEach(function () {
    dom = installFakeDom();
});

function rect(left, top, width, height) {
    return { left: left, top: top, width: width, height: height, right: left + width, bottom: top + height };
}

function setup(anchorRect, boxRect) {
    var anchor = dom.el('button');
    var box = dom.el('div');
    box.hidden = true;
    var item = dom.el('button');
    box.appendChild(item);
    dom.document.body.appendChild(anchor);
    dom.document.body.appendChild(box);
    anchor._rect = anchorRect || rect(100, 100, 40, 20);
    box._rect = boxRect || rect(0, 0, 100, 50);
    return { anchor: anchor, box: box, item: item };
}

test('the gap is the narrow spacing token, 8px when it cannot be read', function () {
    assert.equal(popoverGap(dom.document.body), 8);
});

test('open shows the box below the anchor by viewport coordinates, and close hides it', function () {
    var ui = setup();
    var pop = anchorPopover(ui.anchor, ui.box);
    pop.open();
    assert.equal(pop.isOpen(), true);
    assert.equal(ui.box.hidden, false);
    assert.equal(ui.box.style.top, '128px');
    assert.equal(ui.box.style.left, '70px');
    pop.close();
    assert.equal(pop.isOpen(), false);
    assert.equal(ui.box.hidden, true);
});

test('the box flips above near the bottom and stays inside a 375 pixel viewport', function () {
    globalThis.innerWidth = 375;
    globalThis.innerHeight = 600;
    var ui = setup(rect(340, 560, 30, 30), rect(0, 0, 160, 120));
    anchorPopover(ui.anchor, ui.box, { align: 'start' }).open();
    assert.equal(parseFloat(ui.box.style.top), 560 - 8 - 120);
    assert.equal(parseFloat(ui.box.style.left), 375 - 160 - 8);
});

test('prefer above opens above when it fits, and gap replaces the token', function () {
    var ui = setup(rect(100, 300, 40, 20), rect(0, 0, 80, 30));
    anchorPopover(ui.anchor, ui.box, { prefer: 'above', gap: 2 }).open();
    assert.equal(parseFloat(ui.box.style.top), 300 - 2 - 30);
});

test('an open box follows a scroll of any container and a resize, and drops the listeners once closed', function () {
    var ui = setup();
    var panel = dom.el('div');
    dom.document.body.appendChild(panel);
    var pop = anchorPopover(ui.anchor, ui.box);
    pop.open();
    ui.anchor._rect = rect(100, 200, 40, 20);
    panel.dispatch('scroll');
    assert.equal(ui.box.style.top, '228px');
    ui.anchor._rect = rect(100, 250, 40, 20);
    dom.dispatchWindow('resize');
    assert.equal(ui.box.style.top, '278px');
    pop.close();
    assert.equal(dom.windowListeners('scroll'), 0);
    assert.equal(dom.windowListeners('resize'), 0);
    assert.equal((dom.document.listeners.click || []).length, 0);
    assert.equal((dom.document.listeners.keydown || []).length, 0);
});

test('follow hide dismisses on a scroll and a resize with the reason', function () {
    var reasons = [];
    var ui = setup();
    var pop = anchorPopover(ui.anchor, ui.box, { follow: 'hide', onDismiss: function (r) { reasons.push(r); } });
    pop.open();
    dom.document.body.dispatch('scroll');
    assert.equal(pop.isOpen(), false);
    pop.open();
    dom.dispatchWindow('resize');
    assert.deepEqual(reasons, ['scroll', 'resize']);
    assert.equal(dom.windowListeners('scroll'), 0);
});

test('Escape and an outside click dismiss, while a click on the anchor, the box, or an inside element does not', function () {
    var reasons = [];
    var ui = setup();
    var extra = dom.el('div');
    dom.document.body.appendChild(extra);
    var pop = anchorPopover(ui.anchor, ui.box, { inside: [extra, null], onDismiss: function (r) { reasons.push(r); } });
    pop.open();
    ui.item.click();
    ui.anchor.click();
    extra.click();
    assert.equal(pop.isOpen(), true);
    var e = ui.item.dispatch('keydown', { key: 'Escape' });
    assert.equal(e.defaultPrevented, true);
    assert.equal(pop.isOpen(), false);
    pop.open();
    dom.document.dispatch('click', { target: dom.document.body });
    assert.equal(pop.isOpen(), false);
    assert.deepEqual(reasons, ['escape', 'outside']);
});

test('a close by the caller does not call onDismiss', function () {
    var calls = 0;
    var ui = setup();
    var pop = anchorPopover(ui.anchor, ui.box, { onDismiss: function () { calls++; } });
    pop.open();
    pop.close();
    pop.destroy();
    assert.equal(calls, 0);
});

test('open claims Escape from a dialog on the anchor and the box, and close gives back only its own claims', function () {
    var ui = setup();
    ui.anchor.setAttribute('data-base-escape', 'true');
    var pop = anchorPopover(ui.anchor, ui.box);
    pop.open();
    assert.equal(ui.box.getAttribute('data-base-escape'), 'true');
    pop.close();
    assert.equal(ui.box.hasAttribute('data-base-escape'), false);
    assert.equal(ui.anchor.getAttribute('data-base-escape'), 'true');
});

test('a dismiss with focus in the box, or an outside click that leaves focus on the body, returns focus to the anchor', function () {
    var ui = setup();
    var pop = anchorPopover(ui.anchor, ui.box);
    pop.open();
    ui.item.focus();
    ui.item.dispatch('keydown', { key: 'Escape' });
    assert.equal(dom.document.activeElement, ui.anchor);
    pop.open();
    dom.document.activeElement = dom.document.body;
    dom.document.dispatch('click', { target: dom.document.body });
    assert.equal(dom.document.activeElement, ui.anchor);
});

test('returnFocus false leaves focus where it was, for a box that opens on focus', function () {
    var ui = setup();
    var pop = anchorPopover(ui.anchor, ui.box, { returnFocus: false });
    pop.open();
    dom.document.activeElement = dom.document.body;
    dom.document.dispatch('click', { target: dom.document.body });
    assert.equal(pop.isOpen(), false);
    assert.equal(dom.document.activeElement, dom.document.body);
});

test('a second open does nothing and place does nothing while closed', function () {
    var ui = setup();
    var pop = anchorPopover(ui.anchor, ui.box);
    var before = ui.box.style.top;
    pop.place();
    assert.equal(ui.box.style.top, before);
    pop.open();
    pop.open();
    assert.equal(dom.windowListeners('scroll'), 1);
    pop.close();
});
