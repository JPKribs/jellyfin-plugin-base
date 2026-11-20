import { make, listen, runAll, nextId } from './lib/dom.js';
import { buildThumb } from './lib/thumb.js';
import { bindPressedGroup } from './lib/pressed-group.js';
import { debounce } from './browser-helpers.js';
import { createSpinner } from './spinner.js';
import { createFieldMessage } from './field-message.js';
import { openDialog } from './dialog.js';
import type { ComponentHandle } from './types.js';
import { baseText } from './lib/base-text.js';

/** The background a preview frame shows its image on. */
export type PreviewBackground = 'dark' | 'light' | 'checker';

/** What a preview frame's render may return: an address, a Blob, or a canvas, or a promise of one. */
export type PreviewResult = string | Blob | HTMLCanvasElement | null | undefined;

/** What createPreviewFrame takes. render draws the image, and update asks for it again after a pause. */
export interface PreviewFrameOptions {
    render?(): PreviewResult | PromiseLike<PreviewResult>;
    label?: string;
    delay?: number;
    background?: PreviewBackground;
    backgrounds?: boolean;
    zoom?: boolean;
    renderingText?: string;
    errorText?: string;
    emptyText?: string;
    darkText?: string;
    lightText?: string;
    checkerText?: string;
    zoomText?: string;
}

/** What createPreviewFrame returns. update renders again after the delay, and refresh renders at once. getValue returns the background. */
export interface PreviewFrameHandle extends ComponentHandle {
    getValue(): PreviewBackground;
    setValue(background: PreviewBackground): void;
    update(): void;
    refresh(): Promise<void>;
    destroy(): void;
}

var BACKGROUNDS: PreviewBackground[] = ['dark', 'light', 'checker'];

/**
 * A frame that shows an image made by an async render, such as a generated poster, built on the thumb core. While it renders it shows the spinner and a status line, and a failed render shows a message under it.
 * update renders again once its inputs stop changing for the delay. A pressed group picks a dark, light, or checkered background, and a click on the image opens it larger in a dialog.
 *
 * @param options {
 *   render        : function() returning an address, a Blob, or a canvas, or a promise of one [optional]
 *   label         : the image's alt text and the zoom dialog's title (default 'Preview')
 *   delay         : milliseconds update waits for its inputs to settle (default 300)
 *   background    : 'dark', 'light', or 'checker' (default 'dark')
 *   backgrounds   : false hides the background choice (default true)
 *   zoom          : false turns off click to zoom (default true)
 *   renderingText : the status line while rendering (default 'Rendering…')
 *   errorText     : the message when render fails (default 'Could not render the preview.')
 *   emptyText     : the line while there is no image (default 'No preview.')
 *   darkText      : the dark background's label (default 'Dark')
 *   lightText     : the light background's label (default 'Light')
 *   checkerText   : the checkered background's label (default 'Checkered')
 *   zoomText      : the image button's title and aria-label (default 'Zoom')
 * }
 * @returns { element, getValue, setValue, update, refresh, destroy }.
 */
