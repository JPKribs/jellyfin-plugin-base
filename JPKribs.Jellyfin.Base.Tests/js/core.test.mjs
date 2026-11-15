// Behavior tests for the config page, shared bag, and browser helpers, run with the node test runner and the stub DOM in fake-dom.mjs.
import { test, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installFakeDom } from './fake-dom.mjs';

var dom = installFakeDom();
var { plural, setTabs, createConfigPage, createShared, BADGE_STATES } = await import('../../src/js/index.js');

var shared;
beforeEach(function () {
    dom = installFakeDom();
    shared = createShared(dom.el('div'), 'plugin-id', 'Api');
});

test('plural gives 1 item for exactly one and items for every other count', function () {
    assert.equal(plural(0, 'item'), '0 items');
    assert.equal(plural(1, 'item'), '1 item');
    assert.equal(plural(2, 'item'), '2 items');
    assert.equal(plural(-1, 'item'), '-1 items');
    assert.equal(plural(-2, 'item'), '-2 items');
});

test('plural takes an irregular plural word', function () {
    assert.equal(plural(1, 'child', 'children'), '1 child');
    assert.equal(plural(0, 'child', 'children'), '0 children');
    assert.equal(plural(2, 'child', 'children'), '2 children');
    assert.equal(plural(1, 'person', 'people'), '1 person');
    assert.equal(plural(3, 'person', 'people'), '3 people');
});

test('plural is on the shared bag', function () {
    assert.equal(shared.plural(3, 'item'), '3 items');
});

test('setStatus gives the element role status, and role alert for an error', function () {
    var el = dom.el('span');
    shared.setStatus(el, 'Saved.', false, { timeout: 0 });
    assert.equal(el.getAttribute('role'), 'status');
    assert.equal(el.querySelector('.base-status-message').textContent, 'Saved.');
    shared.setStatus(el, 'Could not save.', true, { timeout: 0 });
    assert.equal(el.getAttribute('role'), 'alert');
    shared.setStatus(el, 'Saved.', false, { timeout: 0 });
    assert.equal(el.getAttribute('role'), 'status');
});

test('setStatus shows the icon of its state beside the text, as base-icon-text, and a clear removes both', function () {
    var el = dom.el('div');
    shared.setStatus(el, 'Saved.', false, { timeout: 0 });
    assert.equal(el.classList.contains('base-icon-text'), true);
    assert.equal(el.classList.contains('success'), true);
    assert.equal(el.querySelector('.material-icons').textContent, 'check_circle');
    shared.setStatus(el, 'Could not save.', true, { timeout: 0 });
    assert.equal(el.classList.contains('error'), true);
    assert.equal(el.classList.contains('success'), false);
    assert.equal(el.querySelector('.material-icons').textContent, 'error');
    shared.setStatus(el, 'Checking.', false, { timeout: 0, state: 'info' });
    assert.equal(el.querySelector('.material-icons').textContent, 'info');
    assert.equal(el.getAttribute('role'), 'status');
    shared.setStatus(el, '', false, { timeout: 0 });
    assert.equal(el.querySelector('.material-icons'), null);
    assert.equal(el.classList.contains('base-icon-text'), false);
});

test('setStatus sets the role once and leaves it alone on a clear', function () {
    var el = dom.el('span');
    var sets = 0;
    var original = el.setAttribute.bind(el);
    el.setAttribute = function (k, v) { if (k === 'role') sets++; original(k, v); };
    shared.setStatus(el, 'One.', false, { timeout: 0 });
    shared.setStatus(el, 'Two.', false, { timeout: 0 });
    shared.setStatus(el, '', false, { timeout: 0 });
    assert.equal(sets, 1);
    assert.equal(el.getAttribute('role'), 'status');
});

test('toDateInput gives the local date, not the UTC date', function () {
    var zone = process.env.TZ;
    process.env.TZ = 'America/Los_Angeles';
    try {
        // 03:00 UTC on the 10th is the evening of the 9th in Los Angeles.
        assert.equal(shared.toDateInput('2026-03-10T03:00:00Z'), '2026-03-09');
        assert.equal(shared.toDateInput(new Date(2026, 0, 5, 23, 30)), '2026-01-05');
    } finally {
        if (zone === undefined) delete process.env.TZ; else process.env.TZ = zone;
    }
});

test('toDateInput keeps a date only string and gives an empty string for nothing or nonsense', function () {
    assert.equal(shared.toDateInput('2026-03-10'), '2026-03-10');
    assert.equal(shared.toDateInput(null), '');
    assert.equal(shared.toDateInput('not a date'), '');
});

test('createChangeTracker gives the indicator role status', function () {
    var indicator = dom.el('span', { class: 'base-unsaved' });
    shared.createChangeTracker({ indicator: indicator });
    assert.equal(indicator.getAttribute('role'), 'status');
});

test('flashSaved shows savedText on the label and restores the original after the pulse', function () {
    mock.timers.enable({ apis: ['setTimeout'] });
    try {
        var indicator = dom.el('span', { class: 'base-unsaved' }, [dom.el('span', { class: 'base-unsaved-dot' })]);
        var label = { nodeType: 3, nodeValue: 'Unsaved changes' };
        indicator.childNodes = [indicator.children[0], label];
        var tracker = shared.createChangeTracker({ indicator: indicator, savedText: 'Saved' });
        tracker.flashSaved();
        assert.equal(label.nodeValue, 'Saved');
        assert.ok(indicator.classList.contains('save-success'));
        tracker.flashSaved();
        mock.timers.tick(1500);
        assert.equal(label.nodeValue, 'Unsaved changes');
        assert.equal(indicator.classList.contains('visible'), false);
    } finally {
        mock.timers.reset();
    }
});

