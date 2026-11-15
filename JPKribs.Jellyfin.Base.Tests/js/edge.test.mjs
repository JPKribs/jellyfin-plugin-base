// Tests for ids, replacement text, odd input, and limits across the components, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, all, shown } from './fake-dom.mjs';

var dom = installFakeDom();
var { fill } = await import('../../src/js/lib/dom.js');
var kit = await import('../../src/js/index.js');
var { createSubTabs, createStepper, createSliderField, createNumberUnitField, createSchedulePicker, createSkeleton, createTagInput,
    createKeyValueEditor, createLogViewer, createAvatar, createStatusDot, createBanner, createStringList } = kit;

beforeEach(function () {
    dom = installFakeDom();
    mock.timers.reset();
    mock.timers.enable({ apis: ['setTimeout'] });
});

test('fill puts a value in as plain text, so $ patterns in a name stay as they are', function () {
    assert.equal(fill('Remove {value}', '$&'), 'Remove $&');
    assert.equal(fill('Remove {value}', 'a$$b'), 'Remove a$$b');
    assert.equal(fill('Move {value} up', "$'x$`"), "Move $'x$` up");
    assert.equal(fill('{value} and {value}', 'x'), 'x and x');
    assert.equal(fill('Remove {value}', null), 'Remove ');
});

test('a string list remove label keeps $$ and $& in the value', function () {
    var list = createStringList({ values: ['a$$b', 'c$&d'] });
    var labels = all(list.element, '.base-string-remove').map(function (b) { return b.getAttribute('aria-label'); });
    assert.deepEqual(labels, ['Remove a$$b', 'Remove c$&d']);
});

test('sub tabs read numeric ids as strings for the value, the lookup, and the data ids', function () {
    var tabs = createSubTabs({ tabs: [{ id: 1, label: 'One' }, { id: 2, label: 'Two' }], value: 2 });
    dom.document.body.appendChild(tabs.element);
    assert.equal(tabs.getValue(), '2');
    assert.equal(tabs.getPanel(2).hidden, false);
    assert.equal(tabs.getPanel('2'), tabs.getPanel(2));
    assert.equal(tabs.getPanel(1).hidden, true);
    tabs.setValue(1);
    assert.equal(tabs.getValue(), '1');
    tabs.setValue('2');
    assert.equal(tabs.getValue(), '2');
    var seen = [];
    var tracked = createSubTabs({ tabs: [{ id: 1, label: 'One' }, { id: 2, label: 'Two' }], onChange: function (id) { seen.push(id); } });
    tracked.setValue(2);
    assert.deepEqual(seen, ['2']);
    var button = all(tracked.element, '.base-subtab')[0];
    button.click();
    assert.equal(tracked.getValue(), '1');
});

test('sub tab ids with spaces build element ids with no spaces, wired together', function () {
    var tabs = createSubTabs({ tabs: [{ id: 'my tab', label: 'A' }, { id: 'b', label: 'B' }] });
    var tab = tabs.element.querySelector('.base-subtab');
    var panel = tabs.getPanel('my tab');
    assert.equal(/\s/.test(tab.id), false);
    assert.equal(/\s/.test(tab.getAttribute('aria-controls')), false);
    assert.equal(tab.getAttribute('aria-controls'), panel.id);
    assert.equal(panel.getAttribute('aria-labelledby'), tab.id);
    assert.equal(tab.getAttribute('data-id'), 'my tab');
});

test('a stepper reads a number as an index and a string as an id', function () {
    var s = createStepper({ steps: [{ id: 10, label: 'A' }, { id: 20, label: 'B' }, { id: 30, label: 'C' }] });
    s.setValue('20');
    assert.equal(s.getValue(), 20);
    s.setValue(2);
    assert.equal(s.getValue(), 30);
    s.setValue(0);
    assert.equal(s.getValue(), 10);
    s.setValue('nope');
    assert.equal(s.getValue(), 10);
    s.setValue(99);
    assert.equal(s.getValue(), 30);
    var start = createStepper({ steps: [{ id: 'a' }, { id: 'b' }], value: 'b' });
    assert.equal(start.getValue(), 'b');
});

