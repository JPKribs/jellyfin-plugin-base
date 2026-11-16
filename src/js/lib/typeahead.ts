import { make, clear, listen, runAll } from './dom.js';
import { bindComboAria } from './combo-aria.js';
import { anchorPopover } from './popover.js';
import { debounce } from '../browser-helpers.js';
import { adornField } from '../field-adornments.js';

/** A typeahead source. It answers a query with a list through answer, or calls fail, or throws. */
export type TypeaheadSource<T> = (query: string, answer: (list: T[] | null | undefined) => void, fail: () => void) => void;

/** What debouncedSource returns. A call asks the source after the delay, and cancel drops the wait and every answer still due. */
export interface DebouncedSource<T> {
    (query: string, answer: (list: T[] | null | undefined) => void, fail: () => void): void;
    cancel(): void;
}

/** What bindTypeahead takes. source answers a query, render fills one option, and onChoose hears a pick. */
export interface TypeaheadOptions<T> {
    source: TypeaheadSource<T>;
    render(item: T, option: HTMLDivElement): (() => void) | void;
    onChoose(item: T, index: number): void;
    accept?(item: T): boolean;
    onEnter?(query: string): void;
    onClose?(): void;
    container?: Element | null;
    optionClass?: string;
    maxResults?: number;
    minChars?: number;
    delay?: number;
    openOnFocus?: boolean;
    noResultsText?: string;
    errorText?: string;
    glyph?: boolean;
    quiet?: boolean;
}

/** What bindTypeahead returns. status is the live region the member places, and search runs a query after the delay. */
export interface TypeaheadHandle<T> {
    status: HTMLDivElement;
    search(query: string): void;
    close(): void;
    isOpen(): boolean;
    results(): T[];
    destroy(): void;
}

/** What createTypeahead takes, besides TypeaheadOptions. field is a search field to use in place of a plain text input. */
export interface TypeaheadFieldOptions<T> extends TypeaheadOptions<T> {
    placeholder?: string;
    field?: { element: HTMLElement; input: HTMLInputElement } | null;
    dropdownClass?: string;
}

/** What createTypeahead returns, the typeahead with the shell it built. */
export interface TypeaheadFieldHandle<T> extends TypeaheadHandle<T> {
    element: HTMLDivElement;
    input: HTMLInputElement;
    dropdown: HTMLDivElement;
}

/**
 * Wraps a source so each call asks it after the delay, and only the answer to the latest call arrives. A newer call, or cancel, drops every answer still due, and a source that throws fails.
 * Internal to the typeahead and the bag's createDebouncedSearch.
 *
 * @param source function(query, answer, fail) that answers with a list, or calls fail, or throws
 * @param delay milliseconds to wait after a call before the source runs, where 0 runs it at once (default 0)
 * @returns the wrapped source, with cancel.
 */
export function debouncedSource<T>(source: TypeaheadSource<T>, delay?: number): DebouncedSource<T> {
    var latest = 0;

    function run(mine: number, query: string, answer: (list: T[] | null | undefined) => void, fail: () => void): void {
        function failed(): void { if (mine === latest) fail(); }
        try {
            source(query, function (list) { if (mine === latest) answer(list); }, failed);
        } catch (err) {
            failed();
        }
    }

    var later = debounce(run, delay || 0);

    function ask(query: string, answer: (list: T[] | null | undefined) => void, fail: () => void): void {
        var mine = ++latest;
        // With no delay the source runs at once, so a fast source answers before the next key.
        if (delay) later(mine, query, answer, fail);
        else run(mine, query, answer, fail);
    }
    ask.cancel = function (): void { latest++; later.cancel(); };
    return ask;
}

