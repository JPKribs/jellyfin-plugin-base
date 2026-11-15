// Behavior tests for createFilterPanel, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, all } from './fake-dom.mjs';

var dom = installFakeDom();
var { createFilterPanel } = await import('../../src/js/index.js');

beforeEach(function () {
    dom = installFakeDom();
});

var GROUPS = [
    { name: 'status', label: 'Status', options: [{ value: 'active', label: 'Active' }, { value: 'paused', label: 'Paused' }, { value: 'failed', label: 'Failed' }] },
    { name: 'kind', label: 'Kind', single: true, options: [{ value: 'movie', label: 'Movies' }, { value: 'show', label: 'Shows' }] }
];

function build(extra) {
    var changes = [];
    var mount = dom.document.createElement('div');
    dom.document.body.appendChild(mount);
    var filter = createFilterPanel(Object.assign({
        groups: GROUPS,
        onChange: function (value) { changes.push(value); }
    }, extra));
    mount.appendChild(filter.element);
    return { filter: filter, changes: changes, button: filter.element, mount: mount };
}

function panel() { return dom.document.querySelector('.base-filter-panel'); }
function inputs() { return all(dom.document, '.base-filter-input'); }
function input(group, value) { return inputs().filter(function (i) { return i.getAttribute('data-group') === group && i.value === value; })[0]; }
function toggle(group, value, on) {
    var el = input(group, value);
    el.checked = on === undefined ? !el.checked : on;
    el.dispatch('change');
}
function badge(ui) { return ui.button.querySelector('.base-filter-count'); }

test('the button shows the default text and no count, and the panel starts closed', function () {
    var ui = build();
    assert.equal(ui.button.tagName, 'BUTTON');
    assert.equal(ui.button.getAttribute('type'), 'button');
    assert.equal(ui.button.querySelector('.base-filter-text').textContent, 'Filter');
    assert.equal(ui.button.getAttribute('aria-label'), 'Filter');
    assert.equal(ui.button.getAttribute('aria-haspopup'), 'dialog');
    assert.equal(ui.button.getAttribute('aria-expanded'), 'false');
    assert.equal(badge(ui).hidden, true);
    assert.equal(ui.button.classList.contains('active'), false);
    assert.equal(panel(), null);
    assert.equal(ui.filter.isOpen(), false);
    assert.deepEqual(ui.filter.getValue(), { status: [], kind: [] });
});

test('the count badge and the aria-label count the filters on, with the right plural', function () {
    var ui = build({ value: { status: ['active', 'failed'], kind: ['movie'] } });
    assert.equal(badge(ui).textContent, '3');
    assert.equal(badge(ui).hidden, false);
    assert.equal(badge(ui).getAttribute('aria-hidden'), 'true');
    assert.ok(ui.button.classList.contains('active'));
    assert.equal(ui.button.getAttribute('aria-label'), 'Filter, 3 filters on');
    ui.filter.setValue({ status: ['paused'] });
    assert.equal(ui.button.getAttribute('aria-label'), 'Filter, 1 filter on');
});

test('every label can be replaced', function () {
    var ui = build({ buttonText: 'Narrow', title: 'Narrow Rows', clearText: 'Reset All', doneText: 'Close Panel', countLabel: '{value} on', countOneLabel: 'one on', value: { status: ['active', 'paused'] } });
    assert.equal(ui.button.querySelector('.base-filter-text').textContent, 'Narrow');
    assert.equal(ui.button.getAttribute('aria-label'), 'Narrow, 2 on');
    ui.filter.open();
    assert.equal(panel().querySelector('.base-filter-title').textContent, 'Narrow Rows');
    assert.equal(panel().querySelector('.base-filter-clear').textContent, 'Reset All');
    assert.equal(panel().querySelector('.base-filter-done').textContent, 'Close Panel');
    ui.filter.setValue({ status: ['active'] });
    assert.equal(ui.button.getAttribute('aria-label'), 'Narrow, one on');
});

