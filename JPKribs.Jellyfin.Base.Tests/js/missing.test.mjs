// Tests for helpers that had none, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, all } from './fake-dom.mjs';

var dom = installFakeDom();
var kit = await import('../../src/js/index.js');
var { createSortableCardList, createChoiceGroup, bindSecretField, readSecretField, clearSecretField, SECRET_KEPT, bindPlaceholders, placeholderHint, createUserSelector, createShared } = kit;
var { bindComboAria } = await import('../../src/js/lib/combo-aria.js');
var { createSearchableComboBox } = await import('../../src/js/combo-box.js');

beforeEach(function () {
    dom = installFakeDom();
    mock.timers.reset();
    mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
});

async function flush() { for (var i = 0; i < 6; i++) await Promise.resolve(); }

// The stub DOM does not parse innerHTML, so the move buttons, which the row editor core adds as elements, are tested in row-editor.test.mjs.
test('createSortableCardList writes the Drag to Reorder label and the arrows holder, and neither without reorder', function () {
    var host = dom.el('div');
    dom.document.body.appendChild(host);
    var listEl = host.appendChild(dom.el('div'));
    createSortableCardList(listEl, { items: [{ n: 'a' }, { n: 'b' }], render: function (item) { return { title: item.n }; } }).render();
    var first = listEl.children[0].innerHTML;
    assert.match(first, /title="Drag to reorder"/);
    assert.match(first, /class="base-card-item-arrows base-row-arrows"/);
    var plain = host.appendChild(dom.el('div'));
    createSortableCardList(plain, { reorder: false, items: [{ n: 'a' }], render: function (item) { return { title: item.n }; } }).render();
    assert.doesNotMatch(plain.children[0].innerHTML, /base-row-arrows|Drag to Reorder/);
});

test('createSortableCardList escapes a title and needs a list element and a render function', function () {
    var host = dom.el('div');
    dom.document.body.appendChild(host);
    var listEl = host.appendChild(dom.el('div'));
    createSortableCardList(listEl, { items: [{}], render: function () { return { title: '<b>x</b>' }; } }).render();
    assert.match(listEl.children[0].innerHTML, /&lt;b&gt;x&lt;\/b&gt;/);
    assert.throws(function () { createSortableCardList(null, { render: function () {} }); }, /list element/);
    assert.throws(function () { createSortableCardList(listEl, {}); }, /render function/);
});

function choiceGroup() {
    var inputs = ['a', 'b'].map(function (v) { return dom.el('input', { type: 'radio', name: 'g', value: v }); });
    var choices = inputs.map(function (i) { return dom.el('label', { class: 'base-choice' }, [i]); });
    var group = dom.el('div', { class: 'base-choice-group' }, choices);
    dom.document.body.appendChild(group);
    return { group: group, inputs: inputs, choices: choices };
}

test('createChoiceGroup marks the checked choice, reports changes, and sets by value', function () {
    var g = choiceGroup();
    var seen = [];
    g.inputs[1].checked = true;
    var handle = createChoiceGroup(g.group, { onChange: function (v) { seen.push(v); } });
    assert.deepEqual(g.choices.map(function (c) { return c.classList.contains('selected'); }), [false, true]);
    assert.equal(handle.get(), 'b');
    g.inputs[0].checked = true;
    g.inputs[1].checked = false;
    g.inputs[0].dispatch('change');
    assert.deepEqual(seen, ['a']);
    assert.equal(g.choices[0].classList.contains('selected'), true);
    assert.equal(g.choices[1].classList.contains('selected'), false);
    handle.set('b');
    assert.equal(handle.get(), 'b');
    assert.equal(g.choices[1].classList.contains('selected'), true);
    assert.equal(seen.length, 1);
    handle.destroy();
    g.inputs[0].checked = true;
    g.inputs[0].dispatch('change');
    assert.equal(seen.length, 1);
});

test('createChoiceGroup gives null with nothing checked and needs a group element', function () {
    var g = choiceGroup();
    assert.equal(createChoiceGroup(g.group).get(), null);
    assert.throws(function () { createChoiceGroup(null); }, /group element/);
});

