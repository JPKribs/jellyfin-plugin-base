import { createList, fillRowParts } from './list.js';
import type { ItemRowParts } from './list.js';
import { moveButtons, refocusAfterMove } from './lib/row-editor.js';
import type { RowLabel } from './lib/row-editor.js';
import type { ListHeight } from './list.js';
import type { ComponentHandle } from './types.js';
import { baseText } from './lib/base-text.js';
import { fillAll } from './lib/dom.js';

/** What createOrderedList takes. render draws each row, and onMove runs after a move so the caller can save. */
export interface OrderedListOptions<T = any> {
    items?: T[];
    render(item: T, index: number): Node | string | ItemRowParts;
    label?(item: T, index: number): string;
    onMove?(fromIndex: number, toIndex: number, items: T[]): void;
    moveUpTitle?: string;
    moveDownTitle?: string;
    moveUpLabel?: RowLabel;
    moveDownLabel?: RowLabel;
    height?: ListHeight;
    maxHeight?: number | string | null;
    minHeight?: number | string | null;
}

/** What createOrderedList returns. getItems gives a copy of the items in their current order. */
export interface OrderedListHandle<T = any> extends ComponentHandle {
    element: HTMLOListElement;
    setItems(next: T[] | null): void;
    getItems(): T[];
    setHeight(height: ListHeight, maxHeight?: number | string | null): void;
    destroy(): void;
}

/**
 * A light ordered list of rows, each with an up and a down button. The caller draws the rows, and a move reorders the items, redraws, and keeps focus on the button that was pressed.
 *
 * @param options {
 *   items         : array of records in order, replaced with setItems [optional]
 *   render        : function(item, index) returning a node or an HTML string for the row, where a string must already be escaped [required]
 *   label         : function(item, index) returning the row's name for the button labels (default "Item 1", "Item 2")
 *   onMove        : function(fromIndex, toIndex, items) called after a move, so the caller can save [optional]
 *   moveUpTitle   : tooltip of the up button (default 'Move up')
 *   moveDownTitle : tooltip of the down button (default 'Move down')
 *   moveUpLabel   : the up button's aria-label, where {value} is the row's name, or a function(name) returning it (default 'Move {value} up')
 *   moveDownLabel : the down button's aria-label, where {value} is the row's name, or a function(name) returning it (default 'Move {value} down')
 *   height        : height of the list, as createList takes it (default 'auto')
 *   maxHeight     : height past which the list scrolls [optional]
 *   minHeight     : least height of a filling list [optional]
 * }
 * @returns { element, setItems, getItems, setHeight, destroy }.
 * The first row's up button and the last row's down button are disabled. A move that leaves the pressed button disabled puts focus on the other button of the row.
 */
export function createOrderedList<T = any>(options: OrderedListOptions<T>): OrderedListHandle<T> {
    options = options || {} as OrderedListOptions<T>;
    if (typeof options.render !== 'function') throw new Error('createOrderedList needs a render function');

    var items = (options.items || []).slice();
    var destroyed = false;

    var list = document.createElement('ol');
    list.className = 'base-ordered-list';

    function nameOf(item: T, index: number): string {
        return options.label ? options.label(item, index) : fillAll(baseText('Base.ItemNumber'), { index: index + 1 });
    }

    // Draws one row from an item.
    function renderRow(item: T, index: number): HTMLLIElement {
        var row = document.createElement('li');
        row.className = 'base-ordered-item base-item-row';
        var main = document.createElement('div');
        main.className = 'base-ordered-main base-item-row-text';
        var content = options.render(item, index);
        if (content instanceof Node) main.appendChild(content);
        else if (typeof content === 'string') main.innerHTML = content;
        else if (content && typeof content === 'object') fillRowParts(main, content);
        var arrows = document.createElement('div');
        arrows.className = 'base-ordered-arrows base-row-arrows';
        moveButtons({
            index: index, count: items.length, name: nameOf(item, index), className: 'base-ordered',
            upTitle: options.moveUpTitle, downTitle: options.moveDownTitle,
            upLabel: options.moveUpLabel, downLabel: options.moveDownLabel,
            onMove: move
        }).forEach(function (btn) { arrows.appendChild(btn); });
        row.appendChild(main);
        row.appendChild(arrows);
        return row;
    }

    var rows = createList<T>({
        element: list,
        layout: 'plain',
        wrap: false,
        role: null,
        emptyText: null,
        height: options.height,
        maxHeight: options.maxHeight,
        minHeight: options.minHeight,
        render: renderRow
    });

    // Redraws every row from the items.
    function render(): void {
        rows.setItems(items);
    }

    // Moves one item, redraws, reports it, and refocuses the pressed button of the moved row.
    function move(from: number, to: number): void {
        if (destroyed || from === to || to < 0 || to >= items.length) return;
        var moved = items.splice(from, 1)[0];
        items.splice(to, 0, moved);
        render();
        refocusAfterMove(list, from, to);
        if (options.onMove) options.onMove(from, to, items.slice());
    }

    render();

    return {
        element: list,
        setItems: function (next: T[] | null) { items = (next || []).slice(); render(); },
        getItems: function () { return items.slice(); },
        setHeight: function (height: ListHeight, maxHeight?: number | string | null) { rows.setHeight(height, maxHeight); },
        destroy: function () { destroyed = true; rows.destroy(); list.innerHTML = ''; }
    };
}
