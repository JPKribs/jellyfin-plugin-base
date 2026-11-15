// Behavior tests for the thumb core's image sources, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fake-dom.mjs';

var dom = installFakeDom();
var { buildThumb, resolveThumbSource, hasThumbSource } = await import('../../src/js/lib/thumb.js');
var { createAvatar } = await import('../../src/js/avatar.js');
var { createMediaCard } = await import('../../src/js/media-card.js');

beforeEach(function () {
    dom = installFakeDom();
});

function flush() { return new Promise(function (resolve) { setImmediate(resolve); }); }

test('an image stays pending until it loads, and hides when it fails, so the broken image mark never shows', function () {
    var thumb = buildThumb({ src: 'a.jpg' });
    var img = thumb.image;
    assert.ok(img.classList.contains('pending'));
    img.dispatch('load');
    assert.equal(img.classList.contains('pending'), false);
    assert.equal(thumb.placeholder.hidden, true);
    thumb.setSrc('b.jpg');
    assert.ok(img.classList.contains('pending'));
    img.dispatch('error');
    assert.equal(img.hidden, true);
    assert.equal(img.classList.contains('pending'), false);
    assert.equal(thumb.placeholder.hidden, false);
});

test('a function source shows the placeholder until its promise gives the address', async function () {
    var thumb = buildThumb({ src: function () { return Promise.resolve('late.jpg'); } });
    assert.equal(thumb.image, null);
    assert.equal(thumb.placeholder.hidden, false);
    await flush();
    assert.equal(thumb.image.getAttribute('src'), 'late.jpg');
});

test('a later setSrc wins over an answer still on its way', async function () {
    var finish;
    var thumb = buildThumb({ src: function () { return new Promise(function (r) { finish = r; }); } });
    thumb.setSrc('now.jpg');
    finish('old.jpg');
    await flush();
    assert.equal(thumb.image.getAttribute('src'), 'now.jpg');
});

test('a Blob becomes an object URL that is revoked on the next source', async function () {
    var made = [];
    var revoked = [];
    var saved = { create: URL.createObjectURL, revoke: URL.revokeObjectURL };
    URL.createObjectURL = function () { var u = 'blob:' + made.length; made.push(u); return u; };
    URL.revokeObjectURL = function (u) { revoked.push(u); };
    try {
        var thumb = buildThumb({ src: function () { return Promise.resolve(new Blob(['x'])); } });
        await flush();
        assert.equal(thumb.image.getAttribute('src'), 'blob:0');
        thumb.setSrc('plain.jpg');
        assert.deepEqual(revoked, ['blob:0']);
    } finally {
        URL.createObjectURL = saved.create;
        URL.revokeObjectURL = saved.revoke;
    }
});

test('a function that throws or rejects keeps the placeholder', async function () {
    var thrown = buildThumb({ src: function () { throw new Error('x'); } });
    var rejected = buildThumb({ src: function () { return Promise.reject(new Error('x')); } });
    await flush();
    assert.equal(thrown.image, null);
    assert.equal(rejected.image, null);
});

test('resolveThumbSource answers at once for an address, and hasThumbSource tells set from empty', function () {
    var got = null;
    resolveThumbSource('x.jpg', function (u) { got = u; });
    assert.equal(got, 'x.jpg');
    assert.equal(hasThumbSource(''), false);
    assert.equal(hasThumbSource(null), false);
    assert.equal(hasThumbSource(function () { return ''; }), true);
});

test('an avatar takes a function image and shows the person icon until it arrives', async function () {
    var avatar = createAvatar({ name: 'Ada', image: function () { return Promise.resolve('ada.png'); } });
    assert.ok(avatar.element.classList.contains('placeholder'));
    await flush();
    assert.equal(avatar.element.querySelector('img').getAttribute('src'), 'ada.png');
    assert.equal(avatar.element.classList.contains('placeholder'), false);
});

test('a media card takes a function image, which wins over imageUrl', async function () {
    var card = createMediaCard({ title: 'A', imageUrl: 'url.jpg', image: function () { return Promise.resolve('fn.jpg'); } });
    await flush();
    assert.equal(card.element.querySelector('img').getAttribute('src'), 'fn.jpg');
});

test('whenVisible calls a function source only once the thumb nears the screen, stops watching on destroy, and loads at once without an observer', async function () {
    var saved = globalThis.IntersectionObserver;
    var made = [];
    globalThis.IntersectionObserver = class {
        constructor(cb) { this.cb = cb; this.on = false; made.push(this); }
        observe() { this.on = true; }
        disconnect() { this.on = false; }
    };
    try {
        var calls = 0;
        var thumb = buildThumb({ src: function () { calls++; return 'seen.jpg'; }, whenVisible: true });
        assert.equal(calls, 0);
        assert.equal(thumb.image, null);
        made[0].cb([{ isIntersecting: false }]);
        assert.equal(calls, 0);
        made[0].cb([{ isIntersecting: true }]);
        assert.equal(calls, 1);
        assert.equal(thumb.image.getAttribute('src'), 'seen.jpg');
        assert.equal(made[0].on, false);
        var gone = buildThumb({ src: function () { calls++; return 'x.jpg'; }, whenVisible: true });
        gone.destroy();
        assert.equal(made[1].on, false);
        var plain = buildThumb({ src: 'now.jpg', whenVisible: true });
        assert.equal(plain.image.getAttribute('src'), 'now.jpg');
        globalThis.IntersectionObserver = undefined;
        var eager = buildThumb({ src: function () { return 'eager.jpg'; }, whenVisible: true });
        assert.equal(eager.image.getAttribute('src'), 'eager.jpg');
    } finally {
        globalThis.IntersectionObserver = saved;
    }
});