test('bindSecretField empties the field and shows eight dots, with the hint in its title, while a secret is stored', function () {
    var input = dom.el('input', { type: 'password' });
    input.placeholder = 'Password';
    input.value = 'typed';
    bindSecretField(input, true);
    assert.equal(input.value, '');
    assert.equal(input.placeholder, '\u2022'.repeat(8));
    assert.equal(input.title, 'Saved, leave blank to keep');
    assert.equal(input.classList.contains('base-secret-stored'), true);
    assert.equal(readSecretField(input), SECRET_KEPT);
    input.value = 'new';
    assert.equal(readSecretField(input), 'new');
    bindSecretField(input, true, { placeholder: 'Stored.' });
    assert.equal(input.title, 'Stored.');
    bindSecretField(input, false);
    assert.equal(input.placeholder, 'Password');
    assert.equal(input.classList.contains('base-secret-stored'), false);
    assert.equal(readSecretField(input), '');
});

test('bindSecretField wires the clear button once, and clearing posts an empty value', function () {
    var input = dom.el('input', { type: 'password' });
    var clear = dom.el('button', { type: 'button' });
    var inputs = 0;
    input.addEventListener('input', function () { inputs++; });
    bindSecretField(input, true, { clearButton: clear });
    bindSecretField(input, true, { clearButton: clear });
    assert.equal(clear.classList.contains('hidden'), false);
    clear.click();
    assert.equal(inputs, 1);
    assert.equal(readSecretField(input), '');
    assert.equal(clear.classList.contains('hidden'), true);
    bindSecretField(input, false, { clearButton: clear });
    assert.equal(clear.classList.contains('hidden'), true);
    bindSecretField(input, true, { clearButton: clear });
    assert.equal(readSecretField(input), SECRET_KEPT);
    clearSecretField(input);
    assert.equal(readSecretField(input), '');
    assert.doesNotThrow(function () { bindSecretField(null, true); clearSecretField(null); });
});

function placeholderField() {
    var textarea = dom.el('textarea');
    textarea.value = 'Hello ';
    var chip = dom.el('button', { type: 'button', 'data-base-placeholder': 'name' });
    var list = dom.el('div', { class: 'base-placeholders', hidden: true }, [chip]);
    var hint = dom.el('button', { type: 'button', 'data-base-hint': '', 'aria-expanded': 'false' });
    var container = dom.el('div', { class: 'inputContainer' }, [textarea, hint, list]);
    var root = dom.el('div', {}, [container]);
    dom.document.body.appendChild(root);
    return { root: root, textarea: textarea, chip: chip, list: list, hint: hint };
}

test('bindPlaceholders toggles the list from the hint button and inserts a placeholder at the cursor', function () {
    var f = placeholderField();
    var inserted = [];
    bindPlaceholders(f.root, function (field) { inserted.push(field); });
    f.hint.click();
    assert.equal(f.list.hidden, false);
    assert.equal(f.hint.getAttribute('aria-expanded'), 'true');
    f.hint.click();
    assert.equal(f.list.hidden, true);
    assert.equal(f.hint.getAttribute('aria-expanded'), 'false');
    f.chip.click();
    assert.equal(f.textarea.value, 'Hello {name}');
    assert.deepEqual(inserted, [f.textarea]);
    assert.equal(dom.document.activeElement, f.textarea);
});

test('bindPlaceholders keeps focus in the field on mousedown, and binds a root once', function () {
    var f = placeholderField();
    bindPlaceholders(f.root);
    bindPlaceholders(f.root);
    assert.equal(f.chip.dispatch('mousedown').defaultPrevented, true);
    f.chip.click();
    assert.equal(f.textarea.value, 'Hello {name}');
    assert.doesNotThrow(function () { bindPlaceholders(null); });
});

test('placeholderHint escapes names and descriptions', function () {
    var html = placeholderHint([['a"b', '<x>']]);
    assert.match(html, /data-base-placeholder="a&quot;b"/);
    assert.match(html, /title="&lt;x&gt;"/);
    assert.match(html, /\{a&quot;b\}/);
});

var USERS = [
    { Id: 'b-2', Name: 'Bob', Policy: { IsAdministrator: false } },
    { Id: 'a-1', Name: 'Alice', Policy: { IsAdministrator: true } },
    { Id: 'c-3', Name: 'Carol', Policy: { IsAdministrator: false } }
];

function labels(sel) { return all(sel.element.querySelector('select').options).map(function (o) { return o.textContent; }); }

