import { make, icon, iconButton, listen, runAll, claimEscape } from './dom-util.js';
import { debounce } from './core.js';
import type { ComponentHandle } from './types.js';

/** What createSearchField takes. onInput runs after typing stops for delay milliseconds, and onSearch on Enter. */
export interface SearchFieldOptions {
    value?: string;
    placeholder?: string;
    label?: string;
    clearLabel?: string;
    delay?: number;
    onInput?(value: string): void;
    onSearch?(value: string): void;
}

/** What createSearchField returns. setValue does not call onInput. */
export interface SearchFieldHandle extends ComponentHandle {
    input: HTMLInputElement;
    getValue(): string;
    setValue(text?: string): void;
    focus(): void;
    destroy(): void;
}

/**
 * A search input with a clear button that shows while it has text. Escape clears it, and clearing returns focus to the input.
 *
 * @param options {
 *   value       : first text [optional]
 *   placeholder : a valid example search [optional]
 *   label       : aria-label of the input (default 'Search')
 *   clearLabel  : title and aria-label of the clear button (default 'Clear')
 *   delay       : milliseconds to wait after typing before onInput runs (default 250)
 *   onInput     : function(value) called after typing stops, and after a clear [optional]
 *   onSearch    : function(value) called at once on Enter [optional]
 * }
 * @returns { element, input, getValue, setValue, focus, destroy }. setValue does not call onInput.
 */
export function createSearchField(options?: SearchFieldOptions): SearchFieldHandle {
    options = options || {};
    var cleanups: Array<() => void> = [];

    var root = make('div', 'jpk-search');
    root.appendChild(icon('search'));
    var input = make('input', '', { type: 'search', 'aria-label': options.label || 'Search', autocomplete: 'off' });
    if (options.placeholder) input.setAttribute('placeholder', options.placeholder);
    input.value = options.value || '';
    var clearButton = iconButton('jpk-row-btn jpk-search-clear', 'close', options.clearLabel || 'Clear');
    root.appendChild(input);
    root.appendChild(clearButton);

    var run = debounce(function () { if (options.onInput) options.onInput(input.value); }, options.delay === undefined ? 250 : options.delay);

    function reflect(): void {
        clearButton.hidden = input.value === '';
        claimEscape(input, input.value !== '');
    }

    function clearText(): void {
        input.value = '';
        reflect();
        run();
        input.focus();
    }

    cleanups.push(listen(input, 'input', function () { reflect(); run(); }));
    cleanups.push(listen(input, 'keydown', function (e: KeyboardEvent) {
        if (e.key === 'Enter') { if (options.onSearch) options.onSearch(input.value); }
        else if (e.key === 'Escape' && input.value !== '') { e.preventDefault(); clearText(); }
    }));
    cleanups.push(listen(clearButton, 'click', clearText));
    reflect();

    return {
        element: root,
        input: input,
        getValue: function () { return input.value; },
        setValue: function (text?: string) { input.value = text || ''; reflect(); },
        focus: function () { input.focus(); },
        destroy: function () { run.cancel(); runAll(cleanups); }
    };
}
