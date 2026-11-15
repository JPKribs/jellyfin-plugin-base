// Behavior tests for the selection core in lib/selection.ts that the paginated table and the checkbox list share.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fake-dom.mjs';

var dom = installFakeDom();
var { createSelection } = await import('../../src/js/lib/selection.js');

beforeEach(function () {
    dom = installFakeDom();
});

test('select, toggle, and has compare ids as text, and getIds keeps the order they were picked', function () {
    var heard = [];
    var s = createSelection({ onChange: function (ids) { heard.push(ids); } });
    s.select(3);
    s.select('1');
    assert.equal(s.has('3'), true);
    assert.equal(s.has(1), true);
    assert.deepEqual(s.getIds(), ['3', '1']);
    assert.equal(s.toggle(3), false);
    assert.deepEqual(s.getIds(), ['1']);
    assert.deepEqual(heard, [['3'], ['3', '1'], ['1']]);
});

test('selecting an id already picked does not call onChange, and clear always does', function () {
    var calls = 0;
    var s = createSelection({ ids: ['a'], onChange: function () { calls++; } });
    s.select('a');
    s.select('b', false);
    assert.equal(calls, 0);
    s.clear();
    s.clear();
    assert.equal(calls, 2);
    assert.equal(s.size(), 0);
});

test('selectAll sets only the ids given and calls onChange once', function () {
    var heard = [];
    var s = createSelection({ ids: ['x'], onChange: function (ids) { heard.push(ids); } });
    s.selectAll(['a', 'b']);
    assert.deepEqual(s.getIds(), ['x', 'a', 'b']);
    s.selectAll(['a', 'b'], false);
    assert.deepEqual(s.getIds(), ['x']);
    assert.equal(heard.length, 2);
});

test('boxState is checked for all, indeterminate for some, and clear for none or no rows', function () {
    var s = createSelection({ ids: ['a'] });
    assert.deepEqual(s.boxState(['a']), { checked: true, indeterminate: false });
    assert.deepEqual(s.boxState(['a', 'b']), { checked: false, indeterminate: true });
    assert.deepEqual(s.boxState(['b']), { checked: false, indeterminate: false });
    assert.deepEqual(s.boxState([]), { checked: false, indeterminate: false });
    var box = dom.el('input', { type: 'checkbox' });
    s.syncBox(box, ['a', 'b']);
    assert.equal(box.indeterminate, true);
    assert.equal(box.checked, false);
});

test('matchKey decides when two ids are the same, and setIds replaces them without onChange', function () {
    var calls = 0;
    var s = createSelection({ matchKey: function (id) { return String(id).toLowerCase().replace(/-/g, ''); }, onChange: function () { calls++; } });
    s.setIds(['AB-CD']);
    assert.equal(s.has('abcd'), true);
    assert.deepEqual(s.getIds(), ['abcd']);
    assert.equal(calls, 0);
});
