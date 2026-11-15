// Tests the Checkbox component and the checkbox core it is built on.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fake-dom.mjs';

installFakeDom();
var { createCheckbox } = await import('../../src/js/checkbox.js');
var { makeCheck, makeCheckRow } = await import('../../src/js/lib/check.js');

test('the core makes a box in the shared look, a radio on request, and a row label around it with its text', function () {
    var box = makeCheck('extra', { 'data-id': '7' });
    assert.equal(box.getAttribute('type'), 'checkbox');
    assert.ok(box.classList.contains('base-check-row-input') && box.classList.contains('extra'));
    assert.equal(box.getAttribute('data-id'), '7');
    assert.equal(makeCheck(null, null, 'radio').getAttribute('type'), 'radio');
    var row = makeCheckRow(box, 'Movies', 'mine');
    assert.equal(row.tagName, 'LABEL');
    assert.ok(row.classList.contains('base-check-row') && row.classList.contains('mine'));
    assert.equal(row.children[0], box);
    assert.equal(row.querySelector('.base-check-label').textContent, 'Movies');
    assert.equal(makeCheckRow(makeCheck(), null).children.length, 1);
});

test('a checkbox shows its label beside the box, starts as set, and reports a change by the reader', function () {
    var seen = [];
    var cb = createCheckbox({ label: 'Sync ratings', checked: true, onChange: function (on) { seen.push(on); } });
    assert.ok(cb.element.classList.contains('base-checkbox'));
    assert.equal(cb.element.querySelector('.base-check-label').textContent, 'Sync ratings');
    assert.equal(cb.getValue(), true);
    cb.input.checked = false;
    cb.input.dispatch('change');
    assert.deepEqual(seen, [false]);
    cb.setValue(true);
    assert.equal(cb.getValue(), true);
    assert.deepEqual(seen, [false], 'setValue does not report');
});

test('with no label the box is named by ariaLabel, and field stands it a field tall', function () {
    var cb = createCheckbox({ ariaLabel: 'Enabled', field: true });
    assert.equal(cb.input.getAttribute('aria-label'), 'Enabled');
    assert.equal(cb.element.querySelector('.base-check-label'), null);
    assert.ok(cb.element.classList.contains('field'));
    var boxed = createCheckbox({ label: 'Enabled', boxed: true });
    assert.ok(boxed.element.classList.contains('boxed') && boxed.element.classList.contains('field'), 'boxed is field tall in a text box frame');
    assert.ok(!createCheckbox({ label: 'A', size: 'large', boxed: true }).element.classList.contains('boxed'), 'a tile has its own frame');
    cb.setLabel('Enabled');
    assert.equal(cb.element.querySelector('.base-check-label').textContent, 'Enabled');
    assert.equal(cb.input.getAttribute('aria-label'), null);
});

test('partly on clears on a change, and disabled dims it and stops the box', function () {
    var cb = createCheckbox({ label: 'Some', indeterminate: true });
    assert.equal(cb.input.indeterminate, true);
    cb.input.checked = true;
    cb.input.dispatch('change');
    assert.equal(cb.input.indeterminate, false);
    cb.setDisabled(true);
    assert.equal(cb.input.disabled, true);
    assert.ok(cb.element.classList.contains('disabled'));
    cb.setDisabled(false);
    assert.ok(!cb.element.classList.contains('disabled'));
    cb.destroy();
});

test('small is the default size, medium and large are on request, and a large tile carries its state and description', function () {
    assert.ok(createCheckbox({ label: 'A' }).element.classList.contains('small'));
    assert.ok(createCheckbox({ label: 'A', size: 'medium' }).element.classList.contains('medium'));
    var tile = createCheckbox({ label: 'Sync watched', description: 'Played and resume points.', size: 'large', field: true });
    assert.ok(tile.element.classList.contains('large'));
    assert.ok(!tile.element.classList.contains('field'), 'a tile is never field tall');
    assert.equal(tile.element.querySelector('.base-check-sub').textContent, 'Played and resume points.');
    assert.ok(!tile.element.classList.contains('checked'));
    tile.input.checked = true;
    tile.input.dispatch('change');
    assert.ok(tile.element.classList.contains('checked'));
    tile.setValue(false);
    assert.ok(!tile.element.classList.contains('checked'));
    tile.setDescription('');
    assert.equal(tile.element.querySelector('.base-check-sub').hidden, true);
});
