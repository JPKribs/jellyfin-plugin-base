// Behavior tests for the QR encoder and createQrCode, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, all } from './fake-dom.mjs';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

var dom = installFakeDom();
var { encodeQr, utf8Bytes, QR_MAX_BYTES } = await import('../../src/js/lib/qr.js');
var { createQrCode } = await import('../../src/js/qr-code.js');

beforeEach(function () {
    dom = installFakeDom();
});

// Reads the 15 format bits from around the top left finder, as a scanner does.
function formatBits(m) {
    var bits = 0;
    var cells = [[0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [7, 8], [8, 8], [8, 7], [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0]];
    cells.forEach(function (rc, i) { if (m[rc[0]][rc[1]]) bits |= 1 << i; });
    return bits;
}

test('utf8Bytes encodes text as UTF-8', function () {
    assert.deepEqual(utf8Bytes('A'), [65]);
    assert.deepEqual(utf8Bytes('é'), [0xc3, 0xa9]);
    assert.deepEqual(utf8Bytes('✓'), [0xe2, 0x9c, 0x93]);
});

test('it picks the smallest version that holds the text, up to version 10', function () {
    assert.equal(encodeQr('HELLO').length, 21);
    assert.equal(encodeQr('x'.repeat(14)).length, 21);
    assert.equal(encodeQr('x'.repeat(15)).length, 25);
    assert.equal(encodeQr('x'.repeat(QR_MAX_BYTES)).length, 57);
    assert.equal(encodeQr('x'.repeat(QR_MAX_BYTES + 1)), null);
});

test('the finders, the timing lines, and the dark module sit where a scanner looks', function () {
    var m = encodeQr('https://example.com');
    var n = m.length;
    [[0, 0], [0, n - 7], [n - 7, 0]].forEach(function (p) {
        assert.equal(m[p[0]][p[1]], true);
        assert.equal(m[p[0] + 1][p[1] + 1], false);
        assert.equal(m[p[0] + 3][p[1] + 3], true);
    });
    for (var i = 8; i < n - 8; i++) {
        assert.equal(m[6][i], i % 2 === 0);
        assert.equal(m[i][6], i % 2 === 0);
    }
    assert.equal(m[n - 8][8], true);
});

test('the format bits say level M and match the second copy', function () {
    var m = encodeQr('https://example.com');
    var n = m.length;
    var bits = formatBits(m) ^ 0x5412;
    assert.equal(bits >> 13, 0);
    var second = 0;
    for (var i = 0; i < 8; i++) if (m[8][n - 1 - i]) second |= 1 << i;
    for (var j = 8; j < 15; j++) if (m[n - 15 + j][8]) second |= 1 << j;
    assert.equal(second, formatBits(m));
});

test('the component draws the code, its name, and the text as a copy field', function () {
    var qr = createQrCode({ value: 'https://example.com' });
    var frame = qr.element.querySelector('.base-qr-code-frame');
    assert.equal(frame.getAttribute('role'), 'img');
    assert.equal(frame.getAttribute('aria-label'), 'QR code for https://example.com');
    var dots = frame.querySelector('.base-qr-code-modules').getAttribute('d');
    assert.ok(dots.length > 100);
    assert.ok(!/h1v1h-1z/.test(dots), 'the data modules are round dots, not squares');
    var eyes = frame.querySelector('.base-qr-code-eyes');
    assert.equal(eyes.getAttribute('fill-rule'), 'evenodd');
    assert.equal((eyes.getAttribute('d').match(/M/g) || []).length, 9, 'three eyes, each a ring of two rounded squares around a rounded center');
    assert.equal(qr.element.querySelector('.base-copy-field input').value, 'https://example.com');
    assert.equal(all(qr.element, '.base-qr-code-actions button').length, 2);
});

test('a text too long shows a message and hides the code and its buttons', function () {
    var qr = createQrCode({ value: 'x'.repeat(300) });
    assert.equal(qr.element.querySelector('.base-qr-code-frame').hidden, true);
    assert.equal(qr.element.querySelector('.base-qr-code-actions').hidden, true);
    assert.match(qr.element.querySelector('.base-field-message').textContent, /too long for a QR code/);
    qr.setValue('short');
    assert.equal(qr.element.querySelector('.base-qr-code-frame').hidden, false);
    assert.equal(qr.getValue(), 'short');
});

test('showValue false leaves out the copy field', function () {
    assert.equal(createQrCode({ value: 'a', showValue: false }).element.querySelector('.base-copy-field'), null);
});

test('inline draws the text with a QR button beside Copy that opens the full code in a dialog', function () {
    var qr = createQrCode({ value: 'https://example.com', layout: 'inline' });
    assert.ok(qr.element.classList.contains('inline'));
    assert.equal(qr.element.querySelector('.base-qr-code-frame'), null, 'no code on the page');
    assert.equal(qr.element.querySelector('.base-copy-field input').value, 'https://example.com');
    var btn = qr.element.querySelector('.base-copy-field .base-qr-code-open');
    assert.equal(btn.getAttribute('aria-label'), 'Show QR code');
    assert.equal(btn.disabled, false);
    var dialog = qr.open();
    assert.ok(dialog, 'open returns the dialog');
    assert.ok(dialog.content.querySelector('.base-qr-code-dialog .base-qr-code-frame svg'), 'the dialog holds the code');
    assert.equal(dialog.content.querySelector('.base-copy-field'), null, 'the dialog leaves out the text it came from');
    dialog.close();
    qr.destroy();
});

test('inline shows the whole of an 84 character link, with nothing in its CSS that clips or ellipsizes it', function () {
    var url = 'https://jellyfin.example.com/invite/0123456789abcdef0123456789abcdef?code=ABCDEFGHIJ';
    assert.equal(url.length, 84);
    var qr = createQrCode({ value: url, layout: 'inline' });
    var field = qr.element.querySelector('.base-copy-field');
    assert.ok(field.classList.contains('wrap'));
    var text = field.querySelector('.base-copy-field-text');
    assert.equal(text.textContent, url);
    assert.ok(field.querySelector('.base-copy-button'), 'Copy stays beside the text');
    assert.ok(field.querySelector('.base-qr-code-open'), 'the QR button stays beside the text');
    var css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'css', 'copy-field.css'), 'utf8');
    var rule = /\.base-copy-field-text \{([^}]*)\}/.exec(css)[1];
    assert.match(rule, /overflow-wrap: anywhere/);
    assert.match(rule, /white-space: pre-wrap/);
    assert.doesNotMatch(rule, /text-overflow|overflow: hidden|nowrap|max-height|(?<![\w-])height:/);
});

test('inline with a text too long disables the QR button and shows the message', function () {
    var qr = createQrCode({ value: 'x'.repeat(300), layout: 'inline' });
    assert.equal(qr.element.querySelector('.base-qr-code-open').disabled, true);
    assert.equal(qr.open(), null);
    assert.match(qr.element.querySelector('.base-field-message').textContent, /too long for a QR code/);
});
