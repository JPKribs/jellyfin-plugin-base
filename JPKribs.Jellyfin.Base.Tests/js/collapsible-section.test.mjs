// Tests for the collapsible section builder and its header badge, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fake-dom.mjs';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

var dom = installFakeDom();
var { createCollapsibleSection, setCollapsibleBadge, initCollapsibles } = await import('../../src/js/collapsible-section.js');

beforeEach(function () {
    dom = installFakeDom();
});

test('createCollapsibleSection builds the markup initCollapsibles binds, with aria-controls and aria-expanded', function () {
    var section = createCollapsibleSection({ title: 'Advanced', content: '<p>Body</p>', collapsed: true });
    var header = section.header;
    assert.equal(section.element.className, 'base-collapsible-section');
    assert.equal(header.tagName, 'BUTTON');
    assert.equal(header.getAttribute('type'), 'button');
    assert.equal(header.getAttribute('aria-controls'), section.content.id);
    assert.equal(header.getAttribute('aria-expanded'), 'false');
    assert.ok(section.content.classList.contains('collapsed'));
    assert.equal(header.querySelector('.base-collapsible-title').textContent, 'Advanced');
    assert.equal(header.querySelector('.base-collapsible-icon').textContent, 'expand_more');
    assert.equal(section.getValue(), false);
});

test('a header click opens and closes the section and reports it, and setValue does the same without reporting', function () {
    var heard = [];
    var section = createCollapsibleSection({ title: 'A', onToggle: function (open) { heard.push(open); } });
    assert.equal(section.getValue(), true);
    section.header.click();
    assert.equal(section.getValue(), false);
    section.header.click();
    assert.equal(section.getValue(), true);
    section.setValue(false);
    assert.equal(section.header.getAttribute('aria-expanded'), 'false');
    assert.deepEqual(heard, [false, true]);
    section.destroy();
    section.header.click();
    assert.deepEqual(heard, [false, true]);
});

test('numbered and className add their modifiers', function () {
    var section = createCollapsibleSection({ title: 'Step', numbered: true, className: 'mine' });
    assert.equal(section.element.className, 'base-collapsible-section numbered mine');
});

test('a header badge sits between the title and the chevron, in its color, and setBadge replaces or removes it', function () {
    var section = createCollapsibleSection({ title: 'Certificate', badge: { label: 'Expires Soon', color: 'orange' } });
    var kids = section.header.children;
    assert.ok(kids[1].classList.contains('base-badge'));
    assert.ok(kids[1].classList.contains('base-collapsible-badge'));
    assert.ok(kids[1].classList.contains('orange'));
    assert.equal(kids[1].textContent, 'Expires Soon');
    assert.ok(kids[2].classList.contains('base-collapsible-icon'));
    section.setBadge({ label: 'Errored', color: 'Errored' });
    var badges = section.header.querySelectorAll('.base-collapsible-badge');
    assert.equal(badges.length, 1);
    assert.ok(badges[0].classList.contains('red'));
    section.setBadge(null);
    assert.equal(section.header.querySelector('.base-collapsible-badge'), null);
});

test('a dot badge is a status dot named by its label', function () {
    var section = createCollapsibleSection({ title: 'Relay', badge: { label: 'Connected', color: 'green', dot: true } });
    var dot = section.header.querySelector('.base-collapsible-badge');
    assert.ok(dot.classList.contains('base-dot'));
    assert.ok(dot.classList.contains('green'));
    assert.equal(dot.getAttribute('aria-label'), 'Connected');
    assert.equal(dot.getAttribute('role'), 'img');
});

test('setCollapsibleBadge works on a header from the page markup that initCollapsibles bound', function () {
    var icon = dom.el('span', { class: 'base-collapsible-icon' });
    var header = dom.el('button', { type: 'button', class: 'base-collapsible-header', 'data-target': 'body' }, [dom.el('span', { class: 'base-collapsible-title' }), icon]);
    var body = dom.el('div', { id: 'body', class: 'base-collapsible-content' });
    var view = dom.el('div', {}, [dom.el('div', { class: 'base-collapsible-section' }, [header, body])]);
    initCollapsibles(view);
    setCollapsibleBadge(header, { label: 'Done', color: 'green' });
    assert.equal(header.children[1].textContent, 'Done');
    assert.equal(header.children[2], icon);
    setCollapsibleBadge(header, { label: '' });
    assert.equal(header.querySelector('.base-collapsible-badge'), null);
});

test('a section with no slots keeps its plain header markup', function () {
    var section = createCollapsibleSection({ title: 'Plain' });
    var kids = section.header.children;
    assert.equal(kids.length, 2);
    assert.ok(kids[0].classList.contains('base-collapsible-title'));
    assert.equal(section.header.querySelector('.base-collapsible-heading'), null);
    assert.equal(section.element.querySelector('.base-collapsible-bar'), null);
});

