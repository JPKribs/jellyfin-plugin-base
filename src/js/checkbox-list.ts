import { make, toText, idOf } from './lib/dom.js';
import { makeBadge } from './lib/badge.js';
import { createFilteredList } from './filtered-list.js';
import { createAvatar } from './avatar.js';
import { buildThumb } from './lib/thumb.js';
import type { ThumbSource } from './lib/thumb.js';
import { createSelection } from './lib/selection.js';
import type { ListHeight } from './list.js';
import type { ComponentHandle } from './types.js';
import { baseText } from './lib/base-text.js';

/** What a checkbox list draws on one row. Only label is needed. avatar draws a person, with the person icon when it has no picture. */
export interface CheckboxListRow {
    label?: unknown;
    sublabel?: string | null;
    imageUrl?: string | null;
    image?: ThumbSource;
    avatar?: { src?: string | null; name?: string | null } | null;
    badge?: string | { label: string; color?: string } | null;
    note?: string | null;
}

/** What createCheckboxList takes. fetchItems overrides items, and onChange hears the selected ids after each change. */
export interface CheckboxListOptions {
    items?: any[];
    fetchItems?(): any[] | { Items?: any[] } | Promise<any[] | { Items?: any[] }>;
    idKey?: string | ((item: any) => unknown);
    matchKey?(id: unknown): string;
    value?: unknown[];
    disabledIds?: unknown[];
    renderRow?(item: any): CheckboxListRow | null | undefined;
    search?: boolean | ((text: string) => any[] | { Items?: any[] } | Promise<any[] | { Items?: any[] }>);
    placeholder?: string;
    searchKeys?: string[];
    showSelectAll?: boolean;
    selectAllText?: string;
    emptyMessage?: string;
    height?: ListHeight;
    maxHeight?: number | string | null;
    minHeight?: number | string | null;
    size?: 'small' | 'medium' | 'large';
    onChange?(ids: string[]): void;
}

/** What createCheckboxList returns. getValue gives the selected ids as strings, and ready resolves to the loaded items. */
export interface CheckboxListHandle extends ComponentHandle {
    ready: Promise<any[]>;
    getValue(): string[];
    setValue(ids: unknown[] | null): void;
    setDisabled(ids: unknown[] | null): void;
    refresh(): Promise<any[]>;
    setHeight(height: ListHeight, maxHeight?: number | string | null): void;
    destroy(): void;
}

/**
 * A searchable list of checkbox rows for picking many items, with an optional thumbnail, sublabel, and note on each row.
 * It is a Filtered List whose items are check rows, with a select all row over the selection core. It reads a static
 * array or an async fetch.
 *
 * @param options {
 *   items         : static array of item objects [optional]
 *   fetchItems    : function() returning an array or a promise of one, which overrides items [optional]
 *   idKey         : property name or function(item) returning the id (default 'id')
 *   matchKey      : function(id) returning the form two ids are compared in, such as one that ignores case and dashes in a GUID (default the id as text)
 *   value         : array of preselected ids [optional]
 *   disabledIds   : array of ids to render non-selectable [optional]
 *   renderRow     : function(item) returning { label, sublabel, imageUrl, avatar, badge, note } (default reads item.name) [optional]
 *   search        : show a search box (default true), or function(text) returning the items the server finds for the text, or a promise of them, which the search box asks through the data view's fetch
 *   placeholder   : search box placeholder (default 'Search')
 *   searchKeys    : item properties the query is matched against, whether or not renderRow is given (default ['name'])
 *   showSelectAll : add a select all row (default false)
 *   selectAllText : the label of the select all row (default 'Select all')
 *   emptyMessage  : message when no items match (default 'No items available.')
 *   height        : the rows' height, 'auto', 'fill', a number of pixels, or a CSS length, as a List takes it (default 'auto')
 *   maxHeight     : the most the rows grow before they scroll, or null for no cap (default 320)
 *   minHeight     : the least a filling list takes [optional]
 *   size          : 'small', 'medium', or 'large' for its fields (default 'medium')
 *   onChange      : function(idsArray) called on every selection change [optional]
 * }
 * @returns { element, ready, getValue, setValue, setDisabled, refresh, setHeight, destroy }.
 * getValue returns the selected ids as strings, and ready resolves to the loaded items.
 */