test('flashSaved changes the text of a plain indicator and leaves it alone without savedText', function () {
    mock.timers.enable({ apis: ['setTimeout'] });
    try {
        var plain = dom.el('span');
        plain.textContent = 'Unsaved';
        var withText = shared.createChangeTracker({ indicator: plain, savedText: 'Saved' });
        withText.flashSaved();
        assert.equal(plain.textContent, 'Saved');
        mock.timers.tick(1500);
        assert.equal(plain.textContent, 'Unsaved');

        var untouched = dom.el('span');
        untouched.textContent = 'Unsaved';
        shared.createChangeTracker({ indicator: untouched }).flashSaved();
        assert.equal(untouched.textContent, 'Unsaved');
    } finally {
        mock.timers.reset();
    }
});

async function flush() { await Promise.resolve(); await Promise.resolve(); }

test('a poller with pauseWhenHidden skips ticks while the page is hidden and ticks once when it shows', async function () {
    mock.timers.enable({ apis: ['setInterval'] });
    try {
        var calls = 0;
        dom.document.hidden = true;
        var poller = shared.createPoller(function () { calls++; }, 1000, { pauseWhenHidden: true });
        poller.start();
        mock.timers.tick(3000);
        await flush();
        assert.equal(calls, 0);

        dom.document.hidden = false;
        dom.document.dispatch('visibilitychange');
        await flush();
        assert.equal(calls, 1);

        mock.timers.tick(1000);
        await flush();
        assert.equal(calls, 2);

        poller.stop();
        assert.equal((dom.document.listeners.visibilitychange || []).length, 0);
    } finally {
        mock.timers.reset();
    }
});

test('a poller without pauseWhenHidden keeps ticking while the page is hidden', async function () {
    mock.timers.enable({ apis: ['setInterval'] });
    try {
        var calls = 0;
        dom.document.hidden = true;
        var poller = shared.createPoller(function () { calls++; }, 1000);
        poller.start();
        await flush();
        mock.timers.tick(1000);
        await flush();
        mock.timers.tick(1000);
        await flush();
        assert.equal(calls, 3);
        assert.equal((dom.document.listeners.visibilitychange || []).length, 0);
        poller.stop();
    } finally {
        mock.timers.reset();
    }
});

test('setTabs hands LibraryMenu a getter that re-reads a function each time the tabs are shown', function () {
    var getters = [];
    globalThis.LibraryMenu = { setTabs: function (key, index, getter) { getters.push({ key: key, index: index, getter: getter }); } };
    try {
        var n = 0;
        setTabs('plugin', 1, function () { n++; return [{ href: 'a', name: 'A' + n }]; });
        assert.equal(getters[0].key, 'plugin');
        assert.equal(getters[0].index, 1);
        assert.equal(getters[0].getter()[0].name, 'A1');
        assert.equal(getters[0].getter()[0].name, 'A2');

        var fixed = [{ href: 'b', name: 'B' }];
        setTabs('plugin', 0, fixed);
        assert.equal(getters[1].getter(), fixed);
    } finally {
        delete globalThis.LibraryMenu;
    }
});

test('createConfigPage re-evaluates a tabs function on each viewshow', function () {
    var getters = [];
    globalThis.LibraryMenu = { setTabs: function (key, index, getter) { getters.push(getter); } };
    globalThis.addEventListener = function () {};
    globalThis.removeEventListener = function () {};
    try {
        var n = 0;
        var view = dom.el('div');
        createConfigPage(view, { pluginId: 'p', tabsKey: 'k', tabs: function () { n++; return [{ href: 'x', name: 'X' + n }]; } });
        view.dispatch('viewshow');
        view.dispatch('viewshow');
        assert.equal(getters.length, 2);
        assert.equal(getters[1]()[0].name, 'X1');
        assert.equal(getters[1]()[0].name, 'X2');
    } finally {
        delete globalThis.LibraryMenu;
        delete globalThis.addEventListener;
        delete globalThis.removeEventListener;
    }
});

test('BADGE_STATES names Locked, Expired, and the extra state names, and lists pink and teal', function () {
    ['Locked', 'Expired', 'Completed', 'Enabled', 'Failed', 'Paused', 'Running', 'Skipped', 'Unknown'].forEach(function (name) {
        assert.ok(BADGE_STATES.names.indexOf(name) >= 0, name);
    });
    assert.ok(BADGE_STATES.colors.indexOf('pink') >= 0);
    assert.ok(BADGE_STATES.colors.indexOf('teal') >= 0);
});

test('every BADGE_STATES name and color has a rule in badge.css', function () {
    var css = readFileSync(new URL('../../src/css/badge.css', import.meta.url), 'utf8');
    BADGE_STATES.names.forEach(function (name) {
        assert.ok(css.indexOf('.base-table-status-badge.' + name + ',') >= 0 || css.indexOf('.base-table-status-badge.' + name + ' {') >= 0, name);
    });
    BADGE_STATES.colors.forEach(function (color) {
        assert.ok(css.indexOf('.base-badge.' + color + ',') >= 0 || css.indexOf('.base-badge.' + color + ' {') >= 0, color);
    });
});