/**
 * Turns a text input and its dropdown into a typeahead combobox, with a search icon at the input's trailing end unless it sits in a search field. The dropdown floats through anchorPopover, fixed to the viewport and as wide as the input's box, so a scrolling list or a dialog never clips it, it flips above with no room below, and it follows a scroll. It owns the arrow keys and Enter, a pick by mousedown that keeps focus in the input, Escape, blur, the outside click, minChars, and the no results and error sentences in a live status, and asks through debouncedSource.
 * Internal to createTypeahead.
 *
 * @param input the text input the user types in, already placed in its box
 * @param dropdown the base-combo-dropdown element, already placed beside the input
 * @param opts {
 *   source        : function(query, answer, fail) that answers with a list, or calls fail, or throws
 *   render        : function(item, option) that fills one option and may return its cleanup
 *   onChoose      : function(item, index) called when the user picks a result, before the dropdown closes
 *   accept        : function(item) that keeps a result in the dropdown [optional]
 *   onEnter       : function(query) called on Enter with no active option, which then never submits a form [optional]
 *   onClose       : function() called each time the dropdown closes [optional]
 *   container     : the element a click outside of closes the dropdown, and that takes Escape in the capture phase, so the first Escape closes the results before any other handler on the input (default the dropdown's parent)
 *   optionClass   : extra classes on each option [optional]
 *   maxResults    : most results shown [optional]
 *   minChars      : fewest characters of the trimmed query that start a search (default 0)
 *   delay         : milliseconds to wait after typing before the search runs (default 0)
 *   openOnFocus   : search when an empty input takes focus (default false)
 *   noResultsText : sentence shown when a search finds nothing (default 'No matches.')
 *   errorText     : sentence shown when a search fails (default 'Could not search.')
 *   glyph         : false leaves out the search icon, for a field whose results are only suggestions (default true)
 *   quiet         : true shows no sentence when a search finds nothing, for a field that takes any text (default false)
 * }
 */
export function bindTypeahead<T>(input: HTMLInputElement, dropdown: HTMLElement, opts: TypeaheadOptions<T>): TypeaheadHandle<T> {
    var aria = bindComboAria(input, dropdown);
    if (opts.glyph !== false) input.setAttribute('data-base-search', '');
    var adorned = adornField(input);
    var anchor = (input.parentNode as Element | null) || input;
    var container = opts.container || dropdown.parentElement || input;
    var minChars = opts.minChars || 0;
    var cleanups: Array<() => void> = [];
    var openCleanups: Array<() => void> = [];
    var results: T[] = [];
    var drops: Array<() => void> = [];
    var activeIndex = -1;
    var open = false;
    var ask = debouncedSource(opts.source, opts.delay || 0);
    var popover = anchorPopover(anchor, dropdown, {
        align: 'start',
        returnFocus: false,
        inside: [container],
        onDismiss: function () { close(); }
    });
    dropdown.hidden = true;

    var status = make('div', 'base-combo-message base-empty-inline', { role: 'status', 'aria-live': 'polite' });
    status.hidden = true;

    function say(text: string): void {
        status.textContent = text;
        status.hidden = !text;
    }

    // Keeps the dropdown as wide as the input's box, which the popover then places.
    function fit(): void {
        dropdown.style.setProperty('--base-combo-width', anchor.getBoundingClientRect().width + 'px');
    }

    function clearResults(): void {
        runAll(drops);
        results = [];
        activeIndex = -1;
        clear(dropdown);
    }

    function shut(): void {
        open = false;
        aria.setOpen(false);
        runAll(openCleanups);
        popover.close();
        if (opts.onClose) opts.onClose();
    }

    function close(): void {
        ask.cancel();
        clearResults();
        shut();
        // The status describes the text in the input, so it goes with that text.
        if (!input.value.trim()) say('');
    }

    function choose(index: number): void {
        var item = results[index];
        if (item === undefined) return;
        opts.onChoose(item, index);
        close();
    }

    function show(list: T[], query: string): void {
        clearResults();
        shut();
        results = list.filter(function (item) { return item != null && (!opts.accept || opts.accept(item)); });
        if (opts.maxResults) results = results.slice(0, opts.maxResults);
        if (!results.length) {
            say(query && !opts.quiet ? (opts.noResultsText || 'No matches.') : '');
            return;
        }
        say('');
        results.forEach(function (item, i) {
            var option = make('div', 'base-combo-option' + (opts.optionClass ? ' ' + opts.optionClass : ''));
            aria.option(option, i);
            var drop = opts.render(item, option);
            if (drop) drops.push(drop);
            drops.push(listen(option, 'mousedown', function (e: MouseEvent) {
                e.preventDefault();
                choose(i);
            }));
            dropdown.appendChild(option);
        });
        open = true;
        aria.setOpen(true);
        fit();
        // Added before the popover opens, so a resize sets the width before the popover places the box.
        openCleanups.push(listen(window, 'resize', fit));
        popover.open();
    }

    function failed(): void {
        clearResults();
        shut();
        say(opts.errorText || 'Could not search.');
    }

    function search(value: string): void {
        var query = (value || '').trim();
        if (query.length < minChars) {
            say('');
            close();
            return;
        }
        ask(query, function (list) { show(list || [], query); }, failed);
    }

    function highlight(delta: number): void {
        if (!results.length) return;
        activeIndex = (activeIndex + delta + results.length) % results.length;
        aria.activate(activeIndex);
    }

    cleanups.push(listen(input, 'input', function () { search(input.value); }));

    cleanups.push(listen(container, 'keydown', function (e: KeyboardEvent) {
        if (e.target !== input || e.key !== 'Escape') return;
        var wasOpen = open;
        close();
        if (!wasOpen) return;
        e.preventDefault();
        e.stopPropagation();
    }, true));

    cleanups.push(listen(input, 'keydown', function (e: KeyboardEvent) {
        if (e.key === 'ArrowDown') { e.preventDefault(); highlight(1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); highlight(-1); }
        else if (e.key === 'Enter' && activeIndex >= 0 && results[activeIndex] !== undefined) { e.preventDefault(); choose(activeIndex); }
        else if (e.key === 'Enter' && opts.onEnter) { e.preventDefault(); opts.onEnter(input.value); }
    }));

    cleanups.push(listen(input, 'blur', function () { ask.cancel(); }));

    if (opts.openOnFocus) cleanups.push(listen(input, 'focus', function () { if (!input.value) search(''); }));

    cleanups.push(listen(document, 'click', function (e: MouseEvent) {
        // The popover hears an outside click only while open, and an outside click also drops a search still due.
        if (!container.contains(e.target as Node)) close();
    }));

    return {
        status: status,
        search: search,
        close: close,
        isOpen: function () { return open; },
        results: function () { return results.slice(); },
        destroy: function () {
            ask.cancel();
            runAll(cleanups);
            runAll(openCleanups);
            popover.destroy();
            clearResults();
            adorned.destroy();
        }
    };
}

