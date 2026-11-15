// Behavior tests for createChipSelect and the combo box ARIA, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fake-dom.mjs';

var dom = installFakeDom();
var { createChipSelect, createShared } = await import('../../src/js/index.js');

beforeEach(function () {
    dom = installFakeDom();
});

var OPTIONS = [{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'Beta' }, { value: 'c', label: 'Gamma' }];

function build(extra) {
    var select = createChipSelect(Object.assign({ options: OPTIONS }, extra));
    dom.document.body.appendChild(select.element);
    var input = select.element.querySelector('input');
    var dropdown = select.element.querySelector('.base-combo-dropdown');
    return { select: select, input: input, dropdown: dropdown, chips: select.element.querySelector('.base-tags') };
}

test('a preselected value renders as a chip with a labeled remove button', function () {
    var ui = build({ value: [OPTIONS[1]] });
    assert.equal(ui.chips.children.length, 1);
    var remove = ui.chips.children[0].querySelector('.base-tag-remove');
    assert.equal(remove.tagName, 'BUTTON');
    assert.equal(remove.type, 'button');
    assert.equal(remove.getAttribute('aria-label'), 'Remove Beta');
    assert.deepEqual(ui.select.getValue(), ['b']);
});

test('removeText replaces the start of the remove label', function () {
    var ui = build({ value: [OPTIONS[0]], removeText: 'Clear' });
    assert.equal(ui.chips.children[0].querySelector('.base-tag-remove').getAttribute('aria-label'), 'Clear Alpha');
});

test('clicking a remove button removes the chip and reports the change', function () {
    var seen = null;
    var ui = build({ value: ['a', 'b'], onChange: function (values) { seen = values; } });
    ui.chips.children[0].querySelector('.base-tag-remove').click();
    assert.deepEqual(ui.select.getValue(), ['b']);
    assert.deepEqual(seen, ['b']);
    assert.equal(ui.chips.children.length, 1);
});

test('the pill option adds base-tag-pill to every chip', function () {
    var ui = build({ value: ['a'], pill: true });
    assert.ok(ui.chips.children[0].classList.contains('base-tag-pill'));
    var plain = build({ value: ['a'] });
    assert.equal(plain.chips.children[0].classList.contains('base-tag-pill'), false);
});

test('the input is a combobox that controls a listbox, closed until it has results', function () {
    var ui = build();
    assert.equal(ui.input.getAttribute('role'), 'combobox');
    assert.equal(ui.input.getAttribute('aria-expanded'), 'false');
    assert.equal(ui.input.getAttribute('aria-controls'), ui.dropdown.id);
    assert.equal(ui.dropdown.getAttribute('role'), 'listbox');
    assert.ok(ui.dropdown.classList.contains('hidden'));
});

test('focus opens the listbox with an option role on every result', function () {
    var ui = build();
    ui.input.dispatch('focus');
    var options = ui.dropdown.querySelectorAll('.base-combo-option');
    assert.equal(options.length, 3);
    assert.equal(ui.input.getAttribute('aria-expanded'), 'true');
    assert.equal(ui.dropdown.classList.contains('hidden'), false);
    options.forEach(function (o) {
        assert.equal(o.getAttribute('role'), 'option');
        assert.ok(o.id);
        assert.equal(o.getAttribute('aria-selected'), 'false');
    });
});

test('the arrow keys move aria-activedescendant and Enter picks the active option', function () {
    var ui = build();
    ui.input.dispatch('focus');
    var options = ui.dropdown.querySelectorAll('.base-combo-option');
    ui.input.dispatch('keydown', { key: 'ArrowDown' });
    assert.equal(ui.input.getAttribute('aria-activedescendant'), options[0].id);
    assert.equal(options[0].getAttribute('aria-selected'), 'true');
    ui.input.dispatch('keydown', { key: 'ArrowDown' });
    assert.equal(ui.input.getAttribute('aria-activedescendant'), options[1].id);
    assert.equal(options[0].getAttribute('aria-selected'), 'false');
    ui.input.dispatch('keydown', { key: 'ArrowUp' });
    ui.input.dispatch('keydown', { key: 'ArrowUp' });
    assert.equal(ui.input.getAttribute('aria-activedescendant'), options[2].id);

    var e = ui.input.dispatch('keydown', { key: 'Enter' });
    assert.ok(e.defaultPrevented);
    assert.deepEqual(ui.select.getValue(), ['c']);
    assert.equal(ui.input.getAttribute('aria-expanded'), 'false');
    assert.equal(ui.input.hasAttribute('aria-activedescendant'), false);
});

test('Escape closes the listbox and drops the active option', function () {
    var ui = build();
    ui.input.dispatch('focus');
    ui.input.dispatch('keydown', { key: 'ArrowDown' });
    ui.input.dispatch('keydown', { key: 'Escape' });
    assert.equal(ui.input.getAttribute('aria-expanded'), 'false');
    assert.ok(ui.dropdown.classList.contains('hidden'));
    assert.equal(ui.input.hasAttribute('aria-activedescendant'), false);
});

