import { make, icon, clear, listen, runAll, fillAll, idOf, toText } from './lib/dom.js';
import { makeCheck, makeCheckRow } from './lib/check.js';
import { createDataView, fieldOf } from './lib/data-view.js';
import type { DataFilter, DataSort, DataState, DataQuery, DataResult } from './lib/data-view.js';
import { bindPressedGroup } from './lib/pressed-group.js';
import type { PressedGroupHandle } from './lib/pressed-group.js';
import { createSelection, bindChecks } from './lib/selection.js';
import type { CheckBinding } from './lib/selection.js';
import { buildCard } from './lib/card.js';
import { balanceRows } from './lib/balance.js';
import { createList } from './list.js';
import { classNames } from './lib/class-names.js';
import type { ListContent, ListHeight, ListLayout, ListHandle, ListItemHandle } from './list.js';
import { createSearchField } from './search-field.js';
import { createDateRangePicker, dateKey } from './date-range-picker.js';
import type { DateRangePickerHandle, DateRangePreset } from './date-range-picker.js';
import type { ComponentHandle, PagedResult } from './types.js';
import { baseText, fillLabel, labelText } from './lib/base-text.js';

/** One choice of a filter. color tints its card or pill, as a status color name or a hex code. */
export interface FilteredListOption {
    value: string;
    label: string;
    color?: string;
}

/**
 * One filter. kind picks how it is shown: a select, a row of pills with an All pill, count cards that each turn on
 * and off, or a Date Range Picker that keeps items whose date field falls in the range. field is the item field it
 * matches (default its name), and test decides a match for anything else. clearable lets a second click on the picked
 * pill go back to All. A daterange filter needs no options, takes presets for its pills, and its values are [from, to].
 */
export interface FilteredListFilter<T = any> {
    name: string;
    label: string;
    kind?: 'select' | 'pills' | 'cards' | 'daterange';
    field?: string;
    multiple?: boolean;
    clearable?: boolean;
    options?: FilteredListOption[];
    presets?: DateRangePreset[];
    test?(item: T, values: string[]): boolean;
}

// A filter as the list keeps it, with its options always set.
type ListFilter<T> = FilteredListFilter<T> & { options: FilteredListOption[] };

/** One way to sort, shown as a choice in the sort select. */
export interface FilteredListSort {
    key: string;
    label: string;
    dir?: 'asc' | 'desc';
}

/** A button on the bar of selected items. onClick receives the selected items. */
export interface FilteredListBulkAction<T = any> {
    id: string;
    label: string;
    icon?: string;
    variant?: 'primary' | 'secondary' | 'destructive';
    onClick(items: T[]): void;
}

/** A button beside the search. visible decides from the state whether it shows, such as Retry Errors only while an item failed. */
export interface FilteredListToolbarAction<T = any> {
    id: string;
    label: string;
    icon?: string;
    variant?: 'primary' | 'secondary' | 'destructive';
    onClick(state: DataState<T>): void;
    visible?(state: DataState<T>): boolean;
}

/** What createFilteredList takes. Give items for local data, or fetch for data the server searches, filters, and pages. */
export interface FilteredListOptions<T = any> {
    render(item: T, index: number, check?: HTMLInputElement | null): ListContent;
    itemClass?(item: T, index: number): unknown;
    items?: T[] | null;
    fetch?(query: DataQuery): Promise<PagedResult<T> | T[]> | PagedResult<T> | T[];
    rowKey?: string | ((item: T) => unknown);
    search?: { keys?: string[]; placeholder?: string; label?: string; delay?: number } | false;
    filters?: FilteredListFilter<T>[];
    filterValues?: Record<string, string[]>;
    sorts?: FilteredListSort[];
    sort?: DataSort | null;
    sortValue?(item: T, key: string): unknown;
    pageSize?: number;
    immediate?: boolean;
    loadOnScroll?: boolean;
    limit?: number;
    limitText?: string;
    selectable?: 'single' | 'multiple' | null;
    selected?: unknown[] | null;
    matchKey?(id: unknown): string;
    selectAll?: boolean;
    selectAllText?: string;
    selectedText?: string;
    selectText?: string;
    containChecks?: boolean;
    bulkActions?: FilteredListBulkAction<T>[];
    actions?: FilteredListToolbarAction<T>[];
    layout?: ListLayout;
    height?: ListHeight;
    maxHeight?: number | string | null;
    minHeight?: number | string | null;
    minColumn?: number | string;
    label?: string;
    listRole?: string | null;
    wrap?: boolean;
    emptyText?: string;
    allText?: string;
    summary?: boolean;
    summaryText?: string;
    size?: 'small' | 'medium' | 'large';
    onOpen?(item: T): void;
    onSelectionChange?(ids: string[], items: T[]): void;
    onSearch?(text: string): boolean | void;
    onChange?(state: DataState<T>): void;
}

