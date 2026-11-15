// Tests for the placeholder hint's delimiters and copy mode, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fake-dom.mjs';

var dom = installFakeDom();
var { placeholderHint, bindPlaceholders, placeholderToken } = await import('../../src/js/placeholder-hint.js');

beforeEach(function () {
    dom = installFakeDom();
});

function stubClipboard(calls) {
    Object.defineProperty(globalThis, 'navigator', { value: { clipboard: { writeText: function (t) { calls.push(t); return Promise.resolve(); } } }, configurable: true, writable: true });
}

// Builds a hint's markup by hand, as placeholderHint would, since the stub DOM does not parse innerHTML.
function hintMarkup(copy, token, name) {
    var field = dom.el('textarea');
    var chip = dom.el('button', { type: 'button', class: 'base-tag base-tag-button', 'data-base-placeholder': name, 'data-base-token': token });
    var status = dom.el('span', { class: 'base-sr-only', role: 'status' });
    var list = dom.el('div', { class: 'base-placeholders', hidden: true }, [dom.el('span', { class: 'base-tags' }, [chip]), status]);
    var hint = dom.el('div', copy ? { class: 'base-placeholder-hint copy', 'data-base-copied': 'Copied {value}.' } : { class: 'base-placeholder-hint' }, [list]);
    var root = dom.el('div', {}, [dom.el('div', { class: 'inputContainer' }, [field, hint])]);
    dom.document.body.appendChild(root);
    return { root: root, field: field, chip: chip, status: status };
}

test('placeholderToken wraps a name in braces by default, or in the given delimiters', function () {
    assert.equal(placeholderToken('title'), '{title}');
    assert.equal(placeholderToken('item.name', { open: '{{', close: '}}' }), '{{item.name}}');
    assert.equal(placeholderToken('x', { open: '$', close: '' }), '$x');
});

test('the default hint keeps its markup, with {name} tokens and the Placeholders label', function () {
    var html = placeholderHint([['title', 'The title']]);
    assert.match(html, /<div class="base-placeholder-hint">/);
    assert.match(html, /data-base-placeholder="title" data-base-token="\{title\}" title="The title">\{title\}<\/button>/);
    assert.match(html, /<span>Placeholders<\/span>/);
    assert.doesNotMatch(html, /role="status"/);
});

test('custom delimiters draw and carry the token, escaped', function () {
    var html = placeholderHint([['item.name', 'The <name>']], { open: '{{', close: '}}' });
    assert.match(html, /data-base-token="\{\{item\.name\}\}"/);
    assert.match(html, />\{\{item\.name\}\}<\/button>/);
    assert.match(html, /title="The &lt;name&gt;"/);
});

test('copy mode marks the hint, carries the copied message, and adds a live region', function () {
    var html = placeholderHint([['a', '']], { mode: 'copy', label: 'Tokens', copiedText: 'Took {value}.' });
    assert.match(html, /<div class="base-placeholder-hint copy" data-base-copied="Took \{value\}\.">/);
    assert.match(html, /<span>Tokens<\/span>/);
    assert.match(html, /<span class="base-sr-only" role="status"><\/span>/);
});

test('a placeholder in insert mode puts its token with its own delimiters at the cursor', function () {
    var ui = hintMarkup(false, '{{year}}', 'year');
    ui.field.value = 'Released ';
    bindPlaceholders(ui.root);
    ui.chip.click();
    assert.equal(ui.field.value, 'Released {{year}}');
});

test('a placeholder in copy mode copies its token, leaves the field alone, and announces the copy', async function () {
    var calls = [];
    stubClipboard(calls);
    var ui = hintMarkup(true, '{{item.name}}', 'item.name');
    ui.field.value = 'echo';
    var inserted = [];
    bindPlaceholders(ui.root, function (f) { inserted.push(f); });
    ui.chip.click();
    await new Promise(function (r) { setTimeout(r, 0); });
    assert.deepEqual(calls, ['{{item.name}}']);
    assert.equal(ui.field.value, 'echo');
    assert.deepEqual(inserted, []);
    assert.ok(ui.chip.classList.contains('copied'));
    assert.equal(ui.status.textContent, 'Copied {{item.name}}.');
});

test('a chip without a token attribute still inserts {name}, as hints built before delimiters do', function () {
    var ui = hintMarkup(false, '', 'title');
    ui.chip.removeAttribute('data-base-token');
    bindPlaceholders(ui.root);
    ui.chip.click();
    assert.equal(ui.field.value, '{title}');
});
