// Behavior tests for setTooltip, bindTooltips, and createHelpHint, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fake-dom.mjs';

var dom = installFakeDom();
var { setTooltip, bindTooltips, createHelpHint } = await import('../../src/js/index.js');

beforeEach(function () {
    dom = installFakeDom();
});

function page() {
    var root = dom.document.body.appendChild(dom.el('div'));
    var target = root.appendChild(dom.el('button', { type: 'button', 'data-jpk-tip': 'Explains the field.' }));
    var other = root.appendChild(dom.el('button', { type: 'button' }));
    return { root: root, target: target, other: other };
}

test('setTooltip sets the data attribute and makes a plain element focusable, but leaves a button alone', function () {
    var span = dom.el('span');
    setTooltip(span, 'Hello', 'bottom');
    assert.equal(span.getAttribute('data-jpk-tip'), 'Hello');
    assert.equal(span.getAttribute('data-jpk-tip-placement'), 'bottom');
    assert.equal(span.getAttribute('tabindex'), '0');
    var button = setTooltip(dom.el('button'), 'Hi');
    assert.equal(button.hasAttribute('tabindex'), false);
});

test('hovering a target shows the tip with the text, the tooltip role, and aria-describedby', function () {
    var p = page();
    var tips = bindTooltips(p.root);
    p.target.dispatch('mouseover');
    assert.equal(tips.element.hidden, false);
    assert.equal(tips.element.textContent, 'Explains the field.');
    assert.equal(tips.element.getAttribute('role'), 'tooltip');
    assert.equal(p.target.getAttribute('aria-describedby'), tips.element.id);
});

test('leaving the target hides the tip and removes aria-describedby', function () {
    var p = page();
    var tips = bindTooltips(p.root);
    p.target.dispatch('mouseover');
    p.target.dispatch('mouseout');
    assert.equal(tips.element.hidden, true);
    assert.equal(p.target.hasAttribute('aria-describedby'), false);
});

test('focus shows the tip and blur hides it', function () {
    var p = page();
    var tips = bindTooltips(p.root);
    p.target.dispatch('focusin');
    assert.equal(tips.element.hidden, false);
    p.target.dispatch('focusout');
    assert.equal(tips.element.hidden, true);
});

test('an element without the attribute shows nothing', function () {
    var p = page();
    var tips = bindTooltips(p.root);
    p.other.dispatch('mouseover');
    assert.equal(tips.element.hidden, true);
});

test('Escape and scrolling hide the tip', function () {
    var p = page();
    var tips = bindTooltips(p.root);
    p.target.dispatch('mouseover');
    dom.document.key('Escape');
    assert.equal(tips.element.hidden, true);
    p.target.dispatch('mouseover');
    dom.document.dispatch('scroll');
    assert.equal(tips.element.hidden, true);
});

test('the tip is placed above the target, flips below when there is no room, and honors the bottom placement', function () {
    var p = page();
    var tips = bindTooltips(p.root);
    tips.element._rect = { top: 0, left: 0, right: 40, bottom: 20, width: 40, height: 20 };
    p.target._rect = { top: 100, left: 100, right: 160, bottom: 120, width: 60, height: 20 };
    p.target.dispatch('mouseover');
    assert.equal(tips.element.style.top, '72px');
    p.target._rect = { top: 2, left: 100, right: 160, bottom: 22, width: 60, height: 20 };
    p.target.dispatch('mouseover');
    assert.equal(tips.element.style.top, '30px');
    p.target._rect = { top: 100, left: 100, right: 160, bottom: 120, width: 60, height: 20 };
    p.target.setAttribute('data-jpk-tip-placement', 'bottom');
    p.target.dispatch('mouseover');
    assert.equal(tips.element.style.top, '128px');
});

test('destroy removes the tip and the root listeners', function () {
    var p = page();
    var tips = bindTooltips(p.root);
    tips.destroy();
    assert.equal(tips.element.parentNode, null);
    assert.equal(p.root.listeners.mouseover.length, 0);
    assert.equal(p.root.listeners.focusin.length, 0);
});

test('createHelpHint needs text and builds a described, labelled button', function () {
    assert.throws(function () { createHelpHint({}); }, /text/);
    var hint = createHelpHint({ text: 'Seconds between checks.' });
    var button = hint.element.querySelector('.jpk-help-button');
    var tip = hint.element.querySelector('.jpk-help-tip');
    assert.equal(button.getAttribute('aria-label'), 'Help');
    assert.equal(button.getAttribute('aria-describedby'), tip.id);
    assert.equal(tip.getAttribute('role'), 'tooltip');
    assert.equal(tip.textContent, 'Seconds between checks.');
    assert.equal(hint.getValue(), 'Seconds between checks.');
});

test('the help hint label and icon can be replaced, and setValue changes the text', function () {
    var hint = createHelpHint({ text: 'a', label: 'About This Field', icon: 'info' });
    var button = hint.element.querySelector('.jpk-help-button');
    assert.equal(button.getAttribute('aria-label'), 'About This Field');
    assert.equal(button.querySelector('.material-icons').textContent, 'info');
    hint.setValue('b');
    assert.equal(hint.getValue(), 'b');
});

test('a click toggles the help bubble, Escape and an outside click close it', function () {
    var hint = createHelpHint({ text: 'a' });
    dom.document.body.appendChild(hint.element);
    var button = hint.element.querySelector('.jpk-help-button');
    button.click();
    assert.ok(hint.element.classList.contains('open'));
    button.dispatch('keydown', { key: 'Escape' });
    assert.equal(hint.element.classList.contains('open'), false);
    button.click();
    dom.document.dispatch('click', { target: dom.document.body });
    assert.equal(hint.element.classList.contains('open'), false);
    button.click();
    button.click();
    assert.equal(hint.element.classList.contains('open'), false);
});

test('destroy of the help hint drops the document listener', function () {
    var hint = createHelpHint({ text: 'a' });
    dom.document.body.appendChild(hint.element);
    hint.element.querySelector('.jpk-help-button').click();
    var before = (dom.document.listeners.click || []).length;
    hint.destroy();
    assert.equal(dom.document.listeners.click.length, before - 1);
    assert.equal(hint.element.querySelector('.jpk-help-button').listeners.click.length, 0);
});
