// Behavior tests for the validation core in lib/validate.ts, and the components that check through it, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, shown } from './fake-dom.mjs';

var dom = installFakeDom();
var { validateValue, readRules, bindValidation, validateAll, validationOf } = await import('../../src/js/lib/validate.js');
var { bindFieldAdornments, adornField } = await import('../../src/js/field-adornments.js');
var { createSaveBar } = await import('../../src/js/save-bar.js');
var { promptDialog } = await import('../../src/js/prompt-dialog.js');
var { createColorPicker } = await import('../../src/js/color-picker.js');
var { createSchedulePicker } = await import('../../src/js/schedule-picker.js');

beforeEach(function () {
    dom = installFakeDom();
});

function field(attrs) {
    var input = dom.el('input', attrs || {});
    dom.document.body.appendChild(input);
    return input;
}

function type(input, text) { input.value = text; input.dispatch('input'); }
function leave(input) { input.dispatch('blur'); }
function messageOf(input) {
    var id = (input.getAttribute('aria-describedby') || '').split(' ').pop();
    var el = id ? dom.document.querySelector('#' + id) : null;
    return el ? el.querySelector('.base-field-message-text').textContent : '';
}

test('readRules reads required, min, max, step, minlength, maxlength, pattern, and the checked types', function () {
    var input = field({ type: 'number', required: '', min: '1', max: '10', step: '2', minlength: '1', maxlength: '4', pattern: '\\d+' });
    assert.deepEqual(readRules(input), { required: true, min: '1', max: '10', step: '2', minLength: '1', maxLength: '4', pattern: '\\d+', type: 'number' });
    assert.deepEqual(readRules(field({ type: 'text' })), {});
});

test('validateValue gives the plain Base sentence for each rule', function () {
    assert.equal(validateValue('', { required: true }), 'Fill this in.');
    assert.equal(validateValue('', {}), '');
    assert.equal(validateValue('abc', { type: 'number' }), 'Enter a number.');
    assert.equal(validateValue('0', { type: 'number', min: 1, max: 65535 }), 'Enter a number from 1 to 65535.');
    assert.equal(validateValue('0', { type: 'number', min: 1 }), 'Enter 1 or more.');
    assert.equal(validateValue('11', { type: 'number', max: 10 }), 'Enter 10 or less.');
    assert.equal(validateValue('1.5', { type: 'number', step: 1 }), 'Enter a whole number.');
    assert.equal(validateValue('0.3', { type: 'number', step: 0.25 }), 'Enter a multiple of 0.25.');
    assert.equal(validateValue('1.5', { type: 'number', step: 'any' }), '');
    assert.equal(validateValue('example.com', { type: 'url' }), 'Enter a web address.');
    assert.equal(validateValue('https://example.com/a', { type: 'url' }), '');
    assert.equal(validateValue('me', { type: 'email' }), 'Enter an email address.');
    assert.equal(validateValue('25:00', { type: 'time' }), 'Enter a time.');
    assert.equal(validateValue('2026-02-30', { type: 'date' }), 'Enter a date.');
    assert.equal(validateValue('2026-01-01', { type: 'date', min: '2026-02-01', max: '2026-03-01' }), 'Enter a date from 2026-02-01 to 2026-03-01.');
    assert.equal(validateValue('ab', { minLength: 3 }), 'Enter at least 3 characters.');
    assert.equal(validateValue('abcd', { maxLength: 3 }), 'Enter no more than 3 characters.');
    assert.equal(validateValue('a1', { pattern: '[a-z]+' }), 'Check the format.');
});

test('a noun names the value, and messages replace any sentence', function () {
    assert.equal(validateValue('0', { type: 'number', min: 1, max: 65535 }, { noun: 'port' }), 'Enter a port from 1 to 65535.');
    assert.equal(validateValue('', { required: true }, { noun: 'address' }), 'Enter an address.');
    assert.equal(validateValue('0', { type: 'number', min: 1 }, { messages: { min: 'At least {min}.' } }), 'At least 1.');
    var input = field({ type: 'number', min: '1', max: '9', 'data-base-label': 'worker count' });
    assert.equal(validateValue('20', readRules(input), null, input), 'Enter a worker count from 1 to 9.');
});

test('noun true reads the label and keeps acronyms', function () {
    var label = dom.el('label', { for: 'u' });
    label.textContent = 'Server URL';
    dom.document.body.appendChild(label);
    var input = field({ id: 'u', required: '' });
    assert.equal(validateValue('', readRules(input), { noun: true }, input), 'Enter a server URL.');
});