test('stepper getStep finds a step by id for a string or a number id', function () {
    var s = createStepper({ steps: [{ id: 10, label: 'A', description: 'd' }, { id: 'two', label: 'B' }] });
    assert.deepEqual(s.getStep(10), { id: 10, index: 0, label: 'A', description: 'd' });
    assert.equal(s.getStep('10').index, 0);
    assert.equal(s.getStep('two').index, 1);
    assert.equal(s.getStep('missing'), null);
});

test('a slider ignores NaN, clamps to its range, and reads a backwards range the right way round', function () {
    var s = createSliderField({ min: 0, max: 10, value: 5 });
    s.setValue(NaN);
    assert.equal(s.getValue(), 5);
    s.setValue('abc');
    assert.equal(s.getValue(), 5);
    s.setValue(50);
    assert.equal(s.getValue(), 10);
    s.setValue(-4);
    assert.equal(s.getValue(), 0);
    var back = createSliderField({ min: 10, max: 2 });
    assert.equal(back.input.getAttribute('min'), '2');
    assert.equal(back.input.getAttribute('max'), '10');
    assert.equal(back.getValue(), 2);
    var odd = createSliderField({ value: NaN, min: NaN });
    assert.equal(odd.getValue(), 0);
    assert.equal(odd.element.querySelector('output').textContent, '0');
});

test('a number and unit field ignores a base value that is not a number, and reads a backwards range the right way round', function () {
    var f = createNumberUnitField({ units: [{ value: 'MB', factor: 1 }, { value: 'GB', factor: 1024 }], value: 5 });
    f.setBaseValue(NaN);
    f.setBaseValue(null);
    f.setBaseValue(undefined);
    f.setBaseValue(Infinity);
    assert.deepEqual(f.getValue(), { value: 5, unit: 'MB', base: 5 });
    f.setBaseValue(2048);
    assert.deepEqual(f.getValue(), { value: 2, unit: 'GB', base: 2048 });
    var back = createNumberUnitField({ units: ['x'], min: 10, max: 2 });
    assert.equal(back.input.getAttribute('min'), '2');
    assert.equal(back.input.getAttribute('max'), '10');
    back.setValue({ value: 5 });
    assert.equal(back.isValid(), true);
    back.setValue({ value: 11 });
    assert.equal(back.isValid(), false);
    assert.equal(back.element.querySelector('.base-field-message-text').textContent, 'Enter a number from 2 to 10.');
    var odd = createNumberUnitField({ units: ['x'], min: NaN, max: 'abc' });
    odd.setValue({ value: 100000 });
    assert.equal(odd.isValid(), true);
});

test('a schedule keeps only whole number days from 0 to 6, once each, and falls back to the default labels', function () {
    var p = createSchedulePicker({});
    p.setValue({ days: [1, 1, 3, '4', 2.5, -1, 7, NaN, null, 6, 0] });
    assert.deepEqual(p.getValue().days, [0, 1, 3, 6]);
    p.setValue({ days: 'monday' });
    assert.deepEqual(p.getValue().days, []);
    p.setValue({});
    assert.deepEqual(p.getValue().days, []);
    var short = createSchedulePicker({ dayLabels: ['S', 'M'] });
    var labels = all(short.element, '.base-toggle').map(function (b) { return b.textContent; });
    assert.deepEqual(labels, ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
    var own = createSchedulePicker({ dayLabels: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] });
    assert.equal(own.element.querySelector('.base-toggle').textContent, 'a');
});

test('skeleton lines that are not a number fall back to the default of three', function () {
    assert.equal(createSkeleton({ lines: NaN }).element.querySelectorAll('.base-skeleton-line').length, 3);
    assert.equal(createSkeleton({ lines: 'abc' }).element.querySelectorAll('.base-skeleton-line').length, 3);
    assert.equal(createSkeleton({ lines: Infinity }).element.querySelectorAll('.base-skeleton-line').length, 3);
    assert.equal(createSkeleton({ lines: 2 }).element.querySelectorAll('.base-skeleton-line').length, 2);
});