test('the popover shows default titles, a heading per group, checkboxes, and radios for a single group', function () {
    var ui = build();
    ui.button.click();
    var p = panel();
    assert.ok(p);
    assert.equal(p.getAttribute('role'), 'dialog');
    assert.equal(p.getAttribute('aria-labelledby'), p.querySelector('.base-filter-title').id);
    assert.equal(ui.button.getAttribute('aria-controls'), p.id);
    assert.equal(ui.button.getAttribute('aria-expanded'), 'true');
    assert.equal(p.querySelector('.base-filter-title').textContent, 'Filters');
    assert.equal(p.querySelector('.base-filter-clear').textContent, 'Clear');
    assert.equal(p.querySelector('.base-filter-done').textContent, 'Done');
    assert.deepEqual(all(p, '.base-filter-group-name').map(function (l) { return l.textContent; }), ['Status', 'Kind']);
    assert.deepEqual(inputs().map(function (i) { return i.getAttribute('type'); }), ['checkbox', 'checkbox', 'checkbox', 'radio', 'radio']);
    assert.equal(input('kind', 'movie').getAttribute('name'), input('kind', 'show').getAttribute('name'));
    assert.ok(all(p, '.base-filter-group')[1].classList.contains('single'));
    assert.deepEqual(all(p, '.base-check-label').map(function (l) { return l.textContent; }), ['Active', 'Paused', 'Failed', 'Movies', 'Shows']);
});

test('the popover sits beside the button in the page, is placed by the viewport, and focuses the first box', function () {
    var ui = build();
    ui.button.click();
    assert.equal(panel().parentNode, ui.mount);
    assert.equal(ui.mount.children.indexOf(panel()), ui.mount.children.indexOf(ui.button) + 1);
    assert.equal(panel().style.top, '128px');
    assert.equal(panel().style.left, '100px');
    assert.equal(dom.document.activeElement, inputs()[0]);
    assert.ok(dom.windowListeners('resize') > 0);
});

test('a popover opened from a button outside the page goes on the body', function () {
    var filter = createFilterPanel({ groups: GROUPS });
    filter.open();
    assert.equal(panel().parentNode, dom.document.body);
    filter.destroy();
});

test('checking boxes applies at once by default and reports a copy of every group', function () {
    var ui = build();
    ui.filter.open();
    toggle('status', 'failed', true);
    toggle('status', 'active', true);
    assert.deepEqual(ui.changes, [{ status: ['failed'], kind: [] }, { status: ['active', 'failed'], kind: [] }]);
    assert.equal(badge(ui).textContent, '2');
    ui.changes[1].status.push('x');
    assert.deepEqual(ui.filter.getValue().status, ['active', 'failed']);
    toggle('status', 'active', false);
    assert.deepEqual(ui.filter.getValue(), { status: ['failed'], kind: [] });
});

test('a single group holds at most one value', function () {
    var ui = build({ value: { kind: ['movie', 'show'] } });
    assert.deepEqual(ui.filter.getValue().kind, ['movie']);
    ui.filter.open();
    assert.equal(input('kind', 'movie').checked, true);
    toggle('kind', 'show', true);
    assert.deepEqual(ui.filter.getValue().kind, ['show']);
    assert.equal(input('kind', 'movie').checked, false);
    assert.equal(input('kind', 'show').checked, true);
});

test('Clear unchecks every group', function () {
    var ui = build({ value: { status: ['active', 'paused'], kind: ['show'] } });
    ui.filter.open();
    panel().querySelector('.base-filter-clear').click();
    assert.deepEqual(ui.filter.getValue(), { status: [], kind: [] });
    assert.deepEqual(ui.changes, [{ status: [], kind: [] }]);
    assert.equal(inputs().some(function (i) { return i.checked; }), false);
    assert.equal(badge(ui).hidden, true);
    panel().querySelector('.base-filter-clear').click();
    assert.equal(ui.changes.length, 1);
});

test('with applyOnChange false, changes wait for Done', function () {
    var ui = build({ applyOnChange: false });
    ui.filter.open();
    toggle('status', 'paused', true);
    toggle('kind', 'movie', true);
    assert.deepEqual(ui.changes, []);
    assert.deepEqual(ui.filter.getValue(), { status: [], kind: [] });
    assert.equal(badge(ui).hidden, true);
    panel().querySelector('.base-filter-done').click();
    assert.deepEqual(ui.changes, [{ status: ['paused'], kind: ['movie'] }]);
    assert.equal(badge(ui).textContent, '2');
    assert.equal(ui.filter.isOpen(), false);
    assert.equal(dom.document.activeElement, ui.button);
});

