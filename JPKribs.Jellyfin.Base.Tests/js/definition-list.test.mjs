// Behavior tests for createDefinitionList, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fake-dom.mjs';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

var dom = installFakeDom();
var { createDefinitionList } = await import('../../src/js/index.js');


beforeEach(function () {
    dom = installFakeDom();
});

test('it is a dl with a dt and a dd per item', function () {
    var list = createDefinitionList({ items: [{ label: 'Version', value: '1.2.0' }, { label: 'Id', value: 'abc', mono: true }] });
    assert.equal(list.element.tagName, 'DL');
    var rows = list.element.querySelectorAll('.base-defs-row');
    assert.equal(rows.length, 2);
    assert.equal(rows[0].querySelector('dt').textContent, 'Version');
    assert.equal(rows[0].querySelector('dd').textContent, '1.2.0');
    assert.ok(rows[1].querySelector('dd').classList.contains('base-mono'));
    assert.equal(rows[0].querySelector('dd').classList.contains('base-mono'), false);
});

test('a missing value shows the empty text, which can be replaced, and a zero shows as 0', function () {
    var list = createDefinitionList({ items: [{ label: 'A' }, { label: 'B', value: 0 }] });
    var values = list.element.querySelectorAll('dd');
    assert.equal(values[0].textContent, 'None');
    assert.ok(values[0].classList.contains('base-defs-missing'));
    assert.equal(values[1].textContent, '0');
    var custom = createDefinitionList({ emptyText: 'Not Set', items: [{ label: 'A', value: '' }] });
    assert.equal(custom.element.querySelector('dd').textContent, 'Not Set');
});

test('setValue and setItems replace the rows, and getValue returns a copy', function () {
    var list = createDefinitionList();
    assert.equal(list.element.querySelectorAll('.base-defs-row').length, 0);
    list.setValue([{ label: 'A', value: '1' }]);
    list.setItems([{ label: 'B', value: '2' }, { label: 'C', value: '3' }]);
    assert.equal(list.element.querySelectorAll('.base-defs-row').length, 2);
    var copy = list.getValue();
    copy.pop();
    assert.equal(list.getValue().length, 2);
});

test('destroy empties the list', function () {
    var list = createDefinitionList({ items: [{ label: 'A', value: '1' }] });
    list.destroy();
    assert.equal(list.element.children.length, 0);
});

test('by default the dl grows with its rows and keeps its own semantics, with only row groups inside', function () {
    var list = createDefinitionList({ items: [{ label: 'A', value: '1' }] });
    assert.equal(list.element.getAttribute('role'), null);
    assert.equal(list.element.classList.contains('scrolls'), false);
    var row = list.element.children[0];
    assert.equal(row.tagName, 'DIV');
    assert.ok(row.classList.contains('base-defs-row'));
    assert.equal(row.getAttribute('role'), null);
    assert.equal(list.element.children.length, 1);
    list.setItems([]);
    assert.equal(list.element.children.length, 0);
});

test('height, maxHeight, and minHeight reach the dl, and setHeight switches them', function () {
    var list = createDefinitionList({ height: 240, minHeight: 100 });
    assert.ok(list.element.classList.contains('fixed'));
    assert.equal(list.element.style['--base-list-height'], '240px');
    assert.equal(list.element.style['--base-list-min'], '100px');
    list.setHeight('auto', 300);
    assert.equal(list.element.classList.contains('fixed'), false);
    assert.ok(list.element.classList.contains('capped'));
    assert.equal(list.element.style['--base-list-max'], '300px');
    list.setHeight('fill');
    assert.ok(list.element.classList.contains('fill'));
});

test('a value may be a node, a badge, a link, or mono text, and an empty one shows the empty text', function () {
    var node = dom.document.createElement('strong');
    node.textContent = 'Bold';
    var list = createDefinitionList({ items: [
        { label: 'Node', value: node },
        { label: 'State', value: { badge: { label: 'Healthy', color: 'green' } } },
        { label: 'Site', value: { link: 'https://example.com', text: 'Example' } },
        { label: 'Hash', value: { text: 'abc123', mono: true } },
        { label: 'Empty', value: { text: '' } }
    ] });
    var dds = Array.from(list.element.querySelectorAll('dd'));
    assert.equal(dds[0].children[0], node);
    var badge = dds[1].querySelector('.base-badge');
    assert.ok(badge);
    assert.equal(badge.textContent, 'Healthy');
    var a = dds[2].querySelector('a');
    assert.equal(a.getAttribute('href'), 'https://example.com');
    assert.equal(a.getAttribute('rel'), 'noopener noreferrer');
    assert.equal(a.textContent, 'Example');
    assert.ok(dds[3].querySelector('.base-mono'));
    assert.ok(dds[4].classList.contains('base-defs-missing'));
    assert.equal(dds[4].textContent, 'None');
});

