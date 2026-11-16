import { make, icon, iconButton, listen, runAll, toText, nextId } from './lib/dom.js';
import { openDialog } from './dialog.js';
import type { DialogHandle } from './dialog.js';
import { encodeQr } from './lib/qr.js';
import { svgEl } from './lib/chart.js';
import { canvasBlob, copyImage } from './lib/canvas.js';
import { downloadBlob } from './lib/file.js';
import { createCopyField } from './copy-field.js';
import type { CopyFieldHandle } from './copy-field.js';
import { createFieldMessage } from './field-message.js';
import type { ComponentHandle } from './types.js';

/** What createQrCode takes. value is the text the code holds, such as a URL. */
export interface QrCodeOptions {
    value?: string;
    layout?: 'full' | 'inline';
    showText?: string;
    dialogTitle?: string;
    label?: string;
    showValue?: boolean;
    fileName?: string;
    copyImageText?: string;
    downloadText?: string;
    copiedText?: string;
    copyFailedText?: string;
    tooLongText?: string;
    feedbackMs?: number;
}

/** What createQrCode returns. toBlob draws the code as a PNG. */
export interface QrCodeHandle extends ComponentHandle {
    getValue(): string;
    open(): DialogHandle | null;
    setValue(value: string | null): void;
    toBlob(): Promise<Blob | null>;
    destroy(): void;
}

// The modules of white space around the code that a scanner needs.
var QUIET = 4;
// The pixels per module of the PNG, high enough that the round dots stay smooth.
var PNG_SCALE = 12;
// The radius of a data dot, in modules. A little under half, so neighbors read as separate dots yet still scan.
var DOT = 0.43;

// A rounded rectangle as path data, drawn clockwise.
function roundRect(x: number, y: number, w: number, h: number, r: number): string {
    return 'M' + (x + r) + ' ' + y + 'h' + (w - 2 * r) + 'a' + r + ' ' + r + ' 0 0 1 ' + r + ' ' + r + 'v' + (h - 2 * r) +
        'a' + r + ' ' + r + ' 0 0 1 ' + (-r) + ' ' + r + 'h' + (2 * r - w) + 'a' + r + ' ' + r + ' 0 0 1 ' + (-r) + ' ' + (-r) +
        'v' + (2 * r - h) + 'a' + r + ' ' + r + ' 0 0 1 ' + r + ' ' + (-r) + 'z';
}

/**
 * The code drawn in the rounded style: a round dot per dark module, and each of the three finder eyes as a rounded ring
 * around a rounded square. The paths are in modules with the quiet zone around them, and the eyes fill even-odd so the
 * ring's hole stays open. The page's SVG and the PNG draw the same paths.
 */
function qrPaths(grid: boolean[][]): { dots: string; eyes: string } {
    var size = grid.length;
    var corners = [[0, 0], [0, size - 7], [size - 7, 0]];
    function inEye(r: number, c: number): boolean {
        return corners.some(function (k) { return r >= k[0] && r < k[0] + 7 && c >= k[1] && c < k[1] + 7; });
    }
    var dots: string[] = [];
    grid.forEach(function (row, r) {
        row.forEach(function (dark, c) {
            if (!dark || inEye(r, c)) return;
            var x = c + QUIET + 0.5 - DOT;
            var y = r + QUIET + 0.5;
            dots.push('M' + x + ' ' + y + 'a' + DOT + ' ' + DOT + ' 0 1 0 ' + (2 * DOT) + ' 0a' + DOT + ' ' + DOT + ' 0 1 0 ' + (-2 * DOT) + ' 0z');
        });
    });
    var eyes = corners.map(function (k) {
        var x = k[1] + QUIET;
        var y = k[0] + QUIET;
        return roundRect(x, y, 7, 7, 2.2) + roundRect(x + 1, y + 1, 5, 5, 1.4) + roundRect(x + 2, y + 2, 3, 3, 1);
    });
    return { dots: dots.join(''), eyes: eyes.join('') };
}

