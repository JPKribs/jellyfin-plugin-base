// Behavior tests for createBreadcrumbs, createStepper, createBanner, createDivider, createAvatar, createUserChip, createStatCard, createProgressRing, createTimeline, and createStatusDot, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, all } from './fake-dom.mjs';

var dom = installFakeDom();
var J = await import('../../src/js/index.js');

beforeEach(function () {
    dom = installFakeDom();
});

test('breadcrumbs are a labelled nav list where the last item is the current page and not a control', function () {
    var picked = [];
    var b = J.createBreadcrumbs({ items: [{ label: 'Servers', value: 's' }, { label: 'Docs', href: '#docs' }, { label: 'Settings' }], onSelect: function (v, item) { picked.push([v, item.label]); } });
    assert.equal(b.element.getAttribute('aria-label'), 'Breadcrumb');
    var items = b.element.querySelectorAll('.base-breadcrumb');
    assert.equal(items.length, 3);
    assert.equal(items[0].querySelector('.base-breadcrumb-link').tagName, 'BUTTON');
    assert.equal(items[1].querySelector('.base-breadcrumb-link').tagName, 'A');
    assert.equal(items[1].querySelector('a').getAttribute('href'), '#docs');
    var current = items[2].querySelector('.base-breadcrumb-current');
    assert.equal(current.getAttribute('aria-current'), 'page');
    assert.equal(items[2].querySelector('.base-breadcrumb-link'), null);
    items[0].querySelector('button').click();
    assert.deepEqual(picked, [['s', 'Servers']]);
});

test('breadcrumbs setItems replaces the trail, the label can be replaced, and a missing value reports the label', function () {
    var picked = [];
    var b = J.createBreadcrumbs({ navLabel: 'You Are Here', onSelect: function (v) { picked.push(v); } });
    assert.equal(b.element.getAttribute('aria-label'), 'You Are Here');
    b.setItems([{ label: 'A' }, { label: 'B' }]);
    b.element.querySelector('button').click();
    assert.deepEqual(picked, ['A']);
    assert.equal(b.getValue().length, 2);
    b.destroy();
    assert.equal(b.element.querySelectorAll('.base-breadcrumb').length, 0);
});

function stepper(extra) {
    var picked = [];
    var s = J.createStepper(Object.assign({ steps: [{ id: 'a', label: 'Connect', description: 'Pick a server' }, { id: 'b', label: 'Choose' }, { id: 'c', label: 'Finish' }], onSelect: function (id, i) { picked.push([id, i]); } }, extra));
    dom.document.body.appendChild(s.element);
    return { s: s, picked: picked };
}

function steps(ui) { return all(ui.s.element, '.base-stepper-step'); }

test('the stepper marks completed, current, and upcoming steps with aria-current on the current one', function () {
    var ui = stepper({ value: 'b' });
    assert.deepEqual(steps(ui).map(function (e) { return e.className; }), ['base-stepper-step completed', 'base-stepper-step current', 'base-stepper-step upcoming']);
    assert.equal(steps(ui)[1].querySelector('.base-stepper-control').getAttribute('aria-current'), 'step');
    assert.equal(steps(ui)[0].querySelector('.material-icons').textContent, 'check');
    assert.equal(steps(ui)[2].querySelector('.base-stepper-number').textContent, '3');
    assert.deepEqual(steps(ui).map(function (e) { return e.querySelector('.base-sr-only').textContent; }), ['Completed', 'Current', 'Not started']);
    assert.equal(ui.s.getValue(), 'b');
});

test('the stepper status texts and the nav label can be replaced', function () {
    var ui = stepper({ value: 'b', completedText: 'Done', currentText: 'Now', upcomingText: 'Later', navLabel: 'Setup' });
    assert.deepEqual(steps(ui).map(function (e) { return e.querySelector('.base-sr-only').textContent; }), ['Done', 'Now', 'Later']);
    assert.equal(ui.s.element.getAttribute('aria-label'), 'Setup');
});

test('steps are plain by default and buttons for completed and current steps when clickable', function () {
    var plain = stepper({ value: 'b' });
    assert.equal(plain.s.element.querySelectorAll('button').length, 0);
    var ui = stepper({ value: 'b', clickable: true });
    var buttons = ui.s.element.querySelectorAll('button');
    assert.equal(buttons.length, 2);
    buttons[0].click();
    assert.deepEqual(ui.picked, [['a', 0]]);
});

