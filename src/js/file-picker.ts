import { make, icon, iconButton, nextId, fill, focusAfterRemove } from './lib/dom.js';
import { createFieldMessage } from './field-message.js';
import { createList, fillRowParts } from './list.js';
import { sizeText } from './lib/file.js';
import { bindFileInput, checkFile } from './lib/file-intake.js';
import type { ComponentHandle } from './types.js';
import { baseText } from './lib/base-text.js';

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

/**
 * A drop zone that is also a button. The user clicks it, presses Enter or Space, or drops files on it. Files that do not match accept or maxSize are refused with a message, and the rest are listed with a Remove button.
 *
 * @param options {
 *   accept       : accept list such as 'image/*,.png' [optional]
 *   maxSize      : most bytes one file may have [optional]
 *   multiple     : true allows several files (default false)
 *   dropText     : text in the zone (default 'Drop files here or click to select.')
 *   removeLabel  : aria-label of a remove button, where {value} is the file name (default 'Remove {value}')
 *   typeText     : message for a file of the wrong type, where {value} is its name (default '{value} is not an accepted type.')
 *   sizeLimitText: message for a file over maxSize, where {value} is its name (default '{value} is larger than the size limit.')
 *   singleText   : message when several files were dropped and multiple is off (default 'Select one file.')
 *   onChange     : function(files) called with the File objects after each change [optional]
 *   onError      : function(messages) called with the refusal messages [optional]
 * }
 * @returns { element, input, getValue, setValue, clear, destroy }. getValue returns an array of File objects. The size limit follows the size message in parentheses, such as (2 MB).
 */
export function createFilePicker(options?: FilePickerOptions): FilePickerHandle {
    options = options || {};
    var files: File[] = [];

    var root = make('div', 'base-file-picker');
    var zone = make('div', 'base-file-zone base-icon-text', { role: 'button', tabindex: '0' });
    zone.id = nextId('file');
    zone.appendChild(icon('upload_file'));
    var zoneText = make('span', 'base-file-text', null, options.dropText || baseText('Base.DropFiles'));
    zone.appendChild(zoneText);
    zone.setAttribute('aria-label', zoneText.textContent);
    var intake = bindFileInput({ trigger: zone, dropTarget: zone, accept: options.accept, multiple: options.multiple, onFiles: take });
    var input = intake.input;
    var list = make('ul', 'base-file-list');
    var message = createFieldMessage();
    root.appendChild(zone);
    root.appendChild(input);
    root.appendChild(list);
    root.appendChild(message.element);

    function renderRow(file: File, index: number): HTMLLIElement {
        var row = make('li', 'base-file-item base-item-row');
        // The name and the size are the row's two parts, so every size starts at one place down the list.
        var text = make('span', 'base-item-row-text');
        fillRowParts(text, { primary: file.name, secondary: sizeText(file.size) });
        text.children[0].classList.add('base-file-name');
        if (text.children[1]) text.children[1].classList.add('base-file-size');
        row.appendChild(text);
        var remove = iconButton('base-row-btn base-file-remove', 'close', fill(options!.removeLabel || baseText('Base.RemoveValue'), file.name));
        remove.addEventListener('click', function () {
            files.splice(index, 1);
            message.clear();
            changed();
            focusAfterRemove(list.querySelectorAll<HTMLElement>('.base-file-remove'), index, zone);
        });
        row.appendChild(remove);
        return row;
    }

    // The list keeps the ul and its li rows, and shows no empty sentence, since the zone above says what to do.
    var rows = createList<File>({
        element: list,
        layout: 'plain',
        wrap: false,
        role: null,
        emptyText: null,
        render: renderRow
    });

    function render(): void {
        rows.setItems(files);
    }

    function changed(): void {
        render();
        if (options!.onChange) options!.onChange(files.slice());
    }

    // Takes a list of File objects from the input or a drop, keeps the good ones, and reports the rest.
    function take(incoming: File[]): void {
        var picked: File[] = incoming;
        var problems: string[] = [];
        if (!options!.multiple && picked.length > 1) {
            problems.push(options!.singleText || baseText('Base.SelectOneFile'));
            picked = picked.slice(0, 1);
        }
        var good = picked.filter(function (file) {
            var problem = checkFile(file, {
                accept: options!.accept,
                maxBytes: options!.maxSize,
                typeText: options!.typeText || baseText('Base.NotAcceptedType'),
                sizeLimitText: options!.sizeLimitText || baseText('Base.LargerThanLimit')
            });
            if (problem) problems.push(problem);
            return !problem;
        });
        if (good.length) files = options!.multiple ? files.concat(good) : good.slice(0, 1);
        message.set(problems.length ? 'error' : '', problems.join(' '));
        if (problems.length && options!.onError) options!.onError(problems);
        if (good.length) changed();
    }

    return {
        element: root,
        input: input,
        getValue: function () { return files.slice(); },
        setValue: function (next?: File[] | null) { files = (next || []).slice(); if (!options.multiple) files = files.slice(0, 1); message.clear(); render(); },
        clear: function () { files = []; message.clear(); changed(); },
        destroy: function () { intake.destroy(); message.destroy(); rows.destroy(); }
    };
}
