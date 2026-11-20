// Behavior tests for createLogViewer, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, all } from './fake-dom.mjs';

var dom = installFakeDom();
var { createLogViewer } = await import('../../src/js/index.js');
var copied = [];


beforeEach(function () {
    dom = installFakeDom();
    copied = [];
    Object.defineProperty(globalThis, 'navigator', { value: { clipboard: { writeText: function (t) { copied.push(t); return Promise.resolve(); } } }, configurable: true, writable: true });
});

function build(extra) {
    var viewer = createLogViewer(extra);
    dom.document.body.appendChild(viewer.element);
    return viewer;
}

function lines(viewer) { return all(viewer.output, '.base-log-line'); }

test('the output is a log region that is not live, focusable, and named', function () {
    var v = build();
    assert.equal(v.output.getAttribute('role'), 'log');
    assert.equal(v.output.getAttribute('aria-live'), 'off');
    assert.equal(v.output.getAttribute('tabindex'), '0');
    assert.equal(v.output.getAttribute('aria-label'), 'Log');
    assert.equal(build({ label: 'Session Log' }).output.getAttribute('aria-label'), 'Session Log');
});

test('it shows the empty text until a line is appended, and the text can be replaced', function () {
    var v = build();
    assert.equal(v.output.querySelector('.base-log-empty').textContent, 'No output yet.');
    v.append('first');
    assert.equal(v.output.querySelector('.base-log-empty'), null);
    assert.equal(build({ emptyText: 'Waiting for output.' }).output.querySelector('.base-log-empty').textContent, 'Waiting for output.');
});

test('append takes a string, a record, and an array, and levels become classes with info as the default', function () {
    var v = build();
    v.append('plain');
    v.append({ text: 'careful', level: 'warn', time: '10:00' });
    v.append([{ text: 'bad', level: 'error' }, { text: 'odd', level: 'loud' }, { text: 'dbg', level: 'debug' }]);
    var all = lines(v);
    assert.deepEqual(all.map(function (l) { return l.className; }), ['base-log-line info base-list-item', 'base-log-line warn base-list-item', 'base-log-line error base-list-item', 'base-log-line info base-list-item', 'base-log-line debug base-list-item']);
    assert.equal(all[1].querySelector('.base-log-time').textContent, '10:00');
    assert.deepEqual(v.getValue()[1], { text: 'careful', level: 'warn', time: '10:00' });
});

test('maxLines keeps the newest lines in the data and the page', function () {
    var v = build({ maxLines: 3 });
    v.append(['1', '2', '3', '4', '5']);
    assert.deepEqual(v.getValue().map(function (l) { return l.text; }), ['3', '4', '5']);
    assert.equal(lines(v).length, 3);
    assert.equal(lines(v)[0].querySelector('.base-log-text').textContent, '3');
});

test('auto scroll follows new lines, and turning it off stops that', function () {
    var v = build();
    v.output.scrollHeight = 500;
    v.append('a');
    assert.equal(v.output.scrollTop, 500);
    var toggle = v.element.querySelector('input');
    toggle.checked = false;
    toggle.dispatch('change');
    v.output.scrollHeight = 900;
    v.append('b');
    assert.equal(v.output.scrollTop, 500);
    v.setAutoScroll(true);
    assert.equal(v.output.scrollTop, 900);
    assert.equal(toggle.checked, true);
});

test('scrolling up turns auto scroll off and the toggle shows it', function () {
    var v = build();
    v.output.scrollHeight = 1000;
    v.output.clientHeight = 200;
    v.output.scrollTop = 100;
    v.output.dispatch('scroll');
    assert.equal(v.element.querySelector('input').checked, false);
    v.append('x');
    assert.equal(v.output.scrollTop, 100);
});

test('autoScroll false starts with the toggle off', function () {
    assert.equal(build({ autoScroll: false }).element.querySelector('input').checked, false);
});

test('Clear empties the lines and the page, shows the empty text, and calls onClear', function () {
    var calls = 0;
    var v = build({ lines: ['a', 'b'], onClear: function () { calls++; } });
    v.element.querySelectorAll('button')[0].click();
    assert.deepEqual(v.getValue(), []);
    assert.equal(lines(v).length, 0);
    assert.ok(v.output.querySelector('.base-log-empty'));
    assert.equal(calls, 1);
});

