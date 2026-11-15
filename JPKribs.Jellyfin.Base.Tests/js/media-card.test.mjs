// Behavior tests for createMediaCard and mediaShape, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, all } from './fake-dom.mjs';

var dom = installFakeDom();
var { createMediaCard, mediaShape } = await import('../../src/js/index.js');

beforeEach(function () {
    dom = installFakeDom();
});

afterEach(function () {
    delete globalThis.ApiClient;
    delete globalThis.location;
});

function build(extra) {
    var card = createMediaCard(extra);
    dom.document.body.appendChild(card.element);
    return card;
}

function q(card, sel) { return card.element.querySelector(sel); }

test('mediaShape picks the shape Jellyfin uses for each item type', function () {
    ['Episode', 'Video', 'TvChannel', 'Program', 'MusicVideo'].forEach(function (t) { assert.equal(mediaShape(t), 'wide', t); });
    ['Person', 'User'].forEach(function (t) { assert.equal(mediaShape(t), 'round', t); });
    ['MusicAlbum', 'Audio', 'Playlist'].forEach(function (t) { assert.equal(mediaShape(t), 'square', t); });
    ['Movie', 'Series', 'BoxSet', '', null, undefined].forEach(function (t) { assert.equal(mediaShape(t), 'portrait', String(t)); });
});

test('the defaults draw a portrait row with a movie placeholder and no image', function () {
    var card = build({ title: 'Alpha' });
    assert.ok(card.element.classList.contains('base-media-card'));
    assert.ok(card.element.classList.contains('base-media-card-row'));
    var thumb = q(card, '.base-media-card-thumb');
    assert.ok(thumb.classList.contains('portrait'));
    assert.equal(q(card, '.base-media-card-placeholder .material-icons').textContent, 'movie');
    assert.equal(q(card, '.base-media-card-placeholder').getAttribute('aria-hidden'), 'true');
    assert.equal(q(card, 'img'), null);
    assert.equal(q(card, '.base-media-card-name').textContent, 'Alpha');
    assert.equal(q(card, '.base-media-card-sub'), null);
    assert.equal(q(card, '.base-media-card-badges'), null);
    assert.equal(q(card, '.base-media-card-side'), null);
    assert.equal(card.element.hasAttribute('tabindex'), false);
    assert.equal(card.element.hasAttribute('role'), false);
});

test('the placeholder icon follows the shape, and icon replaces it', function () {
    assert.equal(q(build({ shape: 'wide' }), '.base-media-card-placeholder').textContent, 'tv');
    assert.equal(q(build({ shape: 'square' }), '.base-media-card-placeholder').textContent, 'album');
    assert.equal(q(build({ shape: 'round' }), '.base-media-card-placeholder').textContent, 'person');
    assert.equal(q(build({ shape: 'round', icon: 'queue_music' }), '.base-media-card-placeholder').textContent, 'queue_music');
    assert.ok(q(build({ shape: 'oval' }), '.base-media-card-thumb').classList.contains('portrait'));
});

test('the card layout draws a tile', function () {
    var card = build({ layout: 'card', shape: 'wide' });
    assert.ok(card.element.classList.contains('base-media-card-tile'));
    assert.equal(card.element.classList.contains('base-media-card-row'), false);
    assert.ok(q(card, '.base-media-card-thumb').classList.contains('wide'));
});

test('imageUrl draws a lazy image with an empty alt over the placeholder', function () {
    var card = build({ imageUrl: 'poster.jpg' });
    var img = q(card, 'img.base-media-card-image');
    assert.equal(img.getAttribute('src'), 'poster.jpg');
    assert.equal(img.getAttribute('loading'), 'lazy');
    assert.equal(img.getAttribute('alt'), '');
    assert.ok(q(card, '.base-media-card-placeholder'));
});

test('an image that fails to load hides and leaves the placeholder', function () {
    var card = build({ imageUrl: 'broken.jpg' });
    var img = q(card, 'img');
    img.dispatch('error');
    assert.equal(img.hidden, true);
    assert.ok(q(card, '.base-media-card-placeholder'));
});

