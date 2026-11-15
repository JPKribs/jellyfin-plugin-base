// Tests for where floating popups go, and how long they follow, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installFakeDom } from './fake-dom.mjs';

var dom = installFakeDom();
var { placeBox } = await import('../../src/js/lib/dom.js');
var { createOverflowMenu, createHelpHint, bindTooltips } = await import('../../src/js/index.js');

beforeEach(function () {
    dom = installFakeDom();
});

function rect(left, top, width, height) {
    return { left: left, top: top, width: width, height: height, right: left + width, bottom: top + height };
}

var VIEW = { width: 400, height: 600 };

test('placeBox opens below the anchor when it fits and centers on it', function () {
    var spot = placeBox(rect(100, 100, 40, 20), { width: 100, height: 50 }, VIEW);
    assert.equal(spot.placement, 'below');
    assert.equal(spot.top, 128);
    assert.equal(spot.left, 70);
});

test('placeBox flips above when there is no room below, and below when above has none', function () {
    var near = placeBox(rect(100, 560, 40, 20), { width: 100, height: 100 }, VIEW);
    assert.equal(near.placement, 'above');
    assert.equal(near.top, 560 - 8 - 100);
    var top = placeBox(rect(100, 10, 40, 20), { width: 100, height: 100 }, VIEW, { prefer: 'above' });
    assert.equal(top.placement, 'below');
});

test('placeBox keeps the preferred side when both fit, and takes the roomier side when neither does', function () {
    assert.equal(placeBox(rect(100, 300, 40, 20), { width: 50, height: 50 }, VIEW, { prefer: 'above' }).placement, 'above');
    assert.equal(placeBox(rect(100, 300, 40, 20), { width: 50, height: 50 }, VIEW).placement, 'below');
    var tall = placeBox(rect(100, 150, 40, 20), { width: 50, height: 500 }, VIEW);
    assert.equal(tall.placement, 'below');
    assert.ok(tall.top >= 8);
});

test('placeBox aligns to the start or end edge and clamps inside the viewport on both sides', function () {
    assert.equal(placeBox(rect(100, 100, 40, 20), { width: 100, height: 20 }, VIEW, { align: 'start' }).left, 100);
    assert.equal(placeBox(rect(100, 100, 40, 20), { width: 100, height: 20 }, VIEW, { align: 'end' }).left, 40);
    assert.equal(placeBox(rect(380, 100, 20, 20), { width: 200, height: 20 }, VIEW, { align: 'start' }).left, 400 - 200 - 8);
    assert.equal(placeBox(rect(0, 100, 20, 20), { width: 200, height: 20 }, VIEW, { align: 'end' }).left, 8);
});

test('the menu list is placed under the button by coordinates, aligned to its right edge', function () {
    var menu = createOverflowMenu({ items: [{ label: 'Edit' }] });
    dom.document.body.appendChild(menu.element);
    var button = menu.element.querySelector('.base-menu-button');
    var list = menu.element.querySelector('.base-menu-list');
    button._rect = rect(300, 100, 30, 30);
    list._rect = rect(0, 0, 160, 80);
    menu.open();
    assert.equal(list.style.top, '138px');
    assert.equal(list.style.left, '170px');
});

test('the menu list flips above the button near the bottom and stays inside a 375 pixel viewport', function () {
    globalThis.innerWidth = 375;
    globalThis.innerHeight = 600;
    var menu = createOverflowMenu({ items: [{ label: 'Edit' }], align: 'start' });
    dom.document.body.appendChild(menu.element);
    var button = menu.element.querySelector('.base-menu-button');
    var list = menu.element.querySelector('.base-menu-list');
    button._rect = rect(330, 560, 30, 30);
    list._rect = rect(0, 0, 160, 120);
    menu.open();
    assert.equal(parseFloat(list.style.top), 560 - 8 - 120);
    assert.equal(parseFloat(list.style.left), 375 - 160 - 8);
    assert.ok(parseFloat(list.style.left) + 160 <= 375);
});

test('an open menu follows a scroll of any container and a resize, and stops listening once closed', function () {
    var panel = dom.el('div', { class: 'base-panel' });
    dom.document.body.appendChild(panel);
    var menu = createOverflowMenu({ items: [{ label: 'Edit' }] });
    panel.appendChild(menu.element);
    var button = menu.element.querySelector('.base-menu-button');
    var list = menu.element.querySelector('.base-menu-list');
    list._rect = rect(0, 0, 100, 50);
    button._rect = rect(300, 100, 30, 30);
    menu.open();
    assert.equal(list.style.top, '138px');
    button._rect = rect(300, 200, 30, 30);
    panel.dispatch('scroll');
    assert.equal(list.style.top, '238px');
    button._rect = rect(300, 250, 30, 30);
    dom.dispatchWindow('resize');
    assert.equal(list.style.top, '288px');
    menu.close();
    assert.equal(dom.windowListeners('scroll'), 0);
    assert.equal(dom.windowListeners('resize'), 0);
});