test('icon, subtitle, and a static aside fill the header slots, and the title takes its tooltip', function () {
    var route = dom.el('span', { class: 'route' });
    var section = createCollapsibleSection({ title: 'Movies', icon: 'video_library', iconColor: 'green', subtitle: route, collapsible: false, aside: dom.el('span', { class: 'base-badge gray' }) });
    var header = section.header;
    assert.equal(header.tagName, 'DIV');
    var tile = header.children[0];
    assert.ok(tile.classList.contains('base-collapsible-tile'));
    assert.ok(tile.classList.contains('green'));
    assert.equal(tile.getAttribute('aria-hidden'), 'true');
    assert.equal(tile.textContent, 'video_library');
    var heading = header.children[1];
    assert.ok(heading.classList.contains('base-collapsible-heading'));
    assert.equal(heading.children[0].getAttribute('title'), 'Movies');
    assert.equal(heading.querySelector('.base-collapsible-subtitle').children[0], route);
    assert.ok(header.children[2].classList.contains('base-collapsible-aside'));
    assert.ok(section.element.classList.contains('has-tile'));
    section.setTitle('Shows');
    assert.equal(heading.children[0].getAttribute('title'), 'Shows');
    section.setSubtitle('Main to Here');
    assert.equal(heading.querySelector('.base-collapsible-subtitle').textContent, 'Main to Here');
    section.setSubtitle(null);
    assert.equal(heading.querySelector('.base-collapsible-subtitle'), null);
});

test('collapsible false is a fixed framed panel, always open, with no chevron or toggle', function () {
    var heard = [];
    var section = createCollapsibleSection({ title: 'Fixed', collapsible: false, collapsed: true, onToggle: function (open) { heard.push(open); } });
    assert.ok(section.element.classList.contains('fixed'));
    assert.ok(section.element.classList.contains('base-panel'));
    assert.equal(section.element.querySelector('.base-collapsible-icon'), null);
    assert.equal(section.header.getAttribute('aria-expanded'), null);
    assert.equal(section.content.classList.contains('collapsed'), false);
    section.header.click();
    section.setValue(false);
    assert.equal(section.getValue(), true);
    assert.deepEqual(heard, []);
});

test('a badge in a fixed header sits before its aside', function () {
    var section = createCollapsibleSection({ title: 'T', collapsible: false, aside: dom.el('button', { type: 'button' }), badge: { label: 'On', color: 'green' } });
    var names = section.header.children.map(function (c) { return c.className.split(' ').filter(function (n) { return n.indexOf('base-collapsible-') === 0; })[0]; });
    assert.deepEqual(names, ['base-collapsible-heading', 'base-collapsible-badge', 'base-collapsible-aside']);
});

test('a collapsible header with an aside sits in a bar with the chevron, and the bar follows the toggle', function () {
    var heard = [];
    var toggle = dom.el('button', { type: 'button', class: 'mine' });
    var section = createCollapsibleSection({ title: 'Relay', collapsed: true, aside: toggle, onToggle: function (open) { heard.push(open); } });
    var bar = section.element.children[0];
    assert.ok(bar.classList.contains('base-collapsible-bar'));
    assert.ok(bar.classList.contains('collapsed'));
    assert.equal(bar.children[0], section.header);
    assert.ok(bar.children[1].classList.contains('base-collapsible-aside'));
    assert.ok(bar.children[2].classList.contains('base-collapsible-icon'));
    assert.equal(section.header.querySelector('button'), null);
    toggle.click();
    assert.equal(section.getValue(), false);
    bar.children[2].click();
    assert.equal(section.getValue(), true);
    assert.equal(bar.classList.contains('collapsed'), false);
    section.header.click();
    assert.equal(bar.classList.contains('collapsed'), true);
    assert.deepEqual(heard, [true, false]);
    section.setAside(null);
    assert.equal(bar.children[1].hidden, true);
    section.setAside(dom.el('span', { class: 'next' }));
    assert.equal(bar.children[1].hidden, false);
    assert.ok(bar.children[1].querySelector('.next'));
});

test('setAside on a plain section moves its header into a bar once', function () {
    var section = createCollapsibleSection({ title: 'Late' });
    section.setAside(dom.el('span'));
    section.setAside(dom.el('span'));
    assert.equal(section.element.querySelectorAll('.base-collapsible-bar').length, 1);
    assert.equal(section.element.querySelectorAll('.base-collapsible-icon').length, 1);
});

test('initCollapsibles leaves a fixed header alone and binds a hand written bar', function () {
    var fixedHeader = dom.el('div', { class: 'base-collapsible-header' });
    var icon = dom.el('span', { class: 'base-collapsible-icon' });
    var header = dom.el('button', { type: 'button', class: 'base-collapsible-header', 'data-target': 'barBody' });
    var aside = dom.el('span', { class: 'base-collapsible-aside' });
    var bar = dom.el('div', { class: 'base-collapsible-bar' }, [header, aside, icon]);
    var body = dom.el('div', { id: 'barBody', class: 'base-collapsible-content' });
    var view = dom.el('div', {}, [
        dom.el('div', { class: 'base-collapsible-section fixed base-panel' }, [fixedHeader]),
        dom.el('div', { class: 'base-collapsible-section' }, [bar, body])
    ]);
    initCollapsibles(view);
    assert.equal(fixedHeader.getAttribute('aria-expanded'), null);
    assert.equal(icon.textContent, 'expand_more');
    icon.click();
    assert.ok(body.classList.contains('collapsed'));
    assert.ok(bar.classList.contains('collapsed'));
    aside.click();
    assert.ok(body.classList.contains('collapsed'));
});

test('a section title shows as written, with no case change from the CSS', function () {
    var dir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'css');
    ['collapsible-section.css', 'section.css'].forEach(function (file) {
        var css = readFileSync(join(dir, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
        var re = /([^{}]*base-(?:collapsible|section)-title[^{}]*)\{([^}]*)\}/g;
        var m;
        while ((m = re.exec(css))) assert.doesNotMatch(m[2], /text-transform/, file + ': ' + m[1].trim());
    });
});
