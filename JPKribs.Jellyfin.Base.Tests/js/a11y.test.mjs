// Tests for avatar names, status contrast and cues, and the persistent live regions, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installFakeDom, shown } from './fake-dom.mjs';

var dom = installFakeDom();
var { createAvatar, createUserChip, createTimeline, createToaster, createFieldMessage, createSkeleton, openDialog } = await import('../../src/js/index.js');

beforeEach(function () {
    dom = installFakeDom();
    mock.timers.reset();
    mock.timers.enable({ apis: ['setTimeout'] });
});

function css(file) { return readFileSync(new URL('../../src/css/' + file, import.meta.url), 'utf8'); }

test('an avatar with no picture is an image named by the person, and aria-hidden stays off', function () {
    var a = createAvatar({ name: 'Ada Lovelace' });
    assert.equal(a.element.getAttribute('role'), 'img');
    assert.equal(a.element.getAttribute('aria-label'), 'Ada Lovelace');
    assert.equal(a.element.hasAttribute('aria-hidden'), false);
    assert.equal(createAvatar({}).element.hasAttribute('role'), false);
});

test('an avatar with a picture has no label of its own, and gets one when the picture fails', function () {
    var a = createAvatar({ name: 'Ada Lovelace', src: 'a.png' });
    assert.equal(a.element.hasAttribute('role'), false);
    var img = a.element.querySelector('img');
    img.dispatch('error');
    assert.equal(a.element.getAttribute('role'), 'img');
    assert.equal(a.element.querySelector('.base-avatar-icon').textContent, 'person');
});

test('a late image error from an earlier draw does not wipe the new content', function () {
    var a = createAvatar({ name: 'Ada Lovelace', src: 'a.png' });
    var old = a.element.querySelector('img');
    a.setValue({ name: 'Bob Stone', src: 'b.png' });
    var current = a.element.querySelector('img');
    old.dispatch('error');
    assert.equal(a.element.querySelector('img'), current);
    assert.equal(a.element.querySelector('.base-avatar-icon'), null);
    a.setValue({ name: 'Cy Young' });
    old.dispatch('error');
    assert.equal(a.element.querySelector('.base-avatar-icon').textContent, 'person');
    assert.equal(a.element.getAttribute('aria-label'), 'Cy Young');
});

test('a user chip leaves the name to its text, so the avatar has no label of its own', function () {
    var chip = createUserChip({ name: 'Ada Lovelace' });
    var avatar = chip.element.querySelector('.base-avatar');
    assert.equal(avatar.hasAttribute('role'), false);
    assert.equal(avatar.hasAttribute('aria-label'), false);
});

// Reads a token such as --base-green-fg from design-tokens.css and returns its hex value.
function token(name) {
    var hex = css('design-tokens.css').match(new RegExp(name + ': (#[0-9a-fA-F]{3,6})'))[1];
    return hex.length === 4 ? '#' + hex.slice(1).split('').map(function (c) { return c + c; }).join('') : hex;
}

