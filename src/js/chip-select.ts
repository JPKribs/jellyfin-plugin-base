import { bindComboAria } from './combo-aria.js';
import type { ComponentHandle } from './types.js';

/** A choice or a selection in a chip select. A plain value shows as its own label. */
export type ChipSelectItem = string | number | { value: unknown; label?: string | null };

/** A choice or a selection after createChipSelect reads it, as a value and a label. */
export interface ChipSelectPair {
    value: unknown;
    label: string;
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
    onChange?(values: unknown[], items: ChipSelectPair[]): void;
}

/** What createChipSelect returns. setValue does not call onChange. */
export interface ChipSelectHandle extends ComponentHandle {
    getValue(): unknown[];
    getItems(): ChipSelectPair[];
    setValue(values: ChipSelectItem[] | null): void;
    setOptions(list: ChipSelectItem[] | null): void;
    clear(): void;
    refresh(): void;
    destroy(): void;
}

/**
 * A typeahead multi-select where typing searches and picking a result adds a removable chip. It reads a static option list or an async search function.
 *
 * @param options {
 *   value       : preselected values, as strings or { value, label } pairs [optional]
 *   options     : static list of choices, as strings or { value, label } [optional]
 *   searchFn    : function(query, cb) calling cb([{ value, label }]), an async source that overrides options [optional]
 *   placeholder : input placeholder [optional]
 *   single      : keep at most one selection, replacing it on the next pick (default false)
 *   allowCreate : add the typed text as a value on Enter when no result is active (default false)
 *   maxResults  : cap the dropdown length (default 50)
 *   pill        : draw each chip as a round jpk-tag-pill (default false)
 *   removeText  : the start of each remove button's label, which reads "Remove Name" (default 'Remove')
 *   onChange    : function(valuesArray, itemsArray) called when a pick, removal, or clear changes the selection [optional]
 * }
 * @returns { element, getValue, getItems, setValue, setOptions, clear, refresh, destroy }.
 * getItems returns the { value, label } pairs, so a caller can restore a friendly label without refetching. setValue does not call onChange.
 */
