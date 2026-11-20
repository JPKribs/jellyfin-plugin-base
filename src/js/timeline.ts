import { make, icon, clear, has } from './lib/dom.js';
import { applyColor } from './lib/color.js';
import { createList } from './list.js';
import type { ListHeight } from './list.js';
import type { ComponentHandle } from './types.js';
import { baseText } from './lib/base-text.js';
import type { BASE_TEXT } from './lib/base-text.js';

/** One event on a timeline. status is a status color name, icon a Material icon name, and pre a block of mono text kept as written, such as a log or a stack trace. */
export interface TimelineItem {
    time?: string;
    datetime?: string;
    title?: string;
    body?: string;
    pre?: string;
    status?: string;
    icon?: string;
}

/** What createTimeline takes. statusLabels maps a status color name to its hidden label. height sets the list's height as a list's does. */
export interface TimelineOptions {
    items?: TimelineItem[];
    emptyText?: string;
    statusLabels?: Record<string, string>;
    height?: ListHeight;
    maxHeight?: number | string | null;
    minHeight?: number | string | null;
}

/** What createTimeline returns. setItems is the same function as setValue. */
export interface TimelineHandle extends ComponentHandle {
    getValue(): TimelineItem[];
    setValue(next: TimelineItem[]): void;
    setItems(next: TimelineItem[]): void;
    setHeight(height: ListHeight, maxHeight?: number | string | null): void;
    destroy(): void;
}

var STATUS_ICONS: Record<string, string> = { green: 'check_circle', red: 'error', orange: 'schedule', purple: 'sync', blue: 'info', gray: 'remove_circle_outline', yellow: 'info', pink: 'info', teal: 'info' };
var STATUS_LABELS: Record<string, keyof typeof BASE_TEXT> = { green: 'Base.Done', red: 'LabelFailed', orange: 'Base.Waiting', purple: 'Base.Working', blue: 'ButtonInfo', gray: 'Off', yellow: 'Base.Note', pink: 'Base.Note', teal: 'Base.Note' };

/**
 * A vertical list of events, each with a colored marker, a time, a title, and an optional body. A status also shows an icon in its marker and a hidden label, so the status never rests on color alone.
 *
 * @param options {
 *   items     : array of { time, datetime, title, body, pre, status, icon } where pre is mono text kept as written, under the body, and status is a status color name such as 'green', and icon is a Material icon name (default an icon for the status) [optional]
 *   emptyText : sentence shown while there are no events [optional]
 *   statusLabels : map of status color name to the hidden label a screen reader reads, such as { green: 'Done' } (default a word for each color) [optional]
 *   height    : the list's height, 'auto', 'fill', a number of pixels, or a CSS length (default 'auto')
 *   maxHeight : the most the list grows to before it scrolls [optional]
 *   minHeight : the least a filling list takes (default 160px) [optional]
 * }
 * @returns { element, getValue, setValue, setItems, setHeight, destroy }.
 * A datetime such as 2026-03-10T12:00 makes the time a time element with that machine value.
 */
export function createTimeline(options?: TimelineOptions): TimelineHandle {
    options = options || {};
    var items: TimelineItem[] = [];
    var root = make('div', 'base-timeline-wrap');
    var list = make('ol', 'base-timeline');
    root.appendChild(list);

    // The hidden label of a status, from the caller's map first and then the defaults.
    function labelOf(status: string): string {
        var custom = options!.statusLabels;
        if (custom && has(custom, status) && custom[status]) return custom[status];
        return has(STATUS_LABELS, status) ? baseText(STATUS_LABELS[status]) : '';
    }

    function row(item: TimelineItem): HTMLElement {
        var li = make('li', 'base-timeline-item');
        applyColor(li, item.status);
        var marker = make('span', 'base-timeline-marker', { 'aria-hidden': 'true' });
        var glyph = item.icon || (has(STATUS_ICONS, item.status) ? STATUS_ICONS[item.status!] : '');
        if (glyph) marker.appendChild(icon(glyph));
        li.appendChild(marker);
        var body = make('div', 'base-timeline-body');
        var status = labelOf(item.status as string);
        if (status) body.appendChild(make('span', 'base-sr-only', null, status));
        if (item.time) body.appendChild(make(item.datetime ? 'time' : 'span', 'base-timeline-time', item.datetime ? { datetime: item.datetime } : null, item.time));
        body.appendChild(make('div', 'base-timeline-title', null, item.title));
        if (item.body) body.appendChild(make('div', 'base-timeline-text', null, item.body));
        if (item.pre) body.appendChild(make('pre', 'base-timeline-pre base-mono', null, item.pre));
        li.appendChild(body);
        return li;
    }

    var rows = createList<TimelineItem>({
        element: list,
        layout: 'plain',
        wrap: false,
        role: null,
        emptyText: options.emptyText || null,
        height: options.height === undefined ? 'auto' : options.height,
        maxHeight: options.maxHeight,
        minHeight: options.minHeight,
        render: row
    });
    rows.emptyElement.classList.add('base-timeline-empty');
    root.appendChild(rows.emptyElement);

    function setValue(next: TimelineItem[] | undefined): void {
        items = (next || []).slice();
        rows.setItems(items);
    }
    setValue(options.items);
    return {
        element: root,
        getValue: function () { return items.slice(); },
        setValue: setValue,
        setItems: setValue,
        setHeight: function (height, maxHeight) { rows.setHeight(height, maxHeight); },
        destroy: function () { rows.destroy(); clear(list); }
    };
}
