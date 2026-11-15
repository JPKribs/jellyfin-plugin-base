// Tests that a slow search answer never overwrites a newer one or reopens a closed dropdown, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fake-dom.mjs';

var dom = installFakeDom();
var { createChipSelect, createShared } = await import('../../src/js/index.js');

beforeEach(function () {
    dom = installFakeDom();
});

// A search source whose answers the test releases by hand.
function source() {
    var pending = [];
    return {
        pending: pending,
        searchFn: function (query, cb) { pending.push({ query: query, cb: cb }); }
    };
}

function chip(src) {
    var select = createChipSelect({ searchFn: src.searchFn });
    dom.document.body.appendChild(select.element);
    var input = select.element.querySelector('input');
    var dropdown = select.element.querySelector('.base-combo-dropdown');
    return { select: select, input: input, dropdown: dropdown, labels: function () { return dropdown.querySelectorAll('.base-combo-option').length ? Array.prototype.map.call(dropdown.querySelectorAll('.base-combo-option'), function (o) { return o.textContent; }) : []; } };
}

function combo(src) {
    var shared = createShared(dom.el('div'), 'p');
    var box = shared.createSearchableComboBox({ searchFn: src.searchFn });
    dom.document.body.appendChild(box.element);
    var input = box.element.querySelector('input');
    var dropdown = box.element.querySelector('.base-combo-dropdown');
    return { box: box, input: input, dropdown: dropdown, labels: function () { return Array.prototype.map.call(dropdown.querySelectorAll('.base-combo-option'), function (o) { return o.textContent; }); } };
}

[['chip select', chip], ['combo box', combo]].forEach(function (kind) {
    var name = kind[0];
    var build = kind[1];

    test(name + ': an older, slower answer does not replace a newer one', function () {
        var src = source();
        var ui = build(src);
        ui.input.value = 'a';
        ui.input.dispatch('input');
        ui.input.value = 'ab';
        ui.input.dispatch('input');
        src.pending[1].cb([{ value: 'b', label: 'Beta' }]);
        src.pending[0].cb([{ value: 'a', label: 'Alpha' }, { value: 'c', label: 'Gamma' }]);
        assert.deepEqual(ui.labels(), ['Beta']);
    });

    test(name + ': an answer that arrives after Escape does not reopen the dropdown', function () {
        var src = source();
        var ui = build(src);
        ui.input.value = 'a';
        ui.input.dispatch('input');
        ui.input.dispatch('keydown', { key: 'Escape' });
        src.pending[0].cb([{ value: 'a', label: 'Alpha' }]);
        assert.equal(ui.input.getAttribute('aria-expanded'), 'false');
        assert.equal(ui.dropdown.classList.contains('hidden'), true);
    });

    test(name + ': an answer that arrives after the input lost focus does not reopen the dropdown', function () {
        var src = source();
        var ui = build(src);
        ui.input.value = 'a';
        ui.input.dispatch('input');
        ui.input.dispatch('blur');
        src.pending[0].cb([{ value: 'a', label: 'Alpha' }]);
        assert.equal(ui.input.getAttribute('aria-expanded'), 'false');
    });

    test(name + ': an answer that arrives after a click outside does not reopen the dropdown', function () {
        var src = source();
        var ui = build(src);
        ui.input.value = 'a';
        ui.input.dispatch('input');
        dom.document.body.dispatch('click');
        src.pending[0].cb([{ value: 'a', label: 'Alpha' }]);
        assert.equal(ui.input.getAttribute('aria-expanded'), 'false');
    });

    test(name + ': an answer that arrives after destroy is dropped', function () {
        var src = source();
        var ui = build(src);
        ui.input.value = 'a';
        ui.input.dispatch('input');
        (ui.select || ui.box).destroy();
        src.pending[0].cb([{ value: 'a', label: 'Alpha' }]);
        assert.equal(ui.input.getAttribute('aria-expanded'), 'false');
    });

    test(name + ': the latest answer still opens the dropdown', function () {
        var src = source();
        var ui = build(src);
        ui.input.value = 'a';
        ui.input.dispatch('input');
        src.pending[0].cb([{ value: 'a', label: 'Alpha' }]);
        assert.equal(ui.input.getAttribute('aria-expanded'), 'true');
        assert.deepEqual(ui.labels(), ['Alpha']);
    });
});

test('chip select: an answer that arrives after a pick is dropped', function () {
    var src = source();
    var ui = chip(src);
    ui.input.value = 'a';
    ui.input.dispatch('input');
    src.pending[0].cb([{ value: 'a', label: 'Alpha' }]);
    ui.input.value = 'al';
    ui.input.dispatch('input');
    ui.dropdown.querySelectorAll('.base-combo-option')[0].dispatch('mousedown');
    src.pending[1].cb([{ value: 'x', label: 'Late' }]);
    assert.deepEqual(ui.select.getValue(), ['a']);
    assert.equal(ui.input.getAttribute('aria-expanded'), 'false');
});

test('combo box: an answer that arrives after a pick is dropped', function () {
    var src = source();
    var ui = combo(src);
    ui.input.value = 'a';
    ui.input.dispatch('input');
    src.pending[0].cb([{ value: 'a', label: 'Alpha' }]);
    ui.input.value = 'al';
    ui.input.dispatch('input');
    ui.dropdown.querySelectorAll('.base-combo-option')[0].dispatch('mousedown');
    src.pending[1].cb([{ value: 'x', label: 'Late' }]);
    assert.equal(ui.box.getValue(), 'a');
    assert.equal(ui.input.getAttribute('aria-expanded'), 'false');
});