test('next and previous move by one and stop at the ends, and setValue takes an id or an index', function () {
    var ui = stepper();
    assert.equal(ui.s.next(), 'b');
    assert.equal(ui.s.next(), 'c');
    assert.equal(ui.s.next(), 'c');
    assert.equal(ui.s.previous(), 'b');
    ui.s.setValue('a');
    assert.equal(ui.s.getValue(), 'a');
    ui.s.setValue(2);
    assert.equal(ui.s.getValue(), 'c');
    ui.s.setValue('missing');
    assert.equal(ui.s.getValue(), 'c');
    ui.s.setItems([{ id: 'x', label: 'X' }]);
    assert.equal(ui.s.getValue(), 'x');
});

function banner(extra) { var b = J.createBanner(Object.assign({ kind: 'warn', title: 'Heads up', text: 'Back up first.' }, extra)); dom.document.body.appendChild(b.element); return b; }

test('the banner reuses the callout class, shows the title and text, and has a Dismiss button', function () {
    var b = banner();
    assert.ok(b.element.classList.contains('base-warn'));
    assert.ok(b.element.classList.contains('base-banner'));
    assert.equal(b.element.querySelector('.base-banner-title').textContent, 'Heads up');
    assert.equal(b.element.querySelector('.base-banner-text').textContent, 'Back up first.');
    assert.equal(b.element.querySelector('.base-banner-close').getAttribute('aria-label'), 'Dismiss');
    assert.equal(banner({ title: '' }).element.querySelector('.base-banner-title').hidden, true);
    assert.equal(banner({ dismissLabel: 'Close' }).element.querySelector('.base-banner-close').getAttribute('aria-label'), 'Close');
    assert.equal(banner({ dismissible: false }).element.querySelector('.base-banner-close').hidden, true);
});

test('dismissing hides it, calls onDismiss, and writes to the storage only with a key and a storage', function () {
    var store = {};
    var seen = 0;
    var storage = { get: function (k) { return store[k]; }, set: function (k, v) { store[k] = v; } };
    var b = banner({ key: 'tip', storage: storage, onDismiss: function () { seen++; } });
    b.element.querySelector('.base-banner-close').click();
    assert.equal(b.element.hidden, true);
    assert.equal(b.getValue().dismissed, true);
    assert.deepEqual(store, { tip: true });
    assert.equal(seen, 1);
    var remembered = banner({ key: 'tip', storage: storage });
    assert.equal(remembered.element.hidden, true);
    remembered.show();
    assert.equal(remembered.element.hidden, false);
    var plain = banner();
    plain.dismiss();
    assert.deepEqual(store, { tip: true });
    var keyOnly = banner({ key: 'other' });
    keyOnly.dismiss();
    assert.equal(store.other, undefined);
});

test('the banner setValue changes the kind and text, and an unknown kind is info', function () {
    var b = banner();
    b.setValue({ kind: 'error', text: 'Failed.' });
    assert.ok(b.element.classList.contains('base-error'));
    assert.equal(b.element.classList.contains('base-warn'), false);
    assert.equal(b.element.querySelector('.base-banner-text').textContent, 'Failed.');
    assert.ok(J.createBanner({ kind: 'odd' }).element.classList.contains('base-info'));
});

test('the divider has the separator role and an optional label', function () {
    var plain = J.createDivider();
    assert.equal(plain.element.getAttribute('role'), 'separator');
    assert.ok(plain.element.classList.contains('base-divider-plain'));
    var d = J.createDivider({ label: 'Or' });
    assert.equal(d.getValue(), 'Or');
    assert.equal(d.element.classList.contains('base-divider-plain'), false);
    d.setValue('');
    assert.ok(d.element.classList.contains('base-divider-plain'));
});

test('the avatar with no picture shows the person icon on a gray circle, a size, and a title', function () {
    var a = J.createAvatar({ name: 'ada lovelace', size: 'large' });
    assert.equal(a.element.querySelector('.base-avatar-icon').textContent, 'person');
    assert.ok(a.element.classList.contains('placeholder'));
    assert.ok(a.element.classList.contains('base-avatar-large'));
    assert.equal(a.element.getAttribute('title'), 'ada lovelace');
    assert.equal(J.createAvatar({ name: 'ada lovelace' }).element.className, a.element.className.replace('large', 'medium'));
    assert.equal(J.createAvatar({ name: 'x', color: 'red' }).element.classList.contains('red'), true);
    assert.equal(J.createAvatar({}).element.querySelector('.base-avatar-icon').textContent, 'person');
});