function luminance(hex) {
    var c = [1, 3, 5].map(function (i) {
        var v = parseInt(hex.slice(i, i + 2), 16) / 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

function contrast(a, b) {
    var x = luminance(a);
    var y = luminance(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

test('white on green, orange, yellow, and gray falls below 3 to 1, and the dark on-warning token clears it', function () {
    ['green', 'orange', 'yellow', 'gray'].forEach(function (color) {
        assert.ok(contrast('#ffffff', token('--base-' + color + '-fg')) < 3, color);
        assert.ok(contrast(token('--base-on-warning'), token('--base-' + color + '-fg')) >= 3, color);
    });
    assert.ok(contrast(token('--base-on-warning'), token('--base-blue-fg')) >= 4.5);
});

test('the stepper check, the pill, and the light timeline markers use the dark token', function () {
    assert.match(css('stepper.css'), /\.completed \.base-stepper-number \{[^}]*color: var\(--base-on-warning\)/);
    assert.match(css('tags.css'), /\.base-tag\.base-tag-pill \{[^}]*color: var\(--base-on-warning\)/);
    ['green', 'orange', 'yellow'].forEach(function (c) {
        assert.match(css('timeline.css'), new RegExp('\\.' + c + ' \\.base-timeline-marker \\{[^}]*color: var\\(--base-on-warning\\)'));
    });
    assert.match(css('timeline.css'), /\.base-timeline-marker \{[^}]*color: var\(--base-on-warning\)/);
});

test('a timeline status shows an icon and a hidden word, not color alone', function () {
    var t = createTimeline({ items: [{ title: 'Synced', status: 'green' }, { title: 'Late', status: 'orange', icon: 'alarm' }, { title: 'Plain' }] });
    var items = t.element.querySelectorAll('.base-timeline-item');
    assert.equal(items[0].querySelector('.base-timeline-marker .material-icons').textContent, 'check_circle');
    assert.equal(items[0].querySelector('.base-sr-only').textContent, 'Done');
    assert.equal(items[1].querySelector('.base-timeline-marker .material-icons').textContent, 'alarm');
    assert.equal(items[1].querySelector('.base-sr-only').textContent, 'Waiting');
    assert.equal(items[2].querySelector('.base-sr-only'), null);
    assert.equal(items[2].querySelector('.base-timeline-marker .material-icons'), null);
});

test('timeline status words can be replaced, and an inherited name such as constructor adds nothing', function () {
    var t = createTimeline({ statusLabels: { green: 'Finished' }, items: [{ title: 'a', status: 'green' }, { title: 'b', status: 'constructor' }, { title: 'c', status: '__proto__' }] });
    var items = t.element.querySelectorAll('.base-timeline-item');
    assert.equal(items[0].querySelector('.base-sr-only').textContent, 'Finished');
    assert.equal(items[1].querySelector('.base-sr-only'), null);
    assert.equal(items[2].querySelector('.base-sr-only'), null);
});

test('the toaster makes its polite and assertive live regions once, and toasts carry no role of their own', function () {
    var t = createToaster({ timeout: 0 });
    var regions = t.element.querySelectorAll('.base-toaster-live');
    assert.equal(regions.length, 2);
    var polite = regions[1];
    var assertive = regions[0];
    assert.equal(polite.getAttribute('aria-live'), 'polite');
    assert.equal(assertive.getAttribute('aria-live'), 'assertive');
    var first = t.info('One.');
    t.error('Two.');
    t.warn('Three.');
    assert.equal(t.element.querySelectorAll('.base-toaster-live')[1], polite);
    assert.equal(first.element.parentNode, polite);
    assert.equal(polite.children.length, 2);
    assert.equal(assertive.children.length, 1);
    assert.equal(first.element.hasAttribute('role'), false);
    t.clear();
    assert.equal(t.element.querySelectorAll('.base-toaster-live')[0], assertive);
});

test('an error toast stays until dismissed unless a timeout is set, and the others still close', function () {
    var t = createToaster();
    var stuck = t.error('Broke.');
    var timed = t.error('Broke too.', 1000);
    var plain = t.info('Fine.');
    mock.timers.tick(5000);
    assert.equal(stuck.element.parentNode !== null, true);
    assert.equal(timed.element.parentNode, null);
    assert.equal(plain.element.parentNode, null);
    var custom = createToaster({ timeout: 100 });
    var e = custom.error('Short.');
    mock.timers.tick(100);
    assert.equal(e.element.parentNode, null);
});

test('the toaster moves into the open dialog so a modal does not hide it, and back to the body after', function () {
    var t = createToaster({ timeout: 0 });
    assert.equal(t.element.parentNode, dom.document.body);
    var dialog = openDialog({ title: 'Edit', body: '<p>Body.</p>' });
    t.info('Inside.');
    assert.equal(t.element.parentNode, dialog.element);
    dialog.close();
    t.info('Outside.');
    assert.equal(t.element.parentNode, dom.document.body);
});

test('a toaster with its own parent stays there while a dialog is open', function () {
    var host = dom.el('div');
    dom.document.body.appendChild(host);
    var t = createToaster({ parent: host, timeout: 0 });
    openDialog({ title: 'Edit', body: '<p>Body.</p>' });
    t.info('Here.');
    assert.equal(t.element.parentNode, host);
});

test('the toast kind lookup ignores inherited names such as constructor and __proto__', function () {
    var t = createToaster({ timeout: 0 });
    assert.ok(t.show({ message: 'a', kind: 'constructor' }).element.classList.contains('info'));
    assert.ok(t.show({ message: 'b', kind: '__proto__' }).element.classList.contains('info'));
});

test('a field message keeps one live region element, never hidden, and only its text changes', function () {
    var m = createFieldMessage();
    var el = m.element;
    assert.equal(el.getAttribute('aria-live'), 'polite');
    assert.equal(el.hidden, false);
    assert.equal(shown(el), false);
    m.set('error', 'Enter a number.');
    assert.equal(m.element, el);
    assert.equal(el.hidden, false);
    assert.equal(shown(el), true);
    assert.equal(el.querySelector('.base-field-message-text').textContent, 'Enter a number.');
    assert.equal(el.querySelector('.material-icons').textContent, 'error');
    m.clear();
    assert.equal(el.hidden, false);
    assert.equal(shown(el), false);
    assert.equal(el.querySelector('.base-field-message-text').textContent, '');
    assert.equal(el.getAttribute('aria-live'), 'polite');
});

test('a field message state that is not a known name shows no glyph', function () {
    var m = createFieldMessage();
    m.set('constructor', 'Odd.');
    assert.equal(m.element.querySelector('.material-icons').textContent, '');
});

test('a skeleton is busy until destroyed or done, and its label is a live region announced after insertion', function () {
    var s = createSkeleton({ label: 'Loading servers' });
    dom.document.body.appendChild(s.element);
    var label = s.element.querySelector('.base-sr-only');
    assert.equal(s.element.getAttribute('aria-busy'), 'true');
    assert.equal(label.getAttribute('aria-live'), 'polite');
    assert.equal(label.textContent, 'Loading servers');
    mock.timers.tick(0);
    assert.equal(label.textContent, 'Loading servers');
    s.setValue('Still loading');
    assert.equal(s.getValue(), 'Still loading');
    assert.equal(label.textContent, 'Still loading');
    s.destroy();
    assert.equal(s.element.hasAttribute('aria-busy'), false);
    assert.equal(s.element.parentNode, null);
});

test('done clears aria-busy and swaps in the content where the skeleton was', function () {
    var host = dom.el('div');
    dom.document.body.appendChild(host);
    var s = createSkeleton({});
    host.appendChild(s.element);
    var content = dom.el('p');
    s.done(content);
    assert.equal(s.element.hasAttribute('aria-busy'), false);
    assert.equal(host.children[0], content);
    assert.equal(s.element.parentNode, null);
});