test('by default the list keeps the rows layout, with no columns class or route arrow', function () {
    var list = createDefinitionList({ items: [{ label: 'A', value: '1' }, { label: 'B', value: '2' }] });
    assert.equal(list.element.classList.contains('columns'), false);
    assert.equal(list.element.classList.contains('grid'), false);
    assert.equal(list.element.querySelector('.base-defs-arrow'), null);
});

test('the columns layout is a balanced grid of label over value, with meta and note lines under the value', function () {
    var list = createDefinitionList({ layout: 'columns', items: [
        { label: 'Source Path', value: '/media/movies', mono: true, meta: '4.2 GB' },
        { label: 'Local Path', value: '/data/movies', note: 'Not synced yet.' },
        { label: 'Library' }
    ] });
    assert.ok(list.element.classList.contains('columns'));
    assert.ok(list.element.classList.contains('grid'));
    var rows = list.element.querySelectorAll('.base-defs-row');
    assert.equal(rows[0].querySelector('.base-defs-meta').textContent, '4.2 GB');
    assert.equal(rows[0].querySelector('.base-defs-meta').tagName, 'DD');
    assert.equal(rows[0].querySelector('.base-defs-note'), null);
    assert.equal(rows[1].querySelector('.base-defs-note').textContent, 'Not synced yet.');
    assert.equal(rows[2].querySelector('.base-defs-value').textContent, 'None');
});

test('arrow on the list draws a route arrow between items, and arrow on an item draws one after it', function () {
    var list = createDefinitionList({ layout: 'columns', arrow: true, items: [{ label: 'From', value: 'Movies' }, { label: 'To', value: 'Films' }] });
    var rows = list.element.querySelectorAll('.base-defs-row');
    assert.equal(rows[0].querySelector('.base-defs-arrow').textContent, 'arrow_forward');
    assert.equal(rows[0].querySelector('.base-defs-arrow').getAttribute('aria-hidden'), 'true');
    assert.ok(rows[0].classList.contains('has-arrow'));
    assert.equal(rows[1].querySelector('.base-defs-arrow'), null);
    var one = createDefinitionList({ layout: 'columns', items: [{ label: 'A', value: '1' }, { label: 'From', value: 'x', arrow: true }, { label: 'To', value: 'y' }] });
    assert.deepEqual(Array.from(one.element.querySelectorAll('.base-defs-row')).map(function (r) { return !!r.querySelector('.base-defs-arrow'); }), [false, true, false]);
});

test('the columns layout turns compact by its own width, so the route arrow turns down', function () {
    var list = createDefinitionList({ layout: 'columns', arrow: true, items: [{ label: 'From', value: 'Movies' }, { label: 'To', value: 'Films' }] });
    assert.equal(list.element.classList.contains('compact'), false);
    Object.defineProperty(list.element, 'clientWidth', { value: 340, configurable: true });
    list.setItems(list.getValue());
    assert.ok(list.element.classList.contains('compact'));
    Object.defineProperty(list.element, 'clientWidth', { value: 800, configurable: true });
    list.setItems(list.getValue());
    assert.equal(list.element.classList.contains('compact'), false);
    list.destroy();
});

test('a long unbroken label keeps to its own column and never runs over its value', function () {
    var list = createDefinitionList({ items: [{ label: 'JF_COMMUNITY_RATING', value: '8.1' }, { label: 'JF_DAYS_SINCE_ADDED', value: '12' }] });
    var labels = list.element.querySelectorAll('.base-defs-label');
    assert.equal(labels[0].textContent, 'JF_COMMUNITY_RATING');
    assert.equal(labels[1].textContent, 'JF_DAYS_SINCE_ADDED');
    var css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'css', 'definition-list.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    var label = /\.base-defs-label \{([^}]*)\}/.exec(css)[1];
    assert.match(label, /min-width: 0/);
    assert.match(label, /overflow-wrap: anywhere/);
    assert.match(css, /grid-template-columns: fit-content\(40%\) minmax\(0, 1fr\)/, 'the label column sizes to the longest label, up to a limit');
    assert.match(css, /grid-template-columns: subgrid/, 'every row shares the one label column');
    assert.match(css, /@media \(max-width: 600px\)[\s\S]*grid-template-columns: minmax\(0, 1fr\)/, 'a phone stacks each label over its value');
});