/** What createFilteredList returns. setCounts gives server counts for a filter's choices. query and more settle once the list shows the result. */
export interface FilteredListHandle<T = any> extends ComponentHandle {
    list: ListHandle<T>;
    toolbar: HTMLElement;
    selectBar: HTMLElement | null;
    bulkBar: HTMLElement | null;
    toggleSort(key: string): void;
    setItems(items: T[] | null | undefined): void;
    setSearch(text: string): void;
    setFilter(name: string, values: string[] | null | undefined): void;
    setFilterOptions(name: string, options: FilteredListOption[] | null | undefined): void;
    setSort(key: string | null, dir?: 'asc' | 'desc'): void;
    setCounts(name: string, counts: Record<string, number>): void;
    setHeight(height: ListHeight, maxHeight?: number | string | null): void;
    getSelected(): string[];
    getSelectedItems(): T[];
    setSelected(ids: unknown[] | null | undefined): void;
    clearSelection(): void;
    redraw(): void;
    getState(): DataState<T>;
    query(change: { search?: string; filters?: Record<string, string[]>; sort?: DataSort | null }): Promise<DataResult<T>>;
    more(): Promise<DataResult<T>>;
    setLoadOnScroll(on: boolean): void;
    reload(): void;
    destroy(): void;
}

// FilterRow
// The pills or cards of one filter, with the count element of each choice and the pressed group that picks them.
interface FilterRow {
    el: HTMLElement;
    counts: Record<string, HTMLElement>;
    group: PressedGroupHandle;
}

// Builds a Base button for an action, with its icon beside its label.
function actionButton(spec: { id: string; label: string; icon?: string; variant?: string }, size: string): HTMLButtonElement {
    var variant = spec.variant === 'primary' || spec.variant === 'destructive' ? spec.variant : 'secondary';
    var btn = make('button', 'raised base-button ' + variant + ' ' + size + ' base-filtered-action', { type: 'button', 'data-action': spec.id });
    if (spec.icon) btn.appendChild(icon(spec.icon));
    btn.appendChild(make('span', '', null, spec.label));
    return btn;
}

