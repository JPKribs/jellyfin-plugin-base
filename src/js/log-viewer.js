import { make, listen, runAll, clear, nextId } from './dom-util.js';
import { copyToClipboard } from './clipboard.js';

var LEVELS = ['debug', 'info', 'warn', 'error'];

// createLogViewer
// A scrolling mono output area with a toolbar. Lines are appended, colored by level, bounded to maxLines, and scrolled into view while Auto Scroll is on. Scrolling up turns Auto Scroll off.
//
// Param: options | {
//   lines          : array of strings or { text, level, time } where level is debug, info, warn, or error [optional]
//   maxLines       : most lines kept, where the oldest go first (default 500)
//   autoScroll     : true follows new lines (default true)
//   label          : aria-label of the output (default 'Log')
//   autoScrollText : label of the toggle (default 'Auto Scroll')
//   clearText      : text of the clear button (default 'Clear')
//   copyText       : text of the copy button (default 'Copy All')
//   copiedText     : feedback after a copy (default 'Copied.')
//   failedText     : feedback when the copy failed (default 'Copy failed.')
//   emptyText      : sentence shown while there are no lines (default 'No output yet.')
//   toolbar        : false hides the toolbar (default true)
//   onClear        : function() called after Clear is pressed [optional]
// }
// Returns { element, output, append, clear, getValue, setValue, setAutoScroll, copyAll, destroy }. append takes one line or an array of lines. getValue returns an array of { text, level, time }.
export function createLogViewer(options) {
    options = options || {};
    var max = options.maxLines || 500;
    var lines = [];
    var cleanups = [];
    var timer = null;
    var auto = options.autoScroll !== false;

    var root = make('div', 'jpk-log');
    var bar = make('div', 'jpk-log-toolbar');
    bar.hidden = options.toolbar === false;
    var toggleLabel = make('label', 'jpk-log-toggle');
    var toggle = make('input', '', { type: 'checkbox' });
    toggle.id = nextId('log');
    toggle.checked = auto;
    toggleLabel.appendChild(toggle);
    toggleLabel.appendChild(make('span', '', null, options.autoScrollText || 'Auto Scroll'));
    var clearButton = make('button', 'raised jpk-button-small jpk-secondary', { type: 'button' }, options.clearText || 'Clear');
    var copyButton = make('button', 'raised jpk-button-small jpk-secondary', { type: 'button' }, options.copyText || 'Copy All');
    bar.appendChild(toggleLabel);
    bar.appendChild(clearButton);
    bar.appendChild(copyButton);
    var output = make('div', 'jpk-log-output', { role: 'log', 'aria-live': 'off', 'aria-label': options.label || 'Log', tabindex: '0' });
    var empty = make('div', 'jpk-log-empty', null, options.emptyText || 'No output yet.');
    root.appendChild(bar);
    root.appendChild(output);

    function normalize(line) {
        if (line === undefined || line === null) return { text: '', level: 'info', time: '' };
        if (typeof line !== 'object') return { text: String(line), level: 'info', time: '' };
        return { text: String(line.text === undefined ? '' : line.text), level: LEVELS.indexOf(line.level) === -1 ? 'info' : line.level, time: line.time || '' };
    }

    function node(line) {
        var el = make('div', 'jpk-log-line ' + line.level);
        if (line.time) el.appendChild(make('span', 'jpk-log-time', null, line.time));
        el.appendChild(make('span', 'jpk-log-text', null, line.text));
        return el;
    }

    function syncEmpty() {
        if (!lines.length) { if (!empty.parentNode) output.appendChild(empty); }
        else if (empty.parentNode) output.removeChild(empty);
    }

    function follow() {
        if (auto) output.scrollTop = output.scrollHeight;
    }

    function append(next) {
        var batch = (Array.isArray(next) ? next : [next]).map(normalize);
        if (!batch.length) return;
        if (!lines.length && empty.parentNode) output.removeChild(empty);
        batch.forEach(function (line) {
            lines.push(line);
            output.appendChild(node(line));
        });
        while (lines.length > max) {
            lines.shift();
            var first = output.querySelector('.jpk-log-line');
            if (first) output.removeChild(first);
        }
        follow();
    }

    function reset() {
        lines = [];
        clear(output);
        syncEmpty();
    }

    function setAutoScroll(on) {
        auto = !!on;
        toggle.checked = auto;
        follow();
    }

    function copyAll() {
        var text = lines.map(function (l) { return (l.time ? l.time + ' ' : '') + l.text; }).join('\n');
        return copyToClipboard(text).then(function (ok) {
            var original = options.copyText || 'Copy All';
            copyButton.textContent = ok ? (options.copiedText || 'Copied.') : (options.failedText || 'Copy failed.');
            clearTimeout(timer);
            timer = setTimeout(function () { copyButton.textContent = original; }, 1500);
            return ok;
        });
    }

    cleanups.push(listen(toggle, 'change', function () { setAutoScroll(toggle.checked); }));
    cleanups.push(listen(clearButton, 'click', function () { reset(); if (options.onClear) options.onClear(); }));
    cleanups.push(listen(copyButton, 'click', copyAll));
    cleanups.push(listen(output, 'scroll', function () {
        if (auto && output.scrollHeight - output.scrollTop - output.clientHeight > 8) setAutoScroll(false);
    }));

    reset();
    if (options.lines) append(options.lines);

    return {
        element: root,
        output: output,
        append: append,
        clear: reset,
        getValue: function () { return lines.map(function (l) { return { text: l.text, level: l.level, time: l.time }; }); },
        setValue: function (next) { reset(); if (next && next.length) append(next); },
        setAutoScroll: setAutoScroll,
        copyAll: copyAll,
        destroy: function () { clearTimeout(timer); runAll(cleanups); }
    };
}
