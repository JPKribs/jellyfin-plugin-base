// Behavior tests for createInheritField, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, all } from './fake-dom.mjs';

var dom = installFakeDom();
var { createInheritField } = await import('../../src/js/inherit-field.js');

beforeEach(function () {
    dom = installFakeDom();
});

function select() {
    var el = dom.el('select');
    [['en', 'English'], ['fr', 'French']].forEach(function (pair) { var o = dom.el('option', { value: pair[0] }); o.textContent = pair[1]; el.appendChild(o); });
    return el;
}

function pills(ui) { return all(ui.element, '.base-pill'); }

test('while inheriting, the field shows the inherited value, dimmed and disabled, and the pill names it', function () {
    var host = dom.el('div');
    var field = select();
    host.appendChild(field);
    dom.document.body.appendChild(host);
    var ui = createInheritField({ field: field, inheritedValue: 'fr', value: { inherit: true, value: 'en' } });
    assert.equal(host.children[0], ui.element);
    assert.ok(ui.element.classList.contains('inheriting'));
    assert.equal(field.disabled, true);
    assert.equal(field.value, 'fr');
    assert.equal(pills(ui)[0].textContent, 'Inherit (French)');
    assert.equal(pills(ui)[0].getAttribute('aria-pressed'), 'true');
    assert.deepEqual(ui.getValue(), { inherit: true, value: 'en' });
});

test('Override turns the field back on with its own value and reports it', function () {
    var changes = [];
    var field = dom.el('input', { type: 'number' });
    var ui = createInheritField({ field: field, inheritedValue: 30, value: { value: '45' }, onChange: function (v) { changes.push(v); } });
    dom.document.body.appendChild(ui.element);
    assert.equal(field.value, '30');
    pills(ui)[1].click();
    assert.equal(field.disabled, false);
    assert.equal(field.value, '45');
    assert.deepEqual(changes[0], { inherit: false, value: '45' });
    field.value = '50';
    pills(ui)[0].click();
    assert.equal(field.value, '30');
    assert.deepEqual(ui.getValue(), { inherit: true, value: '50' });
});

test('an adorned number moves with its box, so its arrows stay beside it', async function () {
    var { adornField } = await import('../../src/js/field-adornments.js');
    var host = dom.el('div');
    var field = dom.el('input', { type: 'number' });
    host.appendChild(field);
    dom.document.body.appendChild(host);
    adornField(field);
    var ui = createInheritField({ field: field, inheritedValue: 4 });
    assert.ok(field.parentNode.classList.contains('base-adorned'));
    assert.ok(field.parentNode.parentNode.classList.contains('base-inherit-field'));
    assert.equal(host.children[0], ui.element);
});

test('a checkbox reads On or Off, and the checkbox toggle overrides', function () {
    var field = dom.el('input', { type: 'checkbox' });
    var ui = createInheritField({ field: field, inheritedValue: true, toggle: 'checkbox', value: { inherit: true, value: false } });
    dom.document.body.appendChild(ui.element);
    assert.equal(field.checked, true);
    var box = ui.element.querySelector('.base-inherit-toggle input');
    assert.equal(box.checked, false);
    box.checked = true;
    box.dispatch('change');
    assert.equal(field.checked, false);
    assert.deepEqual(ui.getValue(), { inherit: false, value: false });
});

test('it wraps a Base field handle and disables every control inside it', function () {
    var el = dom.el('div');
    var input = dom.el('input');
    el.appendChild(input);
    var stored = 'own';
    var handle = { element: el, getValue: function () { return stored; }, setValue: function (v) { stored = v; input.value = v; } };
    var ui = createInheritField({ field: handle, inheritedValue: 'parent', inheritText: 'Use {value}' });
    assert.equal(input.disabled, true);
    assert.equal(stored, 'parent');
    assert.equal(pills(ui)[0].textContent, 'Use parent');
    ui.setValue({ inherit: false });
    assert.equal(input.disabled, false);
    assert.equal(stored, 'own');
});

test('setValue and setInherited update the state, and setValue keeps a disabled control disabled after override', function () {
    var field = dom.el('input');
    field.disabled = true;
    var ui = createInheritField({ field: field, inheritedValue: 'a' });
    ui.setInherited('b');
    assert.equal(field.value, 'b');
    ui.setValue({ inherit: false, value: 'mine' });
    assert.equal(field.value, 'mine');
    assert.equal(field.disabled, true);
    assert.throws(function () { createInheritField({}); }, /field/);
});