test('an image address that arrives later through setValue keeps the other options', function () {
    var card = build({ title: 'Alpha', shape: 'wide' });
    assert.equal(q(card, 'img'), null);
    card.setValue({ imageUrl: 'blob:late' });
    assert.equal(q(card, 'img').getAttribute('src'), 'blob:late');
    assert.equal(q(card, '.base-media-card-name').textContent, 'Alpha');
    assert.ok(q(card, '.base-media-card-thumb').classList.contains('wide'));
    assert.equal(card.getValue().imageUrl, 'blob:late');
    assert.equal(card.getValue().title, 'Alpha');
    card.setValue(null);
    assert.equal(card.getValue().title, 'Alpha');
});

test('itemId builds the address through ApiClient.getImageUrl with the type and max height', function () {
    var calls = [];
    globalThis.ApiClient = { getImageUrl: function (id, o) { calls.push([id, o]); return 'Items/' + id + '/Images/' + o.type; } };
    var card = build({ itemId: 'abc' });
    assert.equal(q(card, 'img').getAttribute('src'), 'Items/abc/Images/Primary');
    assert.deepEqual(calls[0], ['abc', { type: 'Primary', maxHeight: 128 }]);
    build({ itemId: 'def', imageType: 'Thumb', layout: 'card' });
    assert.deepEqual(calls[1], ['def', { type: 'Thumb', maxHeight: 400 }]);
    build({ itemId: 'ghi', imageMaxHeight: 64 });
    assert.equal(calls[2][1].maxHeight, 64);
    build({ itemId: 'jkl', imageUrl: 'given.jpg' });
    assert.equal(calls.length, 3);
});

test('itemId without ApiClient, or without getImageUrl, keeps the placeholder', function () {
    assert.equal(q(build({ itemId: 'abc' }), 'img'), null);
    globalThis.ApiClient = {};
    assert.equal(q(build({ itemId: 'abc' }), 'img'), null);
});

test('titleSuffix, subtitle, and user draw the second part and the second line', function () {
    var card = build({ title: 'Show', titleSuffix: 'Pilot', subtitle: 'watch history', user: { name: 'viewer', imageUrl: 'u.png' } });
    assert.equal(q(card, '.base-media-card-suffix').textContent, 'Pilot');
    assert.equal(q(card, '.base-media-card-subtitle').textContent, 'watch history');
    assert.equal(q(card, '.base-media-card-user-name').textContent, 'viewer');
    var avatar = q(card, '.base-media-card-user .base-avatar');
    assert.equal(avatar.getAttribute('aria-hidden'), 'true');
    assert.equal(avatar.querySelector('img').getAttribute('src'), 'u.png');
    var noImage = build({ user: { name: 'Ada Lovelace' } });
    assert.equal(noImage.element.querySelector('.base-avatar-icon').textContent, 'person');
    assert.equal(noImage.element.querySelector('.base-media-card-subtitle'), null);
});

test('badges draw as base-badge with a known color, else gray, and skip an empty label', function () {
    var card = build({ badges: [{ label: 'Metadata', color: 'blue' }, { label: 'Provider', color: 'bad color"' }, { label: '' }] });
    var badges = all(card.element, '.base-badge');
    assert.equal(badges.length, 2);
    assert.equal(badges[0].className, 'base-badge blue');
    assert.equal(badges[0].textContent, 'Metadata');
    assert.equal(badges[1].className, 'base-badge gray');
});