/**
 * With layout 'inline' it draws only the text as a wrapped Copy Field that shows all of it, with a QR button beside Copy that opens the full code,
 * with its Copy Image and Download, in a dialog. A text too long to encode disables that button and shows the message.
 *
 * A QR code of a short text, such as a URL, drawn as SVG in the text color on the surface in a rounded style: round dots, and rounded finder eyes in the accent color, with Copy Image and Download buttons for a PNG and the text under it as a Copy Field.
 * It encodes in byte mode at error correction level M, up to 213 bytes, and shows a message under the frame for a longer text.
 *
 * @param options {
 *   value          : the text the code holds, such as a URL [optional]
 *   layout         : 'full', the code with its buttons and text, or 'inline', the text with a QR button that opens the code in a dialog (default 'full')
 *   showText       : the inline QR button's title and aria-label (default 'Show QR Code')
 *   dialogTitle    : the inline dialog's title (default 'QR Code')
 *   label          : the code's accessible name (default 'QR code for' and the text)
 *   showValue      : false hides the Copy Field under the code (default true)
 *   fileName       : the name of the downloaded PNG (default 'qr-code.png')
 *   copyImageText  : the copy button's label (default 'Copy Image')
 *   downloadText   : the download button's label (default 'Download')
 *   copiedText     : the feedback after a copy (default 'Copied.')
 *   copyFailedText : the feedback when the browser refused the copy (default 'Copy failed.')
 *   tooLongText    : the message for a text too long to encode (default 'This text is too long for a QR code.')
 *   feedbackMs     : how long the feedback stays (default 1500)
 * }
 * @returns { element, getValue, setValue, toBlob, open, destroy }. toBlob resolves to a PNG of the code, or null. open shows the code in a dialog, the inline QR button's action, and returns the dialog, or null for an empty or too long text.
 */