export function createPreviewFrame(options?: PreviewFrameOptions): PreviewFrameHandle {
    var opts = options || {};
    var cleanups: Array<() => void> = [];
    var background: PreviewBackground = BACKGROUNDS.indexOf(opts.background as PreviewBackground) !== -1 ? opts.background as PreviewBackground : 'dark';
    var url = '';
    var objectUrl = '';
    var asked = 0;
    var label = opts.label || baseText('Preview');

    var root = make('div', 'base-preview-frame');
    var choices = make('div', 'base-pill-group base-preview-frame-backgrounds', { role: 'group', 'aria-label': baseText('Base.Background') });
    var names: Record<PreviewBackground, string> = { dark: opts.darkText || baseText('Base.Dark'), light: opts.lightText || baseText('Base.Light'), checker: opts.checkerText || baseText('Base.Checkered') };
    BACKGROUNDS.forEach(function (b) {
        choices.appendChild(make('button', 'base-pill', { type: 'button', 'data-value': b, 'aria-pressed': b === background ? 'true' : 'false' }, names[b]));
    });
    choices.hidden = opts.backgrounds === false;
    var zoomable = opts.zoom !== false;
    var stage: HTMLElement = zoomable
        ? make('button', 'base-preview-frame-stage ' + background, { type: 'button', title: opts.zoomText || baseText('Base.Zoom'), 'aria-label': (opts.zoomText || baseText('Base.Zoom')) + ' ' + label })
        : make('div', 'base-preview-frame-stage ' + background);
    var thumb = buildThumb({ icon: 'image', className: 'base-preview-frame-thumb', imageClass: 'base-preview-frame-image', alt: label });
    stage.appendChild(thumb.element);
    var statusId = nextId('preview');
    var status = make('div', 'base-preview-frame-status base-icon-text small', { id: statusId, role: 'status' });
    var spinner = createSpinner({ size: 'small', label: opts.renderingText || baseText('Base.Rendering') });
    spinner.element.removeAttribute('role');
    var statusText = make('span', 'base-preview-frame-status-text');
    status.appendChild(spinner.element);
    status.appendChild(statusText);
    var message = createFieldMessage({});
    root.appendChild(choices);
    root.appendChild(stage);
    root.appendChild(status);
    root.appendChild(message.element);

    var pressed = bindPressedGroup(choices, {
        selector: '.base-pill',
        onChange: function (values) { setBackground(values[0] as PreviewBackground); }
    });
    cleanups.push(pressed.destroy);

    function setBackground(next: PreviewBackground): void {
        if (BACKGROUNDS.indexOf(next) === -1) return;
        background = next;
        BACKGROUNDS.forEach(function (b) { stage.classList.toggle(b, b === next); });
        pressed.setValues([next]);
    }

    function free(): void {
        if (objectUrl && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(objectUrl);
        objectUrl = '';
    }

    function show(result: PreviewResult): void {
        free();
        if (result && typeof (result as HTMLCanvasElement).toDataURL === 'function') url = (result as HTMLCanvasElement).toDataURL('image/png');
        else if (result && typeof Blob !== 'undefined' && result instanceof Blob) url = objectUrl = URL.createObjectURL(result);
        else url = typeof result === 'string' ? result : '';
        thumb.setSrc(url);
        root.classList.toggle('empty', !url);
        if (zoomable) (stage as HTMLButtonElement).disabled = !url;
    }

    function setBusy(busy: boolean, text: string): void {
        root.classList.toggle('busy', busy);
        spinner.element.hidden = !busy;
        statusText.textContent = text;
        status.hidden = !text;
    }

    function refresh(): Promise<void> {
        update.cancel();
        var mine = ++asked;
        if (typeof opts.render !== 'function') { show(null); setBusy(false, opts.emptyText || baseText('Base.NoPreview')); return Promise.resolve(); }
        setBusy(true, opts.renderingText || baseText('Base.Rendering'));
        message.clear();
        var result: PreviewResult | PromiseLike<PreviewResult>;
        try { result = opts.render(); } catch (e) { result = Promise.reject(e); }
        return Promise.resolve(result).then(function (value) {
            if (mine !== asked) return;
            show(value);
            setBusy(false, value ? '' : (opts.emptyText || baseText('Base.NoPreview')));
        }, function () {
            if (mine !== asked) return;
            setBusy(false, '');
            message.set('error', opts.errorText || baseText('Base.CouldNotRender'));
        });
    }

    var update = debounce(function () { refresh(); }, typeof opts.delay === 'number' ? opts.delay : 300);

    if (zoomable) {
        cleanups.push(listen(stage, 'click', function () {
            if (!url) return;
            var body = make('div', 'base-preview-frame-zoom ' + background);
            body.appendChild(make('img', 'base-preview-frame-zoom-image', { src: url, alt: label }));
            openDialog({ title: label, body: body, size: 'large' });
        }));
    }

    refresh();
    return {
        element: root,
        getValue: function () { return background; },
        setValue: setBackground,
        update: function () { update(); },
        refresh: refresh,
        destroy: function () {
            asked++;
            update.cancel();
            runAll(cleanups);
            thumb.destroy();
            message.destroy();
            free();
        }
    };
}
