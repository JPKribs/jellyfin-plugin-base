// Tests for the setup checklist, numbered collapsible steps with state badges under a segmented summary, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fake-dom.mjs';

var dom = installFakeDom();
var { createSetupChecklist, setupState, firstOpenStep } = await import('../../src/js/setup-checklist.js');

beforeEach(function () {
    dom = installFakeDom();
});

function steps() {
    return [
        { key: 'port', title: 'Choose a Port', state: 'done', content: '<p>Open.</p>' },
        { key: 'domain', title: 'Point a Domain', state: 'attention', action: { text: 'Check Again' } },
        { key: 'cert', title: 'Add a Certificate' },
        { key: 'relay', title: 'Set Up a Relay', state: 'optional' }
    ];
}

function sections(list) {
    return list.element.querySelectorAll('.base-setup-step');
}

function segments(list) {
    return list.element.querySelectorAll('.base-stepper-step');
}

test('setupState keeps the four states and reads anything else as todo', function () {
    assert.equal(setupState('done'), 'done');
    assert.equal(setupState('optional'), 'optional');
    assert.equal(setupState('finished'), 'todo');
    assert.equal(setupState(undefined), 'todo');
});

test('firstOpenStep finds the first step that is not done, or -1', function () {
    assert.equal(firstOpenStep(['done', 'optional', 'todo']), 1);
    assert.equal(firstOpenStep(['done', 'done']), -1);
    assert.equal(firstOpenStep([]), -1);
});

test('each step is a numbered collapsible section whose header badge names its state', function () {
    var list = createSetupChecklist({ steps: steps() });
    var all = sections(list);
    assert.equal(all.length, 4);
    assert.ok(all[0].classList.contains('base-collapsible-section'));
    assert.ok(all[0].classList.contains('numbered'));
    var badges = list.element.querySelectorAll('.base-collapsible-header .base-collapsible-badge');
    assert.equal(badges[0].textContent, 'Done');
    assert.ok(badges[0].classList.contains('green'));
    assert.equal(badges[1].textContent, 'Needs attention');
    assert.ok(badges[1].classList.contains('orange'));
    assert.equal(badges[2].textContent, 'To do');
    assert.equal(badges[3].textContent, 'Optional');
});

test('the first step that is not done opens on its own, and the rest stay closed', function () {
    var list = createSetupChecklist({ steps: steps() });
    var headers = list.element.querySelectorAll('.base-collapsible-header');
    assert.equal(headers[0].getAttribute('aria-expanded'), 'false');
    assert.equal(headers[1].getAttribute('aria-expanded'), 'true');
    assert.equal(headers[2].getAttribute('aria-expanded'), 'false');
});

test('the summary counts the done steps and draws one segment per step in its state', function () {
    var list = createSetupChecklist({ steps: steps() });
    assert.equal(list.element.querySelector('.base-setup-count').textContent, '1 of 4 done');
    var segs = segments(list);
    assert.equal(segs.length, 4);
    assert.ok(segs[0].classList.contains('completed'));
    assert.ok(segs[1].classList.contains('attention'));
    assert.ok(segs[2].classList.contains('upcoming'));
    assert.ok(segs[3].classList.contains('optional'));
    assert.equal(segs[1].querySelector('.base-stepper-control').getAttribute('aria-current'), 'step');
});

test('the next todo step shows as current in the summary, and its hidden text says To do', function () {
    var list = createSetupChecklist({ steps: [{ key: 'a', title: 'A', state: 'done' }, { key: 'b', title: 'B' }] });
    var seg = segments(list)[1];
    assert.ok(seg.classList.contains('current'));
    assert.match(seg.textContent, /To do/);
});

test('a segment is a button that opens its step and focuses its header', function () {
    var list = createSetupChecklist({ steps: steps() });
    dom.document.body.appendChild(list.element);
    var button = segments(list)[3].querySelector('button.base-stepper-control');
    assert.ok(button);
    assert.equal(button.title, 'Set Up a Relay');
    button.click();
    var header = sections(list)[3].querySelector('.base-collapsible-header');
    assert.equal(header.getAttribute('aria-expanded'), 'true');
    assert.equal(dom.document.activeElement, header);
});

test('setState updates the badge and the summary, and a done step hands on to the next open one', function () {
    var changes = [];
    var list = createSetupChecklist({ steps: steps(), onStateChange: function (key, state) { changes.push(key + ':' + state); } });
    list.setState('domain', 'done');
    var headers = list.element.querySelectorAll('.base-collapsible-header');
    assert.equal(headers[1].querySelector('.base-collapsible-badge').textContent, 'Done');
    assert.equal(headers[1].getAttribute('aria-expanded'), 'false');
    assert.equal(headers[2].getAttribute('aria-expanded'), 'true');
    assert.equal(list.element.querySelector('.base-setup-count').textContent, '2 of 4 done');
    assert.deepEqual(changes, ['domain:done']);
    list.setState('domain', 'done');
    assert.deepEqual(changes, ['domain:done']);
});

test('autoAdvance false leaves a step open when it turns done', function () {
    var list = createSetupChecklist({ steps: steps(), autoAdvance: false });
    list.setState('domain', 'done');
    var headers = list.element.querySelectorAll('.base-collapsible-header');
    assert.equal(headers[1].getAttribute('aria-expanded'), 'true');
    assert.equal(headers[2].getAttribute('aria-expanded'), 'false');
});

test('getValue maps each key to its state, and setValue and getState read and write the same', function () {
    var list = createSetupChecklist({ steps: steps() });
    assert.deepEqual(list.getValue(), { port: 'done', domain: 'attention', cert: 'todo', relay: 'optional' });
    list.setValue({ cert: 'done', relay: 'bogus' });
    assert.equal(list.getState('cert'), 'done');
    assert.equal(list.getState('relay'), 'todo');
    assert.equal(list.getState('missing'), null);
});

test('a step action is a button that reports its key', function () {
    var pressed = [];
    var items = steps();
    items[1].action.onClick = function (key) { pressed.push(key); };
    var list = createSetupChecklist({ steps: items });
    var button = sections(list)[1].querySelector('.base-collapsible-actions .base-button');
    assert.equal(button.textContent, 'Check Again');
    assert.ok(button.classList.contains('primary'));
    button.click();
    assert.deepEqual(pressed, ['domain']);
});

test('the badge words and the summary are replaceable', function () {
    var list = createSetupChecklist({ steps: steps(), stateLabels: { done: 'Ready' }, summaryText: '{done}/{total}' });
    assert.equal(list.element.querySelector('.base-collapsible-badge').textContent, 'Ready');
    assert.equal(list.element.querySelector('.base-setup-count').textContent, '1/4');
});

test('setItems replaces the steps and opens the first that is not done, and destroy stops the actions', function () {
    var pressed = [];
    var list = createSetupChecklist({ steps: steps() });
    list.setItems([{ key: 'x', title: 'X', state: 'done' }, { key: 'y', title: 'Y', action: { text: 'Go', onClick: function () { pressed.push('y'); } } }]);
    assert.equal(sections(list).length, 2);
    var headers = list.element.querySelectorAll('.base-collapsible-header');
    assert.equal(headers[1].getAttribute('aria-expanded'), 'true');
    list.destroy();
    sections(list)[1].querySelector('.base-button').click();
    assert.deepEqual(pressed, []);
});
