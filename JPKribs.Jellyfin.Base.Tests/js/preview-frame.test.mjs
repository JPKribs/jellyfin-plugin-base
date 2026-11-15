// Behavior tests for createPreviewFrame, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, all } from './fake-dom.mjs';

var dom = installFakeDom();
var { createPreviewFrame } = await import('../../src/js/preview-frame.js');

beforeEach(function () {
    dom = installFakeDom();
});

function flush() { return new Promise(function (resolve) { setImmediate(resolve); }); }

test('it shows busy and the rendering line while render runs, then the image', async function () {
    var finish;
    var frame = createPreviewFrame({ render: function () { return new Promise(function (r) { finish = r; }); } });
    assert.ok(frame.element.classList.contains('busy'));
    assert.equal(frame.element.querySelector('.base-preview-frame-status-text').textContent, 'Rendering…');
    finish('poster.png');
    await flush();
    assert.equal(frame.element.classList.contains('busy'), false);
    assert.equal(frame.element.querySelector('img.base-preview-frame-image').getAttribute('src'), 'poster.png');
    assert.equal(frame.element.querySelector('.base-preview-frame-status').hidden, true);
});

test('a failed render shows the error message', async function () {
    var frame = createPreviewFrame({ render: function () { return Promise.reject(new Error('x')); } });
    await flush();
    assert.match(frame.element.querySelector('.base-field-message').textContent, /Could not render the preview/);
});

test('a canvas result shows as a PNG data URL', async function () {
    var canvas = { toDataURL: function (type) { return 'data:' + type + ';base64,AA'; } };
    var frame = createPreviewFrame({ render: function () { return canvas; } });
    await flush();
    assert.equal(frame.element.querySelector('img').getAttribute('src'), 'data:image/png;base64,AA');
});

test('update renders once its inputs settle, and a late render never wins over a newer one', async function () {
    mock.timers.enable({ apis: ['setTimeout'] });
    try {
        var calls = 0;
        var answers = [];
        var frame = createPreviewFrame({ delay: 300, render: function () { calls++; return new Promise(function (r) { answers.push(r); }); } });
        frame.update();
        frame.update();
        mock.timers.tick(299);
        assert.equal(calls, 1);
        mock.timers.tick(1);
        assert.equal(calls, 2);
        answers[1]('new.png');
        answers[0]('old.png');
        await flush();
        assert.equal(frame.element.querySelector('img').getAttribute('src'), 'new.png');
    } finally {
        mock.timers.reset();
    }
});

test('the background pills switch the stage background, and setValue does too', function () {
    var frame = createPreviewFrame({ background: 'light' });
    var stage = frame.element.querySelector('.base-preview-frame-stage');
    assert.ok(stage.classList.contains('light'));
    var pills = all(frame.element, '.base-pill');
    pills[2].click();
    assert.equal(frame.getValue(), 'checker');
    assert.ok(stage.classList.contains('checker'));
    assert.equal(stage.classList.contains('light'), false);
    frame.setValue('dark');
    assert.equal(pills[0].getAttribute('aria-pressed'), 'true');
    assert.equal(createPreviewFrame({ backgrounds: false }).element.querySelector('.base-preview-frame-backgrounds').hidden, true);
});

test('a click on the image opens it in a dialog, and zoom false makes a plain frame', async function () {
    var frame = createPreviewFrame({ label: 'Poster', render: function () { return 'p.png'; } });
    dom.document.body.appendChild(frame.element);
    await flush();
    frame.element.querySelector('.base-preview-frame-stage').click();
    var dialog = dom.document.querySelector('.base-dialog-content');
    assert.ok(dialog);
    assert.equal(dialog.querySelector('.base-preview-frame-zoom-image').getAttribute('src'), 'p.png');
    assert.equal(createPreviewFrame({ zoom: false }).element.querySelector('.base-preview-frame-stage').tagName, 'DIV');
});
