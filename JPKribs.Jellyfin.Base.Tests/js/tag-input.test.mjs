// Behavior tests for createTagInput, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, all } from './fake-dom.mjs';

var dom = installFakeDom();
var { createTagInput } = await import('../../src/js/index.js');

beforeEach(function () {
    dom = installFakeDom();
});

function build(extra) {
    var changes = [];
    var tags = createTagInput(Object.assign({ values: ['news'], onChange: function (v) { changes.push(v); } }, extra));
    dom.document.body.appendChild(tags.element);
    return { tags: tags, changes: changes };
}

function chips(ui) { return all(ui.tags.element, '.base-tag'); }
function key(ui, k) { return ui.tags.input.dispatch('keydown', { key: k }); }
function type(ui, text) { ui.tags.input.value = text; }
function msg(ui) { return ui.tags.element.querySelector('.base-field-message'); }

test('it draws a pill per value, built on the base-tag-pill style with a remove button', function () {
    var ui = build();
    assert.equal(chips(ui).length, 1);
    assert.ok(chips(ui)[0].classList.contains('base-tag-pill'));
    assert.equal(chips(ui)[0].querySelector('.base-tag-remove').getAttribute('aria-label'), 'Remove news');
    assert.equal(ui.tags.input.getAttribute('aria-label'), 'New tag');
});

test('Enter adds the typed tag and clears the input, and onChange gets the values', function () {
    var ui = build();
    type(ui, ' movies ');
    var e = key(ui, 'Enter');
    assert.equal(e.defaultPrevented, true);
    assert.deepEqual(ui.tags.getValue(), ['news', 'movies']);
    assert.equal(ui.tags.input.value, '');
    assert.deepEqual(ui.changes[0], ['news', 'movies']);
});

test('a comma key adds the tag without typing the comma', function () {
    var ui = build();
    type(ui, 'music');
    var e = key(ui, ',');
    assert.equal(e.defaultPrevented, true);
    assert.deepEqual(ui.tags.getValue(), ['news', 'music']);
});

test('pasting a comma list adds each piece and keeps refused ones in the input', function () {
    var ui = build();
    type(ui, 'a, b, news, c');
    ui.tags.input.dispatch('input');
    assert.deepEqual(ui.tags.getValue(), ['news', 'a', 'b', 'c']);
    assert.equal(ui.tags.input.value, 'news');
});

test('a duplicate is refused with a message and kept in the input, and the duplicates option allows it', function () {
    var ui = build();
    type(ui, 'news');
    key(ui, 'Enter');
    assert.deepEqual(ui.tags.getValue(), ['news']);
    assert.equal(msg(ui).querySelector('.base-field-message-text').textContent, 'Already added.');
    assert.equal(ui.tags.input.value, 'news');
    var allowed = build({ duplicates: true });
    type(allowed, 'news');
    key(allowed, 'Enter');
    assert.equal(allowed.tags.getValue().length, 2);
});

test('Backspace on an empty input removes the last tag, and on a filled one does not', function () {
    var ui = build({ values: ['a', 'b'] });
    type(ui, 'x');
    key(ui, 'Backspace');
    assert.deepEqual(ui.tags.getValue(), ['a', 'b']);
    type(ui, '');
    key(ui, 'Backspace');
    assert.deepEqual(ui.tags.getValue(), ['a']);
    assert.deepEqual(ui.changes[0], ['a']);
});

test('the remove button takes a tag out and focuses the next remove button, or the input after the last', function () {
    var ui = build({ values: ['a', 'b'] });
    chips(ui)[0].querySelector('.base-tag-remove').click();
    assert.deepEqual(ui.tags.getValue(), ['b']);
    assert.equal(dom.document.activeElement, chips(ui)[0].querySelector('.base-tag-remove'));
    chips(ui)[0].querySelector('.base-tag-remove').click();
    assert.deepEqual(ui.tags.getValue(), []);
    assert.equal(dom.document.activeElement, ui.tags.input);
});

test('a search icon sits at the end of the tag box', function () {
    var ui = build();
    var box = ui.tags.element.querySelector('.base-tag-input-box');
    var last = box.children[box.children.length - 1];
    assert.ok(last.classList.contains('base-adorned-icon'));
    assert.equal(last.textContent, 'search');
});

test('blur adds the typed text unless addOnBlur is false', function () {
    var ui = build();
    type(ui, 'late');
    ui.tags.input.dispatch('blur');
    assert.deepEqual(ui.tags.getValue(), ['news', 'late']);
    var off = build({ addOnBlur: false });
    type(off, 'late');
    off.tags.input.dispatch('blur');
    assert.deepEqual(off.tags.getValue(), ['news']);
});

test('validate and maxTags refuse with their sentences, and the sentences can be replaced', function () {
    var ui = build({ validate: function (t) { return t.length < 3 ? 'Too short.' : ''; }, maxTags: 2, limitText: 'Enough.' });
    assert.equal(ui.tags.add('ab'), false);
    assert.equal(msg(ui).querySelector('.base-field-message-text').textContent, 'Too short.');
    assert.equal(ui.tags.add('abc'), true);
    assert.equal(ui.tags.add('abcd'), false);
    assert.equal(msg(ui).querySelector('.base-field-message-text').textContent, 'Enough.');
    var custom = build({ duplicateText: 'Seen.', inputLabel: 'Add Tag', removeLabel: 'Drop {value}', placeholder: 'news' });
    custom.tags.add('news');
    assert.equal(msg(custom).querySelector('.base-field-message-text').textContent, 'Seen.');
    assert.equal(custom.tags.input.getAttribute('aria-label'), 'Add Tag');
    assert.equal(custom.tags.input.getAttribute('placeholder'), 'news');
    assert.equal(chips(custom)[0].querySelector('.base-tag-remove').getAttribute('aria-label'), 'Drop news');
});

test('setValue replaces the tags without onChange, and destroy removes the listeners', function () {
    var ui = build();
    ui.tags.setValue(['x', 'y']);
    assert.equal(chips(ui).length, 2);
    assert.equal(ui.changes.length, 0);
    ui.tags.destroy();
    assert.equal(ui.tags.input.listeners.keydown.length, 0);
    assert.equal(ui.tags.input.listeners.blur.length, 0);
});

test('createTagInput puts size small or large on data-base-size, and leaves it off for medium or no size', function () {
    function build(size) { return createTagInput({ size: size }); }
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