test('Copy All copies the lines with their times and shows the feedback, then the label returns', async function () {
    mock.timers.enable({ apis: ['setTimeout'] });
    try {
        var v = build({ lines: [{ text: 'one', time: '1' }, 'two'] });
        var copy = v.element.querySelectorAll('button')[1];
        assert.equal(copy.textContent, 'Copy all');
        assert.equal(await v.copyAll(), true);
        assert.deepEqual(copied, ['1 one\ntwo']);
        assert.equal(copy.textContent, 'Copied');
        mock.timers.tick(1500);
        assert.equal(copy.textContent, 'Copy all');
    } finally {
        mock.timers.reset();
    }
});

test('every toolbar label can be replaced and the toolbar can be hidden', function () {
    var v = build({ autoScrollText: 'Follow', clearText: 'Wipe', copyText: 'Copy Text' });
    assert.equal(v.element.querySelector('.base-log-toggle span').textContent, 'Follow');
    assert.deepEqual(all(v.element, 'button').map(function (b) { return b.textContent; }), ['Wipe', 'Copy Text']);
    var defaults = build();
    assert.equal(defaults.element.querySelector('.base-log-toggle span').textContent, 'Auto scroll');
    assert.equal(defaults.element.querySelectorAll('button')[0].textContent, 'Clear');
    assert.equal(build({ toolbar: false }).element.querySelector('.base-log-toolbar').hidden, true);
});

test('setValue replaces the lines, and destroy removes the listeners', function () {
    var v = build({ lines: ['a'] });
    v.setValue(['x', 'y']);
    assert.deepEqual(v.getValue().map(function (l) { return l.text; }), ['x', 'y']);
    v.destroy();
    assert.equal(v.output.listeners.scroll.length, 0);
    assert.equal(v.element.querySelector('input').listeners.change.length, 0);
});

test('the output keeps its 280px height and scrolls inside by default, and its lines carry no list roles', function () {
    var v = build({ lines: ['a'] });
    assert.ok(v.output.classList.contains('base-list'));
    assert.ok(v.output.classList.contains('fixed'));
    assert.ok(v.output.classList.contains('scrolls'));
    assert.equal(v.output.style['--base-list-height'], '280px');
    assert.equal(v.output.getAttribute('role'), 'log');
    assert.equal(lines(v)[0].getAttribute('role'), null);
});

test('height, maxHeight, and minHeight reach the output, and setHeight switches them', function () {
    var fill = build({ height: 'fill', minHeight: 200 });
    assert.ok(fill.output.classList.contains('fill'));
    assert.equal(fill.output.style['--base-list-min'], '200px');
    var grow = build({ height: 'auto', maxHeight: '40vh' });
    assert.equal(grow.output.classList.contains('fixed'), false);
    assert.ok(grow.output.classList.contains('capped'));
    assert.equal(grow.output.style['--base-list-max'], '40vh');
    grow.setHeight(120);
    assert.ok(grow.output.classList.contains('fixed'));
    assert.equal(grow.output.style['--base-list-height'], '120px');
    assert.equal(grow.output.classList.contains('capped'), false);
});

test('append adds a node for the new line and keeps the nodes already drawn', function () {
    var v = build({ lines: ['a', 'b'] });
    var before = lines(v);
    v.append('c');
    var after = lines(v);
    assert.equal(after.length, 3);
    assert.equal(after[0], before[0]);
    assert.equal(after[1], before[1]);
});

test('lines appended one at a time past the cap keep the newest, many times over', function () {
    var v = build({ maxLines: 3, autoScroll: false });
    v.output.scrollTop = 40;
    for (var i = 1; i <= 20; i++) v.append(String(i));
    assert.deepEqual(v.getValue().map(function (l) { return l.text; }), ['18', '19', '20']);
    assert.deepEqual(lines(v).map(function (l) { return l.querySelector('.base-log-text').textContent; }), ['18', '19', '20']);
    assert.equal(v.output.scrollTop, 40);
});

test('a batch larger than the cap draws only the newest lines', function () {
    var v = build({ maxLines: 2, lines: ['old'] });
    v.append(['1', '2', '3']);
    assert.deepEqual(lines(v).map(function (l) { return l.querySelector('.base-log-text').textContent; }), ['2', '3']);
    assert.equal(v.output.querySelector('.base-log-empty'), null);
});
