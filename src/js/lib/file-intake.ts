// file-intake.ts
// The hidden file input, trigger, drop and paste target, and file checks that the file picker and the image picker share. None of them is exported from the bundle.

import { make, listen, runAll, fillAll } from './dom.js';
import { sizeText, accepts } from './file.js';

/** What bindFileInput takes. trigger opens the file chooser, and dropTarget, when given, also takes dropped and pasted files. */
export interface FileInputOptions {
    trigger: HTMLElement;
    dropTarget?: HTMLElement | null;
    accept?: string;
    multiple?: boolean;
    onFiles(files: File[]): void;
}

/** What bindFileInput returns. input is the hidden file input, which the caller places in its markup. */
export interface FileInputHandle {
    input: HTMLInputElement;
    destroy(): void;
}

/** What checkFile takes. In both messages {name} is the file name and {limit} the size limit, and {value} is the name, or the limit in sizeLimitText when sizeValue is 'limit'. */
export interface FileRules {
    accept?: string;
    maxBytes?: number;
    typeText: string;
    sizeLimitText: string;
    sizeValue?: 'name' | 'limit';
}

/**
 * Builds a hidden file input that the trigger opens with a click, Enter, or Space, and that hands the chosen files to onFiles and then resets, so the same file can be chosen again.
 * A dropTarget takes dropped files the same way and carries the dragover class while files are over it, and files pasted while it or the trigger has focus go to onFiles too.
 *
 * @param opts { trigger, dropTarget [optional], accept [optional], multiple (default false), onFiles(files) }
 * @returns { input, destroy }.
 */
export function bindFileInput(opts: FileInputOptions): FileInputHandle {
    var cleanups: Array<() => void> = [];
    var input = make('input', 'base-sr-only', { type: 'file', tabindex: '-1', 'aria-hidden': 'true' });
    if (opts.accept) input.setAttribute('accept', opts.accept);
    if (opts.multiple) input.setAttribute('multiple', '');

    function take(list: FileList | null | undefined): void {
        var files: File[] = Array.prototype.slice.call(list || []);
        if (files.length) opts.onFiles(files);
    }

    cleanups.push(listen(opts.trigger, 'click', function () { input.click(); }));
    // A real button already turns Enter and Space into a click.
    if (opts.trigger.tagName !== 'BUTTON') {
        cleanups.push(listen(opts.trigger, 'keydown', function (e: KeyboardEvent) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
        }));
    }
    cleanups.push(listen(input, 'change', function () {
        var list = input.files;
        input.value = '';
        take(list);
    }));
    var target = opts.dropTarget;
    if (target) {
        cleanups.push(listen(target, 'dragover', function (e: DragEvent) { e.preventDefault(); target!.classList.add('dragover'); }));
        cleanups.push(listen(target, 'dragleave', function () { target!.classList.remove('dragover'); }));
        cleanups.push(listen(target, 'drop', function (e: DragEvent) {
            e.preventDefault();
            target!.classList.remove('dragover');
            take(e.dataTransfer && e.dataTransfer.files);
        }));
    }
    // Pasted files, such as a copied screenshot, go in like dropped ones. Pasted text is left alone.
    function onPaste(e: ClipboardEvent): void {
        var list = e.clipboardData && e.clipboardData.files;
        if (!list || !list.length) return;
        e.preventDefault();
        take(list);
    }
    if (target) cleanups.push(listen(target, 'paste', onPaste));
    if (!target || !target.contains(opts.trigger)) cleanups.push(listen(opts.trigger, 'paste', onPaste));

    return {
        input: input,
        destroy: function () { runAll(cleanups); }
    };
}

/**
 * Checks a file against an accept list and a size limit.
 * A size message that does not place {limit}, or {value} as the limit, gets the limit after it in parentheses, so the message always names it.
 *
 * @param file the file to check
 * @param rules { accept, maxBytes, typeText, sizeLimitText, sizeValue (default 'name') }
 * @returns the refusal message, or null when the file passes.
 */
export function checkFile(file: File, rules: FileRules): string | null {
    var name = String(file.name || '');
    if (!accepts(rules.accept, file)) return fillAll(rules.typeText, { value: name, name: name });
    if (!rules.maxBytes || file.size <= rules.maxBytes) return null;
    var limit = sizeText(rules.maxBytes);
    var byLimit = rules.sizeValue === 'limit';
    var text = fillAll(rules.sizeLimitText, { value: byLimit ? limit : name, name: name, limit: limit });
    var placed = /\{limit\}/.test(rules.sizeLimitText) || (byLimit && /\{value\}/.test(rules.sizeLimitText));
    return placed ? text : text + ' (' + limit + ')';
}
