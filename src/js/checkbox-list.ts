import type { ComponentHandle } from './types.js';

/** What a checkbox list draws on one row. Only label is needed. */
export interface CheckboxListRow {
    label?: unknown;
    sublabel?: string | null;
    imageUrl?: string | null;
    note?: string | null;
}

/** What createCheckboxList takes. fetchItems overrides items, and onChange hears the selected ids after each change. */
export interface CheckboxListOptions {
    items?: any[];
    fetchItems?(): any[] | { Items?: any[] } | Promise<any[] | { Items?: any[] }>;
    idKey?: string | ((item: any) => unknown);
    value?: unknown[];
    disabledIds?: unknown[];
    renderRow?(item: any): CheckboxListRow | null | undefined;
    search?: boolean;
    placeholder?: string;
    searchKeys?: string[];
    showSelectAll?: boolean;
    selectAllText?: string;
    emptyMessage?: string;
    onChange?(ids: string[]): void;
}

/** What createCheckboxList returns. getValue gives the selected ids as strings, and ready resolves to the loaded items. */
export interface CheckboxListHandle extends ComponentHandle {
    ready: Promise<any[]>;
    getValue(): string[];
    setValue(ids: unknown[] | null): void;
    setDisabled(ids: unknown[] | null): void;
    refresh(): Promise<any[]>;
    destroy(): void;
}

/**
 * A searchable list of checkbox rows for picking many items, with an optional thumbnail, sublabel, and note on each row. It reads a static array or an async fetch.
 *
 * @param options {
 *   items         : static array of item objects [optional]
 *   fetchItems    : function() returning an array or a promise of one, which overrides items [optional]
 *   idKey         : property name or function(item) returning the id (default 'id')
 *   value         : array of preselected ids [optional]
 *   disabledIds   : array of ids to render non-selectable [optional]
 *   renderRow     : function(item) returning { label, sublabel, imageUrl, note } (default reads item.name) [optional]
 *   search        : show a search box (default true)
 *   placeholder   : search box placeholder (default 'Search')
 *   searchKeys    : item properties the query is matched against, whether or not renderRow is given (default ['name'])
 *   showSelectAll : add a select all row (default false)
 *   selectAllText : the label of the select all row (default 'Select all')
 *   emptyMessage  : message when no items match (default 'No items available.')
 *   onChange      : function(idsArray) called on every selection change [optional]
 * }
 * @returns { element, ready, getValue, setValue, setDisabled, refresh, destroy }.
 * getValue returns the selected ids as strings, and ready resolves to the loaded items.
 */
