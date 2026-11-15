// Behavior tests for createSearchField, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fake-dom.mjs';

var dom = installFakeDom();
var { createSearchField } = await import('../../src/js/index.js');

beforeEach(function () {
    dom = installFakeDom();
    mock.timers.reset();
    mock.timers.enable({ apis: ['setTimeout'] });
});

function build(extra) {
    var inputs = [];
    var searches = [];
    var field = createSearchField(Object.assign({ onInput: function (v) { inputs.push(v); }, onSearch: function (v) { searches.push(v); } }, extra));
    dom.document.body.appendChild(field.element);
    return { field: field, inputs: inputs, searches: searches, clear: field.element.querySelector('.base-search-clear') };
}

function type(ui, text) { ui.field.input.value = text; ui.field.input.dispatch('input'); }

test('it is a search input named Search with a hidden clear button, and the labels can be replaced', function () {
    var ui = build();
    assert.equal(ui.field.input.type, 'search');
    assert.equal(ui.field.input.getAttribute('aria-label'), 'Search');
    assert.equal(ui.clear.hidden, true);
    assert.equal(ui.clear.getAttribute('aria-label'), 'Clear');
    var custom = build({ label: 'Find Users', clearLabel: 'Reset', placeholder: 'alice' });
    assert.equal(custom.field.input.getAttribute('aria-label'), 'Find Users');
    assert.equal(custom.clear.getAttribute('aria-label'), 'Reset');
    assert.equal(custom.field.input.getAttribute('placeholder'), 'alice');
});

test('typing shows the clear button and calls onInput once after the delay with the latest text', function () {
    var ui = build();
    type(ui, 'a');
    type(ui, 'al');
    assert.equal(ui.clear.hidden, false);
    mock.timers.tick(249);
    assert.deepEqual(ui.inputs, []);
    mock.timers.tick(1);
    assert.deepEqual(ui.inputs, ['al']);
});

test('the delay option changes the wait', function () {
    var ui = build({ delay: 50 });
    type(ui, 'x');
    mock.timers.tick(50);
    assert.deepEqual(ui.inputs, ['x']);
});

test('Enter calls onSearch at once', function () {
    var ui = build();
    type(ui, 'abc');
    ui.field.input.dispatch('keydown', { key: 'Enter' });
    assert.deepEqual(ui.searches, ['abc']);
});

test('the clear button empties the input, hides itself, calls onInput with an empty text, and refocuses the input', function () {
    var ui = build();
    type(ui, 'abc');
    ui.clear.click();
    assert.equal(ui.field.getValue(), '');
    assert.equal(ui.clear.hidden, true);
    assert.equal(dom.document.activeElement, ui.field.input);
    mock.timers.tick(250);
    assert.equal(ui.inputs[ui.inputs.length - 1], '');
});

test('Escape clears a filled input and does nothing on an empty one', function () {
    var ui = build();
    type(ui, 'abc');
    var e = ui.field.input.dispatch('keydown', { key: 'Escape' });
    assert.equal(e.defaultPrevented, true);
    assert.equal(ui.field.getValue(), '');
    var again = ui.field.input.dispatch('keydown', { key: 'Escape' });
    assert.equal(again.defaultPrevented, false);
});

test('setValue and the value option set the text and the clear button without calling onInput', function () {
    var ui = build({ value: 'start' });
    assert.equal(ui.field.getValue(), 'start');
    assert.equal(ui.clear.hidden, false);
    ui.field.setValue('');
    assert.equal(ui.clear.hidden, true);
    mock.timers.tick(1000);
    assert.deepEqual(ui.inputs, []);
});

test('destroy cancels a pending call and removes the listeners', function () {
    var ui = build();
    type(ui, 'abc');
    ui.field.destroy();
    mock.timers.tick(1000);
    assert.deepEqual(ui.inputs, []);
    assert.equal(ui.clear.listeners.click.length, 0);
    assert.equal(ui.field.input.listeners.input.length, 0);
});

test('createSearchField puts size small or large on data-base-size, and leaves it off for medium or no size', function () {
    function build(size) { return createSearchField({ size: size }); }
    assert.equal(build('small').element.getAttribute('data-base-size'), 'small');
    assert.equal(build('large').element.getAttribute('data-base-size'), 'large');
    assert.equal(build('medium').element.hasAttribute('data-base-size'), false);
    assert.equal(build(undefined).element.hasAttribute('data-base-size'), false);
    var handle = build('small');
    handle.setSize('large');
    assert.equal(handle.element.getAttribute('data-base-size'), 'large');
    handle.setSize('medium');
    assert.equal(handle.element.hasAttribute('data-base-size'), false);
});
