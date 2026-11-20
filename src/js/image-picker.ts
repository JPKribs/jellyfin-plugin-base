import { make, nextId, listen, runAll, addToken } from './lib/dom.js';
import { createFieldMessage } from './field-message.js';
import { bindFileInput, checkFile } from './lib/file-intake.js';
import { buildThumb } from './lib/thumb.js';
import { fitBox } from './lib/canvas.js';
import { applyColor } from './lib/color.js';
import type { ComponentHandle } from './types.js';
import { baseText } from './lib/base-text.js';

/** A picked image file. dataUrl is the whole data URL, and base64 is only its data after the comma. */
export interface ImagePickerValue {
    name: string;
    type: string;
    size: number;
    dataUrl: string;
    base64: string;
    width?: number;
    height?: number;
}

/** The picture an empty image picker shows: initials from text, or an icon, on a color. */
export interface ImagePickerFallback {
    text?: string;
    icon?: string;
    color?: string;
}

/** What createImagePicker takes. value is a URL or data URL to show at first. The picker never uploads. */
export interface ImagePickerOptions {
    value?: string | null;
    label?: string;
    description?: string;
    accept?: string;
    maxBytes?: number;
    chooseText?: string;
    replaceText?: string;
    removeText?: string;
    emptyText?: string;
    tooLargeText?: string;
    wrongTypeText?: string;
    readErrorText?: string;
    shape?: 'square' | 'portrait' | 'wide';
    crop?: boolean | number;
    maxSize?: number;
    fallback?: ImagePickerFallback | string | null;
    removable?: boolean;
    onChange?(value: ImagePickerValue | null): void;
}

/** What createImagePicker returns. getValue returns the picked file, the URL shown, or null when empty. */
export interface ImagePickerHandle extends ComponentHandle {
    input: HTMLInputElement;
    getValue(): ImagePickerValue | string | null;
    setValue(url: string | null): void;
    setFallback(fallback: ImagePickerFallback | string | null): void;
    fallbackDataUrl(size?: number): string;
    destroy(): void;
}

var SHAPES: string[] = ['square', 'portrait', 'wide'];
var SHAPE_ASPECT: Record<string, number> = { square: 1, portrait: 2 / 3, wide: 16 / 9 };

/**
 * The initials of a name, such as 'AL' for Ada Lovelace, up to two letters.
 *
 * @param text the name
 * @returns the initials in upper case, or ''
 */
export function initials(text: string | null | undefined): string {
    var words = String(text || '').trim().split(/\s+/).filter(Boolean);
    if (!words.length) return '';
    var first = words[0].charAt(0);
    var last = words.length > 1 ? words[words.length - 1].charAt(0) : '';
    return (first + last).toUpperCase();
}

/**
 * Picks an image file, shows it in a frame, and hands the caller the file data. It never uploads. The frame shows a placeholder icon while empty, and a refused or unreadable file shows a message under the field.
 *
 * @param options {
 *   value        : a URL or data URL to show at first [optional]
 *   label        : visible label above the frame [optional]
 *   description  : sentence under the field [optional]
 *   accept       : accept list of the file input (default 'image/*')
 *   maxBytes     : most bytes the file may have [optional]
 *   chooseText   : text of the choose button while empty (default 'Select image')
 *   replaceText  : text of the choose button while an image shows (default 'Replace')
 *   removeText   : text of the remove button (default 'Remove')
 *   emptyText    : text in the empty frame (default 'No image.')
 *   tooLargeText : message for a file over maxBytes, where {value} is the limit (default 'The image is larger than {value}.')
 *   wrongTypeText: message for a file that does not match accept (default 'This file is not an image.')
 *   readErrorText: message when the file cannot be read (default 'Could not read this file.')
 *   shape        : frame shape, 'square', 'portrait', or 'wide' (default 'square')
 *   crop         : true crops a picked image from its center to the frame's shape, or a number crops it to that width over height (default false)
 *   maxSize      : the longest side in pixels a picked image is scaled down to [optional]
 *   fallback     : { text, icon, color } drawn in the empty frame, initials from text or else an icon, on a status color or hex code (default blue), or the URL of an image shown in the empty frame, such as a generated logo [optional]
 *   removable    : false never shows Remove, for an image that must always be set (default true)
 *   onChange     : function(value) called with { name, type, size, dataUrl, base64 } after a pick, and null after Remove [optional]
 * }
 * @returns { element, input, getValue, setValue, setFallback, fallbackDataUrl, destroy }. setFallback swaps the fallback. fallbackDataUrl(size) draws the fallback as a PNG data URL, returns a URL fallback as it is, or '' without one. getValue returns the picked file's data, the URL string while it shows a URL from value or setValue, or null while empty. setValue(url) shows a URL, or empties the frame for null, without onChange.
 */
