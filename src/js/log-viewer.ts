import { make, listen, runAll, nextId } from './lib/dom.js';
import { makeCheck, makeCheckRow } from './lib/check.js';
import { copyToClipboard } from './browser-helpers.js';
import { createList } from './list.js';
import type { ListHeight } from './list.js';
import type { ComponentHandle } from './types.js';
import { baseText } from './lib/base-text.js';

/** One line as the log viewer keeps it. level is debug, info, warn, or error. */
export interface LogLine {
    text: string;
    level: string;
    time: string;
}

/** A line that append takes, as plain text or as an object with a text, a level, and a time. */
export type LogLineInput = string | number | { text?: unknown; level?: string; time?: string } | null | undefined;

/** What createLogViewer takes. maxLines bounds the lines kept, dropping the oldest first. height sets the output's height as a list's does. */
export interface LogViewerOptions {
    lines?: LogLineInput[];
    maxLines?: number;
    autoScroll?: boolean;
    label?: string;
    autoScrollText?: string;
    clearText?: string;
    copyText?: string;
    copiedText?: string;
    failedText?: string;
    emptyText?: string;
    toolbar?: boolean;
    height?: ListHeight;
    maxHeight?: number | string | null;
    minHeight?: number | string | null;
    onClear?(): void;
}

/** What createLogViewer returns. append takes one line or an array of lines. */
export interface LogViewerHandle extends ComponentHandle {
    output: HTMLDivElement;
    append(next: LogLineInput | LogLineInput[]): void;
    clear(): void;
    getValue(): LogLine[];
    setValue(next: LogLineInput[]): void;
    setAutoScroll(on: boolean): void;
    setHeight(height: ListHeight, maxHeight?: number | string | null): void;
    copyAll(): Promise<boolean>;
    destroy(): void;
}

var LEVELS: string[] = ['debug', 'info', 'warn', 'error'];

/**
 * A scrolling mono output area with a toolbar. Lines are appended, colored by level, bounded to maxLines, and scrolled into view while Auto scroll is on. Scrolling up turns Auto scroll off.
 *
 * @param options {
 *   lines          : array of strings or { text, level, time } where level is debug, info, warn, or error [optional]
 *   maxLines       : most lines kept, where the oldest go first (default 500)
 *   autoScroll     : true follows new lines (default true)
 *   label          : aria-label of the output (default 'Log')
 *   autoScrollText : label of the toggle (default 'Auto scroll')
 *   clearText      : text of the clear button (default 'Clear')
 *   copyText       : text of the copy button (default 'Copy all')
 *   copiedText     : feedback after a copy (default 'Copied')
 *   failedText     : feedback when the copy failed (default 'Copy failed.')
 *   emptyText      : sentence shown while there are no lines (default 'No output yet.')
 *   toolbar        : false hides the toolbar (default true)
 *   height         : the output's height, 'auto', 'fill', a number of pixels, or a CSS length (default 280)
 *   maxHeight      : the most the output grows to before it scrolls [optional]
 *   minHeight      : the least a filling output takes (default 160px) [optional]
 *   onClear        : function() called after Clear is pressed [optional]
 * }
 * @returns { element, output, append, clear, getValue, setValue, setAutoScroll, setHeight, copyAll, destroy }. append takes one line or an array of lines. getValue returns an array of { text, level, time }.
 */
export function createLogViewer(options?: LogViewerOptions): LogViewerHandle {
    options = options || {};
    var max: number = options.maxLines || 500;
    var lines: LogLine[] = [];
    var cleanups: Array<() => void> = [];
    var timer: ReturnType<typeof setTimeout> | null = null;
    var auto = options.autoScroll !== false;

    var root = make('div', 'base-log');
    var bar = make('div', 'base-log-toolbar');
    bar.hidden = options.toolbar === false;
    var toggle = makeCheck(null, { id: nextId('log') });
    toggle.checked = auto;
    var toggleLabel = makeCheckRow(toggle, options.autoScrollText || baseText('Base.AutoScroll'), 'base-checkbox base-log-toggle');
    var clearButton = make('button', 'raised base-button small secondary', { type: 'button' }, options.clearText || baseText('Base.Clear'));
    var copyButton = make('button', 'raised base-button small secondary', { type: 'button' }, options.copyText || baseText('Base.CopyAll'));
    bar.appendChild(toggleLabel);
    bar.appendChild(clearButton);
    bar.appendChild(copyButton);
    var output = make('div', 'base-log-output', { role: 'log', 'aria-live': 'off', 'aria-label': options.label || baseText('Base.Log'), tabindex: '0' });
    root.appendChild(bar);
    root.appendChild(output);
    var list = createList<LogLine>({
        element: output,
        layout: 'plain',
        wrap: false,
        role: 'log',
        emptyText: options.emptyText || baseText('Base.NoOutput'),
        height: options.height === undefined ? 280 : options.height,
        maxHeight: options.maxHeight,
        minHeight: options.minHeight,
        render: node
    });
    list.emptyElement.classList.add('base-log-empty');

    function normalize(line: LogLineInput): LogLine {
        if (line === undefined || line === null) return { text: '', level: 'info', time: '' };
        if (typeof line !== 'object') return { text: String(line), level: 'info', time: '' };
        return { text: String(line.text === undefined ? '' : line.text), level: LEVELS.indexOf(line.level as string) === -1 ? 'info' : line.level as string, time: line.time || '' };
    }

    function node(line: LogLine): HTMLDivElement {
        var el = make('div', 'base-log-line ' + line.level);
        if (line.time) el.appendChild(make('span', 'base-log-time', null, line.time));
        el.appendChild(make('span', 'base-log-text', null, line.text));
        return el;
    }

    function follow(): void {
        if (auto) output.scrollTop = output.scrollHeight;
    }

    function append(next: LogLineInput | LogLineInput[]): void {
        var batch = (Array.isArray(next) ? next : [next]).map(normalize);
        if (!batch.length) return;
        // A batch that fills the cap replaces every line, so it is drawn once rather than drawn and dropped.
        if (batch.length >= max) {
            lines = batch.slice(batch.length - max);
            redraw();
            follow();
            return;
        }
        batch.forEach(function (line) { lines.push(line); });
        list.append(batch);
        var extra = lines.length - max;
        if (extra > 0) {
            lines.splice(0, extra);
            list.removeFirst(extra);
        }
        follow();
    }

    function redraw(): void {
        list.setItems(lines);
    }

    function reset(): void {
        lines = [];
        redraw();
    }

    function setAutoScroll(on: boolean): void {
        auto = !!on;
        toggle.checked = auto;
        follow();
    }

    function copyAll(): Promise<boolean> {
        var text = lines.map(function (l) { return (l.time ? l.time + ' ' : '') + l.text; }).join('\n');
        return copyToClipboard(text).then(function (ok) {
            var original = options!.copyText || baseText('Base.CopyAll');
            copyButton.textContent = ok ? (options!.copiedText || baseText('Copied')) : (options!.failedText || baseText('Base.CopyFailed'));
            clearTimeout(timer as ReturnType<typeof setTimeout>);
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
        setHeight: function (height, maxHeight) { list.setHeight(height, maxHeight); },
        copyAll: copyAll,
        destroy: function () { clearTimeout(timer as ReturnType<typeof setTimeout>); runAll(cleanups); list.destroy(); }
    };
}
