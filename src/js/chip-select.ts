import { createTypeahead } from './lib/typeahead.js';
import { renderChips, bindBackspaceRemove } from './lib/chips.js';
import type { ThumbSource } from './lib/thumb.js';
import { make, runAll, applyFieldSize, matchesText } from './lib/dom.js';
import type { ComponentHandle } from './types.js';

/** A choice or a selection in a chip select. A plain value shows as its own label. */
export type ChipSelectItem = string | number | { value: unknown; label?: string | null; image?: ThumbSource };

/** A choice or a selection after createChipSelect reads it, as a value and a label. */
export interface ChipSelectPair {
    value: unknown;
    label: string;
    image?: ThumbSource;
}

/** What createChipSelect takes. searchFn answers each query through its callback and overrides options. */
export interface ChipSelectOptions {
    value?: ChipSelectItem[];
    options?: ChipSelectItem[];
    searchFn?(query: string, cb: (list: ChipSelectItem[] | null) => void): void;
    placeholder?: string;
    single?: boolean;
    allowCreate?: boolean;
    maxResults?: number;
    pill?: boolean;
    removeText?: string;
    noResultsText?: string;
    errorText?: string;
    size?: 'small' | 'medium' | 'large';
    onChange?(values: unknown[], items: ChipSelectPair[]): void;
}

/** What createChipSelect returns. setValue does not call onChange. */
export interface ChipSelectHandle extends ComponentHandle {
    getValue(): unknown[];
    getItems(): ChipSelectPair[];
    setValue(values: ChipSelectItem[] | null): void;
    setOptions(list: ChipSelectItem[] | null): void;
    setSize(size?: 'small' | 'medium' | 'large'): void;
    clear(): void;
    refresh(): void;
    destroy(): void;
}

/**
 * A typeahead multi-select where typing searches and picking a result adds a removable chip. It reads a static option list or an async search function, and focus on the empty input lists the choices.
 *
 * @param options {
 *   value       : preselected values, as strings or { value, label, image } pairs, where image is an address or a function as the thumb core takes, drawn in the chip [optional]
 *   options     : static list of choices, as strings or { value, label, image } [optional]
 *   searchFn    : function(query, cb) calling cb([{ value, label }]), an async source that overrides options [optional]
 *   placeholder : input placeholder [optional]
 *   single      : keep at most one selection, replacing it on the next pick (default false)
 *   allowCreate : add the typed text as a value on Enter when no result is active and none is labeled with it (default false). Enter always picks a result whose label is the typed text
 *   maxResults  : cap the dropdown length (default 50)
 *   pill        : draw each chip as a round base-tag-pill (default false)
 *   removeText  : the start of each remove button's title and aria-label, which reads "Remove Name" (default 'Remove')
 *   noResultsText : sentence shown when a search finds nothing (default 'No matches.')
 *   errorText   : sentence shown when searchFn throws (default 'Could not search.')
 *   size        : 'small', 'medium', or 'large' for its fields (default 'medium')
 *   onChange    : function(valuesArray, itemsArray) called when a pick, removal, or clear changes the selection [optional]
 * }
 * @returns { element, getValue, getItems, setValue, setOptions, setSize, clear, refresh, destroy }.
 * getItems returns the { value, label } pairs, so a caller can restore a friendly label without refetching. setValue keeps the first value when single is set, and does not call onChange.
 */
export function createChipSelect(options?: ChipSelectOptions): ChipSelectHandle {
    options = options || {};
    var opts = options;
    var staticOptions = opts.options || [];
    var cleanups: Array<() => void> = [];

    var container = make('div', 'base-chip-select');
    applyFieldSize(container, opts.size);
    var tags = make('div', 'base-tags');
    container.appendChild(tags);

    var selected: ChipSelectPair[] = [];
    function key(v: unknown): string { return String(v); }
    function has(value: unknown): boolean { return selected.some(function (s) { return key(s.value) === key(value); }); }

    function normalize(item: ChipSelectItem): ChipSelectPair {
        if (item && typeof item === 'object') {
            var pair: ChipSelectPair = { value: item.value, label: item.label != null ? item.label : String(item.value) };
            if (item.image) pair.image = item.image;
            return pair;
        }
        return { value: item, label: String(item) };
    }

    function emit(): void {
        if (opts.onChange) opts.onChange(getValue(), getItems());
    }

    function getValue(): unknown[] {
        return selected.map(function (s) { return s.value; });
    }

    function getItems(): ChipSelectPair[] {
        return selected.map(function (s) { var pair: ChipSelectPair = { value: s.value, label: s.label }; if (s.image) pair.image = s.image; return pair; });
    }

    function draw(): void {
        renderChips(tags, {
            labels: selected.map(function (s) { return s.label; }),
            thumbs: selected.some(function (s) { return !!s.image; }) ? selected.map(function (s) { return s.image; }) : undefined,
            removeText: (opts.removeText || 'Remove') + ' {value}',
            pill: opts.pill,
            input: input,
            onRemove: removeAt
        });
    }

    function removeAt(index: number): void {
        selected.splice(index, 1);
        draw();
        emit();
    }

    function addItem(item: ChipSelectItem): void {
        var n = normalize(item);
        if (n.value === '' || n.value == null || has(n.value)) return;
        if (opts.single) selected = [n];
        else selected.push(n);
        draw();
        emit();
    }

    function setValue(values: ChipSelectItem[] | null): void {
        selected = [];
        (values || []).forEach(function (v) {
            var n = normalize(v);
            if (!has(n.value)) selected.push(n);
        });
        if (opts.single) selected = selected.slice(0, 1);
        draw();
    }

    var typeahead = createTypeahead<ChipSelectPair>({
        placeholder: opts.placeholder,
        maxResults: opts.maxResults || 50,
        openOnFocus: true,
        noResultsText: opts.noResultsText,
        errorText: opts.errorText,
        accept: function (item) { return !has(item.value); },
        source: function (query, answer) {
            if (typeof opts.searchFn === 'function') {
                opts.searchFn(query, function (list) { answer((list || []).map(normalize)); });
                return;
            }
            answer(staticOptions.map(normalize).filter(function (o) { return matchesText(o, query, ['label']); }));
        },
        render: function (item, option) { option.textContent = item.label; },
        onChoose: function (item) {
            addItem(item);
            input.value = '';
        },
        onEnter: function (query) {
            var typed = query.trim().toLowerCase();
            if (!typed) return;
            // Enter with no active option picks the result whose label is what was typed.
            var match = typeahead.results().filter(function (r) { return r.label.trim().toLowerCase() === typed; })[0];
            if (match) {
                addItem(match);
                input.value = '';
                typeahead.close();
                return;
            }
            if (!opts.allowCreate) return;
            addItem(query.trim());
            input.value = '';
            typeahead.close();
        }
    });
    var input = typeahead.input;
    container.appendChild(typeahead.element);
    container.appendChild(typeahead.status);
    cleanups.push(bindBackspaceRemove(input, function () { return selected.length; }, function () { removeAt(selected.length - 1); }));

    setValue(opts.value || []);

    return {
        element: container,
        getValue: getValue,
        getItems: getItems,
        setValue: setValue,
        setOptions: function (list: ChipSelectItem[] | null): void { staticOptions = list || []; },
        setSize: function (size?: 'small' | 'medium' | 'large'): void { applyFieldSize(container, size); },
        clear: function (): void { selected = []; draw(); emit(); },
        refresh: function (): void { typeahead.search(input.value); },
        destroy: function (): void { runAll(cleanups); typeahead.destroy(); }
    };
}
