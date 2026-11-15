import { make, icon, iconButton, nextId, listen, runAll, clear, fill } from './dom-util.js';
import { createFieldMessage } from './field-message.js';
import type { ComponentHandle } from './types.js';

/** What createFilePicker takes. Files that do not match accept or maxSize are refused with a message. */
export interface FilePickerOptions {
    accept?: string;
    maxSize?: number;
    multiple?: boolean;
    dropText?: string;
    removeLabel?: string;
    typeText?: string;
    sizeLimitText?: string;
    singleText?: string;
    onChange?(files: File[]): void;
    onError?(messages: string[]): void;
}

/** What createFilePicker returns. getValue returns a copy of the chosen File objects. */
export interface FilePickerHandle extends ComponentHandle {
    input: HTMLInputElement;
    getValue(): File[];
    setValue(next?: File[] | null): void;
    clear(): void;
    destroy(): void;
}

// Formats a byte count for a message, such as 2 MB.
function sizeText(bytes: number): string {
    if (bytes >= 1048576) return Math.round(bytes / 104857.6) / 10 + ' MB';
    if (bytes >= 1024) return Math.round(bytes / 102.4) / 10 + ' KB';
    return bytes + ' B';
}

// Tells whether a file matches an accept list such as "image/*,.png,application/json".
function accepts(accept: string | undefined, file: File): boolean {
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
 * A drop zone that is also a button. The user clicks it, presses Enter or Space, or drops files on it. Files that do not match accept or maxSize are refused with a message, and the rest are listed with a Remove button.
 *
 * @param options {
 *   accept       : accept list such as 'image/*,.png' [optional]
 *   maxSize      : most bytes one file may have [optional]
 *   multiple     : true allows several files (default false)
 *   dropText     : text in the zone (default 'Drop files here or click to choose.')
 *   removeLabel  : aria-label of a remove button, where {value} is the file name (default 'Remove {value}')
 *   typeText     : message for a file of the wrong type, where {value} is its name (default '{value} is not an accepted type.')
 *   sizeLimitText: message for a file over maxSize, where {value} is its name (default '{value} is larger than the size limit.')
 *   singleText   : message when several files were dropped and multiple is off (default 'Choose one file.')
 *   onChange     : function(files) called with the File objects after each change [optional]
 *   onError      : function(messages) called with the refusal messages [optional]
 * }
 * @returns { element, input, getValue, setValue, clear, destroy }. getValue returns an array of File objects. The size limit follows the size message in parentheses, such as (2 MB).
 */
export function createFilePicker(options?: FilePickerOptions): FilePickerHandle {
    options = options || {};
    var files: File[] = [];
    var cleanups: Array<() => void> = [];

    var root = make('div', 'jpk-file-picker');
    var zone = make('div', 'jpk-file-zone', { role: 'button', tabindex: '0' });
    zone.id = nextId('file');
    zone.appendChild(icon('upload_file'));
    var zoneText = make('span', 'jpk-file-text', null, options.dropText || 'Drop files here or click to choose.');
    zone.appendChild(zoneText);
    zone.setAttribute('aria-label', zoneText.textContent);
    var input = make('input', 'jpk-sr-only', { type: 'file', tabindex: '-1', 'aria-hidden': 'true' });
    if (options.accept) input.setAttribute('accept', options.accept);
    if (options.multiple) input.setAttribute('multiple', '');
    var list = make('ul', 'jpk-file-list');
    var message = createFieldMessage();
    root.appendChild(zone);
    root.appendChild(input);
    root.appendChild(list);
    root.appendChild(message.element);

    function render(): void {
        clear(list);
        files.forEach(function (file, index) {
            var row = make('li', 'jpk-file-item');
            row.appendChild(make('span', 'jpk-file-name', null, file.name));
            row.appendChild(make('span', 'jpk-file-size', null, sizeText(file.size)));
            var remove = iconButton('jpk-row-btn jpk-file-remove', 'close', fill(options!.removeLabel || 'Remove {value}', file.name));
            remove.addEventListener('click', function () {
                files.splice(index, 1);
                message.clear();
                changed();
                var removes = list.querySelectorAll<HTMLElement>('.jpk-file-remove');
                (removes[Math.min(index, removes.length - 1)] || zone).focus();
            });
            row.appendChild(remove);
            list.appendChild(row);
        });
    }

    function changed(): void {
        render();
        if (options!.onChange) options!.onChange(files.slice());
    }

    // Takes a list of File objects from the input or a drop, keeps the good ones, and reports the rest.
    function take(incoming: FileList | File[] | null | undefined): void {
        var list: File[] = Array.prototype.slice.call(incoming || []);
        var problems: string[] = [];
        if (!options!.multiple && list.length > 1) {
            problems.push(options!.singleText || 'Choose one file.');
            list = list.slice(0, 1);
        }
        var good = list.filter(function (file) {
            if (!accepts(options!.accept, file)) { problems.push(fill(options!.typeText || '{value} is not an accepted type.', file.name)); return false; }
            if (options!.maxSize && file.size > options!.maxSize) { problems.push(fill(options!.sizeLimitText || '{value} is larger than the size limit.', file.name) + ' (' + sizeText(options!.maxSize) + ')'); return false; }
            return true;
        });
        if (good.length) files = options!.multiple ? files.concat(good) : good.slice(0, 1);
        message.set(problems.length ? 'error' : '', problems.join(' '));
        if (problems.length && options!.onError) options!.onError(problems);
        if (good.length) changed();
    }

    cleanups.push(listen(zone, 'click', function () { input.click(); }));
    cleanups.push(listen(zone, 'keydown', function (e: KeyboardEvent) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
    }));
    cleanups.push(listen(input, 'change', function () { take(input.files); input.value = ''; }));
    cleanups.push(listen(zone, 'dragover', function (e: DragEvent) { e.preventDefault(); zone.classList.add('dragover'); }));
    cleanups.push(listen(zone, 'dragleave', function () { zone.classList.remove('dragover'); }));
    cleanups.push(listen(zone, 'drop', function (e: DragEvent) {
        e.preventDefault();
        zone.classList.remove('dragover');
        take(e.dataTransfer && e.dataTransfer.files);
    }));

    return {
        element: root,
        input: input,
        getValue: function () { return files.slice(); },
        setValue: function (next?: File[] | null) { files = (next || []).slice(); if (!options.multiple) files = files.slice(0, 1); message.clear(); render(); },
        clear: function () { files = []; message.clear(); changed(); },
        destroy: function () { runAll(cleanups); message.destroy(); }
    };
}
