// Tests for the one badge maker and the parts the badge, button, and collapse family share, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { installFakeDom, all } from './fake-dom.mjs';

var root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
var dom = installFakeDom();
var kit = await import('../../src/js/index.js');
var { BADGE_STATES, createShared, createSortableCardList, openDialog, createHelpHint, placeholderHint, bindPlaceholders } = kit;
var { badgeColor, makeBadge, badgeHtml, classBadgeHtml } = await import('../../src/js/lib/badge.js');
var { statusDotHtml } = await import('../../src/js/status-dot.js');
var { setCollapsed } = await import('../../src/js/collapsible-section.js');
var { pollTaskProgress } = await import('../../src/js/task-progress-button.js');

beforeEach(function () {
    dom = installFakeDom();
});

test('badgeColor keeps a color name or hex code, maps a state name, and falls back for anything else', function () {
    assert.equal(badgeColor('teal'), 'teal');
    assert.equal(badgeColor(' #e91e63 '), '#e91e63');
    assert.equal(badgeColor('Errored'), 'red');
    assert.equal(badgeColor('Queued'), 'orange');
    assert.equal(badgeColor('constructor'), '');
    assert.equal(badgeColor('bad color"', 'gray'), 'gray');
    assert.equal(badgeColor(null), '');
});

test('every BADGE_STATES name has a state color, and badge.css tints its state class the same color', function () {
    var css = readFileSync(join(root, 'src/css/badge.css'), 'utf8');
    BADGE_STATES.names.forEach(function (name) {
        var color = BADGE_STATES.stateColors[name];
        assert.ok(BADGE_STATES.colors.indexOf(color) >= 0, name);
        var line = css.split('\n').filter(function (l) { return l.indexOf('.base-badge.' + color + ',') === 0 || l.indexOf('.base-badge.' + color + ' {') === 0; })[0];
        assert.ok(line, color);
        assert.ok(line.indexOf('.base-table-status-badge.' + name + ',') >= 0 || line.indexOf('.base-table-status-badge.' + name + ' {') >= 0, name + ' is ' + color);
    });
    assert.equal(Object.keys(BADGE_STATES.stateColors).length, BADGE_STATES.names.length);
});

test('makeBadge builds a base-badge with its color, size, and own classes, and a hex code as custom', function () {
    var plain = makeBadge('Active', 'green');
    assert.equal(plain.className, 'base-badge green');
    assert.equal(plain.textContent, 'Active');
    assert.equal(makeBadge('Failed', 'Failed', 'large', 'base-x').className, 'base-badge red large base-x');
    assert.equal(makeBadge('Small', 'blue', 'small').className, 'base-badge blue');
    var hex = makeBadge('VIP', '#e91e63');
    assert.equal(hex.className, 'base-badge custom');
    assert.equal(hex.style['--base-custom'], '#e91e63');
    assert.equal(hex.style['--base-custom-on'], '#000');
    assert.equal(makeBadge('Odd', 'nope').className, 'base-badge');
});

test('badgeHtml draws the same badge as markup, escaping the label and the classes', function () {
    assert.equal(badgeHtml('<b>', 'purple'), '<span class="base-badge purple">&lt;b&gt;</span>');
    assert.equal(badgeHtml('VIP', '#e91e63', 'medium'), '<span class="base-badge custom medium" style="--base-custom: #e91e63; --base-custom-on: #000">VIP</span>');
    assert.equal(badgeHtml('x', '', null, 'a"b c'), '<span class="base-badge ab c">x</span>');
});

test('classBadgeHtml reads the color and size from a class string and keeps the other classes', function () {
    assert.equal(classBadgeHtml('Synced', 'green medium'), '<span class="base-badge green medium">Synced</span>');
    assert.equal(classBadgeHtml('Mine', 'my-thing'), '<span class="base-badge my-thing">Mine</span>');
    assert.equal(classBadgeHtml('VIP', '#e91e63'), '<span class="base-badge custom" style="--base-custom: #e91e63; --base-custom-on: #000">VIP</span>');
    assert.equal(classBadgeHtml('None', null), '<span class="base-badge">None</span>');
});