test('createUserSelector lists a None entry and the users sorted by name, with an admin badge', async function () {
    var sel = createUserSelector({ fetchUsers: function () { return USERS; } });
    await sel.ready;
    assert.deepEqual(labels(sel), ['None', 'Alice (admin)', 'Bob', 'Carol']);
    assert.equal(sel.getValue(), '');
});

test('createUserSelector filters administrators, hides the badge, and replaces the empty label', async function () {
    var only = createUserSelector({ fetchUsers: function () { return USERS; }, adminFilter: 'only', includeEmptyOption: false });
    await only.ready;
    assert.deepEqual(labels(only), ['Alice (admin)']);
    var exclude = createUserSelector({ fetchUsers: function () { return USERS; }, adminFilter: 'exclude', emptyLabel: 'Anyone' });
    await exclude.ready;
    assert.deepEqual(labels(exclude), ['Anyone', 'Bob', 'Carol']);
    var plain = createUserSelector({ fetchUsers: function () { return USERS; }, showAdminBadge: false, emptyLabel: 'Nobody' });
    await plain.ready;
    assert.deepEqual(labels(plain), ['Nobody', 'Alice', 'Bob', 'Carol']);
});

test('createUserSelector selects a value ignoring case and dashes, reports changes, and sets by id', async function () {
    var seen = [];
    var sel = createUserSelector({ fetchUsers: function () { return USERS; }, value: 'B2', onChange: function (v) { seen.push(v); } });
    await sel.ready;
    assert.equal(sel.getValue(), 'b-2');
    var select = sel.element.querySelector('select');
    select.value = 'c-3';
    select.dispatch('change');
    assert.deepEqual(seen, ['c-3']);
    sel.setValue('a-1');
    assert.equal(sel.getValue(), 'a-1');
    sel.setValue('nope');
    assert.equal(sel.getValue(), '');
});

test('createUserSelector reads a paged envelope and gives an empty list when the fetch fails', async function () {
    var paged = createUserSelector({ fetchUsers: function () { return { Items: USERS }; } });
    await paged.ready;
    assert.equal(labels(paged).length, 4);
    var failing = createUserSelector({ fetchUsers: function () { return Promise.reject(new Error('x')); } });
    await failing.ready;
    assert.deepEqual(labels(failing), ['None']);
});

test('pollTaskProgress shows progress that never goes backward, then resets and completes once idle', async function () {
    var tasks = [{ Key: 'k', State: 'Running', CurrentProgressPercentage: 40 }];
    globalThis.ApiClient = { getScheduledTasks: function () { return Promise.resolve(tasks); } };
    var shared = createShared(dom.el('div'), 'p');
    var btn = dom.el('button', {}, [dom.el('span', {}, [])]);
    btn.querySelector('span').textContent = 'Sync';
    dom.document.body.appendChild(btn);
    var done = 0;
    var handle = shared.pollTaskProgress(btn, 'k', 'Sync', function () { done++; });
    var label = btn.querySelector('span');
    assert.equal(btn.disabled, true);
    assert.equal(label.textContent, 'Sync 0%');
    mock.timers.tick(1000);
    await flush();
    assert.equal(label.textContent, 'Sync 40%');
    tasks = [{ Key: 'k', State: 'Running', CurrentProgressPercentage: 10 }];
    mock.timers.tick(1000);
    await flush();
    assert.equal(label.textContent, 'Sync 40%');
    tasks = [{ Key: 'k', State: 'Idle' }];
    mock.timers.tick(1000);
    await flush();
    assert.equal(label.textContent, 'Sync');
    assert.equal(btn.disabled, false);
    assert.equal(done, 1);
    handle.cancel();
    assert.equal(done, 1);
    delete globalThis.ApiClient;
});

test('pollTaskProgress cancel stops the poll and re-enables the button', async function () {
    var calls = 0;
    globalThis.ApiClient = { getScheduledTasks: function () { calls++; return Promise.resolve([]); } };
    var shared = createShared(dom.el('div'), 'p');
    var btn = dom.el('button', {}, [dom.el('span')]);
    var handle = shared.pollTaskProgress(btn, 'k', 'Sync');
    mock.timers.tick(1000);
    await flush();
    assert.equal(calls, 1);
    handle.cancel();
    assert.equal(btn.disabled, false);
    mock.timers.tick(5000);
    assert.equal(calls, 1);
    delete globalThis.ApiClient;
});