test('validate runs after the rules, and a select and a checkbox have their own required sentence', function () {
    assert.equal(validateValue('5', { type: 'number', max: 3 }, { validate: function () { return 'Custom.'; } }), 'Enter 3 or less.');
    assert.equal(validateValue('2', { type: 'number', max: 3 }, { validate: function (v) { return v === '2' ? 'Not 2.' : ''; } }), 'Not 2.');
    var select = dom.el('select', { required: '' });
    assert.equal(validateValue('', readRules(select), null, select), 'Select an option.');
    var box = field({ type: 'checkbox', required: '' });
    assert.equal(validateValue('', readRules(box), null, box), 'Check this box.');
});

test('bindValidation checks when a changed field is left, then live while the error shows', function () {
    var input = field({ type: 'number', min: '1', max: '10' });
    var v = bindValidation(input);
    input.dispatch('blur');
    assert.equal(input.getAttribute('aria-invalid'), null);
    type(input, '50');
    assert.equal(input.getAttribute('aria-invalid'), null);
    leave(input);
    assert.equal(input.getAttribute('aria-invalid'), 'true');
    assert.equal(messageOf(input), 'Enter a number from 1 to 10.');
    type(input, '5');
    assert.equal(input.getAttribute('aria-invalid'), null);
    assert.equal(v.isValid(), true);
    v.destroy();
    assert.equal(validationOf(input), null);
});

test('the message sits after the adorned box, not inside it', function () {
    var wrap = dom.el('div');
    var input = dom.el('input', { type: 'number', max: '3' });
    wrap.appendChild(input);
    dom.document.body.appendChild(wrap);
    adornField(input);
    var v = bindValidation(input);
    type(input, '9');
    v.check();
    var box = wrap.children[0];
    assert.ok(box.classList.contains('base-adorned'));
    assert.ok(wrap.children[1].classList.contains('base-field-message'));
});

test('show and clear set the message by hand, and inputs share the red border', function () {
    var a = field();
    var b = field();
    var v = bindValidation(a, { inputs: [b] });
    v.show('Wrong.');
    assert.equal(a.getAttribute('aria-invalid'), 'true');
    assert.equal(b.getAttribute('aria-invalid'), 'true');
    assert.equal(messageOf(b), 'Wrong.');
    v.clear();
    assert.equal(b.getAttribute('aria-invalid'), null);
    assert.equal(validationOf(b), v);
});

test('moving between the fields of one value waits until all are left', function () {
    var a = field();
    var b = field();
    bindValidation(a, { inputs: [b], validate: function () { return 'Bad.'; } });
    a.focus();
    type(a, 'x');
    b.focus();
    assert.equal(a.getAttribute('aria-invalid'), null);
    b.blur();
    assert.equal(a.getAttribute('aria-invalid'), 'true');
});

test('a stored secret counts as filled for required', function () {
    var input = field({ type: 'password', required: '' });
    input.dataset.baseSecretStored = '1';
    assert.equal(bindValidation(input).check(), true);
});

test('validateAll checks bound and ruled fields, shows every message, focuses the first, and skips disabled ones', function () {
    var form = dom.el('div');
    var plain = dom.el('input', { type: 'text' });
    var port = dom.el('input', { type: 'number', min: '1', max: '65535' });
    var name = dom.el('input', { type: 'text', required: '' });
    var off = dom.el('input', { type: 'text', required: '' });
    off.disabled = true;
    [plain, port, name, off].forEach(function (el) { form.appendChild(el); });
    dom.document.body.appendChild(form);
    port.value = '0';
    assert.equal(validateAll(form), false);
    assert.equal(port.getAttribute('aria-invalid'), 'true');
    assert.equal(name.getAttribute('aria-invalid'), 'true');
    assert.equal(off.getAttribute('aria-invalid'), null);
    assert.equal(dom.document.activeElement, port);
    port.value = '80';
    name.value = 'x';
    assert.equal(validateAll(form), true);
});

test('bindFieldAdornments binds every ruled field, and destroy unbinds them', function () {
    var page = dom.el('div');
    var input = dom.el('input', { type: 'email' });
    page.appendChild(input);
    dom.document.body.appendChild(page);
    var handle = bindFieldAdornments(page);
    assert.ok(validationOf(input));
    handle.destroy();
    assert.equal(validationOf(input), null);
});