test('the bag badge keeps its markup, and statusBadge colors a state while keeping its status classes', function () {
    var shared = createShared(dom.el('div'), 'p');
    assert.equal(shared.badge('green', 'Active'), '<span class="base-badge green">Active</span>');
    assert.equal(shared.badge('#e91e63', 'VIP'), '<span class="base-badge custom" style="--base-custom: #e91e63; --base-custom-on: #000">VIP</span>');
    assert.equal(shared.statusBadge('Queued', 'Queued'), '<span class="base-badge orange base-table-status-badge Queued">Queued</span>');
    assert.equal(shared.statusBadge('Odd', 'Odd'), '<span class="base-badge base-table-status-badge Odd">Odd</span>');
    assert.equal(shared.statusBadge('<i>', 'Pending-Deletion x"y'), '<span class="base-badge base-table-status-badge Pending-Deletion xy">&lt;i&gt;</span>');
});

test('statusDotHtml draws the status dot, named by its label or its color meaning', function () {
    assert.equal(statusDotHtml('green'), '<span class="base-dot green" role="img" title="Active" aria-label="Active"></span>');
    assert.equal(statusDotHtml('nope', '<x>'), '<span class="base-dot gray" role="img" title="&lt;x&gt;" aria-label="&lt;x&gt;"></span>');
    assert.match(statusDotHtml('#e91e63'), /class="base-dot custom" role="img" title="Note" aria-label="Note" style="--base-custom: #e91e63/);
});

test('a card draws its dot as the status dot, its badges as badges, and the collapsible chevron', function () {
    var host = dom.el('div');
    dom.document.body.appendChild(host);
    var listEl = host.appendChild(dom.el('div'));
    var cards = createSortableCardList(listEl, {
        items: ['a', 'b', 'c', 'd'],
        render: function (item) {
            var dots = { a: 'ok', b: 'bad', c: 'checking', d: 'odd' };
            return { title: item, dot: dots[item], dotTitle: item === 'b' ? 'Down' : null, badges: [{ label: 'Mode', cls: item === 'a' ? 'blue' : '' }] };
        }
    });
    cards.render();
    var html = all(listEl, '.base-card-item').map(function (c) { return c.innerHTML; });
    assert.match(html[0], /<span class="base-dot green" role="img" title="Active" aria-label="Active"><\/span>/);
    assert.match(html[1], /<span class="base-dot red" role="img" title="Down" aria-label="Down"><\/span>/);
    assert.match(html[2], /<span class="base-dot orange" role="img" title="Checking" aria-label="Checking"><\/span>/);
    assert.match(html[3], /<span class="base-dot gray" role="img"/);
    assert.match(html[0], /<span class="base-badge blue">Mode<\/span>/);
    assert.match(html[1], /<span class="base-badge gray">Mode<\/span>/);
    assert.match(html[0], /<span class="base-collapsible-icon base-card-item-chevron material-icons" aria-hidden="true">expand_more<\/span>/);
    assert.doesNotMatch(html[0], /base-card-item-dot/);
});

test('setCollapsed sets the header class and aria-expanded, and the content class or hidden attribute', function () {
    var header = dom.el('button');
    var content = dom.el('div');
    setCollapsed(header, content, true);
    assert.ok(header.classList.contains('collapsed'));
    assert.equal(header.getAttribute('aria-expanded'), 'false');
    assert.ok(content.classList.contains('collapsed'));
    setCollapsed(header, content, false);
    assert.equal(header.classList.contains('collapsed'), false);
    assert.equal(header.getAttribute('aria-expanded'), 'true');
    assert.equal(content.classList.contains('collapsed'), false);
    var list = dom.el('div', { hidden: true });
    setCollapsed(header, list, false, true);
    assert.equal(list.hidden, false);
    assert.equal(list.classList.contains('collapsed'), false);
    setCollapsed(header, null, true);
    assert.equal(header.getAttribute('aria-expanded'), 'false');
});

test('the placeholder hint is a collapsed toggle that controls its list and carries no chevron', function () {
    var html = placeholderHint([['title', 'The title']]);
    var id = html.match(/aria-controls="([^"]+)"/)[1];
    assert.match(html, /class="base-hint-button base-icon-text small collapsed" data-base-hint aria-expanded="false"/);
    assert.match(html, new RegExp('class="base-placeholders" id="' + id + '" hidden'));
    assert.match(html, /<span>Placeholders<\/span><\/button>/);
    assert.doesNotMatch(html, /base-collapsible-icon|expand_more/);
    assert.notEqual(placeholderHint([]).match(/aria-controls="([^"]+)"/)[1], id);
});