/**
 * The List with a search, filters, a sort, a summary line, selection, and actions. It is the base the Data Table, the
 * Paginated Table, and the Checkbox List are built on. It is made from Base parts: a Search Field, selects, pill rows,
 * and count cards that turn on and off, over a data view that searches, filters, sorts, and pages local items or a
 * server fetch, and the selection core. Each filter choice shows how many items it would match, given the search and
 * the other filters. A next page adds its items under the ones shown, with the loading line beneath them while it
 * loads, and new items keep the scroll position, the selection, and focus, drawing again only the items that changed.
 *
 * @param options {
 *   render      : function(item, index, check) drawing one item, such as a media card, where check is the item's checkbox with multiple selection, placed by render or else at the item's start [required]
 *   items       : local items [optional]
 *   fetch       : function(query) returning a page { Items, TotalCount } or an array, for server data [optional]
 *   rowKey      : the field or function that names an item, so a refresh keeps what did not change (default 'id' while selectable)
 *   search      : { keys, placeholder, label, delay } to show a search field, where delay is how long it waits after typing (default no search, and 250)
 *   filters     : array of { name, label, kind ('select', 'pills', 'cards', or 'daterange'), field, multiple, clearable, options: [{ value, label, color }], presets, test } [optional]
 *   filterValues: the filter values that start picked, by name [optional]
 *   sorts       : array of { key, label, dir } shown as a sort select [optional]
 *   sort        : { key, dir } to start sorted (default the first of sorts) [optional]
 *   sortValue   : function(item, key) giving the value a sort compares [optional]
 *   pageSize    : items to show before more load as the list scrolls (default all)
 *   immediate   : false waits for the first query or reload before a fetch, and says it is loading until then (default true)
 *   loadOnScroll: false keeps the end of the list from loading the next page, for a variation that loads more from a button (default true)
 *   limit       : the most items shown, with limitText in the summary while more match [optional]
 *   limitText   : the summary while the limit applies, with {shown} and {total} (default 'Showing the first {shown} of {total}.')
 *   selectable  : 'single' picks one item by a click or Enter, and again clears it, and 'multiple' draws a checkbox on each item and a select all over the items shown [optional]
 *   selected    : the item keys that start selected [optional]
 *   matchKey    : function(key) returning the form two keys are compared in, such as one that ignores case [optional]
 *   selectAll   : false hides the select all of multiple selection (default true)
 *   selectAllText: the select all label (default 'Select all')
 *   selectedText: the count of selected items, with {count} (default '{count} selected', shown with bulkActions or when given)
 *   selectText  : the aria-label of an item checkbox that no label names (default 'Select')
 *   containChecks: true keeps a checkbox's change event inside the list, for a selection that is not a setting (default false)
 *   bulkActions : array of { id, label, icon, variant, onClick(items) } on the bar of selected items, disabled while none is selected [optional]
 *   actions     : array of { id, label, icon, variant, onClick(state), visible(state) } beside the search [optional]
 *   layout, height, maxHeight, minHeight, minColumn : the List's own layout and height, so it grows, holds a fixed height and scrolls inside, caps, or fills to the bottom of the window (default rows and 'auto')
 *   label       : aria-label of the list [optional]
 *   listRole, wrap : passed to the List, for a variation such as a table whose rows are table rows [optional]
 *   emptyText   : shown when nothing matches (default 'Nothing matches.')
 *   allText     : the All choice of a select or pill row (default 'All')
 *   summary     : false hides the summary line, except the limit note (default true)
 *   summaryText : the summary line, with {shown} and {total} (default 'Showing {shown} of {total}.')
 *   size        : 'small', 'medium', or 'large' for its fields (default 'medium')
 *   itemClass   : function(item, index) returning class names for the item's row, such as 'selected' for an item picked elsewhere. It runs after every draw and refresh, and replaces the names it gave before [optional]
 *   onOpen      : function(item) when an item is clicked or gets Enter or Space, apart from its checkbox, such as to open a detail dialog [optional]
 *   onSelectionChange : function(ids, items) after the selection changes [optional]
 *   onSearch    : function(text) called when the reader types a search, before it runs, which returns false to run it another way [optional]
 *   onChange    : function(state) after the items shown change [optional]
 * }
 * @returns { element, list, toolbar, selectBar, bulkBar, toggleSort, setItems, setSearch, setFilter, setFilterOptions, setSort, setCounts, setHeight, getSelected, getSelectedItems, setSelected, clearSelection, redraw, getState, query, more, setLoadOnScroll, reload, destroy }.
 * list is the List it is built on, so a variation can frame it, such as a table that adds a header, and toolbar the row a variation adds its own controls to.
 * setFilterOptions swaps a filter's choices and keeps a picked value that still exists. setSelected does not call onSelectionChange.
 * query changes the search, filters, and sort at once, and query and more settle to { answer, error, stale }. setLoadOnScroll pauses or resumes loading at the end of the list.
 */
