// Tests for the stepper's own step states and its segments layout, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fake-dom.mjs';

var dom = installFakeDom();
var { createStepper } = await import('../../src/js/stepper.js');

beforeEach(function () {
    dom = installFakeDom();
});

function stepsOf(s) {
    return s.element.querySelectorAll('.base-stepper-step');
}

test('a step state replaces the state its place gives it, and aria-current stays on the current step', function () {
    var s = createStepper({ steps: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B', state: 'attention' }, { id: 'c', label: 'C', state: 'optional' }], value: 'a' });
    var li = stepsOf(s);
    assert.ok(li[0].classList.contains('current'));
    assert.ok(li[1].classList.contains('attention'));
    assert.ok(li[2].classList.contains('optional'));
    assert.equal(li[0].querySelector('.base-stepper-control').getAttribute('aria-current'), 'step');
    assert.match(li[1].textContent, /Needs attention/);
    assert.match(li[2].textContent, /Optional/);
});

test('steps with no state keep the old look and text', function () {
    var s = createStepper({ steps: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }], value: 'b', clickable: true });
    var li = stepsOf(s);
    assert.ok(li[0].classList.contains('completed'));
    assert.equal(li[0].querySelector('.base-stepper-number .material-icons').textContent, 'check');
    assert.equal(li[1].querySelector('.base-stepper-number').textContent, '2');
    assert.equal(li[2].querySelector('button'), null);
    assert.equal(s.element.className, 'base-stepper');
});

test('clickable all makes every step a button that reports itself', function () {
    var picked = [];
    var s = createStepper({ steps: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }], clickable: 'all', onSelect: function (id, index) { picked.push(id + index); } });
    var buttons = s.element.querySelectorAll('button.base-stepper-control');
    assert.equal(buttons.length, 2);
    buttons[1].click();
    assert.deepEqual(picked, ['b1']);
});

test('the segments layout draws a segment per step, with the label as its tooltip and hidden text', function () {
    var s = createStepper({ layout: 'segments', steps: [{ id: 'a', label: 'Connect', state: 'completed' }, { id: 'b', label: 'Review' }], attentionText: 'Fix it' });
    assert.equal(s.element.className, 'base-stepper segments');
    var li = stepsOf(s);
    assert.ok(li[0].querySelector('.base-stepper-segment'));
    assert.equal(li[0].querySelector('.base-stepper-number'), null);
    assert.equal(li[0].querySelector('.base-stepper-control').title, 'Connect');
    assert.ok(li[0].querySelector('.base-stepper-text').classList.contains('base-sr-only'));
    assert.match(li[0].textContent, /ConnectCompleted/);
});