export function createCheckboxList(options?: CheckboxListOptions): CheckboxListHandle {
    var opts = options || {};
    var allItems: any[] = [];
    var disabled = createSelection({ ids: opts.disabledIds, matchKey: opts.matchKey });

    function itemId(item: any): unknown { return idOf(item, opts.idKey); }

    function defaultRow(item: any): CheckboxListRow {
        return { label: item.name != null ? item.name : String(itemId(item)) };
    }

    // Builds one row for an item, a label around the checkbox the Filtered List gives it.
    function renderRow(item: any, index: number, check?: HTMLInputElement | null): HTMLLabelElement {
        var isDisabled = disabled.has(itemId(item));
        var info: CheckboxListRow = (opts.renderRow || defaultRow)(item) || {};

        var row = make('label', 'base-check-row' + (isDisabled ? ' base-check-row-disabled' : ''));
        if (check) {
            check.disabled = isDisabled;
            row.appendChild(check);
        }

        if (info.avatar) {
            var avatar = createAvatar({ src: info.avatar.src || '', name: info.avatar.name || '', size: 'small' });
            avatar.element.classList.add('base-check-avatar');
            avatar.element.setAttribute('aria-hidden', 'true');
            row.appendChild(avatar.element);
        } else if (info.image || info.imageUrl) {
            // A loader such as a proxied peer image wins over a plain address.
            row.appendChild(buildThumb({ src: info.image || info.imageUrl, icon: 'image', className: 'base-check-thumb' }).element);
        }

        var textWrap = make('span', 'base-check-text');
        textWrap.appendChild(make('span', 'base-check-label', null, toText(info.label)));
        if (info.sublabel) textWrap.appendChild(make('span', 'base-check-sub', null, info.sublabel));
        row.appendChild(textWrap);

        if (info.badge) {
            var spec = typeof info.badge === 'string' ? { label: info.badge, color: 'gray' } : info.badge;
            row.appendChild(makeBadge(spec.label, spec.color || 'gray', null, 'base-check-badge'));
        }

        if (info.note) row.appendChild(makeBadge(info.note, 'gray', null, 'base-check-note'));

        return row;
    }

    // The rows are a plain list of labels with no list role, and the selection, its checkboxes, and select all come from the Filtered List.
    var server = typeof opts.search === 'function' ? opts.search : null;

    // A server search goes through the data view's fetch, which asks it again for each search text.
    function fetchPage(q: { search: string }): Promise<any[]> {
        return Promise.resolve(server!(q.search)).then(function (got) { return Array.isArray(got) ? got : (got && got.Items) || []; });
    }

    var base = createFilteredList<any>({
        items: [],
        fetch: server ? fetchPage : undefined,
        immediate: server ? false : undefined,
        render: renderRow,
        rowKey: function (item: any) { return itemId(item); },
        selectable: 'multiple',
        selected: opts.value,
        matchKey: opts.matchKey,
        selectAll: !!opts.showSelectAll,
        selectAllText: opts.selectAllText,
        search: opts.search !== false ? { keys: opts.searchKeys || ['name'], placeholder: opts.placeholder || baseText('Search'), delay: 200 } : false,
        layout: 'plain',
        listRole: null,
        wrap: false,
        emptyText: opts.emptyMessage || baseText('Base.NoItemsAvailable'),
        height: opts.height,
        maxHeight: opts.maxHeight === undefined ? 320 : opts.maxHeight,
        minHeight: opts.minHeight,
        summary: false,
        size: opts.size,
        onSelectionChange: function (ids) { if (opts.onChange) opts.onChange(ids); }
    });
    var list = base.list;
    var container = base.element;
    container.classList.add('base-check-list');
    list.element.classList.add('base-check-list-body');
    list.emptyElement.classList.add('base-check-empty');
    var searchInput = base.toolbar.querySelector<HTMLInputElement>('input');
    if (searchInput) searchInput.classList.add('base-check-list-search');
    var selectAllRow = base.selectBar ? base.selectBar.querySelector<HTMLElement>('.base-filtered-selectall') : null;
    if (selectAllRow) selectAllRow.classList.add('base-check-selectall');

    // Reads the items from the server search, fetchItems, or items and shows them, or shows none when the read fails.
    function load(): Promise<any[]> {
        if (server) {
            return base.query({ search: base.getState().query.search }).then(function (result) {
                allItems = result.error ? [] : base.getState().items;
                return allItems;
            });
        }
        var source = typeof opts.fetchItems === 'function' ? opts.fetchItems() : (opts.items || []);
        list.setLoading(true);
        return Promise.resolve(source).then(function (got) {
            allItems = Array.isArray(got) ? got : (got && got.Items) || [];
        }, function () {
            allItems = [];
        }).then(function () {
            list.setLoading(false);
            base.setItems(allItems);
            return allItems;
        });
    }

    var ready = load();

    return {
        element: container,
        ready: ready,
        getValue: base.getSelected,
        setValue: function (ids: unknown[] | null): void { base.setSelected(ids); },
        setDisabled: function (ids: unknown[] | null): void {
            disabled.setIds(ids);
            base.redraw();
        },
        refresh: function (): Promise<any[]> { return load(); },
        setHeight: function (height: ListHeight, maxHeight?: number | string | null): void { base.setHeight(height, maxHeight); },
        destroy: function (): void { base.destroy(); }
    };
}
