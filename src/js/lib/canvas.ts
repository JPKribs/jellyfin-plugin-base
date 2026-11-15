// canvas.ts
// Canvas helpers that the image picker, the QR code, and the preview frame share: drawing an image scaled and cropped, reading a canvas as a Blob, and copying an image. None of them is exported from the bundle.

/** How fitImage sizes a picture: crop to an aspect, as width over height, and cap the longer side. */
export interface FitOptions {
    aspect?: number | null;
    maxSize?: number | null;
}

/** The size and the source rectangle fitImage draws from. */
export interface FitBox {
    width: number;
    height: number;
    sx: number;
    sy: number;
    sw: number;
    sh: number;
}

/**
 * Works out how to draw a picture cropped to an aspect from its center and scaled so its longer side is at most maxSize. It never scales up.
 * Internal to the web components.
 *
 * @param width the picture's width
 * @param height the picture's height
 * @param opts { aspect: width over height, such as 1 for square [optional], maxSize: the longest side in pixels [optional] }
 * @returns { width, height, sx, sy, sw, sh }, the canvas size and the source rectangle
 */
export function fitBox(width: number, height: number, opts: FitOptions): FitBox {
    var sw = width;
    var sh = height;
    var aspect = opts.aspect && opts.aspect > 0 ? opts.aspect : 0;
    if (aspect) {
        if (width / height > aspect) sw = Math.round(height * aspect);
        else sh = Math.round(width / aspect);
    }
    var scale = opts.maxSize && opts.maxSize > 0 ? Math.min(1, opts.maxSize / Math.max(sw, sh)) : 1;
    return {
        width: Math.max(1, Math.round(sw * scale)),
        height: Math.max(1, Math.round(sh * scale)),
        sx: Math.round((width - sw) / 2),
        sy: Math.round((height - sh) / 2),
        sw: sw,
        sh: sh
    };
}

/**
 * Reads a canvas as a Blob.
 * Internal to the web components.
 *
 * @param canvas the canvas
 * @param type the image type (default 'image/png')
 * @param quality the quality from 0 to 1 for a lossy type [optional]
 * @returns a promise of the Blob, or null when the browser cannot make one
 */
export function canvasBlob(canvas: HTMLCanvasElement, type?: string, quality?: number): Promise<Blob | null> {
    return new Promise(function (resolve) {
        if (typeof canvas.toBlob !== 'function') { resolve(null); return; }
        try { canvas.toBlob(function (blob) { resolve(blob); }, type || 'image/png', quality); } catch (e) { resolve(null); }
    });
}

/**
 * Copies an image to the clipboard.
 * Internal to the web components.
 *
 * @param blob a PNG image
 * @returns a promise of whether the copy worked
 */
export function copyImage(blob: Blob | null): Promise<boolean> {
    var nav = typeof navigator !== 'undefined' ? navigator as Navigator & { clipboard?: { write?(items: unknown[]): Promise<void> } } : null;
    var Item = (window as unknown as { ClipboardItem?: new (items: Record<string, Blob>) => unknown }).ClipboardItem;
    if (!blob || !nav || !nav.clipboard || typeof nav.clipboard.write !== 'function' || typeof Item !== 'function') return Promise.resolve(false);
    var item = new Item({ 'image/png': blob });
    return nav.clipboard.write([item]).then(function () { return true; }, function () { return false; });
}