export function createFilteredList<T = any>(options: FilteredListOptions<T>): FilteredListHandle<T> {
    var opts = options || ({} as FilteredListOptions<T>);
    var filters: ListFilter<T>[] = (opts.filters || []).map(function (f) {
        var copy: ListFilter<T> = Object.assign({}, f, { options: (f.options || []).slice() });
        // A date range keeps an item whose date, read as a local day, falls between the picked days, either of which may be open.
        if (f.kind === 'daterange' && !f.test) {
            copy.test = function (item: T, values: string[]): boolean {
                if (!values[0] && !values[1]) return true;
                var day = dateKey(fieldOf(item, f.field || f.name));
                return !!day && (!values[0] || day >= values[0]) && (!values[1] || day <= values[1]);
            };
        }
        return copy;
    });
    var remote = typeof opts.fetch === 'function';
    var cleanups: Array<() => void> = [];
    var all: T[] = (opts.items || []).slice();
    var picked: Record<string, string[]> = {};
    var serverCounts: Record<string, Record<string, number>> = {};
    var limit = opts.limit && opts.limit > 0 ? Math.floor(opts.limit) : 0;
    var selecting = opts.selectable === 'single' || opts.selectable === 'multiple';
    var multiple = opts.selectable === 'multiple';
    var rowKey = opts.rowKey !== undefined ? opts.rowKey : (selecting ? 'id' : undefined);
    var bulk = opts.bulkActions || [];
    filters.forEach(function (f) { picked[f.name] = ((opts.filterValues && opts.filterValues[f.name]) || []).map(String); });

    function keyOf(item: T): string { return toText(idOf(item, rowKey as any)); }

    var root = make('div', 'base-filtered-list');
    if (opts.size === 'small' || opts.size === 'large') root.setAttribute('data-base-size', opts.size);

    // Count cards sit above the toolbar, as a summary that also filters.
    var cardRows: Record<string, FilterRow> = {};
    filters.filter(function (f) { return f.kind === 'cards'; }).forEach(function (filter) {
        var row = make('div', 'base-cards base-filtered-cards', { role: 'group', 'aria-label': filter.label });
        root.appendChild(row);
        var balance = balanceRows(row, { minWidth: 110 });
        cleanups.push(function () { balance.destroy(); });
        // Cards turn on and off one by one. With none on, every choice shows.
        var group = bindPressedGroup(row, {
            selector: '.base-filtered-card',
            multiple: true,
            onChange: function (values) {
                var on = values.filter(function (v): v is string { return v !== null; });
                row.classList.toggle('picking', on.length > 0);
                set(filter.name, on);
            }
        });
        cleanups.push(function () { group.destroy(); });
        cardRows[filter.name] = { el: row, counts: {}, group: group };
        fillCards(filter);
    });

    function fillCards(filter: ListFilter<T>): void {
        var row = cardRows[filter.name];
        clear(row.el);
        row.counts = {};
        filter.options.forEach(function (o) {
            var card = buildCard({ tag: 'button', count: '0', label: o.label, color: o.color, className: 'base-filtered-card', attrs: { type: 'button', 'data-value': o.value, 'aria-pressed': picked[filter.name].indexOf(o.value) !== -1 ? 'true' : 'false' } });
            row.counts[o.value] = card.count;
            row.el.appendChild(card.element);
        });
        row.group.setValues(picked[filter.name]);
        row.el.classList.toggle('picking', picked[filter.name].length > 0);
    }

    var toolbar = make('div', 'base-filtered-toolbar');
    var search = opts.search ? createSearchField({
        placeholder: opts.search.placeholder,
        label: opts.search.label,
        delay: opts.search.delay,
        onInput: function (text) {
            if (opts.onSearch && opts.onSearch(text) === false) return;
            view.setSearch(text);
        }
    }) : null;
    if (search) toolbar.appendChild(search.element);

    var selects: Record<string, { el: HTMLSelectElement; texts: Record<string, HTMLOptionElement> }> = {};
    filters.filter(function (f) { return !f.kind || f.kind === 'select'; }).forEach(function (filter) {
        var select = make('select', 'base-filtered-select', { 'aria-label': filter.label });
        cleanups.push(listen(select, 'change', function () { set(filter.name, select.value ? [select.value] : []); }));
        selects[filter.name] = { el: select, texts: {} };
        fillSelect(filter);
        toolbar.appendChild(select);
    });

    function fillSelect(filter: ListFilter<T>): void {
        var entry = selects[filter.name];
        clear(entry.el);
        entry.texts = {};
        entry.el.appendChild(make('option', '', { value: '' }, opts.allText ? opts.allText + ' ' + labelText(filter.label, true) : fillLabel(baseText('Base.AllOf'), 'value', filter.label)));
        filter.options.forEach(function (o) {
            var option = make('option', '', { value: o.value }, o.label);
            entry.texts[o.value] = option;
            entry.el.appendChild(option);
        });
        entry.el.value = picked[filter.name].length === 1 ? picked[filter.name][0] : '';
    }

    var sortSelect: HTMLSelectElement | null = null;
    var sorts = opts.sorts || [];
    if (sorts.length) {
        sortSelect = make('select', 'base-filtered-sort', { 'aria-label': baseText('Sort') });
        sorts.forEach(function (s, i) { sortSelect!.appendChild(make('option', '', { value: String(i) }, s.label)); });
        cleanups.push(listen(sortSelect, 'change', function () {
            var s = sorts[Number(sortSelect!.value)];
            if (s) view.setSort(s.key, s.dir || 'asc');
        }));
        toolbar.appendChild(sortSelect);
    }

    var toolButtons: Array<{ spec: FilteredListToolbarAction<T>; el: HTMLButtonElement }> = [];
    (opts.actions || []).forEach(function (spec) {
        var btn = actionButton(spec, 'field');
        cleanups.push(listen(btn, 'click', function () { spec.onClick(view.getState()); }));
        toolButtons.push({ spec: spec, el: btn });
        toolbar.appendChild(btn);
    });
    // The toolbar stays even while empty, so a variation can add its own controls, and the stylesheet hides it while it holds none.
    root.appendChild(toolbar);

    var pillRows: Record<string, FilterRow> = {};
    filters.filter(function (f) { return f.kind === 'pills'; }).forEach(function (filter) {
        var row = make('div', 'base-pill-group base-filtered-pills', { role: 'group', 'aria-label': filter.label });
        root.appendChild(row);
        var group = bindPressedGroup(row, {
            selector: '.base-pill',
            clearable: filter.clearable === true,
            onChange: function (values) {
                // A cleared pill goes back to All.
                if (!values[0]) group.setValues(['']);
                set(filter.name, values[0] ? [values[0]] : []);
            }
        });
        cleanups.push(function () { group.destroy(); });
        pillRows[filter.name] = { el: row, counts: {}, group: group };
        fillPills(filter);
    });

    var ranges: Record<string, DateRangePickerHandle> = {};
    filters.filter(function (f) { return f.kind === 'daterange'; }).forEach(function (filter) {
        var values = picked[filter.name];
        var picker = createDateRangePicker({
            value: { from: values[0] || '', to: values[1] || '' },
            presets: filter.presets,
            presetsLabel: filter.label,
            size: opts.size,
            onChange: function (range) {
                // A range that is not valid yet, such as an end before the start, filters nothing until it is fixed.
                if (range.from && range.to && range.to < range.from) return;
                set(filter.name, range.from || range.to ? [range.from, range.to] : []);
            }
        });
        picker.element.classList.add('base-filtered-daterange');
        root.appendChild(picker.element);
        ranges[filter.name] = picker;
        cleanups.push(picker.destroy);
    });

    function fillPills(filter: ListFilter<T>): void {
        var row = pillRows[filter.name];
        clear(row.el);
        row.counts = {};
        row.el.appendChild(make('button', 'base-pill small', { type: 'button', 'data-value': '', 'aria-pressed': 'false' }, opts.allText || baseText('All')));
        filter.options.forEach(function (o) {
            var pill = make('button', 'base-pill small', { type: 'button', 'data-value': o.value, 'aria-pressed': 'false' });
            pill.appendChild(make('span', '', null, o.label));
            var count = make('span', 'base-filtered-pill-count');
            pill.appendChild(count);
            row.counts[o.value] = count;
            row.el.appendChild(pill);
        });
        row.group.setValues(picked[filter.name].length ? [picked[filter.name][0]] : ['']);
    }

    var summary = make('div', 'base-filtered-summary', { role: 'status' });
    if (opts.summary !== false || limit) root.appendChild(summary);

    // Multiple selection draws a bar with the select all, the count of selected items, and the bulk actions.
    var selectBar: HTMLElement | null = null;
    var selectAllRow: HTMLElement | null = null;
    var selectAllBox: HTMLInputElement | null = null;
    var countEl: HTMLElement | null = null;
    var bulkBar: HTMLElement | null = null;
    var bulkButtons: HTMLButtonElement[] = [];
    var counting = bulk.length > 0 || !!opts.selectedText;
    if (multiple && (opts.selectAll !== false || counting)) {
        selectBar = make('div', 'base-filtered-selectbar' + (counting ? ' actions' : ''));
        if (opts.selectAll !== false) {
            selectAllBox = makeCheck('base-filtered-selectall-box');
            selectAllRow = makeCheckRow(selectAllBox, opts.selectAllText || baseText('SelectAll'), 'base-filtered-selectall');
            selectBar.appendChild(selectAllRow);
        }
        if (counting) {
            countEl = make('span', 'base-filtered-selected', { role: 'status' });
            selectBar.appendChild(countEl);
        }
        bulkBar = make('div', 'base-filtered-bulk');
        bulk.forEach(function (spec) {
            var btn = actionButton(spec, 'small');
            cleanups.push(listen(btn, 'click', function () { spec.onClick(selectedItems()); }));
            bulkButtons.push(btn);
            bulkBar!.appendChild(btn);
        });
        selectBar.appendChild(bulkBar);
        root.appendChild(selectBar);
    }

    var selection = createSelection({
        ids: opts.selected,
        matchKey: opts.matchKey,
        onChange: function (ids) {
            decorate();
            if (opts.onSelectionChange) opts.onSelectionChange(ids, selectedItems());
        }
    });
    var checks: CheckBinding | null = null;

    // Draws an item, with its checkbox under multiple selection, placed by render or at the item's start.
    function renderItem(item: T, index: number): ListContent {
        if (!multiple) return opts.render(item, index, null);
        var key = keyOf(item);
        var check = makeCheck('base-filtered-check', { 'data-id': key });
        check.checked = selection.has(key);
        var content = opts.render(item, index, check);
        if (!check.parentNode) content = placeCheck(check, content);
        if (!check.closest('label')) check.setAttribute('aria-label', opts.selectText || baseText('Select'));
        return content;
    }

    function placeCheck(check: HTMLInputElement, content: ListContent): ListContent {
        var handle = content && typeof content === 'object' && (content as ListItemHandle).element ? content as ListItemHandle : null;
        var node = handle ? handle.element : content as HTMLElement | null;
        // An unwrapped item is the row itself, so its checkbox goes first in the row.
        if (opts.wrap === false && node && typeof content !== 'string' && node.classList) {
            node.insertBefore(check, node.firstChild);
            return content;
        }
        var holder = make('div', 'base-filtered-checked');
        holder.appendChild(check);
        if (typeof content === 'string') holder.appendChild(make('span', 'base-filtered-checked-text', null, content));
        else if (node) holder.appendChild(node);
        if (!handle) return holder;
        return { element: holder, destroy: function () { if (handle!.destroy) handle!.destroy(); } };
    }

    var list = createList<T>({
        layout: opts.layout || 'rows',
        height: opts.height === undefined ? 'auto' : opts.height,
        maxHeight: opts.maxHeight,
        minHeight: opts.minHeight,
        minColumn: opts.minColumn,
        label: opts.label,
        role: opts.listRole,
        wrap: opts.wrap,
        key: rowKey,
        emptyText: opts.emptyText || baseText('Base.NothingMatches'),
        render: renderItem,
        onEndReached: opts.pageSize && opts.loadOnScroll !== false ? function () {
            if (scrollMore && !(limit && list.getItems().length >= limit)) view.more();
        } : undefined
    });
    root.appendChild(list.element);
    if (selecting) list.element.classList.add(multiple ? 'checking' : 'picking');
    var scrollMore = true;
    // A list that waits for its first query says it is loading until the first fetch starts.
    var waiting = opts.immediate === false;
    var busy = waiting;
    var source: T[] | null = null;

    if (multiple) {
        checks = bindChecks(list.element, {
            selection: selection,
            boxClass: 'base-filtered-check',
            rowClass: 'base-list-item',
            selectAll: selectAllBox,
            contain: opts.containChecks === true,
            ids: function () {
                return Array.prototype.filter.call(list.element.querySelectorAll<HTMLInputElement>('.base-filtered-check'), function (box: HTMLInputElement) { return !box.disabled; })
                    .map(function (box: HTMLInputElement) { return box.getAttribute('data-id'); });
            }
        });
        cleanups.push(checks.destroy);
    }

    // The items the selection can name: every local item, or the loaded ones of a server list.
    function pool(): T[] { return remote ? view.getState().items : all; }

    function selectedItems(): T[] {
        var items = pool();
        return selection.getIds().map(function (id) {
            return items.filter(function (item) { return selection.key(keyOf(item)) === id; })[0];
        }).filter(function (item) { return item !== undefined; });
    }

    // Marks each drawn item from the selection and the open action, and draws the bar of selected items.
    // Swaps the names the item class gave a row last time for the ones it gives now, so a reused row follows its item.
    function markItem(cell: HTMLElement, names: string): void {
        var before = (cell.getAttribute('data-base-item-class') || '').split(' ').filter(Boolean);
        var after = names.split(' ').filter(Boolean);
        before.forEach(function (n) { if (after.indexOf(n) === -1) cell.classList.remove(n); });
        after.forEach(function (n) { cell.classList.add(n); });
        if (after.length) cell.setAttribute('data-base-item-class', after.join(' '));
        else cell.removeAttribute('data-base-item-class');
    }

    function decorate(): void {
        list.getItems().forEach(function (item, i) {
            var cell = list.cellAt(i);
            if (!cell) return;
            var key = keyOf(item);
            if (rowKey !== undefined) cell.setAttribute('data-key', key);
            if (opts.itemClass) markItem(cell, classNames(opts.itemClass(item, i)));
            if (opts.onOpen) cell.classList.add('openable');
            if (opts.onOpen || opts.selectable === 'single') cell.setAttribute('tabindex', '0');
            if (!selecting) return;
            var on = selection.has(key);
            cell.classList.toggle('selected', on);
            if (!multiple) cell.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        if (checks) checks.paint();
        var count = selection.size();
        if (selectBar) selectBar.classList.toggle('active', count > 0);
        if (selectAllRow) selectAllRow.classList.toggle('hidden', !list.getItems().length);
        if (countEl) countEl.textContent = fillAll(opts.selectedText || baseText('Base.CountSelected'), { count: String(count) });
        bulkButtons.forEach(function (btn) { btn.disabled = count === 0; });
    }

    // The item drawn in the cell an event came from, unless it came from a control inside the item.
    function itemAt(target: EventTarget | null): T | null {
        var el = target as HTMLElement | null;
        while (el && el !== list.element) {
            if (el.classList && el.classList.contains('base-list-item') && el.parentNode === list.element) break;
            var tag = String(el.tagName || '').toUpperCase();
            if (/^(INPUT|SELECT|TEXTAREA|A|LABEL)$/.test(tag) || (tag === 'BUTTON' && !el.hasAttribute('data-base-open'))) return null;
            el = el.parentNode as HTMLElement | null;
        }
        if (!el || el === list.element) return null;
        var items = list.getItems();
        for (var i = 0; i < items.length; i++) if (list.cellAt(i) === el) return items[i];
        return null;
    }

    function act(item: T): void {
        if (opts.selectable === 'single') {
            var key = keyOf(item);
            if (selection.has(key)) selection.clear();
            else { selection.setIds([]); selection.select(key, true); }
        }
        if (opts.onOpen) opts.onOpen(item);
    }

    if (opts.onOpen || opts.selectable === 'single') {
        cleanups.push(listen(list.element, 'click', function (e: Event) {
            var item = itemAt(e.target);
            if (item !== null) act(item);
        }));
        cleanups.push(listen(list.element, 'keydown', function (e: KeyboardEvent) {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            var target = e.target as HTMLElement;
            if (!target.classList || !target.classList.contains('base-list-item')) return;
            var item = itemAt(target);
            if (item === null) return;
            e.preventDefault();
            act(item);
        }));
    }

    // Draws what the view holds. A next page adds its items under the ones shown, and anything else draws them again.
    function draw(state: DataState<T>): void {
        if (state.loading) waiting = false;
        busy = waiting || (state.loading && (!state.items.length || state.query.page > 1));
        list.setLoading(busy);
        if (state.items === source) return;
        source = state.items;
        var next = limit ? state.items.slice(0, limit) : state.items;
        var had = list.getItems();
        var grows = state.query.page > 1 && next.length >= had.length && had.length > 0 && had.every(function (item, i) { return next[i] === item; });
        if (grows) list.append(next.slice(had.length));
        else list.setItems(next);
        decorate();
    }

    function fieldFor(filter: ListFilter<T>): string { return filter.field || filter.name; }

    function passes(item: T, filter: ListFilter<T>, values: string[]): boolean {
        if (!values.length) return true;
        if (filter.test) return filter.test(item, values);
        return values.indexOf(String(fieldOf(item, fieldFor(filter)))) !== -1;
    }

    // How many items each choice of a filter would match, given the search and every other filter.
    function countsFor(filter: ListFilter<T>, text: string): Record<string, number> {
        if (remote) return serverCounts[filter.name] || {};
        var out: Record<string, number> = {};
        var q = text.toLowerCase();
        var keys = opts.search ? opts.search.keys : undefined;
        all.forEach(function (item) {
            if (q && !(keys || ['name', 'Name']).some(function (k) { var v = fieldOf(item, k); return v !== null && v !== undefined && String(v).toLowerCase().indexOf(q) !== -1; })) return;
            var others = filters.every(function (f) { return f === filter || passes(item, f, picked[f.name]); });
            if (!others) return;
            filter.options.forEach(function (o) { if (passes(item, filter, [o.value])) out[o.value] = (out[o.value] || 0) + 1; });
        });
        return out;
    }

    function drawCounts(text: string): void {
        filters.forEach(function (filter) {
            var counts = countsFor(filter, text);
            var known = remote ? !!serverCounts[filter.name] : true;
            filter.options.forEach(function (o) {
                var n = counts[o.value] || 0;
                if (cardRows[filter.name] && cardRows[filter.name].counts[o.value]) cardRows[filter.name].counts[o.value].textContent = String(n);
                if (pillRows[filter.name] && pillRows[filter.name].counts[o.value]) pillRows[filter.name].counts[o.value].textContent = known ? String(n) : '';
                if (selects[filter.name] && selects[filter.name].texts[o.value]) selects[filter.name].texts[o.value].textContent = known ? o.label + ' (' + n + ')' : o.label;
            });
        });
    }

    function drawSummary(state: DataState<T>): void {
        var capped = limit > 0 && state.total > limit;
        var whole = remote ? state.total : all.length;
        summary.textContent = capped
            ? fillAll(opts.limitText || baseText('Base.ShowingFirst'), { shown: String(Math.min(limit, state.items.length)), total: String(state.total) })
            : fillAll(opts.summaryText || baseText('Base.Showing'), { shown: String(state.total), total: String(whole) });
        summary.hidden = !capped && (opts.summary === false || (!state.items.length && !state.total));
    }

    function set(name: string, values: string[]): void {
        picked[name] = values.slice();
        view.setFilter(name, values);
    }

    var dataFilters: DataFilter<T>[] = filters.map(function (f) {
        return { name: f.name, field: fieldFor(f), test: f.test };
    });
    var firstSort = opts.sort || (sorts[0] ? { key: sorts[0].key, dir: sorts[0].dir || 'asc' } : null);
    var view = createDataView<T>({
        items: all,
        fetch: opts.fetch as any,
        searchKeys: opts.search ? opts.search.keys : undefined,
        filters: dataFilters,
        filterValues: picked,
        sort: firstSort,
        sortValue: opts.sortValue,
        pageSize: opts.pageSize,
        immediate: opts.immediate,
        onChange: function (state) {
            draw(state);
            drawCounts(state.query.search);
            drawSummary(state);
            toolButtons.forEach(function (b) { b.el.hidden = b.spec.visible ? !b.spec.visible(state) : false; });
            if (opts.onChange) opts.onChange(state);
        }
    });

    // A pill row that shares a line with the one before it is marked, so the divider between them shows only then.
    function markPillLines(): void {
        var rows = Array.prototype.filter.call(root.children, function (el: HTMLElement) { return el.classList.contains('base-filtered-pills'); }) as HTMLElement[];
        rows.forEach(function (row, i) {
            var prev = rows[i - 1];
            var beside = !!prev && !row.hidden && !prev.hidden && Math.abs(row.getBoundingClientRect().top - prev.getBoundingClientRect().top) < 2;
            row.classList.toggle('beside', beside);
        });
    }
    if (typeof ResizeObserver !== 'undefined') {
        var pillWatch = new ResizeObserver(markPillLines);
        pillWatch.observe(root);
        cleanups.push(function () { pillWatch.disconnect(); });
    }
    markPillLines();

    return {
        element: root,
        list: list,
        toolbar: toolbar,
        selectBar: selectBar,
        bulkBar: bulkBar,
        toggleSort: function (key) { view.toggleSort(key); },
        setItems: function (items) { all = (items || []).slice(); view.setItems(all); },
        setSearch: function (text) { if (search) search.setValue(text); view.setSearch(text); },
        setFilter: function (name, values) {
            var next = (values || []).map(String);
            if (selects[name]) selects[name].el.value = next.length === 1 ? next[0] : '';
            if (cardRows[name]) { cardRows[name].group.setValues(next); cardRows[name].el.classList.toggle('picking', next.length > 0); }
            if (pillRows[name]) pillRows[name].group.setValues(next.length ? [next[0]] : ['']);
            if (ranges[name]) ranges[name].setValue({ from: next[0] || '', to: next[1] || '' });
            set(name, next);
        },
        setFilterOptions: function (name, choices) {
            var filter = filters.filter(function (f) { return f.name === name; })[0];
            if (!filter) return;
            filter.options = (choices || []).slice();
            var values = filter.options.map(function (o) { return o.value; });
            var kept = picked[name].filter(function (v) { return values.indexOf(v) !== -1; });
            var changed = kept.length !== picked[name].length;
            picked[name] = kept;
            if (cardRows[name]) fillCards(filter);
            if (pillRows[name]) fillPills(filter);
            if (selects[name]) fillSelect(filter);
            if (changed) set(name, kept);
            else drawCounts(view.getState().query.search);
        },
        setSort: function (key, dir) {
            if (sortSelect) {
                var at = sorts.map(function (s) { return s.key + ':' + (s.dir || 'asc'); }).indexOf(key + ':' + (dir || 'asc'));
                if (at !== -1) sortSelect.value = String(at);
            }
            view.setSort(key, dir);
        },
        setHeight: function (height, maxHeight) { list.setHeight(height, maxHeight); },
        setCounts: function (name, counts) { serverCounts[name] = counts || {}; drawCounts(view.getState().query.search); },
        getSelected: function () { return selection.getIds(); },
        getSelectedItems: selectedItems,
        setSelected: function (ids) { selection.setIds(ids); decorate(); },
        clearSelection: function () { selection.clear(); },
        redraw: function () {
            var top = list.element.scrollTop;
            var items = list.getItems();
            list.setItems([]);
            list.setItems(items);
            if (top) list.element.scrollTop = top;
            decorate();
        },
        getState: function () { return view.getState(); },
        query: function (change) { return view.setQuery(change || {}); },
        more: function () { return view.more(); },
        setLoadOnScroll: function (on) {
            scrollMore = !!on;
            // Drawing the loading state again watches the end of the list afresh, so a scroll that reached it while paused loads.
            if (scrollMore) list.setLoading(busy);
        },
        reload: function () { view.reload(); },
        destroy: function () {
            runAll(cleanups);
            view.destroy();
            list.destroy();
            if (search) search.destroy();
            clear(root);
        }
    };
}