test('status, meta, and metaIsError draw the side column', function () {
    var card = build({ status: { label: 'Failed', color: 'red' }, meta: 'Could not reach the server.', metaIsError: true });
    var status = q(card, '.base-media-card-side .base-media-card-status');
    assert.equal(status.className, 'base-badge red base-media-card-status');
    assert.equal(status.textContent, 'Failed');
    var meta = q(card, '.base-media-card-meta');
    assert.ok(meta.classList.contains('error'));
    assert.equal(meta.textContent, 'Could not reach the server.');
    var plain = build({ meta: 'edited 2 minutes ago' });
    assert.equal(q(plain, '.base-media-card-meta').classList.contains('error'), false);
    assert.equal(q(plain, '.base-media-card-status'), null);
    assert.equal(q(card, '.base-media-card-side').classList.contains('compact'), false);
    card.setValue({ status: null, meta: '' });
    assert.equal(q(card, '.base-media-card-side'), null);
    card.setValue({ actions: [{ label: 'Discard', icon: 'close', value: 'x' }] });
    assert.equal(q(card, '.base-media-card-side'), null);
    assert.equal(q(card, '.base-media-card-actions').parentNode, card.element);
    assert.ok(card.element.classList.contains('has-actions'));
});

test('the actions sit in the card itself, pinned apart from the side column, and the card counts them', function () {
    var card = build({ status: { label: 'Queued', color: 'orange' }, actions: [{ label: 'Remove', icon: 'close', value: 'x' }] });
    assert.equal(q(card, '.base-media-card-side .base-media-card-actions'), null);
    assert.equal(q(card, '.base-media-card-actions').parentNode, card.element);
    assert.equal(card.element.style['--base-media-card-actions'], '1');
    card.setValue({ actions: [] });
    assert.equal(card.element.classList.contains('has-actions'), false);
});

test('the size and then the status share the first line, and the detail and error follow on their own lines', function () {
    var card = build({ title: 'Alien', detail: 'Pending, retry in 2m', error: 'Could not reach the server.', size: 1288490189, status: { label: 'Errored', color: 'red' } });
    var side = q(card, '.base-media-card-side');
    assert.deepEqual(Array.from(side.children).map(function (c) { return c.className.split(' ').pop(); }), ['base-media-card-side-line', 'base-media-card-detail', 'base-media-card-error']);
    assert.deepEqual(Array.from(q(card, '.base-media-card-side-line').children).map(function (c) { return c.className.split(' ').pop(); }), ['base-media-card-size', 'base-media-card-status']);
    assert.equal(q(card, '.base-media-card-detail').textContent, 'Pending, retry in 2m');
    var error = q(card, '.base-media-card-side .base-media-card-error');
    assert.equal(error.textContent, 'Could not reach the server.');
    assert.equal(error.getAttribute('title'), 'Could not reach the server.');
    assert.equal(q(card, '.base-media-card-side .base-media-card-size').textContent, '1.2 GB');
    card.setValue({ size: '700 MB', detail: '', error: '' });
    assert.equal(q(card, '.base-media-card-size').textContent, '700 MB');
    assert.equal(q(card, '.base-media-card-detail'), null);
    assert.equal(q(card, '.base-media-card-error'), null);
});

test('actions draw labeled icon buttons that report their value and do not open the card', function () {
    var seen = [];
    var opened = 0;
    var card = build({
        actions: [{ label: 'Discard', icon: 'close', value: 'discard' }, { label: 'Retry', icon: 'refresh', value: 'retry' }],
        onAction: function (v) { seen.push(v); },
        onClick: function () { opened++; }
    });
    var buttons = all(card.element, '.base-media-card-action');
    assert.equal(buttons.length, 2);
    assert.equal(buttons[0].tagName, 'BUTTON');
    assert.equal(buttons[0].type, 'button');
    assert.equal(buttons[0].getAttribute('aria-label'), 'Discard');
    assert.equal(buttons[0].getAttribute('title'), 'Discard');
    assert.equal(buttons[0].querySelector('.material-icons').textContent, 'close');
    buttons[1].click();
    buttons[1].querySelector('.material-icons').dispatch('click');
    assert.deepEqual(seen, ['retry', 'retry']);
    assert.equal(opened, 0);
});

