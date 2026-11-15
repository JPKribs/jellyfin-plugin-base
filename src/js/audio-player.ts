import { make, icon, listen, runAll, toText, applyFieldSize, clockText } from './lib/dom.js';
import { createSliderField } from './slider-field.js';
import type { ComponentHandle } from './types.js';

/** What createAudioPlayer takes. src is the address of the audio. */
export interface AudioPlayerOptions {
    src?: string;
    title?: string;
    label?: string;
    playText?: string;
    pauseText?: string;
    seekText?: string;
    errorText?: string;
    resetText?: string;
    size?: 'small' | 'medium' | 'large';
    onPlay?(): void;
    onPause?(): void;
}

/** What createAudioPlayer returns. audio is the audio element, and getValue returns the address. */
export interface AudioPlayerHandle extends ComponentHandle {
    audio: HTMLAudioElement;
    getValue(): string;
    setValue(src: string | null): void;
    play(): void;
    pause(): void;
    destroy(): void;
}

// The one player that plays on the page, so starting another pauses it.
var playing: HTMLAudioElement | null = null;

export { clockText };

/**
 * A small audio player: a Play and Pause button, a seek slider on the Slider Field, and the current and total time, beside an optional title.
 * Only one player plays at a time on the page, so starting one pauses the one before. The slider reads the time as its value text.
 * When the audio cannot load, the error takes the title's place in red and the button turns into an X, so nothing on the
 * page moves. Pressing the X clears the error, brings the title back, and loads the audio again.
 *
 * @param options {
 *   src       : address of the audio [optional]
 *   title     : the name shown beside the controls, such as a theme song's file name [optional]
 *   label     : the player's accessible name (default the title, else 'Audio')
 *   playText  : the play button's title and aria-label (default 'Play')
 *   pauseText : the pause button's title and aria-label (default 'Pause')
 *   seekText  : the slider's aria-label (default 'Seek')
 *   errorText : the text in the title's place when the audio cannot load (default 'Could not load the audio.')
 *   resetText : the X button's title and aria-label after an error (default 'Reset')
 *   size      : 'small', 'medium', or 'large' for its controls (default 'medium')
 *   onPlay    : function() called when it starts to play [optional]
 *   onPause   : function() called when it pauses or ends [optional]
 * }
 * @returns { element, audio, getValue, setValue, play, pause, destroy }.
 */
export function createAudioPlayer(options?: AudioPlayerOptions): AudioPlayerHandle {
    var opts = options || {};
    var cleanups: Array<() => void> = [];
    var src = '';
    var seeking = false;

    var root = make('div', 'base-audio-player', { role: 'group', 'aria-label': opts.label || opts.title || 'Audio' });
    applyFieldSize(root, opts.size);
    var audio = make('audio', 'base-audio-player-audio', { preload: 'metadata' });
    var playLabel = opts.playText || 'Play';
    var pauseLabel = opts.pauseText || 'Pause';
    var button = make('button', 'raised base-button secondary field base-audio-player-toggle', { type: 'button', title: playLabel, 'aria-label': playLabel });
    var glyph = icon('play_arrow');
    button.appendChild(glyph);
    var body = make('div', 'base-audio-player-body');
    var titleEl = make('div', 'base-audio-player-title', null, opts.title || '');
    titleEl.hidden = !opts.title;
    if (opts.title) titleEl.setAttribute('title', opts.title);
    var line = make('div', 'base-audio-player-line');
    var slider = createSliderField({ min: 0, max: 1000, step: 1, value: 0, showValue: false, label: opts.seekText || 'Seek' });
    var time = make('span', 'base-audio-player-time', null, '0:00 / 0:00');
    var failed = false;
    line.appendChild(slider.element);
    line.appendChild(time);
    body.appendChild(titleEl);
    body.appendChild(line);
    root.appendChild(button);
    root.appendChild(body);
    root.appendChild(audio);

    function duration(): number { return isFinite(audio.duration) ? audio.duration : 0; }

    function reflect(): void {
        if (failed) return;
        var d = duration();
        var t = audio.currentTime || 0;
        var text = clockText(t) + ' / ' + clockText(d);
        time.textContent = text;
        if (!seeking) slider.setValue(d ? t / d * 1000 : 0);
        slider.input.setAttribute('aria-valuetext', clockText(t) + ' of ' + clockText(d));
        var on = !audio.paused && !audio.ended;
        glyph.textContent = on ? 'pause' : 'play_arrow';
        button.setAttribute('title', on ? pauseLabel : playLabel);
        button.setAttribute('aria-label', on ? pauseLabel : playLabel);
        root.classList.toggle('playing', on);
    }

    function play(): void {
        if (!src) return;
        var started = audio.play();
        if (started && typeof started.catch === 'function') started.catch(function () { reflect(); });
    }

    function pause(): void { if (audio.paused === false) audio.pause(); }

    cleanups.push(listen(button, 'click', function () {
        if (failed) { setValue(src); return; }
        if (audio.paused || audio.ended) play();
        else pause();
    }));
    cleanups.push(listen(slider.input, 'input', function () {
        seeking = true;
        var d = duration();
        if (d) audio.currentTime = slider.getValue() / 1000 * d;
        seeking = false;
        reflect();
    }));
    cleanups.push(listen(audio, 'play', function () {
        // Starting this player pauses the one that was playing, so only one plays at a time.
        if (playing && playing !== audio) playing.pause();
        playing = audio;
        reflect();
        if (opts.onPlay) opts.onPlay();
    }));
    ['pause', 'ended'].forEach(function (type) {
        cleanups.push(listen(audio, type, function () {
            if (playing === audio) playing = null;
            reflect();
            if (opts.onPause) opts.onPause();
        }));
    });
    ['timeupdate', 'loadedmetadata', 'durationchange', 'seeked'].forEach(function (type) {
        cleanups.push(listen(audio, type, reflect));
    });
    // An error takes the title's line and turns the button into an X, so the player keeps its height.
    function setFailed(on: boolean): void {
        failed = on;
        root.classList.toggle('failed', on);
        var text = on ? opts.errorText || 'Could not load the audio.' : opts.title || '';
        titleEl.textContent = text;
        titleEl.hidden = !text;
        if (text) titleEl.setAttribute('title', text);
        else titleEl.removeAttribute('title');
        if (on) titleEl.setAttribute('role', 'alert');
        else titleEl.removeAttribute('role');
        if (on) {
            glyph.textContent = 'close';
            var reset = opts.resetText || 'Reset';
            button.setAttribute('title', reset);
            button.setAttribute('aria-label', reset);
            button.disabled = false;
        }
    }

    cleanups.push(listen(audio, 'error', function () {
        if (!src) return;
        if (playing === audio) playing = null;
        setFailed(true);
    }));

    function setValue(next: string | null): void {
        pause();
        src = toText(next);
        setFailed(false);
        button.disabled = !src;
        if (src) audio.setAttribute('src', src);
        else audio.removeAttribute('src');
        if (typeof audio.load === 'function') audio.load();
        reflect();
    }

    setValue(opts.src || '');
    return {
        element: root,
        audio: audio,
        getValue: function () { return src; },
        setValue: setValue,
        play: play,
        pause: pause,
        destroy: function () {
            pause();
            if (playing === audio) playing = null;
            runAll(cleanups);
            slider.destroy();
        }
    };
}