test('typing filters the results and a picked option is not offered again', function () {
    var ui = build();
    ui.input.value = 'ta';
    ui.input.dispatch('input');
    var options = ui.dropdown.querySelectorAll('.base-combo-option');
    assert.equal(options.length, 1);
    assert.equal(options[0].textContent, 'Beta');
    options[0].dispatch('mousedown');
    assert.deepEqual(ui.select.getValue(), ['b']);
    ui.input.dispatch('focus');
    assert.equal(ui.dropdown.querySelectorAll('.base-combo-option').length, 2);
});

test('Backspace on an empty input removes the last chip', function () {
    var ui = build({ value: ['a', 'b'] });
    ui.input.dispatch('keydown', { key: 'Backspace' });
    assert.deepEqual(ui.select.getValue(), ['a']);
});

test('single keeps one selection, and allowCreate adds typed text on Enter', function () {
    var single = build({ single: true, value: ['a'] });
    single.input.dispatch('focus');
    single.dropdown.querySelectorAll('.base-combo-option')[0].dispatch('mousedown');
    assert.equal(single.select.getValue().length, 1);

    var creating = build({ allowCreate: true });
    creating.input.value = 'Delta';
    creating.input.dispatch('keydown', { key: 'Enter' });
    assert.deepEqual(creating.select.getValue(), ['Delta']);
});

test('the searchable combo box gets the same combobox and listbox roles', function () {
    var shared = createShared(dom.el('div'), 'p');
    var combo = shared.createSearchableComboBox({
        searchFn: function (q, cb) { cb(['one', 'two']); }
    });
    dom.document.body.appendChild(combo.element);
    var input = combo.element.querySelector('input');
    var dropdown = combo.element.querySelector('.base-combo-dropdown');
    assert.equal(input.getAttribute('role'), 'combobox');
    assert.equal(input.getAttribute('aria-expanded'), 'false');
    assert.equal(dropdown.getAttribute('role'), 'listbox');
    assert.equal(input.getAttribute('aria-controls'), dropdown.id);

    input.dispatch('input');
    var options = dropdown.querySelectorAll('.base-combo-option');
    assert.equal(input.getAttribute('aria-expanded'), 'true');
    assert.equal(options[0].getAttribute('role'), 'option');
    input.dispatch('keydown', { key: 'ArrowDown' });
    assert.equal(input.getAttribute('aria-activedescendant'), options[0].id);
    input.dispatch('keydown', { key: 'Enter' });
    assert.equal(combo.getValue(), 'one');
    assert.equal(input.getAttribute('aria-expanded'), 'false');
    assert.equal(input.hasAttribute('aria-activedescendant'), false);
    combo.destroy();
});

test('two combo boxes never share a listbox id', function () {
    var a = build();
    var b = build();
    assert.notEqual(a.dropdown.id, b.dropdown.id);
});

test('createChipSelect puts size small or large on data-base-size, and leaves it off for medium or no size', function () {
    function build(size) { return createChipSelect({ size: size }); }
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

test('single replaces the chip on each pick and reports one value to onChange, getValue, and getItems', function () {
    var seen = [];
    var ui = build({ single: true, value: ['a', 'b'], onChange: function (values, items) { seen.push([values, items]); } });
    assert.deepEqual(ui.select.getValue(), ['a']);
    assert.equal(ui.chips.children.length, 1);
    ui.input.dispatch('focus');
    ui.dropdown.querySelectorAll('.base-combo-option')[0].dispatch('mousedown');
    ui.input.dispatch('focus');
    ui.dropdown.querySelectorAll('.base-combo-option')[1].dispatch('mousedown');
    assert.equal(ui.chips.children.length, 1);
    assert.equal(seen.length, 2);
    seen.forEach(function (s) { assert.equal(s[0].length, 1); assert.equal(s[1].length, 1); });
    assert.deepEqual(ui.select.getValue(), [seen[1][0][0]]);
    assert.deepEqual(ui.select.getItems(), seen[1][1]);
    ui.select.setValue(['a', 'b', 'c']);
    assert.deepEqual(ui.select.getValue(), ['a']);
});

test('the searchable combo box and the chip select input show a trailing search icon', function () {
    var ui = build();
    var wrap = ui.input.parentNode;
    assert.ok(wrap.classList.contains('base-adorned-search'));
    assert.equal(wrap.children[wrap.children.length - 1].textContent, 'search');
    var combo = createShared(dom.el('div'), 'p').createSearchableComboBox({ searchFn: function (q, cb) { cb([]); } });
    var input = combo.element.querySelector('input');
    assert.ok(input.parentNode.classList.contains('base-adorned-search'));
    assert.ok(combo.element.querySelector('.base-adorned-icon'));
});

test('an item with an image draws a round picture in its chip, and getItems keeps it', function () {
    var ui = build({ value: [{ value: 'a', label: 'Alpha', image: 'a.png' }, { value: 'b', label: 'Beta' }] });
    var first = ui.chips.children[0];
    assert.ok(first.classList.contains('has-thumb'));
    assert.equal(first.querySelector('.base-tag-thumb img').getAttribute('src'), 'a.png');
    assert.equal(ui.chips.children[1].querySelector('.base-tag-thumb'), null);
    assert.equal(ui.select.getItems()[0].image, 'a.png');
    assert.equal('image' in ui.select.getItems()[1], false);
});
