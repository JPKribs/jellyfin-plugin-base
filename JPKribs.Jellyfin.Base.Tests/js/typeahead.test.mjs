// Tests for the typeahead core, its shell, its debounced source, and the bag's createDebouncedSearch, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fake-dom.mjs';

var dom = installFakeDom();
var { createTypeahead, debouncedSource } = await import('../../src/js/lib/typeahead.js');
var { createSearchField, createChipSelect, createMediaPicker, createShared } = await import('../../src/js/index.js');

beforeEach(function () {
    dom = installFakeDom();
});

afterEach(function () {
    delete globalThis.ApiClient;
});

function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

function rect(left, top, width, height) {
    return { left: left, top: top, width: width, height: height, right: left + width, bottom: top + height };
}

function shell(extra) {
    var ta = createTypeahead(Object.assign({
        source: function (q, answer) { answer(['one', 'two', 'three']); },
        render: function (item, option) { option.textContent = item; },
        onChoose: function () {}
    }, extra));
    dom.document.body.appendChild(ta.element);
    return ta;
}

function type(input, text) {
    input.value = text;
    input.dispatch('input');
}

test('debouncedSource passes only the answer to the latest call', function () {
    var answers = {};
    var got = [];
    var ask = debouncedSource(function (q, answer) { answers[q] = answer; });
    ask('a', function (list) { got.push(list); }, function () {});
    ask('ab', function (list) { got.push(list); }, function () {});
    answers.ab(['new']);
    answers.a(['old']);
    assert.deepEqual(got, [['new']]);
});

test('debouncedSource waits the delay, and cancel drops the wait and an answer still due', async function () {
    var calls = [];
    var pending = null;
    var got = [];
    var ask = debouncedSource(function (q, answer) { calls.push(q); pending = answer; }, 5);
    ask('a', function (list) { got.push(list); }, function () {});
    ask('ab', function (list) { got.push(list); }, function () {});
    assert.deepEqual(calls, []);
    await wait(15);
    assert.deepEqual(calls, ['ab']);
    ask.cancel();
    pending(['late']);
    assert.deepEqual(got, []);
    ask('x', function () {}, function () {});
    ask.cancel();
    await wait(15);
    assert.deepEqual(calls, ['ab']);
});

test('debouncedSource fails when the source throws or calls fail, and drops a stale failure', function () {
    var fails = 0;
    var failers = [];
    debouncedSource(function () { throw new Error('down'); })('q', function () {}, function () { fails++; });
    assert.equal(fails, 1);
    var ask = debouncedSource(function (q, answer, fail) { failers.push(fail); });
    ask('a', function () {}, function () { fails++; });
    ask('b', function () {}, function () { fails++; });
    failers[0]();
    assert.equal(fails, 1);
    failers[1]();
    assert.equal(fails, 2);
});

test('createTypeahead builds the base-combo shell with a plain input, its dropdown, and a trailing search icon', function () {
    var ta = shell({ placeholder: 'Movies', dropdownClass: 'extra' });
    assert.ok(ta.element.classList.contains('base-combo'));
    assert.equal(ta.input.placeholder, 'Movies');
    assert.ok(ta.input.classList.contains('base-edit-input'));
    assert.ok(ta.dropdown.classList.contains('base-combo-dropdown'));
    assert.ok(ta.dropdown.classList.contains('extra'));
    assert.equal(ta.dropdown.parentNode, ta.element);
    assert.equal(ta.dropdown.hidden, true);
    assert.ok(ta.input.parentNode.classList.contains('base-adorned-search'));
    assert.equal(ta.element.querySelector('.base-adorned-icon').textContent, 'search');
    assert.ok(ta.status.classList.contains('base-empty-inline'));
});

test('createTypeahead places a given search field in the shell and adds no second icon', function () {
    var field = createSearchField({ placeholder: 'Find' });
    var ta = shell({ field: field });
    assert.equal(ta.input, field.input);
    assert.equal(ta.element.children[0], field.element);
    assert.equal(ta.element.querySelector('.base-adorned-icon'), null);
});

