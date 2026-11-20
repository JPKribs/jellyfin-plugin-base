// Behavior tests for createCompareTable, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, all } from './fake-dom.mjs';

var dom = installFakeDom();
var { createCompareTable } = await import('../../src/js/compare-table.js');

beforeEach(function () {
    dom = installFakeDom();
});

var ROWS = [
    { key: 'title', label: 'Title', values: { source: 'Alien', local: 'Alien', after: 'Alien' } },
    { key: 'year', label: 'Year', values: { source: 1979, local: 1980, after: 1979 } },
    { key: 'rating', label: 'Rating', values: { source: 'R', local: '', after: 'R' } }
];

function keys(t) { return all(t.element, '.base-data-row').map(function (r) { return r.getAttribute('data-key'); }); }

test('it is a Data Table of a property column and the source, local, and after sync columns', function () {
    var t = createCompareTable({ rows: ROWS });
    assert.ok(t.element.classList.contains('base-data-table'));
    assert.deepEqual(all(t.element, '.base-data-heading .base-data-label').map(function (h) { return h.textContent; }), ['Property', 'Source', 'Local', 'After sync']);
    assert.deepEqual(keys(t), ['title', 'year', 'rating']);
});

test('a row whose values differ is marked changed, and each differing value is marked', function () {
    var t = createCompareTable({ rows: ROWS });
    var rows = all(t.element, '.base-data-row');
    assert.equal(rows[0].classList.contains('changed'), false);
    assert.equal(rows[1].classList.contains('changed'), true);
    assert.deepEqual(all(rows[1], '.base-compare-value').map(function (v) { return v.classList.contains('differs'); }), [false, true, false]);
    assert.equal(all(rows[2], '.base-compare-value')[1].textContent, 'None');
    assert.deepEqual(t.getChanged(), ['year', 'rating']);
});

test('Show Only Changes hides the rows that match, and a second press shows them again', function () {
    var seen = [];
    var t = createCompareTable({ rows: ROWS, onChange: function (on) { seen.push(on); } });
    var toggle = t.element.querySelector('.base-compare-toggle');
    assert.equal(toggle.getAttribute('aria-pressed'), 'false');
    toggle.click();
    assert.equal(toggle.getAttribute('aria-pressed'), 'true');
    assert.deepEqual(keys(t), ['year', 'rating']);
    assert.ok(all(t.element, '.base-data-row').every(function (r) { return r.classList.contains('changed'); }));
    toggle.click();
    assert.deepEqual(keys(t), ['title', 'year', 'rating']);
    assert.deepEqual(seen, [true, false]);
});

test('with only changes on and none changed it says so', function () {
    var t = createCompareTable({ rows: [ROWS[0]], onlyChanges: true });
    assert.deepEqual(keys(t), []);
    assert.equal(t.element.querySelector('.base-list-empty').textContent, 'No changes.');
});

var GROUPED = [
    { section: 'Metadata' },
    { key: 'title', label: 'Title', values: { source: 'Alien', local: 'Alien', after: 'Alien' } },
    { key: 'year', label: 'Year', values: { source: 1979, local: 1980, after: 1979 } },
    { note: 'Changed because the year differs.' },
    { section: 'Genres' },
    { key: 'genres', label: 'Genres', values: { source: 'Horror', local: 'Horror', after: 'Horror' } },
    { note: 'Genres match.' },
    { section: 'Tags', key: 'tags' }
];

function kinds(t) {
    return all(t.element, '.base-data-row').map(function (r) {
        return r.classList.contains('base-compare-section') ? 'section' : r.classList.contains('base-compare-note') ? 'note' : r.getAttribute('data-key');
    });
}

test('a section and a note draw one row each across every column, and only compared rows count as changed', function () {
    var t = createCompareTable({ rows: GROUPED });
    // The Tags section has no rows under it, so it hides even with every row shown.
    assert.deepEqual(kinds(t), ['section', 'title', 'year', 'note', 'section', 'genres', 'note']);
    var rows = all(t.element, '.base-data-row');
    assert.equal(rows[0].querySelector('.base-compare-section-text').textContent, 'Metadata');
    assert.equal(rows[3].querySelector('.base-compare-note-text').textContent, 'Changed because the year differs.');
    assert.equal(rows[0].classList.contains('changed'), false);
    assert.equal(all(rows[0], '.base-compare-value').length, 0);
    assert.deepEqual(t.getChanged(), ['year']);
});

test('with only changes shown, a section hides while no row under it shows, and a note shows only after a shown row', function () {
    var t = createCompareTable({ rows: GROUPED, onlyChanges: true });
    assert.deepEqual(kinds(t), ['section', 'year', 'note']);
    t.setOnlyChanges(false);
    assert.deepEqual(kinds(t), ['section', 'title', 'year', 'note', 'section', 'genres', 'note']);
});

test('a note after an unchanged row hides with it, and a key given to a section is kept', function () {
    var t = createCompareTable({ rows: [
        { section: 'Images', key: 'images' },
        { key: 'year', label: 'Year', values: { source: 1, local: 2, after: 1 } },
        { key: 'size', label: 'Size', values: { source: 5, local: 5, after: 5 } },
        { note: 'Sizes are summed.' }
    ], onlyChanges: true });
    assert.deepEqual(kinds(t), ['section', 'year']);
    assert.equal(all(t.element, '.base-data-row')[0].getAttribute('data-key'), 'images');
});
