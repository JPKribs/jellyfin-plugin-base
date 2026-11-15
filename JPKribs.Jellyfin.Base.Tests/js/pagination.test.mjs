// Behavior tests for createPagination, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, all } from './fake-dom.mjs';

var dom = installFakeDom();
var { createPagination } = await import('../../src/js/index.js');

beforeEach(function () {
    dom = installFakeDom();
});

function build(extra) {
    var changes = [];
    var pager = createPagination(Object.assign({ total: 95, pageSize: 10, onChange: function (v) { changes.push(v); } }, extra));
    dom.document.body.appendChild(pager.element);
    return { pager: pager, changes: changes };
}

function numbers(ui) { return all(ui.pager.element, '.base-pager-number').map(function (b) { return b.textContent; }); }
function summary(ui) { return ui.pager.element.querySelector('.base-pager-total').textContent; }

test('it is a labelled nav with the total text, and the label and text can be replaced', function () {
    var ui = build();
    assert.equal(ui.pager.element.tagName, 'NAV');
    assert.equal(ui.pager.element.getAttribute('aria-label'), 'Pagination');
    assert.equal(summary(ui), '1 to 10 of 95');
    var custom = build({ navLabel: 'Pages', totalText: 'Showing {from}-{to} of {total}' });
    assert.equal(custom.pager.element.getAttribute('aria-label'), 'Pages');
    assert.equal(summary(custom), 'Showing 1-10 of 95');
});

test('an empty list shows the empty text and one disabled page', function () {
    var ui = build({ total: 0 });
    assert.equal(summary(ui), 'No items.');
    assert.equal(ui.pager.element.querySelector('.base-pager-prev').disabled, true);
    assert.equal(ui.pager.element.querySelector('.base-pager-next').disabled, true);
    assert.equal(build({ total: 0, emptyText: 'Nothing.' }).pager.element.querySelector('.base-pager-total').textContent, 'Nothing.');
});

test('getValue gives page, size, skip, take, total, and page count', function () {
    var ui = build({ page: 3 });
    assert.deepEqual(ui.pager.getValue(), { page: 3, pageSize: 10, skip: 20, take: 10, total: 95, pageCount: 10 });
});

test('Next and Previous change the page and report it, and disable at the ends', function () {
    var ui = build();
    var prev = ui.pager.element.querySelector('.base-pager-prev');
    var next = ui.pager.element.querySelector('.base-pager-next');
    assert.equal(prev.disabled, true);
    next.click();
    assert.equal(ui.pager.getValue().page, 2);
    assert.equal(ui.changes[0].skip, 10);
    ui.pager.element.querySelector('.base-pager-prev').click();
    assert.equal(ui.pager.getValue().page, 1);
    ui.pager.setValue({ page: 10 });
    assert.equal(ui.pager.element.querySelector('.base-pager-next').disabled, true);
});

test('page numbers show the first, the last, and a window with gaps, and the current one is marked', function () {
    var ui = build({ total: 300, pageSize: 10, page: 15, windowSize: 3 });
    assert.deepEqual(numbers(ui), ['1', '14', '15', '16', '30']);
    assert.equal(ui.pager.element.querySelectorAll('.base-pager-gap').length, 2);
    var current = ui.pager.element.querySelector('.base-pager-number.active');
    assert.equal(current.textContent, '15');
    assert.equal(current.getAttribute('aria-current'), 'page');
    assert.equal(current.getAttribute('aria-label'), 'Page 15');
    assert.deepEqual(numbers(build({ total: 25, pageSize: 10 })), ['1', '2', '3']);
});

test('clicking a number goes to that page', function () {
    var ui = build();
    all(ui.pager.element, '.base-pager-number').filter(function (b) { return b.textContent === '4'; })[0].click();
    assert.equal(ui.pager.getValue().page, 4);
    assert.equal(ui.changes.length, 1);
});