/**
 * Builds the typeahead shell, a base-combo box holding a text input, or the given search field, and its base-combo-dropdown, and binds it with bindTypeahead. The member places the returned status.
 * Internal to createSearchableComboBox, createChipSelect, and createMediaPicker.
 *
 * @param opts TypeaheadOptions, with {
 *   placeholder   : the plain input's placeholder [optional]
 *   field         : a { element, input } search field placed in the box in place of a plain input [optional]
 *   dropdownClass : extra classes on the dropdown [optional]
 * }
 * @returns the TypeaheadHandle, with element, input, and dropdown.
 */
export function createTypeahead<T>(opts: TypeaheadFieldOptions<T>): TypeaheadFieldHandle<T> {
    var element = make('div', 'base-combo');
    var input: HTMLInputElement;
    if (opts.field) {
        input = opts.field.input;
        element.appendChild(opts.field.element);
    } else {
        input = make('input', 'base-edit-input');
        input.type = 'text';
        input.placeholder = opts.placeholder || '';
        element.appendChild(input);
    }
    var dropdown = make('div', 'base-combo-dropdown hidden' + (opts.dropdownClass ? ' ' + opts.dropdownClass : ''));
    element.appendChild(dropdown);
    var bound = bindTypeahead<T>(input, dropdown, opts);
    return {
        element: element,
        input: input,
        dropdown: dropdown,
        status: bound.status,
        search: bound.search,
        close: bound.close,
        isOpen: bound.isOpen,
        results: bound.results,
        destroy: bound.destroy
    };
}