export function createCheckboxList(options?: CheckboxListOptions): CheckboxListHandle {
    options = options || {};

    var container = document.createElement('div');
    container.className = 'jpk-check-list';

    var searchInput: HTMLInputElement | null = null;
    if (options.search !== false) {
        searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'jpk-edit-input jpk-check-list-search';
        searchInput.placeholder = options.placeholder || 'Search';
        container.appendChild(searchInput);
    }

    var selectAllRow: HTMLLabelElement | null = null;
    var selectAllCheck: HTMLInputElement | null = null;
    if (options.showSelectAll) {
        selectAllRow = document.createElement('label');
        selectAllRow.className = 'jpk-check-row jpk-check-selectall hidden';
        selectAllCheck = document.createElement('input');
        selectAllCheck.type = 'checkbox';
        var selectAllName = document.createElement('span');
        selectAllName.className = 'jpk-check-label';
        selectAllName.textContent = options.selectAllText || 'Select all';
        selectAllRow.appendChild(selectAllCheck);
        selectAllRow.appendChild(selectAllName);
        container.appendChild(selectAllRow);
    }

    var body = document.createElement('div');
    body.className = 'jpk-check-list-body';
    container.appendChild(body);

    function idOf(item: any): unknown {
        var k = options!.idKey || 'id';
        return typeof k === 'function' ? k(item) : item[k];
    }
    function key(id: unknown): string { return String(id == null ? '' : id); }

    var selected: Record<string, boolean> = {};
    (options.value || []).forEach(function (id) { selected[key(id)] = true; });

    var disabled: Record<string, boolean> = {};
    (options.disabledIds || []).forEach(function (id) { disabled[key(id)] = true; });

    var allItems: any[] = [];
    var query = '';

    function defaultRow(item: any): CheckboxListRow {
        return { label: item.name != null ? item.name : String(idOf(item)) };
    }

    // Whether the item matches the search query on any of the search keys.
    function matches(item: any): boolean {
        if (!query) return true;
        var keys = options!.searchKeys || ['name'];
        var q = query.toLowerCase();
        return keys.some(function (k) {
            var v = item[k];
            return v != null && String(v).toLowerCase().indexOf(q) !== -1;
        });
    }

    function visibleItems(): any[] {
        return allItems.filter(matches);
    }

    function rowChecks(): NodeListOf<HTMLInputElement> {
        return body.querySelectorAll<HTMLInputElement>('.jpk-check-row-input');
    }

    function getValue(): string[] {
        return Object.keys(selected).filter(function (k) { return selected[k]; });
    }

    // Shows the select all row only while rows exist, and sets its checked and mixed state.
    function syncSelectAll(): void {
        if (!selectAllCheck) return;
        var checks = rowChecks();
        if (!checks.length) { selectAllRow!.classList.add('hidden'); return; }
        selectAllRow!.classList.remove('hidden');
        var on = 0;
        checks.forEach(function (cb) { if (cb.checked) on++; });
        selectAllCheck.checked = on === checks.length;
        selectAllCheck.indeterminate = on > 0 && on < checks.length;
    }

    function emit(): void {
        if (options!.onChange) options!.onChange(getValue());
    }

    // Rebuilds the rows for the items that match the search.
    function render(): void {
        body.innerHTML = '';
        var items = visibleItems();
        if (!items.length) {
            var empty = document.createElement('div');
            empty.className = 'jpk-check-empty';
            empty.textContent = options!.emptyMessage || 'No items available.';
            body.appendChild(empty);
            syncSelectAll();
            return;
        }

        items.forEach(function (item) {
            var id = idOf(item);
            var isDisabled = !!disabled[key(id)];
            var info: CheckboxListRow = (options!.renderRow || defaultRow)(item) || {};

            var row = document.createElement('label');
            row.className = 'jpk-check-row' + (isDisabled ? ' jpk-check-row-disabled' : '');

            var cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.className = 'jpk-check-row-input';
            cb.setAttribute('data-id', id as string);
            cb.checked = !!selected[key(id)];
            cb.disabled = isDisabled;
            if (!isDisabled) {
                cb.addEventListener('change', function () {
                    selected[key(id)] = cb.checked;
                    syncSelectAll();
                    emit();
                });
            }
            row.appendChild(cb);

            if (info.imageUrl) {
                var img = document.createElement('img');
                img.className = 'jpk-check-thumb';
                img.src = info.imageUrl;
                img.alt = '';
                row.appendChild(img);
            }

            var textWrap = document.createElement('span');
            textWrap.className = 'jpk-check-text';
            var label = document.createElement('span');
            label.className = 'jpk-check-label';
            label.textContent = info.label != null ? info.label as string : '';
            textWrap.appendChild(label);
            if (info.sublabel) {
                var sub = document.createElement('span');
                sub.className = 'jpk-check-sub';
                sub.textContent = info.sublabel;
                textWrap.appendChild(sub);
            }
            row.appendChild(textWrap);

            if (info.note) {
                var note = document.createElement('span');
                note.className = 'jpk-check-note';
                note.textContent = info.note;
                row.appendChild(note);
            }

            body.appendChild(row);
        });

        syncSelectAll();
    }

    if (selectAllCheck) {
        selectAllCheck.addEventListener('change', function () {
            var checked = selectAllCheck!.checked;
            visibleItems().forEach(function (item) {
                var id = idOf(item);
                if (disabled[key(id)]) return;
                selected[key(id)] = checked;
            });
            selectAllCheck!.indeterminate = false;
            render();
            emit();
        });
    }

    var searchTimer: ReturnType<typeof setTimeout> | null = null;
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            if (searchTimer) clearTimeout(searchTimer);
            searchTimer = setTimeout(function () { query = searchInput!.value; render(); }, 200);
        });
    }

    // Reads the items from fetchItems or items and renders them, or renders none when the read fails.
    function load(): Promise<any[]> {
        var source = typeof options!.fetchItems === 'function' ? options!.fetchItems() : (options!.items || []);
        return Promise.resolve(source).then(function (list) {
            allItems = Array.isArray(list) ? list : (list && list.Items) || [];
            render();
            return allItems;
        }).catch(function () { allItems = []; render(); return []; });
    }

    var ready = load();

    return {
        element: container,
        ready: ready,
        getValue: getValue,
        setValue: function (ids: unknown[] | null): void {
            selected = {};
            (ids || []).forEach(function (id) { selected[key(id)] = true; });
            render();
        },
        setDisabled: function (ids: unknown[] | null): void {
            disabled = {};
            (ids || []).forEach(function (id) { disabled[key(id)] = true; });
            render();
        },
        refresh: function (): Promise<any[]> { return load(); },
        destroy: function (): void { if (searchTimer) clearTimeout(searchTimer); }
    };
}