export function createChipSelect(options?: ChipSelectOptions): ChipSelectHandle {
    options = options || {};

    var staticOptions = options.options || [];

    var container = document.createElement('div');
    container.className = 'jpk-chip-select';

    var tags = document.createElement('div');
    tags.className = 'jpk-tags';
    container.appendChild(tags);

    var combo = document.createElement('div');
    combo.className = 'jpk-combo';
    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'jpk-edit-input';
    input.placeholder = options.placeholder || '';
    var dropdown = document.createElement('div');
    dropdown.className = 'jpk-combo-dropdown hidden';
    combo.appendChild(input);
    combo.appendChild(dropdown);
    container.appendChild(combo);
    var aria = bindComboAria(input, dropdown);

    var maxResults = options.maxResults || 50;

    var selected: ChipSelectPair[] = [];
    function key(v: unknown): string { return String(v); }
    function has(value: unknown): boolean { return selected.some(function (s) { return key(s.value) === key(value); }); }

    function normalize(item: ChipSelectItem): ChipSelectPair {
        if (item && typeof item === 'object') return { value: item.value, label: item.label != null ? item.label : String(item.value) };
        return { value: item, label: String(item) };
    }

    (options.value || []).forEach(function (v) {
        var n = normalize(v);
        if (!has(n.value)) selected.push(n);
    });

    function emit(): void {
        if (options!.onChange) options!.onChange(getValue(), getItems());
    }

    function getValue(): unknown[] {
        return selected.map(function (s) { return s.value; });
    }

    function getItems(): ChipSelectPair[] {
        return selected.map(function (s) { return { value: s.value, label: s.label }; });
    }

    function renderChips(): void {
        tags.innerHTML = '';
        selected.forEach(function (item) {
            var chip = document.createElement('span');
            chip.className = 'jpk-tag' + (options!.pill ? ' jpk-tag-pill' : '');
            var text = document.createElement('span');
            text.textContent = item.label;
            var remove = document.createElement('button');
            remove.type = 'button';
            remove.className = 'jpk-tag-remove';
            remove.setAttribute('aria-label', (options!.removeText || 'Remove') + ' ' + item.label);
            remove.textContent = '×';
            remove.addEventListener('click', function () { removeAt(key(item.value)); });
            chip.appendChild(text);
            chip.appendChild(remove);
            tags.appendChild(chip);
        });
    }

    function removeAt(k: string): void {
        selected = selected.filter(function (s) { return key(s.value) !== k; });
        renderChips();
        emit();
    }

    function addItem(item: ChipSelectItem): void {
        var n = normalize(item);
        if (n.value === '' || n.value == null || has(n.value)) return;
        if (options!.single) selected = [n];
        else selected.push(n);
        renderChips();
        emit();
    }

    var activeIndex = -1;
    var currentResults: ChipSelectPair[] = [];
    // Each search takes a number, and an answer that is not the latest, or that comes after the dropdown closed, is dropped.
    var requestId = 0;

    function search(query: string, cb: (list: ChipSelectItem[]) => void): void {
        var mine = ++requestId;
        if (typeof options!.searchFn === 'function') {
            options!.searchFn(query, function (list) { if (mine === requestId) cb(list || []); });
            return;
        }
        var q = (query || '').toLowerCase();
        var list = staticOptions.map(normalize).filter(function (o) {
            return !has(o.value) && (!q || o.label.toLowerCase().indexOf(q) !== -1);
        });
        cb(list);
    }

    function renderDropdown(results: ChipSelectItem[]): void {
        currentResults = results.map(normalize).filter(function (o) { return !has(o.value); }).slice(0, maxResults);
        activeIndex = -1;
        dropdown.innerHTML = '';
        aria.setOpen(false);
        if (!currentResults.length) return;
        currentResults.forEach(function (item, i) {
            var opt = document.createElement('div');
            opt.className = 'jpk-combo-option';
            opt.textContent = item.label;
            aria.option(opt, i);
            opt.addEventListener('mousedown', function (e) {
                // A default mousedown would blur the input before the pick lands.
                e.preventDefault();
                addItem(item);
                input.value = '';
                closeDropdown();
            });
            dropdown.appendChild(opt);
        });
        aria.setOpen(true);
    }

    // Closes the dropdown and drops any search still waiting, so a late answer cannot open it again.
    function closeDropdown(): void {
        requestId++;
        aria.setOpen(false);
    }

    function highlight(delta: number): void {
        if (!currentResults.length) return;
        activeIndex = (activeIndex + delta + currentResults.length) % currentResults.length;
        aria.activate(activeIndex);
    }

    input.addEventListener('input', function () {
        search(input.value, renderDropdown);
    });

    input.addEventListener('keydown', function (e: KeyboardEvent) {
        if (e.key === 'ArrowDown') { e.preventDefault(); highlight(1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); highlight(-1); }
        else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeIndex >= 0 && currentResults[activeIndex]) {
                addItem(currentResults[activeIndex]);
                input.value = '';
                closeDropdown();
            } else if (options.allowCreate && input.value.trim()) {
                addItem(input.value.trim());
                input.value = '';
                closeDropdown();
            }
        } else if (e.key === 'Backspace' && !input.value && selected.length) {
            removeAt(key(selected[selected.length - 1].value));
        } else if (e.key === 'Escape') {
            closeDropdown();
        }
    });

    input.addEventListener('blur', function () { requestId++; });

    input.addEventListener('focus', function () {
        if (!input.value) search('', renderDropdown);
    });

    function onDocClick(e: MouseEvent): void {
        if (!container.contains(e.target as Node)) closeDropdown();
    }
    document.addEventListener('click', onDocClick);

    renderChips();

    return {
        element: container,
        getValue: getValue,
        getItems: getItems,
        setValue: function (values: ChipSelectItem[] | null): void {
            selected = [];
            (values || []).forEach(function (v) {
                var n = normalize(v);
                if (!has(n.value)) selected.push(n);
            });
            renderChips();
        },
        setOptions: function (list: ChipSelectItem[] | null): void { staticOptions = list || []; },
        clear: function (): void { selected = []; renderChips(); emit(); },
        refresh: function (): void { search(input.value, renderDropdown); },
        destroy: function (): void { requestId++; document.removeEventListener('click', onDocClick); }
    };
}
