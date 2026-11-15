import { make, listen, runAll, clear, fill } from './dom-util.js';
import { createFieldMessage } from './field-message.js';
import type { ComponentHandle } from './types.js';

/** What createTagInput takes. validate returns an error sentence for a bad tag, and onChange hears the tags after each change. */
export interface TagInputOptions {
    values?: unknown[];
    placeholder?: string;
    inputLabel?: string;
    removeLabel?: string;
    duplicateText?: string;
    limitText?: string;
    separators?: string[];
    duplicates?: boolean;
    addOnBlur?: boolean;
    maxTags?: number;
    validate?(tag: string): string | null | undefined;
    onChange?(values: string[]): void;
}

/** What createTagInput returns. add returns true when the tag was added. */
export interface TagInputHandle extends ComponentHandle {
    input: HTMLInputElement;
    getValue(): string[];
    setValue(next: unknown[] | null): void;
    add(raw: unknown): boolean;
    destroy(): void;
}

/**
 * A free form tag field. The user types a tag and presses Enter or comma to add it, Backspace on an empty input removes the last tag, and a pasted list that has commas is split into tags. The tags use the jpk-tag-pill style.
 *
 * @param options {
 *   values        : array of strings [optional]
 *   placeholder   : a valid example tag [optional]
 *   inputLabel    : aria-label of the input (default 'New Tag')
 *   removeLabel   : aria-label of a remove button, where {value} is the tag (default 'Remove {value}')
 *   duplicateText : message for a repeated tag (default 'Already added.')
 *   limitText     : message when maxTags is reached (default 'No more tags can be added.')
 *   separators    : keys that add a tag, besides Enter, where a one character key also splits typed and pasted text (default [','])
 *   duplicates    : true allows the same tag twice (default false)
 *   addOnBlur     : true adds the typed text when the input loses focus (default true)
 *   maxTags       : most tags allowed [optional]
 *   validate      : function(tag) returning an error sentence, or an empty value when valid [optional]
 *   onChange      : function(values) [optional]
 * }
 * @returns { element, input, getValue, setValue, add, destroy }. add(tag) returns true when the tag was added.
 */
export function createTagInput(options?: TagInputOptions): TagInputHandle {
    options = options || {};
    var values: string[] = [];
    var cleanups: Array<() => void> = [];
    var separators = options.separators || [','];
    // Only a key that types one character can also split pasted or typed text.
    var marks = separators.filter(function (key) { return typeof key === 'string' && key.length === 1; });
    var splitter = new RegExp('[' + marks.map(function (m) { return '\\u' + ('0000' + m.charCodeAt(0).toString(16)).slice(-4); }).join('') + ']');
    var glue = marks.length && marks[0] !== ' ' ? marks[0] + ' ' : ' ';

    var root = make('div', 'jpk-tag-input');
    var box = make('div', 'jpk-tag-input-box');
    var tags = make('div', 'jpk-tags');
    var input = make('input', 'jpk-tag-input-field', { type: 'text', 'aria-label': options.inputLabel || 'New Tag', autocomplete: 'off' });
    if (options.placeholder) input.setAttribute('placeholder', options.placeholder);
    var message = createFieldMessage({ input: input });
    box.appendChild(tags);
    box.appendChild(input);
    root.appendChild(box);
    root.appendChild(message.element);

    function render(): void {
        clear(tags);
        values.forEach(function (value, index) {
            var chip = make('span', 'jpk-tag jpk-tag-pill', null, value);
            var remove = make('button', 'jpk-tag-remove', { type: 'button', 'aria-label': fill(options!.removeLabel || 'Remove {value}', value) }, 'x');
            remove.addEventListener('click', function () { removeAt(index); input.focus(); });
            chip.appendChild(remove);
            tags.appendChild(chip);
        });
    }

    function changed(): void {
        render();
        if (options!.onChange) options!.onChange(values.slice());
    }

    function removeAt(index: number): void {
        values.splice(index, 1);
        message.clear();
        changed();
    }

    function add(raw: unknown): boolean {
        var tag = String(raw === undefined || raw === null ? '' : raw).trim();
        if (!tag) return false;
        if (options!.maxTags && values.length >= options!.maxTags) { message.set('error', options!.limitText || 'No more tags can be added.'); return false; }
        if (!options!.duplicates && values.indexOf(tag) !== -1) { message.set('error', options!.duplicateText || 'Already added.'); return false; }
        var problem = options!.validate ? options!.validate(tag) : '';
        if (problem) { message.set('error', problem); return false; }
        values.push(tag);
        message.clear();
        changed();
        return true;
    }

    // Adds each piece of the typed text between separators and keeps the text that was refused.
    function commit(): void {
        var pieces = input.value.split(splitter);
        var kept = pieces.filter(function (piece) { return piece.trim() !== '' && !add(piece); });
        input.value = kept.map(function (piece) { return piece.trim(); }).join(glue);
    }

    cleanups.push(listen(input, 'keydown', function (e: KeyboardEvent) {
        if (e.key === 'Enter' || separators.indexOf(e.key) !== -1) {
            e.preventDefault();
            commit();
        } else if (e.key === 'Backspace' && input.value === '' && values.length) {
            removeAt(values.length - 1);
        }
    }));
    cleanups.push(listen(input, 'input', function () {
        if (marks.length && splitter.test(input.value)) commit();
        else if (message.getValue().state) message.clear();
    }));
    cleanups.push(listen(input, 'blur', function () { if (options.addOnBlur !== false && input.value.trim() !== '') commit(); }));
    cleanups.push(listen(box, 'click', function (e: MouseEvent) { if (e.target === box || e.target === tags) input.focus(); }));

    values = (options.values || []).map(String);
    render();

    return {
        element: root,
        input: input,
        getValue: function () { return values.slice(); },
        setValue: function (next: unknown[] | null): void { values = (next || []).map(String); message.clear(); render(); },
        add: add,
        destroy: function () { runAll(cleanups); message.destroy(); }
    };
}