test('changing the page size returns to page 1 and reports it, and the select lists the sizes', function () {
    var ui = build({ page: 3 });
    var select = ui.pager.element.querySelector('select');
    assert.deepEqual(all(select, 'option').map(function (o) { return o.textContent; }), ['10', '25', '50', '100']);
    select.value = '25';
    select.dispatch('change');
    assert.equal(ui.pager.getValue().page, 1);
    assert.equal(ui.pager.getValue().pageSize, 25);
    assert.equal(ui.changes[0].take, 25);
    assert.equal(build({ pageSize: 7 }).pager.element.querySelectorAll('option').length, 5);
});

test('setResult reads TotalCount or totalCount from a PagedResult, and a page past the end moves to the last', function () {
    var ui = build({ page: 9 });
    ui.pager.setResult({ Items: [], TotalCount: 30 });
    assert.equal(ui.pager.getValue().total, 30);
    assert.equal(ui.pager.getValue().page, 3);
    ui.pager.setResult({ totalCount: 5 });
    assert.equal(ui.pager.getValue().total, 5);
    ui.pager.setTotal(40);
    assert.equal(ui.pager.getValue().pageCount, 4);
});

test('every default label can be replaced', function () {
    var ui = build({ previousText: 'Back', nextText: 'Forward', pageSizeLabel: 'Rows', pageLabel: 'Go to {value}' });
    assert.equal(ui.pager.element.querySelector('.base-pager-prev').textContent, 'Back');
    assert.equal(ui.pager.element.querySelector('.base-pager-next').textContent, 'Forward');
    assert.equal(ui.pager.element.querySelector('.base-pager-size span').textContent, 'Rows');
    assert.equal(ui.pager.element.querySelector('.base-pager-number').getAttribute('aria-label'), 'Go to 1');
    var defaults = build();
    assert.equal(defaults.pager.element.querySelector('.base-pager-prev').textContent, 'Previous');
    assert.equal(defaults.pager.element.querySelector('.base-pager-next').textContent, 'Next');
    assert.equal(defaults.pager.element.querySelector('.base-pager-size span').textContent, 'Page Size');
});

test('destroy removes the select listener', function () {
    var ui = build();
    ui.pager.destroy();
    assert.equal(ui.pager.element.querySelector('select').listeners.change.length, 0);
});

test('a click on Next, Previous, or a page number keeps focus on the same control after the redraw', function () {
    var ui = build();
    var next = ui.pager.element.querySelector('.base-pager-next');
    next.focus();
    next.click();
    assert.equal(dom.document.activeElement, ui.pager.element.querySelector('.base-pager-next'));
    assert.equal(dom.document.activeElement.disabled, false);
    ui.pager.element.querySelector('.base-pager-next').click();
    var prev = ui.pager.element.querySelector('.base-pager-prev');
    prev.focus();
    prev.click();
    assert.equal(ui.pager.getValue().page, 2);
    assert.equal(dom.document.activeElement, ui.pager.element.querySelector('.base-pager-prev'));
    var three = all(ui.pager.element, '.base-pager-number').filter(function (b) { return b.textContent === '3'; })[0];
    three.focus();
    three.click();
    assert.equal(dom.document.activeElement, ui.pager.element.querySelector('.base-pager-number.active'));
    assert.equal(dom.document.activeElement.textContent, '3');
});

test('focus moves to the current page when the control it was on is now disabled', function () {
    var ui = build({ total: 20 });
    var next = ui.pager.element.querySelector('.base-pager-next');
    next.focus();
    next.click();
    assert.equal(ui.pager.element.querySelector('.base-pager-next').disabled, true);
    assert.equal(dom.document.activeElement, ui.pager.element.querySelector('.base-pager-number.active'));
});

test('createPagination puts size small or large on data-base-size, and leaves it off for medium or no size', function () {
    function build(size) { return createPagination({ size: size }); }
    assert.equal(build('small').element.getAttribute('data-base-size'), 'small');
    assert.equal(build('large').element.getAttribute('data-base-size'), 'large');
    assert.equal(build('medium').element.hasAttribute('data-base-size'), false);
    assert.equal(build(undefined).element.hasAttribute('data-base-size'), false);
});
