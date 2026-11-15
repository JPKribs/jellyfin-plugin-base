// Behavior tests for createSpinner and createSkeleton, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fake-dom.mjs';

var dom = installFakeDom();
var { createSpinner, createSkeleton } = await import('../../src/js/index.js');

beforeEach(function () {
    dom = installFakeDom();
});

test('the spinner is a status with a hidden label and a medium size by default', function () {
    var s = createSpinner();
    assert.equal(s.element.getAttribute('role'), 'status');
    assert.ok(s.element.classList.contains('jpk-loading-medium'));
    assert.equal(s.element.querySelector('.jpk-sr-only').textContent, 'Loading');
    assert.equal(s.element.querySelector('.jpk-loading-ring').getAttribute('aria-hidden'), 'true');
});

test('the spinner takes a size and a label, an unknown size is medium, and setValue replaces the label', function () {
    assert.ok(createSpinner({ size: 'small' }).element.classList.contains('jpk-loading-small'));
    assert.ok(createSpinner({ size: 'large' }).element.classList.contains('jpk-loading-large'));
    assert.ok(createSpinner({ size: 'huge' }).element.classList.contains('jpk-loading-medium'));
    var s = createSpinner({ label: 'Saving' });
    assert.equal(s.getValue(), 'Saving');
    s.setValue('Syncing');
    assert.equal(s.element.querySelector('.jpk-sr-only').textContent, 'Syncing');
});

test('destroy removes the spinner from the page', function () {
    var s = createSpinner();
    dom.document.body.appendChild(s.element);
    s.destroy();
    assert.equal(s.element.parentNode, null);
});

test('the skeleton is busy, labelled, and has three lines by default', function () {
    var k = createSkeleton();
    assert.equal(k.element.getAttribute('aria-busy'), 'true');
    assert.equal(k.element.getAttribute('role'), 'status');
    assert.equal(k.element.querySelectorAll('.jpk-skeleton-line').length, 3);
    assert.equal(k.getValue(), 'Loading');
});

test('the skeleton takes a line count, never fewer than one', function () {
    assert.equal(createSkeleton({ lines: 5 }).element.querySelectorAll('.jpk-skeleton-line').length, 5);
    assert.equal(createSkeleton({ lines: 0 }).element.querySelectorAll('.jpk-skeleton-line').length, 1);
});

test('a block and a circle take a size class and hide from a screen reader', function () {
    var block = createSkeleton({ type: 'block', size: 'large' });
    var part = block.element.querySelector('.jpk-skeleton-block');
    assert.ok(part.classList.contains('jpk-skeleton-large'));
    assert.equal(part.getAttribute('aria-hidden'), 'true');
    assert.ok(createSkeleton({ type: 'circle' }).element.querySelector('.jpk-skeleton-circle').classList.contains('jpk-skeleton-medium'));
});

test('the skeleton label can be replaced and destroyed', function () {
    var k = createSkeleton({ label: 'Loading Users' });
    assert.equal(k.getValue(), 'Loading Users');
    k.setValue('Waiting');
    assert.equal(k.element.querySelector('.jpk-sr-only').textContent, 'Waiting');
    dom.document.body.appendChild(k.element);
    k.destroy();
    assert.equal(k.element.parentNode, null);
});