export function createQrCode(options?: QrCodeOptions): QrCodeHandle {
    var opts = options || {};
    var cleanups: Array<() => void> = [];
    var value = '';
    var grid: boolean[][] | null = null;
    var timer: ReturnType<typeof setTimeout> | null = null;

    var inline = opts.layout === 'inline';
    var root = make('div', 'base-qr-code' + (inline ? ' inline' : ''));
    var dialog: DialogHandle | null = null;
    var frame = make('div', 'base-qr-code-frame', { role: 'img' });
    var actions = make('div', 'base-button-row base-qr-code-actions');
    var copyBtn = make('button', 'raised base-button secondary fill base-qr-code-copy', { type: 'button' });
    copyBtn.appendChild(icon('content_copy'));
    var copyLabel = make('span', null, null, opts.copyImageText || 'Copy Image');
    copyBtn.appendChild(copyLabel);
    var downloadBtn = make('button', 'raised base-button secondary fill base-qr-code-download', { type: 'button' });
    downloadBtn.appendChild(icon('download'));
    downloadBtn.appendChild(make('span', null, null, opts.downloadText || 'Download'));
    var status = make('span', 'base-sr-only', { role: 'status', id: nextId('qr') });
    actions.appendChild(copyBtn);
    actions.appendChild(downloadBtn);
    actions.appendChild(status);
    var message = createFieldMessage({});
    // The buttons and the text sit beside the code on a wide line and under it on a narrow one.
    var side = make('div', 'base-qr-code-side');
    var field: CopyFieldHandle | null = null;
    var showBtn: HTMLButtonElement | null = null;
    if (inline) {
        // Inline, the text is the component, and its QR button opens the full code in a dialog.
        field = createCopyField({ value: '', label: opts.label || 'Link', wrap: true });
        var showLabel = opts.showText || 'Show QR Code';
        showBtn = iconButton('base-row-btn base-qr-code-open', 'qr_code_2', showLabel);
        field.element.appendChild(showBtn);
        root.appendChild(field.element);
        root.appendChild(message.element);
        cleanups.push(listen(showBtn, 'click', function () { open(); }));
    } else {
        root.appendChild(frame);
        root.appendChild(side);
        side.appendChild(message.element);
        side.appendChild(actions);
        if (opts.showValue !== false) {
            field = createCopyField({ value: '', label: opts.label || 'Link' });
            side.appendChild(field.element);
        }
    }
    var fit = function (): void {
        var width = root.clientWidth || 0;
        root.classList.toggle('compact', !inline && !!width && width < 480);
    };
    if (!inline && typeof ResizeObserver !== 'undefined') {
        var watch = new ResizeObserver(fit);
        watch.observe(root);
        cleanups.push(function () { watch.disconnect(); });
    }
    setTimeout(fit, 0);

    function draw(): void {
        frame.innerHTML = '';
        grid = value ? encodeQr(value) : null;
        var tooLong = !!value && !grid;
        if (tooLong) message.set('error', opts.tooLongText || 'This text is too long for a QR code.');
        else message.clear();
        // The empty line would add a gap above the buttons, so it is out of the layout until there is a message.
        message.element.hidden = !tooLong;
        if (showBtn) showBtn.disabled = !grid;
        frame.hidden = !grid;
        actions.hidden = !grid;
        frame.setAttribute('aria-label', opts.label || ('QR code for ' + value));
        if (!grid) return;
        var n = grid.length + QUIET * 2;
        var paths = qrPaths(grid);
        var svg = svgEl('svg', { viewBox: '0 0 ' + n + ' ' + n, 'aria-hidden': 'true', focusable: 'false' });
        svg.appendChild(svgEl('rect', { width: n, height: n, class: 'base-qr-code-bg' }));
        svg.appendChild(svgEl('path', { d: paths.dots, class: 'base-qr-code-modules' }));
        svg.appendChild(svgEl('path', { d: paths.eyes, class: 'base-qr-code-eyes', 'fill-rule': 'evenodd' }));
        frame.appendChild(svg);
    }

    // Draws the code on a canvas in the colors it shows on the page.
    function toBlob(): Promise<Blob | null> {
        if (!grid) return Promise.resolve(null);
        var n = grid.length + QUIET * 2;
        var canvas = document.createElement('canvas');
        canvas.width = n * PNG_SCALE;
        canvas.height = n * PNG_SCALE;
        var ctx = canvas.getContext('2d');
        if (!ctx) return Promise.resolve(null);
        var style = window.getComputedStyle(frame);
        ctx.fillStyle = style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)' ? style.backgroundColor : 'Canvas';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        var paths = qrPaths(grid);
        var eyeEl = frame.querySelector('.base-qr-code-eyes');
        var eyeColor = eyeEl ? window.getComputedStyle(eyeEl).fill : '';
        ctx.scale(PNG_SCALE, PNG_SCALE);
        ctx.fillStyle = style.color || 'CanvasText';
        ctx.fill(new Path2D(paths.dots));
        // The eyes take the color they show on the page, the accent unless a page restyles them.
        ctx.fillStyle = eyeColor && eyeColor !== 'none' ? eyeColor : ctx.fillStyle;
        ctx.fill(new Path2D(paths.eyes), 'evenodd');
        return canvasBlob(canvas, 'image/png');
    }

    function feedback(ok: boolean): void {
        var text = ok ? (opts.copiedText || 'Copied.') : (opts.copyFailedText || 'Copy failed.');
        status.textContent = text;
        copyLabel.textContent = text;
        copyBtn.classList.toggle('success', ok);
        if (timer !== null) clearTimeout(timer);
        timer = setTimeout(function () {
            copyLabel.textContent = opts.copyImageText || 'Copy Image';
            copyBtn.classList.remove('success');
            status.textContent = '';
        }, opts.feedbackMs || 1500);
    }

    cleanups.push(listen(copyBtn, 'click', function () {
        toBlob().then(copyImage).then(feedback);
    }));
    cleanups.push(listen(downloadBtn, 'click', function () {
        toBlob().then(function (blob) { if (blob) downloadBlob(opts.fileName || 'qr-code.png', blob); });
    }));

    // The full code, its buttons, and nothing else, in a small dialog. Its own handle is destroyed when the dialog closes.
    function open(): DialogHandle | null {
        if (!grid) return null;
        if (dialog) dialog.close();
        var full = createQrCode({
            value: value, label: opts.label, showValue: false, fileName: opts.fileName, copyImageText: opts.copyImageText,
            downloadText: opts.downloadText, copiedText: opts.copiedText, copyFailedText: opts.copyFailedText, feedbackMs: opts.feedbackMs
        });
        full.element.classList.add('compact', 'base-qr-code-dialog');
        dialog = openDialog({
            title: opts.dialogTitle || 'QR Code',
            body: full.element,
            size: 'small',
            className: 'pluginConfigurationPage',
            returnFocus: showBtn,
            onClose: function () { full.destroy(); dialog = null; }
        });
        return dialog;
    }

    function setValue(next: string | null): void {
        value = toText(next);
        if (field) field.setValue(value);
        if (field) field.element.hidden = !value;
        draw();
    }

    setValue(opts.value || '');
    return {
        element: root,
        getValue: function () { return value; },
        setValue: setValue,
        toBlob: toBlob,
        open: open,
        destroy: function () {
            if (dialog) dialog.close();
            if (timer !== null) clearTimeout(timer);
            runAll(cleanups);
            if (field) field.destroy();
            message.destroy();
        }
    };
}
