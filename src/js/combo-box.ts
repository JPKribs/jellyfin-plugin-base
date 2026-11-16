import { createTypeahead } from './lib/typeahead.js';
import { listen, runAll, applyFieldSize, matchesText, toText } from './lib/dom.js';
import type { ComboBoxItem, ComboBoxOptions, ComboBoxHandle, ComponentHandle } from './types.js';

/** The sentences a searchable combo box shows under its input, besides ComboBoxOptions. */
export interface ComboBoxMessages {
    noResultsText?: string;
    errorText?: string;
}

/**
 * Builds a text input with a floating results dropdown for one searchable value. The bag calls it as shared.createSearchableComboBox.
 *
 * @param options { placeholder, searchFn(query, callback), onSelect(value, item), onInput, size, noResultsText, errorText }, where size is 'small', 'medium', or 'large' for its fields (default 'medium'), noResultsText shows when a search finds nothing (default 'No matches.'), and errorText when searchFn throws (default 'Could not search.')
 */
export function createSearchableComboBox(options: ComboBoxOptions & ComboBoxMessages): ComboBoxHandle {
    var cleanups: Array<() => void> = [];
    var selectedValue: unknown = null;

    function itemLabel(item: ComboBoxItem): string { return item && typeof item === 'object' ? (item.label != null ? item.label : String(item.value)) : String(item); }
    function itemValue(item: ComboBoxItem): unknown { return item && typeof item === 'object' ? item.value : item; }

    var typeahead = createTypeahead<ComboBoxItem>({
        placeholder: options.placeholder,
        noResultsText: options.noResultsText,
        errorText: options.errorText,
        source: function (query, answer) { options.searchFn(query, answer); },
        render: function (item, option) { option.textContent = itemLabel(item); },
        onChoose: function (item) {
            selectedValue = itemValue(item);
            input.value = itemLabel(item);
            if (options.onSelect) options.onSelect(selectedValue, item);
        }
    });
    var container = typeahead.element;
    var input = typeahead.input;
    applyFieldSize(container, options.size);
    container.appendChild(typeahead.status);
    cleanups.push(listen(input, 'input', function () {
        selectedValue = null;
        if (options.onInput) options.onInput();
    }));

    return {
        element: container,
        getValue: function () { return selectedValue != null ? selectedValue : input.value; },
        setValue: function (val: any) { input.value = val || ''; selectedValue = val || null; },
        destroy: function () { runAll(cleanups); typeahead.destroy(); }
    };
}

/** What createComboBox takes. suggestions are offered under the field, and searchFn answers each query in their place. The value is whatever is typed or picked. */
export interface ComboBoxFieldOptions {
    value?: string | null;
    suggestions?: ComboBoxItem[];
    searchFn?(query: string, callback: (results: ComboBoxItem[] | null) => void): void;
    placeholder?: string;
    maxResults?: number;
    size?: 'small' | 'medium' | 'large';
    errorText?: string;
    onChange?(value: string): void;
}

/** What createComboBox returns. setValue does not call onChange. */
export interface ComboBoxFieldHandle extends ComponentHandle {
    input: HTMLInputElement;
    getValue(): string;
    setValue(value: string | null | undefined): void;
    setSuggestions(list: ComboBoxItem[] | null | undefined): void;
    destroy(): void;
}

/**
 * A text field with suggestions, for one value that may be anything typed. Focus or typing lists the suggestions that
 * match, and a pick puts its value in the field. It shows no search icon and no sentence when nothing matches, since
 * any text is a value, in place of a plain datalist.
 *
 * @param options {
 *   value       : the starting text [optional]
 *   suggestions : the values offered, as strings or { value, label } pairs, where a pick puts the value in the field [optional]
 *   searchFn    : function(query, callback) calling callback([{ value, label }]), an async source in place of suggestions [optional]
 *   placeholder : input placeholder [optional]
 *   maxResults  : most suggestions shown (default 50)
 *   size        : 'small', 'medium', or 'large' for its field (default 'medium')
 *   errorText   : sentence shown when searchFn throws (default 'Could not search.')
 *   onChange    : function(value) after a pick, or after typing changes the text [optional]
 * }
 * @returns { element, input, getValue, setValue, setSuggestions, destroy }
 */
export function createComboBox(options?: ComboBoxFieldOptions): ComboBoxFieldHandle {
    var opts = options || {};
    var suggestions = opts.suggestions || [];
    var cleanups: Array<() => void> = [];

    function itemLabel(item: ComboBoxItem): string { return item && typeof item === 'object' ? (item.label != null ? item.label : toText(item.value)) : toText(item); }
    function itemValue(item: ComboBoxItem): string { return item && typeof item === 'object' ? toText(item.value) : toText(item); }

    var typeahead = createTypeahead<ComboBoxItem>({
        placeholder: opts.placeholder,
        maxResults: opts.maxResults || 50,
        openOnFocus: true,
        glyph: false,
        quiet: true,
        errorText: opts.errorText,
        source: function (query, answer) {
            if (typeof opts.searchFn === 'function') { opts.searchFn(query, answer); return; }
            answer(suggestions.filter(function (item) {
                return matchesText({ label: itemLabel(item), value: itemValue(item) }, query, ['label', 'value']);
            }));
        },
        // A suggestion that is already the whole value adds nothing.
        accept: function (item): boolean { return itemValue(item) !== input.value || !input.value; },
        render: function (item, option) { option.textContent = itemLabel(item); },
        onChoose: function (item) {
            input.value = itemValue(item);
            if (opts.onChange) opts.onChange(input.value);
        }
    });
    var input: HTMLInputElement = typeahead.input;
    var container: HTMLDivElement = typeahead.element;
    applyFieldSize(container, opts.size);
    container.appendChild(typeahead.status);
    input.value = opts.value || '';
    cleanups.push(listen(input, 'input', function () { if (opts.onChange) opts.onChange(input.value); }));

    return {
        element: container,
        input: input,
        getValue: function () { return input.value; },
        setValue: function (value) { input.value = value == null ? '' : String(value); },
        setSuggestions: function (list) { suggestions = list || []; },
        destroy: function () { runAll(cleanups); typeahead.destroy(); }
    };
}