test('a tag input splits typed text on every separator it was given', function () {
    var t = createTagInput({ separators: [',', ';', ' '] });
    dom.document.body.appendChild(t.element);
    t.input.value = 'a;b c,d';
    t.input.dispatch('keydown', { key: ';' });
    assert.deepEqual(t.getValue(), ['a', 'b', 'c', 'd']);
    var semi = createTagInput({ separators: [';'] });
    semi.input.value = 'x;y';
    semi.input.dispatch('input');
    assert.deepEqual(semi.getValue(), ['x', 'y']);
    semi.input.value = 'p,q';
    semi.input.dispatch('input');
    assert.deepEqual(semi.getValue(), ['x', 'y']);
    assert.equal(semi.input.value, 'p,q');
});

test('a tag input keeps splitting on commas by default and keeps refused pieces in the input', function () {
    var t = createTagInput({ values: ['a'] });
    t.input.value = 'a, b, c';
    t.input.dispatch('input');
    assert.deepEqual(t.getValue(), ['a', 'b', 'c']);
    assert.equal(t.input.value, 'a');
    t.input.value = 'e, f';
    t.input.dispatch('input');
    assert.deepEqual(t.getValue(), ['a', 'b', 'c', 'e', 'f']);
    assert.equal(t.input.value, '');
});

test('a key value editor disables Add and says so at maxRows, and lifts both when a row goes', function () {
    var e = createKeyValueEditor({ maxRows: 2, values: [{ key: 'a', value: '1' }] });
    dom.document.body.appendChild(e.element);
    var add = e.element.querySelector('.base-kv-add');
    var message = e.element.children[e.element.children.length - 1];
    assert.equal(add.disabled, false);
    assert.equal(shown(message), false);
    add.click();
    assert.equal(add.disabled, true);
    assert.equal(shown(message), true);
    assert.equal(message.querySelector('.base-field-message-text').textContent, 'No more rows can be added.');
    assert.equal(e.addRow({ key: 'z' }), false);
    e.element.querySelector('.base-kv-remove').click();
    assert.equal(add.disabled, false);
    assert.equal(shown(message), false);
    var custom = createKeyValueEditor({ maxRows: 1, limitText: 'Full.', values: [{ key: 'a', value: '1' }] });
    assert.equal(custom.element.children[custom.element.children.length - 1].querySelector('.base-field-message-text').textContent, 'Full.');
});

test('a log viewer treats null and undefined as an empty line and never throws', function () {
    var v = createLogViewer({});
    v.append(null);
    v.append(undefined);
    v.append([null, 'x', undefined, 7]);
    var texts = v.getValue().map(function (l) { return l.text; });
    assert.deepEqual(texts, ['', '', '', 'x', '', '7']);
});

test('the avatar, status dot, banner, and toast kind lookups ignore inherited names', function () {
    ['constructor', '__proto__', 'toString', 'hasOwnProperty'].forEach(function (name) {
        var avatar = createAvatar({ name: 'A', status: name });
        assert.equal(avatar.getValue().status, '');
        assert.equal(avatar.element.querySelector('.base-avatar-status'), null);
        var dot = createStatusDot({ color: name });
        assert.equal(dot.getValue().color, 'gray');
        var banner = createBanner({ kind: name, text: 'x' });
        assert.equal(banner.getValue().kind, 'info');
        banner.setValue({ kind: name });
        assert.equal(banner.getValue().kind, 'info');
    });
    var real = createStatusDot({ color: 'green' });
    assert.equal(real.getValue().color, 'green');
    assert.equal(createBanner({ kind: 'warn' }).getValue().kind, 'warn');
    assert.equal(createAvatar({ name: 'A', status: 'red' }).getValue().status, 'red');
});
