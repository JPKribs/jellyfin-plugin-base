import { make, icon, clear, listen, runAll, toText } from './lib/dom.js';
import { makeBadge } from './lib/badge.js';
import { createList } from './list.js';
import type { ListHeight } from './list.js';
import type { ComponentHandle } from './types.js';
import { baseText } from './lib/base-text.js';

/** A value drawn as more than text: a badge with a status color name or hex code, a link, or text in the mono font. text is the shown text, which a badge or link may also give. */
export interface DefinitionValue {
    text?: unknown;
    badge?: string | { label: string; color?: string } | null;
    link?: string | null;
    mono?: boolean;
}

/** One label and value pair. value is text, a node, or a DefinitionValue, and mono shows a text value in the mono font. meta and note are dimmed lines under the value, and arrow draws a route arrow after the item. */
export interface DefinitionItem {
    label?: string;
    value?: unknown;
    mono?: boolean;
    meta?: string | null;
    note?: string | null;
    arrow?: boolean;
}

/** What createDefinitionList takes. emptyText stands in for a missing value. height sets the list's height as a list's does. */
export interface DefinitionListOptions {
    items?: DefinitionItem[];
    layout?: 'rows' | 'columns';
    arrow?: boolean;
    emptyText?: string;
    height?: ListHeight;
    maxHeight?: number | string | null;
    minHeight?: number | string | null;
}

// The least width a column takes in the columns layout, wide enough for a path, as the balanced groups take theirs.
var MIN_COLUMN = 200;

/** What createDefinitionList returns. setItems is the same function as setValue. */
export interface DefinitionListHandle extends ComponentHandle {
    getValue(): DefinitionItem[];
    setValue(next: DefinitionItem[]): void;
    setItems(next: DefinitionItem[]): void;
    setHeight(height: ListHeight, maxHeight?: number | string | null): void;
    destroy(): void;
}

/**
 * A read-only list of label and value pairs. The label sits beside its value and stacks above it on a narrow screen.
 * The columns layout sets each label over its value, in balanced columns on the wash, and a route arrow between two
 * items, such as From and To, turns down when the items stack.
 *
 * @param options {
 *   items     : array of { label, value, mono, meta, note, arrow } where value is text, a node, or { text, badge, link, mono }, a badge is a label or { label, color }, a link opens in a new tab, mono shows the value in the mono font, meta and note are dimmed lines under the value, and arrow draws a route arrow after the item [optional]
 *   layout    : 'rows' sets each label beside its value, and 'columns' sets it over its value, in balanced columns on the wash (default 'rows')
 *   arrow     : true draws a route arrow between every two items, in one row that stacks when narrow (default false)
 *   emptyText : text for a missing value (default 'None')
 *   height    : the list's height, 'auto', 'fill', a number of pixels, or a CSS length (default 'auto')
 *   maxHeight : the most the list grows to before it scrolls [optional]
 *   minHeight : the least a filling list takes (default 160px) [optional]
 * }
 * @returns { element, getValue, setValue, setItems, setHeight, destroy }.
 */
export function createDefinitionList(options?: DefinitionListOptions): DefinitionListHandle {
    options = options || {};
    var items: DefinitionItem[] = [];
    var columns = options.layout === 'columns';
    var cleanups: Array<() => void> = [];
    var root = make('dl', 'base-defs' + (columns ? ' columns' : ''));

    // Draws a value that is a node or a DefinitionValue into its cell.
    function rich(dd: HTMLElement, value: DefinitionValue): void {
        var text = toText(value.text);
        if (value.badge) {
            var spec = typeof value.badge === 'string' ? { label: value.badge, color: 'gray' } : value.badge;
            dd.appendChild(makeBadge(spec.label, spec.color || 'gray', null, 'base-defs-badge'));
        }
        if (value.link) {
            var a = make('a', 'base-defs-link' + (value.mono ? ' base-mono' : ''), { href: value.link, target: '_blank', rel: 'noopener noreferrer' }, text || value.link);
            dd.appendChild(a);
        } else if (text) {
            dd.appendChild(make('span', value.mono ? 'base-mono' : '', null, text));
        }
    }

    function row(item: DefinitionItem, index: number): HTMLElement {
        var el = make('div', 'base-defs-row');
        el.appendChild(make('dt', 'base-defs-label', null, item.label));
        var value = item.value;
        var node = typeof Node !== 'undefined' && value instanceof Node ? value : null;
        var spec = !node && value && typeof value === 'object' ? value as DefinitionValue : null;
        var missing = value === undefined || value === null || value === '' || (!!spec && !spec.badge && !spec.link && toText(spec.text) === '');
        var dd = make('dd', 'base-defs-value' + (item.mono && !missing && !node && !spec ? ' base-mono' : '') + (missing ? ' base-defs-missing' : ''));
        if (missing) dd.textContent = options!.emptyText || baseText('None');
        else if (node) dd.appendChild(node);
        else if (spec) rich(dd, spec);
        else dd.textContent = String(value);
        el.appendChild(dd);
        var meta = toText(item.meta);
        var note = toText(item.note);
        if (meta) el.appendChild(make('dd', 'base-defs-meta', null, meta));
        if (note) el.appendChild(make('dd', 'base-defs-note', null, note));
        if (arrowAfter(item, index)) {
            var arrow = icon('arrow_forward');
            arrow.classList.add('base-defs-arrow');
            el.appendChild(arrow);
            el.classList.add('has-arrow');
        }
        return el;
    }

    // A route arrow follows an item that asks for one, or every item but the last when the list asks.
    function arrowAfter(item: DefinitionItem, index: number): boolean {
        if (item.arrow === true) return true;
        return options!.arrow === true && index < items.length - 1;
    }

    // The balanced columns stack into one when two no longer fit, and a route's arrows then turn down.
    function fit(): void {
        var width = root.clientWidth || 0;
        var style = typeof getComputedStyle === 'function' ? getComputedStyle(root) : null;
        var gap = parseFloat((style && (style.columnGap || style.gap)) || '') || 16;
        root.classList.toggle('compact', columns && !!width && width < 2 * MIN_COLUMN + gap);
    }

    var rows = createList<DefinitionItem>({
        element: root,
        layout: columns ? 'grid' : 'plain',
        minColumn: MIN_COLUMN,
        wrap: false,
        role: null,
        emptyText: null,
        height: options.height === undefined ? 'auto' : options.height,
        maxHeight: options.maxHeight,
        minHeight: options.minHeight,
        render: row
    });

    function setValue(next: DefinitionItem[] | undefined): void {
        items = (next || []).slice();
        rows.setItems(items);
        fit();
    }
    // Only the columns layout watches its own width. The rows layout stacks by the window's width in its CSS.
    if (columns && typeof ResizeObserver !== 'undefined') {
        var watch = new ResizeObserver(fit);
        watch.observe(root);
        cleanups.push(function () { watch.disconnect(); });
    } else if (columns) {
        cleanups.push(listen(window, 'resize', fit));
    }
    setValue(options.items);

    return {
        element: root,
        getValue: function () { return items.slice(); },
        setValue: setValue,
        setItems: setValue,
        setHeight: function (height, maxHeight) { rows.setHeight(height, maxHeight); },
        destroy: function () { runAll(cleanups); rows.destroy(); clear(root); }
    };
}
