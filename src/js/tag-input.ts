import { make, icon, listen, runAll, applyFieldSize } from './lib/dom.js';
import { renderChips, bindBackspaceRemove } from './lib/chips.js';
import { createFieldMessage } from './field-message.js';
import { bindValidation } from './lib/validate.js';
import type { ComponentHandle } from './types.js';
import { baseText } from './lib/base-text.js';

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
    size?: 'small' | 'medium' | 'large';
    validate?(tag: string): string | null | undefined;
    onChange?(values: string[]): void;
}

/** What createTagInput returns. add returns true when the tag was added. */
export interface TagInputHandle extends ComponentHandle {
    input: HTMLInputElement;
    getValue(): string[];
    setValue(next: unknown[] | null): void;
    add(raw: unknown): boolean;
    setSize(size?: 'small' | 'medium' | 'large'): void;
    destroy(): void;
}

/**
 * A free form tag field. The user types a tag and presses Enter or comma to add it, Backspace on an empty input removes the last tag, a removed tag passes focus to the next remove button or the input, and a pasted list that has commas is split into tags. The tags use the base-tag-pill style, and a search icon sits at the box's trailing end.
 *
 * @param options {
 *   values        : array of strings [optional]
 *   placeholder   : a valid example tag [optional]
 *   inputLabel    : aria-label of the input (default 'New tag')
 *   removeLabel   : title and aria-label of a remove button, where {value} is the tag (default 'Remove {value}')
 *   duplicateText : message for a repeated tag (default 'Already added.')
 *   limitText     : message when maxTags is reached (default 'No more tags can be added.')
 *   separators    : keys that add a tag, besides Enter, where a one character key also splits typed and pasted text (default [','])
 *   duplicates    : true allows the same tag twice (default false)
 *   addOnBlur     : true adds the typed text when the input loses focus (default true)
 *   maxTags       : most tags allowed [optional]
 *   size          : 'small', 'medium', or 'large' for its fields (default 'medium')
 *   validate      : function(tag) returning an error sentence, or an empty value when valid, checked through the validation core [optional]
 *   onChange      : function(values) [optional]
 * }
 * @returns { element, input, getValue, setValue, add, setSize, destroy }. add(tag) returns true when the tag was added.
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

    var root = make('div', 'base-tag-input');
    applyFieldSize(root, options.size);
    var box = make('div', 'base-tag-input-box');
    var tags = make('div', 'base-tags');
    var input = make('input', 'base-tag-input-field', { type: 'text', 'aria-label': options.inputLabel || baseText('Base.NewTag'), autocomplete: 'off' });
    if (options.placeholder) input.setAttribute('placeholder', options.placeholder);
    var message = createFieldMessage({ input: input });
    var searchIcon = icon('search');
    searchIcon.classList.add('base-adorned-icon');
    box.appendChild(tags);
    box.appendChild(input);
    box.appendChild(searchIcon);
    root.appendChild(box);
    root.appendChild(message.element);

    function render(): void {
        renderChips(tags, { labels: values, removeText: options!.removeLabel || baseText('Base.RemoveValue'), pill: true, input: input, onRemove: removeAt });
    }

    function changed(): void {
        render();
        if (options!.onChange) options!.onChange(values.slice());
    }

    function removeAt(index: number): void {
        values.splice(index, 1);
        validation.clear();
        changed();
    }

    // Why a tag cannot be added, or '' when it can.
    function problemOf(tag: string): string {
        if (!tag) return '';
        if (options!.maxTags && values.length >= options!.maxTags) return options!.limitText || baseText('Base.TagsFull');
        if (!options!.duplicates && values.indexOf(tag) !== -1) return options!.duplicateText || baseText('Base.AlreadyAdded');
        return options!.validate ? options!.validate(tag) || '' : '';
    }

    function add(raw: unknown): boolean {
        var tag = String(raw === undefined || raw === null ? '' : raw).trim();
        if (!tag) return false;
        var problem = problemOf(tag);
        if (problem) { validation.show(problem); return false; }
        values.push(tag);
        validation.clear();
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
        }
    }));
    cleanups.push(bindBackspaceRemove(input, function () { return values.length; }, function () { removeAt(values.length - 1); }));
    cleanups.push(listen(input, 'input', function () {
        if (marks.length && splitter.test(input.value)) commit();
    }));
    cleanups.push(listen(input, 'blur', function () { if (options.addOnBlur !== false && input.value.trim() !== '') commit(); }));
    // The typed text is checked as a tag, after a blur has tried to add it, and again as it changes while an error shows.
    var validation = bindValidation(input, { message: message, validate: function (text) { return problemOf(text.trim()); } });
    cleanups.push(validation.destroy);
    cleanups.push(listen(box, 'click', function (e: MouseEvent) { if (e.target === box || e.target === tags) input.focus(); }));

    values = (options.values || []).map(String);
    render();

    return {
        element: root,
        input: input,
        getValue: function () { return values.slice(); },
        setValue: function (next: unknown[] | null): void { values = (next || []).map(String); validation.clear(); render(); },
        add: add,
        setSize: function (size?: 'small' | 'medium' | 'large') { applyFieldSize(root, size); },
        destroy: function () { runAll(cleanups); message.destroy(); }
    };
}