export function createImagePicker(options?: ImagePickerOptions): ImagePickerHandle {
    options = options || {};
    var cleanups: Array<() => void> = [];
    var value: ImagePickerValue | string | null = null;
    var reader: FileReader | null = null;
    // Each pick and each clear takes a number, so a crop that finishes late never overwrites a newer value.
    var picks = 0;
    var shape = options.shape && SHAPES.indexOf(options.shape) !== -1 ? options.shape : 'square';
    var accept = options.accept || 'image/*';

    var root = make('div', 'base-image-picker ' + shape, { role: 'group' });
    if (options.label) {
        var label = make('div', 'base-image-picker-label', null, options.label);
        label.id = nextId('image-label');
        root.setAttribute('aria-labelledby', label.id);
        root.appendChild(label);
    }
    var body = make('div', 'base-image-picker-body');
    var thumb = buildThumb({ icon: 'image', className: 'base-image-picker-frame', imageClass: 'base-image-picker-image', placeholderClass: 'base-image-picker-placeholder', keepImage: true });
    var frame = thumb.element;
    var image = thumb.image!;
    var placeholder = thumb.placeholder;
    // The empty text names the state, so a screen reader reads it.
    placeholder.removeAttribute('aria-hidden');
    placeholder.appendChild(make('span', 'base-image-picker-empty', null, options.emptyText || baseText('Base.NoImage')));
    var fallback: ImagePickerFallback | null = null;
    var fallbackUrl = '';
    var fallbackEl: HTMLElement | null = null;
    // A fallback is drawn initials or an icon, or an image by its URL, shown while the picker is empty.
    function placeFallback(next: ImagePickerFallback | string | null | undefined): void {
        if (fallbackEl && fallbackEl.parentNode) fallbackEl.parentNode.removeChild(fallbackEl);
        fallbackEl = null;
        fallback = null;
        fallbackUrl = typeof next === 'string' ? next.trim() : '';
        if (next && typeof next === 'object' && (next.text || next.icon)) {
            fallback = next;
            fallbackEl = make('span', 'base-image-picker-fallback', { 'aria-hidden': 'true' }, initials(next.text) || null);
            if (!initials(next.text)) fallbackEl.appendChild(make('span', 'material-icons', null, next.icon || 'image'));
            applyColor(fallbackEl, next.color, 'blue');
            frame.appendChild(fallbackEl);
        }
        root.classList.toggle('has-fallback', !!(fallbackEl || fallbackUrl));
    }
    placeFallback(options.fallback);
    var actions = make('div', 'base-image-picker-actions');
    var choose = make('button', 'raised base-button small base-image-picker-choose', { type: 'button' });
    var remove = make('button', 'raised base-button small secondary base-image-picker-remove', { type: 'button' }, options.removeText || baseText('ButtonRemove'));
    var intake = bindFileInput({ trigger: choose, dropTarget: frame, accept: accept, onFiles: function (files: File[]) { take(files[0]); } });
    var input = intake.input;
    actions.appendChild(choose);
    actions.appendChild(remove);
    body.appendChild(frame);
    body.appendChild(actions);
    root.appendChild(body);
    root.appendChild(input);
    if (options.description) {
        var description = make('div', 'base-image-picker-description', null, options.description);
        description.id = nextId('image-description');
        addToken(root, 'aria-describedby', description.id);
        root.appendChild(description);
    }
    var message = createFieldMessage({ input: choose });
    root.appendChild(message.element);

    // Crops and scales a picked image on a canvas when crop or maxSize asks for it, keeping a PNG, JPEG, or WebP type and making anything else a PNG.
    function shrink(dataUrl: string, type: string, done: (url: string, type: string, width?: number, height?: number) => void): void {
        var aspect = options!.crop === true ? SHAPE_ASPECT[shape] : (typeof options!.crop === 'number' && options!.crop > 0 ? options!.crop : 0);
        if ((!aspect && !options!.maxSize) || typeof Image === 'undefined') { done(dataUrl, type); return; }
        var img = new Image();
        img.onload = function () {
            var box = fitBox(img.naturalWidth || img.width, img.naturalHeight || img.height, { aspect: aspect, maxSize: options!.maxSize });
            var canvas = document.createElement('canvas');
            canvas.width = box.width;
            canvas.height = box.height;
            var ctx = canvas.getContext('2d');
            if (!ctx) { done(dataUrl, type); return; }
            ctx.drawImage(img, box.sx, box.sy, box.sw, box.sh, 0, 0, box.width, box.height);
            var out = /^image\/(png|jpeg|webp)$/.test(type) ? type : 'image/png';
            done(canvas.toDataURL(out, 0.9), out, box.width, box.height);
        };
        img.onerror = function () { done(dataUrl, type); };
        img.src = dataUrl;
    }

    function fallbackDataUrl(size?: number): string {
        if (fallbackUrl) return fallbackUrl;
        if (!fallbackEl || typeof document === 'undefined') return '';
        var side = size && size > 0 ? size : 256;
        var canvas = document.createElement('canvas');
        canvas.width = side;
        canvas.height = side;
        var ctx = canvas.getContext ? canvas.getContext('2d') : null;
        if (!ctx) return '';
        var style = window.getComputedStyle(fallbackEl);
        ctx.fillStyle = style.backgroundColor || 'Canvas';
        ctx.fillRect(0, 0, side, side);
        var tint = style.getPropertyValue('--base-image-picker-fallback-bg').trim();
        if (tint) {
            ctx.fillStyle = tint;
            ctx.fillRect(0, 0, side, side);
        }
        ctx.fillStyle = style.color || 'CanvasText';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        var text = initials(fallback!.text);
        ctx.font = (text ? '600 ' + Math.round(side * 0.4) + 'px ' + (style.fontFamily || 'sans-serif') : Math.round(side * 0.55) + 'px "Material Icons"');
        ctx.fillText(text || fallback!.icon || 'image', side / 2, side / 2);
        return canvas.toDataURL('image/png');
    }

    function shownUrl(): string {
        if (!value) return '';
        return typeof value === 'string' ? value : value.dataUrl;
    }

    function render(): void {
        var url = shownUrl();
        var src = url || fallbackUrl;
        root.classList.toggle('filled', !!url);
        if (fallbackEl) fallbackEl.hidden = !!url;
        if (src !== (image.getAttribute('src') || '')) thumb.setSrc(src);
        image.setAttribute('alt', value && typeof value !== 'string' ? value.name : (options!.label || ''));
        remove.hidden = !url || options!.removable === false;
        choose.textContent = url ? (options!.replaceText || baseText('Base.Replace')) : (options!.chooseText || baseText('Base.SelectImage'));
    }

    function stopReading(): void {
        picks++;
        if (!reader) return;
        var old = reader;
        reader = null;
        try { old.abort(); } catch (e) { /* already done */ }
    }

    // Checks the file against accept and maxBytes, then reads it as a data URL.
    function take(file: File | null | undefined): void {
        if (!file) return;
        var problem = checkFile(file, {
            accept: accept,
            maxBytes: options!.maxBytes,
            typeText: options!.wrongTypeText || baseText('Base.NotAnImage'),
            sizeLimitText: options!.tooLargeText || baseText('Base.ImageTooLarge'),
            sizeValue: 'limit'
        });
        if (problem) { message.set('error', problem); return; }
        stopReading();
        var pick = picks;
        var mine = new FileReader();
        reader = mine;
        mine.onload = function () {
            if (reader !== mine) return;
            reader = null;
            shrink(String(mine.result || ''), file.type, function (dataUrl: string, type: string, width?: number, height?: number) {
                if (pick !== picks) return;
                var comma = dataUrl.indexOf(',');
                var base64 = comma === -1 ? '' : dataUrl.slice(comma + 1);
                var changed = dataUrl !== String(mine.result || '');
                value = { name: file.name, type: type, size: changed ? Math.floor(base64.length * 3 / 4) : file.size, dataUrl: dataUrl, base64: base64 };
                if (width) { value.width = width; value.height = height; }
                message.clear();
                render();
                if (options!.onChange) options!.onChange(value);
            });
        };
        mine.onerror = function () {
            if (reader !== mine) return;
            reader = null;
            message.set('error', options!.readErrorText || baseText('Base.CouldNotReadFile'));
        };
        mine.readAsDataURL(file);
    }

    cleanups.push(listen(remove, 'click', function () {
        stopReading();
        value = null;
        message.clear();
        render();
        choose.focus();
        if (options!.onChange) options!.onChange(null);
    }));

    function setValue(url: string | null): void {
        stopReading();
        value = url ? String(url) : null;
        message.clear();
        render();
    }

    setValue(options.value || null);

    return {
        element: root,
        input: input,
        getValue: function () { return value && typeof value !== 'string' ? { name: value.name, type: value.type, size: value.size, dataUrl: value.dataUrl, base64: value.base64 } : value; },
        setValue: setValue,
        setFallback: function (next) { placeFallback(next); render(); },
        fallbackDataUrl: fallbackDataUrl,
        destroy: function () { stopReading(); runAll(cleanups); intake.destroy(); thumb.destroy(); message.destroy(); }
    };
}