test('onClick makes the whole card a focusable button named by its title, opened by click, Enter, and Space', function () {
    var opened = 0;
    var card = build({ title: 'Alpha', onClick: function () { opened++; } });
    assert.equal(card.element.getAttribute('role'), 'button');
    assert.equal(card.element.getAttribute('tabindex'), '0');
    assert.ok(card.element.classList.contains('clickable'));
    assert.equal(card.element.getAttribute('aria-labelledby'), q(card, '.base-media-card-title').id);
    card.element.click();
    var enter = card.element.dispatch('keydown', { key: 'Enter' });
    var space = card.element.dispatch('keydown', { key: ' ' });
    assert.equal(enter.defaultPrevented, true);
    assert.equal(space.defaultPrevented, true);
    card.element.dispatch('keydown', { key: 'a' });
    assert.equal(opened, 3);
});

test('a key pressed on an action button does not open the card', function () {
    var opened = 0;
    var card = build({ onClick: function () { opened++; }, actions: [{ label: 'Discard', icon: 'close', value: 'x' }] });
    q(card, '.base-media-card-action').dispatch('keydown', { key: 'Enter' });
    assert.equal(opened, 0);
});

test('href makes the card a link that goes to the address', function () {
    globalThis.location = { href: 'start' };
    var card = build({ href: '#/details?id=1' });
    assert.equal(card.element.getAttribute('role'), 'link');
    assert.equal(card.element.getAttribute('tabindex'), '0');
    card.element.dispatch('keydown', { key: 'Enter' });
    assert.equal(globalThis.location.href, '#/details?id=1');
});

test('a card with no href or onClick ignores clicks and keys', function () {
    var card = build({ title: 'Alpha' });
    var e = card.element.dispatch('keydown', { key: 'Enter' });
    assert.equal(e.defaultPrevented, false);
    card.setValue({ onClick: function () {} });
    assert.equal(card.element.getAttribute('role'), 'button');
    card.setValue({ onClick: undefined });
    assert.equal(card.element.hasAttribute('role'), false);
    assert.equal(card.element.hasAttribute('tabindex'), false);
});

test('values reach the page as text, never as markup', function () {
    var card = build({ title: '<b>x</b>', subtitle: '<i>y</i>', badges: [{ label: '<u>z</u>' }] });
    assert.equal(q(card, '.base-media-card-name').textContent, '<b>x</b>');
    assert.equal(q(card, 'b'), null);
    assert.equal(q(card, 'i'), null);
    assert.equal(q(card, 'u'), null);
});

test('destroy removes every listener the card added', function () {
    var opened = 0;
    var seen = 0;
    var card = build({ imageUrl: 'p.jpg', onClick: function () { opened++; }, actions: [{ label: 'Go', icon: 'east', value: 'go' }], onAction: function () { seen++; } });
    var img = q(card, 'img');
    var btn = q(card, '.base-media-card-action');
    card.destroy();
    card.element.click();
    card.element.dispatch('keydown', { key: 'Enter' });
    btn.click();
    img.dispatch('error');
    assert.equal(opened, 0);
    assert.equal(seen, 0);
    assert.equal(img.hidden, false);
    assert.equal(Object.values(card.element.listeners).reduce(function (n, l) { return n + l.length; }, 0), 0);
});

test('a row holds its artwork in one slot, so titles line up whatever the shape', function () {
    ['portrait', 'wide', 'square', 'round'].forEach(function (shape) {
        var card = build({ title: 'Alien', shape: shape });
        var slot = card.element.children[0];
        assert.equal(slot.className, 'base-media-card-slot', shape);
        assert.ok(slot.children[0].classList.contains('base-media-card-thumb'), shape);
    });
    var tile = build({ title: 'Alien', layout: 'card' });
    assert.ok(tile.element.children[0].classList.contains('base-media-card-thumb'));
});

test('a compact card puts the episode first on its second line, then the user and the subtitle', function () {
    var card = build({ title: 'Show', titleSuffix: 'S1, E1', user: { name: 'Ada' }, subtitle: 'history' });
    card.element.clientWidth = 300;
    return new Promise(function (resolve) { setTimeout(resolve, 5); }).then(function () {
        var sub = q(card, '.base-media-card-sub');
        assert.ok(card.element.classList.contains('compact'));
        assert.deepEqual(Array.from(sub.children).map(function (c) { return c.className; }), ['base-media-card-episode', 'base-media-card-user', 'base-media-card-subtitle']);
    });
});
