import { make, icon, iconButton, listen, runAll, fill, toText } from './lib/dom.js';
import { createList, fillRowParts } from './list.js';
import type { ListHeight, ListItemHandle } from './list.js';
import type { ComponentHandle } from './types.js';

/** A tag on a record row. icon is a Material icon before its label, and off shows it faded and struck through, such as a destination that is turned off. */
export interface RecordListTag {
    label: string;
    icon?: string;
    off?: boolean;
}

/** One record row. aside is a control drawn at the row's end in place of the chevron, such as a button or a toggle. */
export interface RecordListItem {
    id?: unknown;
    title: string;
    secondary?: string | null;
    tags?: RecordListTag[] | null;
    aside?: Node | ListItemHandle | null;
    [key: string]: unknown;
}

/** What createRecordList takes. onOpen makes each row open by a click, Enter, or its chevron. */
export interface RecordListOptions {
    items?: RecordListItem[] | null;
    rowKey?: string | ((item: RecordListItem) => unknown);
    label?: string;
    emptyText?: string;
    openLabel?: string;
    offText?: string;
    height?: ListHeight;
    maxHeight?: number | string | null;
    minHeight?: number | string | null;
    onOpen?(item: RecordListItem): void;
}

/** What createRecordList returns. setItems draws again only the rows that changed. */
export interface RecordListHandle extends ComponentHandle {
    getValue(): RecordListItem[];
    setValue(next: RecordListItem[] | null): void;
    setItems(next: RecordListItem[] | null): void;
    setHeight(height: ListHeight, maxHeight?: number | string | null): void;
    destroy(): void;
}

/**
 * A List of static rows, each a title, a secondary line, tags with an icon and an off state, and at its end a chevron
 * that opens the row or an aside control. Each row is a boxed item row whose title and secondary text line up down
 * the list, and a refresh keeps the rows whose title, secondary line, and tags did not change, with their aside.
 *
 * @param options {
 *   items     : array of { id, title, secondary, tags: [{ label, icon, off }], aside } [optional]
 *   rowKey    : the field or function that names a row, so a refresh keeps it (default 'id')
 *   label     : aria-label of the list [optional]
 *   emptyText : shown while there is no row (default 'Nothing to show.')
 *   openLabel : aria-label of a row's chevron, where {value} is the title (default 'Open {value}')
 *   offText   : hidden word after an off tag, so it is not told by look alone (default 'off')
 *   height, maxHeight, minHeight : the List's height (default 'auto')
 *   onOpen    : function(item) when a row is clicked, gets Enter or Space, or its chevron is pressed [optional]
 * }
 * @returns { element, getValue, setValue, setItems, setHeight, destroy }.
 */
export function createRecordList(options?: RecordListOptions): RecordListHandle {
    var opts = options || {};
    var items: RecordListItem[] = [];
    var cleanups: Array<() => void> = [];
    var rowKey = opts.rowKey === undefined ? 'id' : opts.rowKey;

    function row(item: RecordListItem): ListItemHandle {
        var el = make('div', 'base-item-row base-record-list-row' + (opts.onOpen ? ' openable' : ''));
        if (opts.onOpen) el.setAttribute('tabindex', '0');
        var body = make('div', 'base-record-list-body');
        var text = make('span', 'base-item-row-text');
        fillRowParts(text, { primary: toText(item.title), secondary: item.secondary ? String(item.secondary) : null });
        body.appendChild(text);
        if (item.tags && item.tags.length) {
            var tags = make('div', 'base-tags base-record-list-tags');
            item.tags.forEach(function (t) {
                var tag = make('span', 'base-tag' + (t.off ? ' base-tag-off' : ''));
                if (t.icon) tag.appendChild(icon(t.icon));
                tag.appendChild(make('span', '', null, t.label));
                if (t.off) tag.appendChild(make('span', 'base-sr-only', null, ' ' + (opts.offText || 'off')));
                tags.appendChild(tag);
            });
            body.appendChild(tags);
        }
        el.appendChild(body);
        var aside = item.aside;
        var handle = aside && (aside as ListItemHandle).element ? aside as ListItemHandle : null;
        if (aside) {
            var holder = make('div', 'base-record-list-aside');
            holder.appendChild(handle ? handle.element : aside as Node);
            el.appendChild(holder);
        } else if (opts.onOpen) {
            var chevron = iconButton('base-row-btn base-record-list-open', 'chevron_right', fill(opts.openLabel || 'Open {value}', item.title));
            chevron.setAttribute('data-base-open', '');
            chevron.tabIndex = -1;
            el.appendChild(chevron);
        }
        return { element: el, destroy: function () { if (handle && handle.destroy) handle.destroy(); } };
    }

    var list = createList<RecordListItem>({
        layout: 'plain',
        label: opts.label,
        key: rowKey as any,
        emptyText: opts.emptyText || 'Nothing to show.',
        height: opts.height,
        maxHeight: opts.maxHeight,
        minHeight: opts.minHeight,
        render: row
    });
    var root = list.element;
    root.classList.add('base-record-list');

    // The item whose row an event came from, unless it came from an aside control.
    function itemAt(target: EventTarget | null): RecordListItem | null {
        var el = target as HTMLElement | null;
        while (el && el !== root) {
            if (el.classList && el.classList.contains('base-record-list-aside')) return null;
            if (el.classList && el.classList.contains('base-list-item')) break;
            el = el.parentNode as HTMLElement | null;
        }
        if (!el || el === root) return null;
        var shown = list.getItems();
        for (var i = 0; i < shown.length; i++) if (list.cellAt(i) === el) return shown[i];
        return null;
    }

    if (opts.onOpen) {
        cleanups.push(listen(root, 'click', function (e: Event) {
            var item = itemAt(e.target);
            if (item) opts.onOpen!(item);
        }));
        cleanups.push(listen(root, 'keydown', function (e: KeyboardEvent) {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            var target = e.target as HTMLElement;
            if (!target.classList || !target.classList.contains('base-record-list-row')) return;
            var item = itemAt(target);
            if (!item) return;
            e.preventDefault();
            opts.onOpen!(item);
        }));
    }

    function setValue(next: RecordListItem[] | null | undefined): void {
        items = (next || []).filter(function (item) { return !!item; });
        list.setItems(items);
    }

    setValue(opts.items);

    return {
        element: root,
        getValue: function () { return items.slice(); },
        setValue: setValue,
        setItems: setValue,
        setHeight: function (height, maxHeight) { list.setHeight(height, maxHeight); },
        destroy: function () { runAll(cleanups); list.destroy(); }
    };
}
