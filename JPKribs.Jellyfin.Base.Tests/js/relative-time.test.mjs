// Behavior tests for createRelativeTime, renderRelative, and the shared clock, run on the stub DOM in fake-dom.mjs with mocked timers.
import { test, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fake-dom.mjs';

var dom = installFakeDom();
var { createRelativeTime, renderRelative, relativeText, countdownText, toDate } = await import('../../src/js/relative-time.js');
var { clockNow, clockState } = await import('../../src/js/lib/clock.js');

var now = 0;
beforeEach(function () {
    dom = installFakeDom();
    now = Date.UTC(2026, 10, 15, 12, 0, 0);
    clockNow.now = function () { return now; };
    mock.timers.enable({ apis: ['setTimeout'] });
});
afterEach(function () {
    mock.timers.reset();
    clockNow.now = function () { return Date.now(); };
});

function advance(ms) {
    now += ms;
    mock.timers.tick(ms);
}

test('relativeText picks the unit by age and says when it next changes', function () {
    assert.equal(relativeText(-20 * 1000, 'en').text, 'just now');
    assert.equal(relativeText(-3 * 60 * 1000, 'en').text, '3 minutes ago');
    assert.equal(relativeText(2 * 3600 * 1000, 'en').text, 'in 2 hours');
    assert.equal(relativeText(-9 * 86400 * 1000, 'en').text, '9 days ago');
    assert.equal(relativeText(-3 * 60 * 1000, 'en').next, 15 * 1000);
    assert.equal(relativeText(-9 * 86400 * 1000, 'en').next, 6 * 3600 * 1000);
});

test('countdownText writes a clock, with hours only when needed', function () {
    assert.equal(countdownText(65 * 1000), '1:05');
    assert.equal(countdownText(3723 * 1000), '1:02:03');
    assert.equal(countdownText(-5), '0:00');
});

test('toDate reads dates, milliseconds, and strings, and refuses junk', function () {
    assert.equal(toDate(0).getTime(), 0);
    assert.equal(toDate('2026-11-15T12:00:00Z').getTime(), Date.UTC(2026, 10, 15, 12));
    assert.equal(toDate('nope'), null);
    assert.equal(toDate(null), null);
});

test('a relative time shows its text, its datetime, and the full date as its title', function () {
    var t = createRelativeTime({ value: now - 3 * 60 * 1000, locale: 'en' });
    dom.document.body.appendChild(t.element);
    var time = t.element.querySelector('time');
    assert.equal(time.textContent, '3 minutes ago');
    assert.equal(time.getAttribute('datetime'), new Date(now - 3 * 60 * 1000).toISOString());
    assert.ok(time.getAttribute('title').length > 10);
    t.destroy();
});

test('the shared clock moves the text on as time passes', function () {
    var t = createRelativeTime({ value: now - 3 * 60 * 1000, locale: 'en' });
    dom.document.body.appendChild(t.element);
    advance(2 * 60 * 1000);
    assert.equal(t.element.querySelector('time').textContent, '5 minutes ago');
    t.destroy();
});

test('one timer serves every live time, and it stops when none is left on the page', function () {
    var a = createRelativeTime({ value: now, locale: 'en' });
    var b = createRelativeTime({ value: now, locale: 'en' });
    dom.document.body.appendChild(a.element);
    dom.document.body.appendChild(b.element);
    assert.equal(clockState().count, 2);
    assert.equal(clockState().running, true);
    a.destroy();
    dom.document.body.removeChild(b.element);
    advance(60 * 60 * 1000);
    assert.equal(clockState().count, 0);
    assert.equal(clockState().running, false);
});

test('a countdown ticks each second, fills its ring, and calls onDone once at zero', function () {
    var done = 0;
    var t = createRelativeTime({ countdown: true, ring: true, start: now, value: now + 3000, onDone: function () { done++; } });
    dom.document.body.appendChild(t.element);
    var time = t.element.querySelector('time');
    assert.equal(time.textContent, '0:03');
    advance(1000);
    assert.equal(time.textContent, '0:02');
    assert.equal(Math.round(Number(t.element.querySelector('.base-ring').getAttribute('aria-valuenow'))), 33);
    advance(2000);
    assert.equal(time.textContent, 'Now');
    assert.ok(t.element.classList.contains('done'));
    advance(5000);
    assert.equal(done, 1);
    t.destroy();
});

test('setValue shows another moment, and an empty one shows emptyText', function () {
    var t = createRelativeTime({ value: now, emptyText: 'Never', locale: 'en' });
    dom.document.body.appendChild(t.element);
    t.setValue(null);
    assert.equal(t.element.querySelector('time').textContent, 'Never');
    assert.equal(t.getValue(), null);
    t.setValue(now + 2 * 3600 * 1000);
    assert.equal(t.element.querySelector('time').textContent, 'in 2 hours');
    t.destroy();
});

test('renderRelative draws a live time from a row key or a function', function () {
    var byKey = renderRelative('seen', { locale: 'en' })({ seen: now - 26 * 60 * 1000 });
    assert.equal(byKey.querySelector('time').textContent, '26 minutes ago');
    var byFn = renderRelative(function (row) { return row.at; }, { locale: 'en' })({ at: now + 3 * 86400 * 1000 });
    assert.equal(byFn.querySelector('time').textContent, 'in 3 days');
});