test('with applyOnChange false, Escape drops the pending changes and Done with none reports nothing', function () {
    var ui = build({ applyOnChange: false, value: { status: ['active'] } });
    ui.filter.open();
    toggle('status', 'active', false);
    panel().querySelector('.base-filter-clear').click();
    dom.document.key('Escape');
    assert.equal(ui.filter.isOpen(), false);
    assert.deepEqual(ui.filter.getValue(), { status: ['active'], kind: [] });
    ui.filter.open();
    assert.equal(input('status', 'active').checked, true);
    panel().querySelector('.base-filter-done').click();
    assert.deepEqual(ui.changes, []);
});

test('Escape closes the popover and returns focus to the button', function () {
    var ui = build();
    ui.button.click();
    var e = dom.document.key('Escape');
    assert.equal(e.defaultPrevented, true);
    assert.equal(ui.filter.isOpen(), false);
    assert.equal(panel(), null);
    assert.equal(ui.button.getAttribute('aria-expanded'), 'false');
    assert.equal(dom.document.activeElement, ui.button);
});

test('Escape on the button closes an open popover', function () {
    var ui = build();
    ui.button.click();
    ui.button.focus();
    dom.document.key('Escape');
    assert.equal(ui.filter.isOpen(), false);
});

test('the popover claims Escape while open, so a dialog around it leaves Escape to it', function () {
    var ui = build();
    ui.filter.open();
    assert.equal(panel().getAttribute('data-base-escape'), 'true');
});

test('a click outside closes the popover and returns focus, and a click inside does not', function () {
    var ui = build();
    ui.button.click();
    dom.document.dispatch('click', { target: inputs()[1] });
    assert.equal(ui.filter.isOpen(), true);
    dom.document.dispatch('click', { target: dom.document.body });
    assert.equal(ui.filter.isOpen(), false);
    assert.equal(dom.document.activeElement, ui.button);
});

test('a second click on the button closes the popover', function () {
    var ui = build();
    ui.button.click();
    ui.button.click();
    assert.equal(ui.filter.isOpen(), false);
    assert.equal(dom.document.activeElement, ui.button);
});

test('moving focus out of the popover closes it without taking focus back', function () {
    var ui = build();
    var other = dom.document.createElement('button');
    dom.document.body.appendChild(other);
    ui.button.click();
    other.focus();
    assert.equal(ui.filter.isOpen(), false);
    assert.equal(dom.document.activeElement, other);
});

test('a narrow screen opens a Base dialog with the title, the groups, and Clear and Done', function () {
    globalThis.innerWidth = 375;
    var ui = build();
    ui.button.click();
    var overlay = dom.document.querySelector('.base-dialog');
    assert.ok(overlay);
    assert.equal(panel(), null);
    assert.equal(overlay.querySelector('.base-modal-title').textContent, 'Filters');
    assert.ok(overlay.querySelector('.base-filter-dialog'));
    assert.equal(all(overlay, '.base-filter-group').length, 2);
    assert.equal(overlay.querySelector('.base-filter-clear').textContent, 'Clear');
    assert.equal(overlay.querySelector('.base-filter-done').textContent, 'Done');
    toggle('status', 'active', true);
    assert.deepEqual(ui.filter.getValue().status, ['active']);
    overlay.querySelector('.base-filter-clear').click();
    assert.deepEqual(ui.filter.getValue().status, []);
    overlay.querySelector('.base-filter-done').click();
    assert.equal(dom.document.querySelector('.base-dialog'), null);
    assert.equal(ui.filter.isOpen(), false);
    assert.equal(dom.document.activeElement, ui.button);
});

test('asDialog opens a dialog on a wide screen, and Escape there drops pending changes and returns focus', function () {
    var ui = build({ asDialog: true, applyOnChange: false });
    ui.filter.open();
    assert.ok(dom.document.querySelector('.base-dialog'));
    toggle('kind', 'show', true);
    dom.document.key('Escape');
    assert.equal(dom.document.querySelector('.base-dialog'), null);
    assert.equal(ui.filter.isOpen(), false);
    assert.deepEqual(ui.filter.getValue().kind, []);
    assert.deepEqual(ui.changes, []);
    assert.equal(dom.document.activeElement, ui.button);
});

