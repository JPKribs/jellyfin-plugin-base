// Behavior tests for createToaster, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, all } from './fake-dom.mjs';

var dom = installFakeDom();
var { createToaster } = await import('../../src/js/index.js');

beforeEach(function () {
    dom = installFakeDom();
    mock.timers.reset();
    mock.timers.enable({ apis: ['setTimeout'] });
});

function toasts(t) { return all(t.element, '.jpk-toast'); }

test('the stack is a labelled region in the document body at the bottom end', function () {
    var t = createToaster();
    assert.equal(t.element.parentNode, dom.document.body);
    assert.equal(t.element.getAttribute('role'), 'region');
    assert.equal(t.element.getAttribute('aria-label'), 'Notifications');
    assert.ok(t.element.classList.contains('jpk-toaster-bottom-end'));
    var custom = createToaster({ label: 'Messages', position: 'top-start' });
    assert.equal(custom.element.getAttribute('aria-label'), 'Messages');
    assert.ok(custom.element.classList.contains('jpk-toaster-top-start'));
});

test('each kind sets its class and icon and joins a live region, where only an error joins the alert', function () {
    var t = createToaster();
    [['info', 'info', 'status'], ['success', 'check_circle', 'status'], ['warn', 'warning', 'status'], ['error', 'error', 'alert']].forEach(function (k) {
        var toast = t[k[0]]('Message.');
        assert.ok(toast.element.classList.contains(k[0]));
        assert.equal(toast.element.querySelector('.material-icons').textContent, k[1]);
        assert.equal(toast.element.parentNode.getAttribute('role'), k[2]);
        assert.equal(toast.element.hasAttribute('role'), false);
        assert.equal(toast.element.querySelector('.jpk-toast-message').textContent, 'Message.');
    });
});

test('show takes a message, a title, and an unknown kind falls back to info', function () {
    var t = createToaster();
    var toast = t.show({ message: 'Saved.', title: 'Done', kind: 'odd' });
    assert.ok(toast.element.classList.contains('info'));
    assert.equal(toast.element.querySelector('.jpk-toast-title').textContent, 'Done');
    assert.equal(t.show('Plain.').element.querySelector('.jpk-toast-title'), null);
});

test('a toast closes after the default timeout, and a timeout option changes it', function () {
    var t = createToaster();
    t.info('a');
    mock.timers.tick(4999);
    assert.equal(toasts(t).length, 1);
    mock.timers.tick(1);
    assert.equal(toasts(t).length, 0);
    var quick = createToaster({ timeout: 100 });
    quick.info('b');
    var own = quick.info('c', 1000);
    mock.timers.tick(100);
    assert.equal(toasts(quick).length, 1);
    mock.timers.tick(900);
    assert.equal(toasts(quick).length, 0);
    assert.equal(own.element.parentNode, null);
});

test('a timeout of 0 keeps the toast until it is dismissed', function () {
    var t = createToaster({ timeout: 0 });
    t.error('Stuck.');
    mock.timers.tick(60000);
    assert.equal(toasts(t).length, 1);
});

test('the dismiss button closes the toast, reports onDismiss, and has the default label that can be replaced', function () {
    var seen = [];
    var t = createToaster({ onDismiss: function (spec) { seen.push(spec.message); } });
    var toast = t.info('Bye.');
    var close = toast.element.querySelector('.jpk-toast-close');
    assert.equal(close.getAttribute('aria-label'), 'Dismiss');
    close.click();
    assert.equal(toasts(t).length, 0);
    assert.deepEqual(seen, ['Bye.']);
    var custom = createToaster({ dismissLabel: 'Close' });
    assert.equal(custom.info('x').element.querySelector('.jpk-toast-close').getAttribute('aria-label'), 'Close');
});

test('the pointer pauses the timer and leaving restarts it', function () {
    var t = createToaster({ timeout: 1000 });
    var toast = t.info('Hold.');
    toast.element.dispatch('mouseenter');
    mock.timers.tick(5000);
    assert.equal(toasts(t).length, 1);
    toast.element.dispatch('mouseleave');
    mock.timers.tick(1000);
    assert.equal(toasts(t).length, 0);
});

test('focus inside pauses the timer too', function () {
    var t = createToaster({ timeout: 1000 });
    var toast = t.info('Hold.');
    toast.element.dispatch('focusin');
    mock.timers.tick(5000);
    assert.equal(toasts(t).length, 1);
    toast.element.dispatch('focusout');
    mock.timers.tick(1000);
    assert.equal(toasts(t).length, 0);
});

test('only max toasts show and the oldest closes first', function () {
    var t = createToaster({ max: 2, timeout: 0 });
    t.info('one');
    t.info('two');
    t.info('three');
    assert.deepEqual(toasts(t).map(function (e) { return e.querySelector('.jpk-toast-message').textContent; }), ['two', 'three']);
});

test('clear and destroy close every toast, and destroy removes the stack and stops the timers', function () {
    var t = createToaster({ timeout: 0 });
    t.info('a');
    t.info('b');
    t.clear();
    assert.equal(toasts(t).length, 0);
    var toast = t.info('c');
    t.destroy();
    assert.equal(t.element.parentNode, null);
    assert.equal(toast.element.querySelector('.jpk-toast-close').listeners.click.length, 0);
});
