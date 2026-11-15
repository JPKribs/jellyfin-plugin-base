// Behavior tests for createFieldMessage and setFieldState, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, shown } from './fake-dom.mjs';

var dom = installFakeDom();
var { createFieldMessage, setFieldState } = await import('../../src/js/index.js');

beforeEach(function () {
    dom = installFakeDom();
});

test('a message with no state is hidden and is a polite live region', function () {
    var msg = createFieldMessage();
    assert.equal(shown(msg.element), false);
    assert.equal(msg.element.getAttribute('aria-live'), 'polite');
    assert.deepEqual(msg.getValue(), { state: '', text: '' });
});

test('each state sets its class and icon and shows the text', function () {
    var msg = createFieldMessage();
    [['error', 'error'], ['warn', 'warning'], ['success', 'check_circle'], ['info', 'info']].forEach(function (pair) {
        msg.set(pair[0], 'Text.');
        assert.ok(msg.element.classList.contains(pair[0]));
        assert.equal(shown(msg.element), true);
        assert.equal(msg.element.querySelector('.material-icons').textContent, pair[1]);
        assert.equal(msg.element.querySelector('.base-field-message-text').textContent, 'Text.');
    });
});

test('an error wires aria-invalid and aria-describedby on the bound input, and clearing removes them', function () {
    var input = dom.el('input', { 'aria-describedby': 'hint' });
    var msg = createFieldMessage({ input: input });
    msg.set('error', 'Enter a number.');
    assert.equal(input.getAttribute('aria-invalid'), 'true');
    assert.equal(input.getAttribute('aria-describedby'), 'hint ' + msg.element.id);
    msg.clear();
    assert.equal(input.hasAttribute('aria-invalid'), false);
    assert.equal(input.getAttribute('aria-describedby'), 'hint');
    assert.equal(shown(msg.element), false);
});

test('a warn message describes the input without marking it invalid', function () {
    var input = dom.el('input');
    var msg = createFieldMessage({ input: input });
    msg.set('warn', 'Large value.');
    assert.equal(input.hasAttribute('aria-invalid'), false);
    assert.equal(input.getAttribute('aria-describedby'), msg.element.id);
});

test('setValue and getValue use the same shape, and a state with no text stays hidden', function () {
    var msg = createFieldMessage({ state: 'success', text: 'Saved.' });
    assert.deepEqual(msg.getValue(), { state: 'success', text: 'Saved.' });
    msg.setValue({ state: 'error', text: '' });
    assert.equal(shown(msg.element), false);
    msg.setValue(null);
    assert.deepEqual(msg.getValue(), { state: '', text: '' });
});

test('bind moves the wiring to another input and unwires the first', function () {
    var a = dom.el('input');
    var b = dom.el('input');
    var msg = createFieldMessage({ input: a });
    msg.set('error', 'Bad.');
    msg.bind(b);
    assert.equal(a.hasAttribute('aria-invalid'), false);
    assert.equal(a.hasAttribute('aria-describedby'), false);
    assert.equal(b.getAttribute('aria-invalid'), 'true');
});

test('setFieldState creates one message after the input and reuses it', function () {
    var box = dom.document.body.appendChild(dom.el('div'));
    var input = box.appendChild(dom.el('input'));
    var after = box.appendChild(dom.el('div'));
    var first = setFieldState(input, 'error', 'Required.');
    assert.equal(input.nextSibling, first.element);
    assert.equal(first.element.nextSibling, after);
    var second = setFieldState(input, '', '');
    assert.equal(second, first);
    assert.equal(input.hasAttribute('aria-invalid'), false);
});

test('destroy unwires the input and removes the element', function () {
    var box = dom.document.body.appendChild(dom.el('div'));
    var input = box.appendChild(dom.el('input'));
    var msg = setFieldState(input, 'error', 'Bad.');
    msg.destroy();
    assert.equal(msg.element.parentNode, null);
    assert.equal(input.hasAttribute('aria-invalid'), false);
});