test('a dialog applies pending changes on Done, and opening again after it uses the popover', function () {
    var ui = build({ asDialog: true, applyOnChange: false });
    ui.filter.open();
    toggle('kind', 'show', true);
    dom.document.querySelector('.base-dialog .base-filter-done').click();
    assert.deepEqual(ui.changes, [{ status: [], kind: ['show'] }]);
    ui.filter.close();
    var wide = build();
    wide.filter.open();
    toggle('status', 'failed', true);
    assert.deepEqual(wide.filter.getValue().status, ['failed']);
    wide.filter.close();
    globalThis.innerWidth = 375;
    wide.filter.open();
    assert.ok(dom.document.querySelector('.base-dialog .base-filter-groups'));
    wide.filter.close();
    globalThis.innerWidth = 1024;
    wide.filter.open();
    assert.ok(panel().querySelector('.base-filter-groups'));
    assert.equal(dom.document.querySelector('.base-dialog'), null);
});

test('setValue keeps only known groups and options and does not report a change', function () {
    var ui = build();
    ui.filter.setValue({ status: ['nope', 'paused'], other: ['x'], kind: 'movie' });
    assert.deepEqual(ui.filter.getValue(), { status: ['paused'], kind: [] });
    ui.filter.setValue(null);
    assert.deepEqual(ui.filter.getValue(), { status: [], kind: [] });
    assert.deepEqual(ui.changes, []);
});

test('a name such as constructor never reads an inherited member', function () {
    var ui = build({ groups: [{ name: 'constructor', label: 'Odd', options: [{ value: 'a', label: 'A' }] }] });
    assert.deepEqual(ui.filter.getValue(), { constructor: [] });
});

test('setGroups replaces the groups, drops values that no longer exist, and keeps the rest', function () {
    var ui = build({ value: { status: ['active', 'failed'], kind: ['show'] } });
    ui.filter.setGroups([{ name: 'status', label: 'State', options: [{ value: 'failed', label: 'Failed' }] }]);
    assert.deepEqual(ui.filter.getValue(), { status: ['failed'] });
    assert.equal(badge(ui).textContent, '1');
    ui.filter.open();
    assert.deepEqual(all(panel(), '.base-filter-group-name').map(function (l) { return l.textContent; }), ['State']);
    assert.equal(input('status', 'failed').checked, true);
    ui.filter.setGroups(null);
    assert.deepEqual(ui.filter.getValue(), {});
    assert.equal(inputs().length, 0);
    assert.deepEqual(ui.changes, []);
});

test('no options gives an empty panel, with Done taking focus', function () {
    var filter = createFilterPanel();
    dom.document.body.appendChild(filter.element);
    assert.deepEqual(filter.getValue(), {});
    filter.open();
    assert.equal(inputs().length, 0);
    assert.equal(dom.document.activeElement, panel().querySelector('.base-filter-done'));
    panel().querySelector('.base-filter-done').click();
    assert.equal(filter.isOpen(), false);
});

test('open twice is one panel, and close when closed does nothing', function () {
    var ui = build();
    ui.filter.close();
    ui.filter.open();
    ui.filter.open();
    assert.equal(all(dom.document, '.base-filter-panel').length, 1);
});

test('destroy closes the panel and removes every listener', function () {
    var ui = build();
    ui.filter.open();
    var p = panel();
    var body = p.querySelector('.base-filter-groups');
    ui.filter.destroy();
    assert.equal(panel(), null);
    assert.equal((dom.document.listeners.click || []).length, 0);
    assert.equal(dom.windowListeners('resize'), 0);
    assert.equal(dom.windowListeners('scroll'), 0);
    assert.equal((ui.button.listeners.click || []).length, 0);
    assert.equal((ui.button.listeners.keydown || []).length, 0);
    assert.equal((p.listeners.keydown || []).length, 0);
    assert.equal((p.listeners.focusout || []).length, 0);
    assert.equal((body.listeners.change || []).length, 0);
});

test('destroy closes an open dialog', function () {
    var ui = build({ asDialog: true });
    ui.filter.open();
    ui.filter.destroy();
    assert.equal(dom.document.querySelector('.base-dialog'), null);
    assert.equal((dom.document.listeners.keydown || []).length, 0);
});