test('the avatar shows an image with the name as alt, and falls back to the person icon when the image fails', function () {
    var a = J.createAvatar({ src: 'a.png', name: 'Ada Lovelace' });
    var img = a.element.querySelector('img');
    assert.equal(img.getAttribute('alt'), 'Ada Lovelace');
    img.dispatch('error');
    assert.equal(a.element.querySelector('img'), null);
    assert.equal(a.element.querySelector('.base-avatar-icon').textContent, 'person');
});

test('the avatar status dot has a title and label from the color, and statusLabel replaces it', function () {
    var a = J.createAvatar({ name: 'A', status: 'green' });
    var dot = a.element.querySelector('.base-avatar-status');
    assert.ok(dot.classList.contains('green'));
    assert.equal(dot.title, 'Active');
    assert.equal(dot.getAttribute('aria-label'), 'Active');
    assert.equal(J.createAvatar({ name: 'A', status: 'red', statusLabel: 'Offline' }).element.querySelector('.base-avatar-status').title, 'Offline');
    assert.equal(J.createAvatar({ name: 'A', status: 'bogus' }).element.querySelector('.base-avatar-status'), null);
});

test('the avatar setValue redraws and getValue returns the drawn options', function () {
    var a = J.createAvatar({ name: 'Ada' });
    a.setValue({ name: 'Bob Ross', status: 'blue' });
    assert.equal(a.element.getAttribute('aria-label'), 'Bob Ross');
    assert.equal(a.getValue().status, 'blue');
});

test('the user chip shows an avatar, a name, and an optional second line', function () {
    var c = J.createUserChip({ name: 'Ada Lovelace', text: 'Administrator' });
    assert.equal(c.element.querySelector('.base-user-chip-name').textContent, 'Ada Lovelace');
    assert.equal(c.element.querySelector('.base-user-chip-text').textContent, 'Administrator');
    assert.equal(c.element.querySelector('.base-avatar-icon').textContent, 'person');
    assert.equal(J.createUserChip({ name: 'A' }).element.querySelector('.base-user-chip-text').hidden, true);
    c.setValue({ name: 'Bob', text: '' });
    assert.equal(c.getValue().name, 'Bob');
});

test('the stat card shows the value and label with the card color, and a trend with a direction', function () {
    var s = J.createStatCard({ value: 1204, label: 'Items', color: 'blue', trend: 12, trendSuffix: '%', trendLabel: 'vs last week' });
    assert.ok(s.element.classList.contains('base-card'));
    assert.ok(s.element.classList.contains('blue'));
    assert.equal(s.element.querySelector('.base-card-count').textContent, '1204');
    assert.equal(s.element.querySelector('.base-card-label').textContent, 'Items');
    var trend = s.element.querySelector('.base-stat-trend');
    assert.ok(trend.classList.contains('good'));
    assert.equal(trend.querySelector('.material-icons').textContent, 'arrow_upward');
    assert.equal(trend.querySelector('.base-sr-only').textContent, 'Up');
    assert.equal(trend.children[2].textContent, '12% vs last week');
});

test('the stat trend is bad for a decrease, reversed with positiveIsGood false, flat at zero, and hidden with no trend', function () {
    assert.ok(J.createStatCard({ trend: -3 }).element.querySelector('.base-stat-trend').classList.contains('bad'));
    assert.ok(J.createStatCard({ trend: -3, positiveIsGood: false }).element.querySelector('.base-stat-trend').classList.contains('good'));
    var flat = J.createStatCard({ trend: 0 }).element.querySelector('.base-stat-trend');
    assert.ok(flat.classList.contains('flat'));
    assert.equal(flat.querySelector('.base-sr-only').textContent, 'No change');
    assert.equal(J.createStatCard({ value: 1 }).element.querySelector('.base-stat-trend').hidden, true);
    var custom = J.createStatCard({ trend: 1, trendUpText: 'Increase' }).element.querySelector('.base-sr-only');
    assert.equal(custom.textContent, 'Increase');
    assert.equal(J.createStatCard({ trend: -1, trendDownText: 'Decrease' }).element.querySelector('.base-sr-only').textContent, 'Decrease');
    assert.equal(J.createStatCard({ trend: 0, trendFlatText: 'Same' }).element.querySelector('.base-sr-only').textContent, 'Same');
});

