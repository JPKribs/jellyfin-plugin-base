import { createTypeahead } from './lib/typeahead.js';
import { listen, runAll, applyFieldSize } from './lib/dom.js';
import type { ComboBoxItem, ComboBoxOptions, ComboBoxHandle } from './types.js';

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