test('copyWithFeedback writes Copied. on success and Copy failed. on failure, then restores the label', async function () {
    var shared = createShared(dom.el('div'), 'p');
    var btn = dom.el('button', {}, [dom.el('span')]);
    var label = btn.querySelector('span');
    label.textContent = 'Copy';
    dom.document.execCommand = function () { return true; };
    assert.equal(await shared.copyWithFeedback(btn, 'text'), true);
    assert.equal(label.textContent, 'Copied');
    mock.timers.tick(1500);
    assert.equal(label.textContent, 'Copy');
    dom.document.execCommand = function () { return false; };
    assert.equal(await shared.copyWithFeedback(btn, 'text'), false);
    assert.equal(label.textContent, 'Copy failed.');
    mock.timers.tick(1500);
    assert.equal(label.textContent, 'Copy');
});

test('copyWithFeedback takes replacement labels and a duration, and works with no button', async function () {
    var shared = createShared(dom.el('div'), 'p');
    var btn = dom.el('button');
    btn.textContent = 'Copy';
    dom.document.execCommand = function () { return true; };
    await shared.copyWithFeedback(btn, 'x', { copiedText: 'Done.', duration: 200 });
    assert.equal(btn.textContent, 'Done.');
    mock.timers.tick(200);
    assert.equal(btn.textContent, 'Copy');
    assert.equal(await shared.copyWithFeedback(null, 'x'), true);
});

test('bindComboAria wires the roles, opens and closes, and activates an option', function () {
    var input = dom.el('input', { type: 'text' });
    var dropdown = dom.el('div', { class: 'base-combo-dropdown hidden' });
    var aria = bindComboAria(input, dropdown);
    assert.equal(input.getAttribute('role'), 'combobox');
    assert.equal(input.getAttribute('aria-controls'), dropdown.id);
    assert.equal(dropdown.getAttribute('role'), 'listbox');
    var a = dom.el('div', { class: 'base-combo-option' });
    var b = dom.el('div', { class: 'base-combo-option' });
    dropdown.appendChild(a);
    dropdown.appendChild(b);
    aria.option(a, 0);
    aria.option(b, 1);
    aria.setOpen(true);
    assert.equal(input.getAttribute('aria-expanded'), 'true');
    assert.equal(dropdown.classList.contains('hidden'), false);
    aria.activate(1);
    assert.equal(input.getAttribute('aria-activedescendant'), b.id);
    assert.equal(b.getAttribute('aria-selected'), 'true');
    assert.equal(a.getAttribute('aria-selected'), 'false');
    aria.activate(-1);
    assert.equal(input.hasAttribute('aria-activedescendant'), false);
    aria.setOpen(false);
    assert.equal(input.getAttribute('aria-expanded'), 'false');
    assert.equal(dropdown.classList.contains('hidden'), true);
});

test('createUserSelector puts size small or large on data-base-size, and leaves it off for medium or no size', function () {
    function build(size) { return createUserSelector({ fetchUsers: function () { return []; }, size: size }); }
    assert.equal(build('small').element.getAttribute('data-base-size'), 'small');
    assert.equal(build('large').element.getAttribute('data-base-size'), 'large');
    assert.equal(build('medium').element.hasAttribute('data-base-size'), false);
    assert.equal(build(undefined).element.hasAttribute('data-base-size'), false);
    var handle = build('small');
    handle.setSize('large');
    assert.equal(handle.element.getAttribute('data-base-size'), 'large');
    handle.setSize('medium');
    assert.equal(handle.element.hasAttribute('data-base-size'), false);
});

test('createSearchableComboBox puts size small or large on data-base-size, and leaves it off for medium or no size', function () {
    function build(size) { return createSearchableComboBox({ searchFn: function (q, cb) { cb([]); }, size: size }); }
    assert.equal(build('small').element.getAttribute('data-base-size'), 'small');
    assert.equal(build('large').element.getAttribute('data-base-size'), 'large');
    assert.equal(build('medium').element.hasAttribute('data-base-size'), false);
    assert.equal(build(undefined).element.hasAttribute('data-base-size'), false);
});
