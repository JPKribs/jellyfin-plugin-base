// Behavior tests for createAudioPlayer, run on the stub DOM in fake-dom.mjs with a stub audio element.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fake-dom.mjs';

var dom = installFakeDom();
var { createAudioPlayer, clockText } = await import('../../src/js/audio-player.js');

beforeEach(function () {
    dom = installFakeDom();
});

// Gives the stub audio element play, pause, and a duration, firing the events a browser fires.
function wire(player, duration) {
    var a = player.audio;
    a.paused = true;
    a.ended = false;
    a.currentTime = 0;
    a.duration = duration;
    a.load = function () {};
    a.play = function () { a.paused = false; a.dispatch('play'); return Promise.resolve(); };
    a.pause = function () { if (a.paused) return; a.paused = true; a.dispatch('pause'); };
    a.dispatch('loadedmetadata');
    return a;
}

test('clockText writes a time as a clock', function () {
    assert.equal(clockText(42), '0:42');
    assert.equal(clockText(3723), '1:02:03');
    assert.equal(clockText(NaN), '0:00');
});

test('the button plays and pauses, and its icon and name follow', function () {
    var player = createAudioPlayer({ src: 'a.mp3', title: 'theme.mp3' });
    var audio = wire(player, 90);
    var button = player.element.querySelector('.base-audio-player-toggle');
    assert.equal(button.getAttribute('aria-label'), 'Play');
    button.click();
    assert.equal(audio.paused, false);
    assert.equal(button.getAttribute('aria-label'), 'Pause');
    assert.equal(button.querySelector('.material-icons').textContent, 'pause');
    assert.ok(player.element.classList.contains('playing'));
    button.click();
    assert.equal(audio.paused, true);
    assert.equal(button.getAttribute('aria-label'), 'Play');
});

test('starting one player pauses the one that was playing', function () {
    var first = createAudioPlayer({ src: 'a.mp3' });
    var second = createAudioPlayer({ src: 'b.mp3' });
    var a = wire(first, 10);
    var b = wire(second, 10);
    first.play();
    second.play();
    assert.equal(a.paused, true);
    assert.equal(b.paused, false);
});

test('the time and the slider follow playback, and the slider seeks', function () {
    var player = createAudioPlayer({ src: 'a.mp3' });
    var audio = wire(player, 200);
    audio.currentTime = 50;
    audio.dispatch('timeupdate');
    assert.equal(player.element.querySelector('.base-audio-player-time').textContent, '0:50 / 3:20');
    var input = player.element.querySelector('input[type="range"]');
    assert.equal(input.value, '250');
    assert.equal(input.getAttribute('aria-valuetext'), '0:50 of 3:20');
    input.value = '500';
    input.dispatch('input');
    assert.equal(audio.currentTime, 100);
});

test('a source that cannot load shows the error in the title line, and its X button resets the player', function () {
    var player = createAudioPlayer({ src: 'missing.mp3' });
    wire(player, NaN);
    player.audio.dispatch('error');
    var title = player.element.querySelector('.base-audio-player-title');
    var button = player.element.querySelector('.base-audio-player-toggle');
    assert.match(title.textContent, /Could not load the audio/);
    assert.equal(title.hidden, false);
    assert.equal(player.element.querySelector('.base-field-message'), null, 'no line is added under the player');
    assert.ok(player.element.classList.contains('failed'));
    assert.equal(button.querySelector('.material-icons').textContent, 'close');
    assert.equal(button.getAttribute('aria-label'), 'Reset');
    assert.equal(button.disabled, false);
    button.click();
    assert.ok(!player.element.classList.contains('failed'), 'the X resets the player');
    assert.equal(button.querySelector('.material-icons').textContent, 'play_arrow');
    assert.equal(button.getAttribute('aria-label'), 'Play');
});

test('no source disables the button, and destroy pauses', function () {
    var player = createAudioPlayer({});
    assert.equal(player.element.querySelector('.base-audio-player-toggle').disabled, true);
    player.setValue('a.mp3');
    var audio = wire(player, 5);
    player.play();
    player.destroy();
    assert.equal(audio.paused, true);
});
