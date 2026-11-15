// file.ts
// File helpers that the file picker and the image picker share. None of them is exported from the bundle.

import { formatBytes } from './dom.js';

/** Formats a byte count for a message, the same way the bag's formatSize does. */
export var sizeText = formatBytes;

/** Tells whether a file matches an accept list such as "image/*,.png,application/json". */
export function accepts(accept: string | undefined, file: File): boolean {
    var tokens = String(accept || '').split(',').map(function (t) { return t.trim().toLowerCase(); }).filter(Boolean);
    if (!tokens.length) return true;
    var name = String(file.name || '').toLowerCase();
    var type = String(file.type || '').toLowerCase();
    return tokens.some(function (t) {
        if (t.charAt(0) === '.') return name.slice(-t.length) === t;
        if (t.slice(-2) === '/*') return type.indexOf(t.slice(0, -1)) === 0;
        return type === t;
    });
}

/**
 * Hands the browser a Blob to save under a file name, through a temporary link.
 * Internal to the web components.
 *
 * @param filename the name the file is saved under
 * @param blob the file's contents
 */
export function downloadBlob(filename: string, blob: Blob): void {
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.hidden = true;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(function () { URL.revokeObjectURL(url); }, 0);
}
