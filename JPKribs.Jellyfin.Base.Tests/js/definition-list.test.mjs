// Behavior tests for createDefinitionList, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fake-dom.mjs';

var dom = installFakeDom();
var { createDefinitionList } = await import('../../src/js/index.js');

beforeEach(function () {
    dom = installFakeDom();
});

test('it is a dl with a dt and a dd per item', function () {
    var list = createDefinitionList({ items: [{ label: 'Version', value: '1.2.0' }, { label: 'Id', value: 'abc', mono: true }] });
    assert.equal(list.element.tagName, 'DL');
    var rows = list.element.querySelectorAll('.jpk-defs-row');
    assert.equal(rows.length, 2);
    assert.equal(rows[0].querySelector('dt').textContent, 'Version');
    assert.equal(rows[0].querySelector('dd').textContent, '1.2.0');
    assert.ok(rows[1].querySelector('dd').classList.contains('jpk-mono'));
    assert.equal(rows[0].querySelector('dd').classList.contains('jpk-mono'), false);
});

test('a missing value shows the empty text, which can be replaced, and a zero shows as 0', function () {
    var list = createDefinitionList({ items: [{ label: 'A' }, { label: 'B', value: 0 }] });
    var values = list.element.querySelectorAll('dd');
    assert.equal(values[0].textContent, 'None');
    assert.ok(values[0].classList.contains('jpk-defs-missing'));
    assert.equal(values[1].textContent, '0');
    var custom = createDefinitionList({ emptyText: 'Not Set', items: [{ label: 'A', value: '' }] });
    assert.equal(custom.element.querySelector('dd').textContent, 'Not Set');
});

test('setValue and setItems replace the rows, and getValue returns a copy', function () {
    var list = createDefinitionList();
    assert.equal(list.element.querySelectorAll('.jpk-defs-row').length, 0);
    list.setValue([{ label: 'A', value: '1' }]);
    list.setItems([{ label: 'B', value: '2' }, { label: 'C', value: '3' }]);
    assert.equal(list.element.querySelectorAll('.jpk-defs-row').length, 2);
    var copy = list.getValue();
    copy.pop();
    assert.equal(list.getValue().length, 2);
});

test('destroy empties the list', function () {
    var list = createDefinitionList({ items: [{ label: 'A', value: '1' }] });
    list.destroy();
    assert.equal(list.element.children.length, 0);
});