test('the menu list and help bubble are fixed to the viewport, so a panel cannot clip them', function () {
    var menuCss = readFileSync(new URL('../../src/css/overflow-menu.css', import.meta.url), 'utf8');
    var helpCss = readFileSync(new URL('../../src/css/help-hint.css', import.meta.url), 'utf8');
    assert.match(menuCss, /\.base-menu-list \{[^}]*position: fixed/);
    assert.match(helpCss, /\.base-help-tip \{[^}]*position: fixed/);
});

test('the help bubble is placed on a tap and stays inside a 375 pixel viewport', function () {
    globalThis.innerWidth = 375;
    var hint = createHelpHint({ text: 'Seconds between checks.' });
    dom.document.body.appendChild(hint.element);
    var button = hint.element.querySelector('button');
    var tip = hint.element.querySelector('.base-help-tip');
    button._rect = rect(340, 100, 20, 20);
    tip._rect = rect(0, 0, 200, 40);
    button.click();
    assert.equal(parseFloat(tip.style.left), 375 - 200 - 8);
    assert.equal(parseFloat(tip.style.top), 128);
    hint.hide();
    assert.equal(dom.windowListeners('scroll'), 0);
});

test('the help bubble is placed on hover and focus too, follows a scroll, and flips above near the bottom', function () {
    var hint = createHelpHint({ text: 'Hint.' });
    dom.document.body.appendChild(hint.element);
    var button = hint.element.querySelector('button');
    var tip = hint.element.querySelector('.base-help-tip');
    tip._rect = rect(0, 0, 100, 40);
    button._rect = rect(100, 100, 20, 20);
    hint.element.dispatch('mouseenter');
    assert.equal(parseFloat(tip.style.top), 128);
    button._rect = rect(100, 740, 20, 20);
    dom.document.body.dispatch('scroll');
    assert.equal(parseFloat(tip.style.top), 740 - 8 - 40);
    hint.element.dispatch('mouseleave');
    assert.equal(dom.windowListeners('scroll'), 0);
    hint.element.dispatch('focusin');
    assert.equal(dom.windowListeners('scroll'), 1);
    hint.destroy();
    assert.equal(dom.windowListeners('scroll'), 0);
});

function tooltipFor(rectOfTarget, extra) {
    var target = dom.el('button', { 'data-base-tip': 'Tip.' });
    target._rect = rectOfTarget;
    dom.document.body.appendChild(target);
    var tips = bindTooltips(dom.document.body, extra);
    tips.element._rect = rect(0, 0, 80, 30);
    return { tips: tips, target: target };
}

test('the tooltip opens above by default, flips below near the top, and flips above near the bottom when it prefers below', function () {
    var a = tooltipFor(rect(100, 300, 40, 20));
    a.tips.show(a.target);
    assert.equal(parseFloat(a.tips.element.style.top), 300 - 8 - 30);
    a.tips.destroy();
    var b = tooltipFor(rect(100, 10, 40, 20));
    b.tips.show(b.target);
    assert.equal(parseFloat(b.tips.element.style.top), 38);
    b.tips.destroy();
    var c = tooltipFor(rect(100, 740, 40, 20), { placement: 'bottom' });
    c.tips.show(c.target);
    assert.equal(parseFloat(c.tips.element.style.top), 740 - 8 - 30);
    c.tips.destroy();
    var d = tooltipFor(rect(100, 300, 40, 20), { placement: 'bottom' });
    d.tips.show(d.target);
    assert.equal(parseFloat(d.tips.element.style.top), 328);
});

test('a scroll of a container hides the tooltip, since the scroll event does not bubble', function () {
    var scroller = dom.el('div');
    dom.document.body.appendChild(scroller);
    var t = tooltipFor(rect(100, 300, 40, 20));
    t.tips.show(t.target);
    assert.equal(t.tips.element.hidden, false);
    scroller.dispatch('scroll');
    assert.equal(t.tips.element.hidden, true);
});

test('the tooltip and the toast stack sit above a dialog, and the menu and help bubble stay inside it', function () {
    function css(file) { return readFileSync(new URL('../../src/css/' + file, import.meta.url), 'utf8'); }
    var tokens = css('design-tokens.css');
    function layer(name) { return parseInt(tokens.match(new RegExp('--base-layer-' + name + ': (\\d+);'))[1], 10); }
    // A z-index is a layer token, plus an optional step: calc(var(--base-layer-dialog) + 2).
    function z(file, selector) {
        var rule = css(file).split(selector + ' {')[1];
        var m = rule.match(/z-index: (?:calc\()?var\(--base-layer-(\w+)\)(?: \+ (\d+))?/);
        return layer(m[1]) + (m[2] ? parseInt(m[2], 10) : 0);
    }
    var dialog = z('dialog.css', '.base-dialog');
    var float = z('utility-classes.css', '.base-float');
    assert.ok(z('tooltip.css', '.base-tooltip.base-float') > dialog);
    assert.ok(z('toast.css', '.base-toaster') > dialog);
    assert.ok(z('tooltip.css', '.base-tooltip.base-float') > z('toast.css', '.base-toaster'));
    assert.ok(float < dialog);
});
