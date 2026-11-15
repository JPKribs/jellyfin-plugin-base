// Behavior tests for createTimeline's list, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fake-dom.mjs';

var dom = installFakeDom();
var { createTimeline } = await import('../../src/js/index.js');


beforeEach(function () {
    dom = installFakeDom();
});

test('by default the timeline grows with its events and stays an ordered list of items', function () {
    var t = createTimeline({ items: [{ title: 'A' }, { title: 'B' }] });
    var ol = t.element.querySelector('ol');
    assert.equal(ol.getAttribute('role'), null);
    assert.equal(ol.classList.contains('scrolls'), false);
    assert.equal(ol.children.length, 2);
    ol.children.forEach(function (li) {
        assert.equal(li.tagName, 'LI');
        assert.equal(li.getAttribute('role'), null);
    });
    t.setItems([]);
    assert.equal(ol.children.length, 0);
});

test('height, maxHeight, and minHeight reach the ordered list, and setHeight switches them', function () {
    var t = createTimeline({ height: 'fill', minHeight: 120, items: [{ title: 'A' }] });
    var ol = t.element.querySelector('ol');
    assert.ok(ol.classList.contains('fill'));
    assert.equal(ol.style['--base-list-min'], '120px');
    t.setHeight(200, '50vh');
    assert.ok(ol.classList.contains('fixed'));
    assert.equal(ol.style['--base-list-height'], '200px');
    assert.equal(ol.style['--base-list-max'], '50vh');
    var capped = createTimeline({ maxHeight: 320 });
    assert.ok(capped.element.querySelector('ol').classList.contains('capped'));
});

test('an item with pre shows a mono block kept as written under its body', function () {
    var t = createTimeline({ items: [{ title: 'Failed', body: 'The sync stopped.', pre: 'Error: timeout\n  at sync' }, { title: 'Done' }] });
    var pres = t.element.querySelectorAll('pre');
    assert.equal(pres.length, 1);
    assert.ok(pres[0].classList.contains('base-mono'));
    assert.ok(pres[0].classList.contains('base-timeline-pre'));
    assert.equal(pres[0].textContent, 'Error: timeout\n  at sync');
});