test('the dropdown opens as a fixed popover as wide as the input box, and closes with its hidden attribute', function () {
    var ta = shell();
    ta.input.parentNode._rect = rect(20, 100, 300, 32);
    ta.dropdown._rect = rect(0, 0, 300, 90);
    type(ta.input, 't');
    assert.equal(ta.isOpen(), true);
    assert.equal(ta.dropdown.hidden, false);
    assert.equal(ta.dropdown.classList.contains('hidden'), false);
    assert.equal(ta.dropdown.style['--base-combo-width'], '300px');
    assert.equal(parseFloat(ta.dropdown.style.top), 140);
    assert.equal(parseFloat(ta.dropdown.style.left), 20);
    ta.close();
    assert.equal(ta.dropdown.hidden, true);
    assert.equal(ta.dropdown.classList.contains('hidden'), true);
});

test('the dropdown flips above near the bottom and stays inside a 375 pixel screen', function () {
    globalThis.innerWidth = 375;
    globalThis.innerHeight = 600;
    var ta = shell();
    ta.input.parentNode._rect = rect(16, 540, 343, 32);
    ta.dropdown._rect = rect(0, 0, 343, 150);
    type(ta.input, 't');
    assert.equal(parseFloat(ta.dropdown.style.top), 540 - 8 - 150);
    assert.equal(parseFloat(ta.dropdown.style.left), 16);
});

test('the dropdown follows a scroll and takes the new width on a resize', function () {
    var ta = shell();
    var box = ta.input.parentNode;
    box._rect = rect(20, 100, 300, 32);
    ta.dropdown._rect = rect(0, 0, 300, 90);
    type(ta.input, 't');
    box._rect = rect(20, 60, 300, 32);
    dom.dispatchWindow('scroll');
    assert.equal(parseFloat(ta.dropdown.style.top), 100);
    box._rect = rect(10, 60, 250, 32);
    dom.dispatchWindow('resize');
    assert.equal(ta.dropdown.style['--base-combo-width'], '250px');
    assert.equal(parseFloat(ta.dropdown.style.left), 10);
    ta.close();
    assert.equal(dom.windowListeners('resize'), 0);
    assert.equal(dom.windowListeners('scroll'), 0);
});

test('destroy closes the popover and removes every window listener', function () {
    var ta = shell();
    type(ta.input, 't');
    ta.destroy();
    assert.equal(ta.dropdown.hidden, true);
    assert.equal(dom.windowListeners('resize'), 0);
    assert.equal(dom.windowListeners('scroll'), 0);
});

test('a chip select matches its static options by label without regard to case', function () {
    var select = createChipSelect({ options: [{ value: 1, label: 'Alpha' }, 'beta', { value: 3, label: 'ALPINE' }] });
    dom.document.body.appendChild(select.element);
    var input = select.element.querySelector('input');
    type(input, 'alp');
    var labels = Array.prototype.map.call(select.element.querySelectorAll('.base-combo-option'), function (o) { return o.textContent; });
    assert.deepEqual(labels, ['Alpha', 'ALPINE']);
});

test('the media picker shows the list empty text after the list, and hides it once an item is picked', function () {
    var picker = createMediaPicker({ emptyText: 'Nothing yet.' });
    var list = picker.element.querySelector('.base-media-picker-items');
    var empty = picker.element.querySelector('.base-list-empty');
    assert.ok(empty.classList.contains('outside'));
    assert.ok(empty.classList.contains('base-media-picker-empty'));
    assert.equal(empty.textContent, 'Nothing yet.');
    var kids = Array.prototype.slice.call(picker.element.children);
    assert.equal(kids[kids.indexOf(list) + 1], empty);
    assert.equal(empty.hidden, false);
    picker.setValue([{ Id: 'm1', Name: 'Alpha', Type: 'Movie' }]);
    assert.equal(empty.hidden, true);
});

test('createDebouncedSearch passes only the latest answer, and a short query cancels one still due', async function () {
    var resolvers = {};
    globalThis.ApiClient = {
        getUrl: function (u) { return u; },
        fetch: function (o) { return new Promise(function (r) { resolvers[o.url] = r; }); }
    };
    var search = createShared(dom.el('div'), 'p').createDebouncedSearch('Find', 1);
    var got = [];
    search('al', function (r) { got.push(r); });
    await wait(10);
    search('alp', function (r) { got.push(r); });
    await wait(10);
    resolvers['Find?query=alp'](['new']);
    resolvers['Find?query=al'](['old']);
    await wait(0);
    assert.deepEqual(got, [['new']]);
    search('beta', function (r) { got.push(r); });
    search('b', function (r) { got.push(r); });
    await wait(10);
    assert.equal(resolvers['Find?query=beta'], undefined);
    assert.deepEqual(got, [['new'], []]);
});