test('a number marked data-base-unit shows its unit inside the box', function () {
    var input = field({ type: 'number', 'data-base-unit': 'h' });
    adornField(input);
    var box = input.parentNode;
    assert.ok(box.classList.contains('base-adorned-with-unit'));
    assert.equal(box.querySelector('.base-adorned-unit').textContent, 'h');
});

test('the save bar refuses to save while its form is invalid', async function () {
    var form = dom.el('div');
    var input = dom.el('input', { required: '' });
    form.appendChild(input);
    dom.document.body.appendChild(form);
    var saved = 0;
    var bar = createSaveBar({ form: form, onSave: function () { saved++; } });
    assert.equal(await bar.save(), false);
    assert.equal(saved, 0);
    assert.equal(bar.getState(), 'failed');
    assert.equal(bar.status.textContent.indexOf('Fix the fields marked in red.') !== -1, true);
    input.value = 'x';
    assert.equal(await bar.save(), true);
    assert.equal(saved, 1);
});

test('the prompt dialog shows a description, and stays open while a required or validated field is invalid', async function () {
    var answer = promptDialog([
        { name: 'name', label: 'Name', required: true, description: 'Shown on the card.' },
        { name: 'port', type: 'number', min: 1, max: 9, validate: function (v) { return v === '5' ? 'Not 5.' : ''; } }
    ]);
    var done = function () { var b = dom.document.querySelectorAll('.base-modal-button'); return b[b.length - 1]; };
    assert.equal(dom.document.querySelector('.fieldDescription').textContent, 'Shown on the card.');
    done().click();
    var inputs = dom.document.querySelectorAll('.base-edit-input');
    assert.equal(inputs[0].getAttribute('aria-invalid'), 'true');
    assert.equal(messageOf(inputs[0]), 'Fill this in.');
    inputs[0].value = 'Ann';
    inputs[1].value = '5';
    done().click();
    assert.equal(messageOf(inputs[1]), 'Not 5.');
    inputs[1].value = '4';
    done().click();
    assert.deepEqual(await answer, { name: 'Ann', port: '4' });
});

test('the color picker refuses an opacity over 100 and keeps the color', function () {
    var picker = createColorPicker({ value: '#11223380', alpha: true });
    dom.document.body.appendChild(picker.element);
    var opacity = picker.element.querySelector('.base-color-alpha-input');
    type(opacity, '1200');
    opacity.dispatch('change');
    assert.equal(picker.getValue(), '#11223380');
    assert.equal(opacity.getAttribute('aria-invalid'), 'true');
    assert.equal(messageOf(opacity), 'Enter a number from 0 to 100.');
    assert.equal(picker.isValid(), false);
    type(opacity, '100');
    assert.equal(picker.getValue(), '#112233ff');
    assert.equal(opacity.getAttribute('aria-invalid'), null);
});

test('the color picker takes a validate function, and format argb reads and writes #aarrggbb', function () {
    var picker = createColorPicker({ value: '#000000', validate: function (v) { return v === '#000000' ? 'Pick a color other than black.' : ''; } });
    dom.document.body.appendChild(picker.element);
    assert.equal(picker.isValid(), false);
    var argb = createColorPicker({ value: '#80112233', format: 'argb' });
    assert.equal(argb.getValue(), '#80112233');
    assert.equal(argb.getRgba().a.toFixed(2), '0.50');
    assert.ok(argb.element.querySelector('.base-color-alpha-input'));
    argb.setValue('#ff445566');
    assert.equal(argb.getValue(), '#ff445566');
    assert.equal(createColorPicker({ value: '#445566', format: 'argb', alpha: false }).getValue(), '#ff445566');
});

test('the schedule picker checks its time through the core, with required and validate', function () {
    var picker = createSchedulePicker({ required: true, validate: function (v) { return v.days.length ? '' : 'Select a day.'; } });
    dom.document.body.appendChild(picker.element);
    assert.equal(picker.isValid(), false);
    var time = picker.element.querySelector('input');
    assert.equal(messageOf(time), 'Fill this in.');
    picker.setValue({ time: '08:00', days: [] });
    assert.equal(picker.isValid(), false);
    assert.equal(messageOf(time), 'Select a day.');
    picker.setValue({ time: '08:00', days: [1] });
    assert.equal(picker.isValid(), true);
});