test('bindPlaceholders opens and closes the list through the shared collapsible toggle', function () {
    var list = dom.el('div', { class: 'base-placeholders', hidden: true });
    var hint = dom.el('button', { type: 'button', class: 'base-hint-button collapsed', 'data-base-hint': '', 'aria-expanded': 'false' });
    var rootEl = dom.el('div', {}, [dom.el('div', { class: 'inputContainer' }, [dom.el('input'), hint, list])]);
    dom.document.body.appendChild(rootEl);
    bindPlaceholders(rootEl);
    hint.click();
    assert.equal(list.hidden, false);
    assert.equal(hint.classList.contains('collapsed'), false);
    hint.click();
    assert.equal(list.hidden, true);
    assert.ok(hint.classList.contains('collapsed'));
});

test('the dialog close button is a row button built by iconButton', function () {
    var handle = openDialog({ title: 'Edit' });
    var btn = handle.element.querySelector('.base-dialog-close');
    assert.equal(btn.className, 'base-row-btn base-dialog-close');
    assert.equal(btn.getAttribute('type'), 'button');
    assert.equal(btn.getAttribute('title'), 'Close');
    assert.equal(btn.getAttribute('aria-label'), 'Close');
    assert.equal(btn.querySelector('.material-icons').textContent, 'close');
    handle.close();
});

test('the help hint button is a row button', function () {
    var hint = createHelpHint({ text: 'a' });
    var btn = hint.element.querySelector('.base-help-button');
    assert.equal(btn.className, 'base-row-btn base-help-button');
    assert.equal(btn.getAttribute('title'), 'Help');
    hint.destroy();
});

test('pollTaskProgress draws a progress bar along a medium button, also on a bar the markup holds, and a pie beside a small one', function () {
    globalThis.ApiClient = { getScheduledTasks: function () { return Promise.resolve([]); } };
    var btn = dom.el('button', {}, [dom.el('span')]);
    dom.document.body.appendChild(btn);
    var handle = pollTaskProgress(btn, 'k', 'Sync');
    var bar = btn.querySelector('.base-btn-progress');
    assert.ok(bar.classList.contains('base-progress-bar'));
    assert.ok(bar.classList.contains('btn-progress'));
    assert.ok(btn.classList.contains('base-btn-progress-host'));
    handle.cancel();

    var own = dom.el('div', { class: 'btn-progress' });
    var held = dom.el('button', {}, [dom.el('span'), own]);
    dom.document.body.appendChild(held);
    handle = pollTaskProgress(held, 'k', 'Sync');
    assert.ok(own.classList.contains('base-progress-bar'));
    assert.ok(own.classList.contains('base-btn-progress'));
    assert.equal(all(held, '.btn-progress').length, 1);
    handle.cancel();

    var small = dom.el('button', { class: 'small' }, [dom.el('span')]);
    var wrap = dom.el('div', {}, [small]);
    dom.document.body.appendChild(wrap);
    handle = pollTaskProgress(small, 'k', 'Sync');
    assert.equal(small.querySelector('.base-btn-progress'), null);
    assert.ok(wrap.querySelector('.base-btn-progress-pie'));
    handle.cancel();
    delete globalThis.ApiClient;
});