test('the stat card setValue merges new data', function () {
    var s = J.createStatCard({ value: 1, label: 'A' });
    s.setValue({ value: 2 });
    assert.equal(s.element.querySelector('.base-card-count').textContent, '2');
    assert.equal(s.getValue().label, 'A');
});

test('the progress ring is a progressbar with value attributes, and the arc length follows the value', function () {
    var r = J.createProgressRing({ value: 40, color: 'green', size: 'large' });
    assert.equal(r.element.getAttribute('role'), 'progressbar');
    assert.equal(r.element.getAttribute('aria-label'), 'Progress');
    assert.equal(r.element.getAttribute('aria-valuenow'), '40');
    assert.equal(r.element.getAttribute('aria-valuemax'), '100');
    assert.ok(r.element.classList.contains('green'));
    assert.ok(r.element.classList.contains('base-ring-large'));
    assert.equal(r.element.querySelector('.base-ring-arc').getAttribute('stroke-dasharray'), '40 100');
    assert.equal(r.element.querySelector('.base-ring-value').textContent, '40%');
});

test('the progress ring clamps the value, takes a label, and can hide the percent', function () {
    var r = J.createProgressRing({ label: 'Download', showValue: false });
    r.setValue(250);
    assert.equal(r.getValue(), 100);
    r.setValue(-5);
    assert.equal(r.getValue(), 0);
    r.setValue('abc');
    assert.equal(r.getValue(), 0);
    assert.equal(r.element.getAttribute('aria-label'), 'Download');
    assert.equal(r.element.querySelector('.base-ring-value').hidden, true);
});

test('the timeline draws an item per event with the status class, time, title, and body', function () {
    var t = J.createTimeline({ items: [
        { time: '10:00', datetime: '2026-03-10T10:00', title: 'Synced', body: '12 items', status: 'green', icon: 'check' },
        { title: 'Plain' }
    ] });
    assert.equal(t.element.querySelector('ol').className, 'base-timeline base-list plain');
    var items = t.element.querySelectorAll('.base-timeline-item');
    assert.ok(items[0].classList.contains('green'));
    assert.equal(items[0].querySelector('time').getAttribute('datetime'), '2026-03-10T10:00');
    assert.equal(items[0].querySelector('.base-timeline-title').textContent, 'Synced');
    assert.equal(items[0].querySelector('.base-timeline-text').textContent, '12 items');
    assert.equal(items[0].querySelector('.base-timeline-marker .material-icons').textContent, 'check');
    assert.equal(items[1].querySelector('.base-timeline-time'), null);
    assert.equal(items[1].querySelector('.base-timeline-text'), null);
});

test('the timeline shows its empty text only while empty, and setValue replaces the events', function () {
    var t = J.createTimeline({ emptyText: 'No events yet.' });
    assert.equal(t.element.querySelector('.base-timeline-empty').hidden, false);
    t.setValue([{ title: 'A' }]);
    assert.equal(t.element.querySelector('.base-timeline-empty').hidden, true);
    t.setItems([{ title: 'B' }, { title: 'C' }]);
    assert.equal(t.element.querySelectorAll('.base-timeline-item').length, 2);
    assert.equal(t.getValue().length, 2);
    t.destroy();
    assert.equal(t.element.querySelectorAll('.base-timeline-item').length, 0);
});

test('the status dot has an image role with a title and aria-label from the color, and both can be set', function () {
    var d = J.createStatusDot({ color: 'orange' });
    assert.equal(d.element.getAttribute('role'), 'img');
    assert.equal(d.element.title, 'Waiting');
    assert.equal(d.element.getAttribute('aria-label'), 'Waiting');
    assert.ok(d.element.classList.contains('orange'));
    d.setValue({ color: 'green', label: 'Reachable' });
    assert.deepEqual(d.getValue(), { color: 'green', label: 'Reachable' });
    assert.equal(J.createStatusDot().element.title, 'Off');
    assert.ok(J.createStatusDot({ color: 'nope' }).element.classList.contains('gray'));
});
