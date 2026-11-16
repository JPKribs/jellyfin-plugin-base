// Tests the color picker and the color parsing it is built on.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fake-dom.mjs';

installFakeDom();
var { createColorPicker, parseColor, toHexColor } = await import('../../src/js/index.js');

function type(input, text, final) {
    input.value = text;
    input.dispatchEvent(new Event('input'));
    if (final) input.dispatchEvent(new Event('change'));
}

test('parseColor reads hex and rgb text, and toHexColor writes it back', function () {
    assert.deepEqual(parseColor('#3498db'), { r: 52, g: 152, b: 219, a: 1 });
    assert.deepEqual(parseColor('#fff'), { r: 255, g: 255, b: 255, a: 1 });
    assert.deepEqual(parseColor('#00000080'), { r: 0, g: 0, b: 0, a: 0.5 });
    assert.deepEqual(parseColor('rgba(10, 20, 30, 0.25)'), { r: 10, g: 20, b: 30, a: 0.25 });
    assert.deepEqual(parseColor('rgb(10 20 30 / 50%)'), { r: 10, g: 20, b: 30, a: 0.5 });
    assert.equal(parseColor('rgb(300, 0, 0)'), null);
    assert.equal(parseColor('blue'), null);
    assert.equal(toHexColor({ r: 52, g: 152, b: 219, a: 0.5 }), '#3498db');
    assert.equal(toHexColor({ r: 52, g: 152, b: 219, a: 0.5 }, true), '#3498db80');
});

test('the # is part of the box: the field holds the digits, takes them with or without #, and getValue keeps the #', function () {
    var picker = createColorPicker({ value: '#3498db' });
    assert.equal(picker.input.value, '3498db');
    assert.equal(picker.element.querySelector('.base-color-hash').textContent, '#');
    type(picker.input, 'ff8800', true);
    assert.equal(picker.getValue(), '#ff8800');
    type(picker.input, '#00ff00', true);
    assert.equal(picker.getValue(), '#00ff00');
});

test('the picker is RGB by default, takes typed hex and rgb text, and drops alpha', function () {
    var seen = [];
    var picker = createColorPicker({ value: '#3498db80', onChange: function (v) { seen.push(v); } });
    assert.equal(picker.getValue(), '#3498db');
    assert.equal(picker.element.querySelector('.base-color-alpha'), null);
    type(picker.input, 'rgba(255, 0, 0, 0.5)', true);
    assert.equal(picker.getValue(), '#ff0000');
    assert.equal(seen[seen.length - 1], '#ff0000');
});

test('alpha adds the opacity box on the same line and gives #rrggbbaa', function () {
    var picker = createColorPicker({ value: '#e91e6380', alpha: true });
    assert.equal(picker.getValue(), '#e91e6380');
    var opacity = picker.element.querySelector('.base-color-alpha-input');
    assert.ok(opacity);
    assert.equal(opacity.value, '50');
    assert.ok(picker.element.querySelector('.base-color-picker-row .base-color-alpha'));
    opacity.value = '25';
    opacity.dispatchEvent(new Event('input'));
    assert.equal(picker.getValue(), '#e91e6340');
    opacity.value = '50';
    opacity.dispatchEvent(new Event('input'));
    assert.equal(picker.getRgba().a, 0.5);
    type(picker.input, '#00ff00', true);
    assert.equal(picker.getValue(), '#00ff0080');
});

test('text that is not a color shows the message on change and keeps the value', function () {
    var picker = createColorPicker({ value: '#123456' });
    type(picker.input, 'nope', true);
    assert.equal(picker.getValue(), '#123456');
    assert.equal(picker.isValid(), false);
    var msg = picker.element.querySelector('.base-field-message');
    assert.equal(msg.classList.contains('error'), true);
    picker.setValue('#abcdef');
    assert.equal(picker.input.value, 'abcdef');
    assert.equal(msg.classList.contains('error'), false);
});

test('opacityOnly shows only the opacity box, and setOpacityOnly switches back keeping the color', function () {
    var picker = createColorPicker({ value: '#3498db', opacityOnly: true });
    assert.equal(picker.element.classList.contains('opacity-only'), true);
    assert.ok(picker.element.querySelector('.base-color-alpha-input'));
    picker.input.value = 'nope';
    assert.equal(picker.isValid(), true);
    picker.input.value = '3498db';
    picker.setOpacityOnly(false);
    assert.equal(picker.element.classList.contains('opacity-only'), false);
    assert.equal(picker.getValue(), '#3498dbff');
    picker.setOpacityOnly(true);
    assert.equal(picker.element.classList.contains('opacity-only'), true);
    var plain = createColorPicker({ value: '#3498db' });
    plain.setOpacityOnly(true);
    assert.equal(plain.element.classList.contains('opacity-only'), false);
});
