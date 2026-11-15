import { escapeHtml } from './browser-helpers.js';
import { classBadgeHtml } from './lib/badge.js';
import { statusDotHtml } from './status-dot.js';
import { createList } from './list.js';
import { moveButtons, refocusAfterMove } from './lib/row-editor.js';
import type { RowLabel } from './lib/row-editor.js';
import type { ListHandle, ListHeight } from './list.js';

/** What render returns for one card. dot picks the status dot, and a disabled card is dimmed. */
export interface CardSpec {
    title?: unknown;
    subtitle?: unknown;
    badges?: Array<{ label: unknown; cls?: string }>;
    dot?: 'ok' | 'bad' | 'checking' | 'unknown' | 'none' | string;
    dotTitle?: unknown;
    disabled?: boolean;
}

/** What createSortableCardList takes. One editor element moves into whichever card is open. */
export interface SortableCardListOptions<T = any> {
    items?: T[];
    render(item: T, index: number): CardSpec | null | undefined;
    editor?: HTMLElement | null;
    onSelect?(index: number): void;
    onBeforeLeave?(index: number): void;
    onMove?(fromIndex: number, toIndex: number): void;
    reorder?: boolean;
    collapsible?: boolean;
    escapeHtml?(str: unknown): string;
    moveUpTitle?: string;
    moveDownTitle?: string;
    moveUpLabel?: RowLabel;
    moveDownLabel?: RowLabel;
    height?: ListHeight;
    maxHeight?: number | string | null;
    minHeight?: number | string | null;
}

/** What createSortableCardList returns. getSelected is the open card's index, or -1 when none is open. */
export interface SortableCardListHandle<T = any> {
    render(): void;
    setItems(next: T[] | null): void;
    getSelected(): number;
    setSelected(index: number | null, opts?: { collapsed?: boolean }): void;
    setHeight(height: ListHeight, maxHeight?: number | string | null): void;
    destroy(): void;
}

// CardTargetEvent
// An event whose target is a card list element.
type CardTargetEvent<E extends Event> = E & { target: HTMLElement };

// The status dot color and default name for each card dot word. Any other word is a status color, a hex code, or gray.
var DOTS: Record<string, string[]> = { ok: ['green', 'Active'], bad: ['red', 'Error'], checking: ['orange', 'Checking'], unknown: ['gray', 'Unknown'] };

// Draws a card's dot as the status dot, named by dotTitle or the word's default.
function dotHtml(dot: string, title: unknown): string {
    var known = Object.prototype.hasOwnProperty.call(DOTS, dot) ? DOTS[dot] : null;
    return statusDotHtml(known ? known[0] : dot, title || (known ? known[1] : null));
}

/**
 * Renders records as numbered cards with a status dot, badges, arrow and drag reordering, and a body the open card shows. One editor element moves into whichever card is open, so its fields and bindings survive a re-render.
 *
 * @param listEl container element the cards render into
 * @param options {
 *   items         : array of records in priority order, replaced with setItems [optional]
 *   render        : function(item, index) returning { title, subtitle, badges: [{ label, cls }], dot: 'ok'|'bad'|'checking'|'unknown'|'none', dotTitle, disabled } [required]
 *   editor        : element placed inside the open card's body [optional]
 *   onSelect      : function(index) called when a card opens, before the editor is placed [optional]
 *   onBeforeLeave : function(index) called when the open card is left, to read the editor back [optional]
 *   onMove        : function(fromIndex, toIndex) called after a reorder, so the caller can save [optional]
 *   reorder       : allow arrows and drag (default true)
 *   collapsible   : clicking the open head folds it and a chevron shows the state, where false keeps the open card open (default true)
 *   escapeHtml    : function(str) returning a safe string (default the built in escaper)
 *   moveUpTitle   : tooltip of an up arrow (default 'Move Up')
 *   moveDownTitle : tooltip of a down arrow (default 'Move Down')
 *   moveUpLabel   : aria-label of an up arrow, where {value} is the card's title or "Item 2", or a function(name) returning it (default 'Move {value} up')
 *   moveDownLabel : aria-label of a down arrow, where {value} is the card's title or "Item 2", or a function(name) returning it (default 'Move {value} down')
 *   height        : height of the list, as createList takes it (default 'auto')
 *   maxHeight     : height past which the list scrolls [optional]
 *   minHeight     : least height of a filling list [optional]
 * }
 * @returns { render, setItems, getSelected, setSelected, setHeight, destroy }.
 */
export function createSortableCardList<T = any>(listEl: HTMLElement, options: SortableCardListOptions<T>): SortableCardListHandle<T> {
    options = options || {} as SortableCardListOptions<T>;
    if (!listEl) throw new Error('createSortableCardList needs a list element');
    if (typeof options.render !== 'function') throw new Error('createSortableCardList needs a render function');

    var items: T[] = options.items || [];
    var selected = -1;
    var collapsed = false;
    var dragIndex = -1;
    var reorder = options.reorder !== false;
    var collapsible = options.collapsible !== false;
    var esc = options.escapeHtml || escapeHtml;
    var height: ListHeight | undefined = options.height;
    var maxHeight = options.maxHeight;
    // The list adopts listEl on the first render, so the caller's own content stays until then.
    var list: ListHandle<T> | null = null;

    // The editor parks here during a render, since replacing the list HTML would destroy it.
    var holder: HTMLDivElement | null = null;
    if (options.editor) {
        holder = document.createElement('div');
        holder.className = 'hidden';
        listEl.parentNode!.insertBefore(holder, listEl.nextSibling);
    }

    function parkEditor(): void {
        if (options.editor && options.editor.parentNode !== holder) holder!.appendChild(options.editor);
    }

    function placeEditor(): void {
        if (!options.editor) return;
        var body = listEl.querySelector<HTMLElement>('.base-card-item.selected > .base-card-item-body');
        if (body) body.appendChild(options.editor);
        else parkEditor();
    }

    // Builds one card from a record.
    function renderCard(item: T, index: number): HTMLDivElement {
        var spec: CardSpec = options.render(item, index) || {};
        var isSelected = index === selected;
        var card = document.createElement('div');
        card.className = 'base-card-item' + (isSelected ? ' selected' : '') + (isSelected && collapsed ? ' collapsed' : '') + (spec.disabled ? ' disabled' : '');
        card.setAttribute('data-index', String(index));
        var dot = spec.dot || 'none';
        var badges = (spec.badges || []).map(function (b) { return classBadgeHtml(b.label, b.cls || 'gray'); }).join('');
        card.innerHTML =
            '<div class="base-card-item-head"' + (reorder ? ' draggable="true"' : '') + ' role="button" tabindex="0" aria-expanded="' + (isSelected && !collapsed ? 'true' : 'false') + '">' +
                (reorder ? '<span class="base-card-item-grip material-icons" title="Drag to Reorder">drag_indicator</span>' : '') +
                '<span class="base-card-item-num">' + (index + 1) + '</span>' +
                '<div class="base-card-item-main base-item-row-parts">' +
                    '<div class="base-card-item-title base-item-row-primary">' +
                        (dot !== 'none' ? dotHtml(dot, spec.dotTitle) : '') +
                        '<span>' + esc(spec.title) + '</span>' + badges +
                    '</div>' +
                    (spec.subtitle ? '<div class="base-card-item-sub base-item-row-secondary">' + esc(spec.subtitle) + '</div>' : '') +
                '</div>' +
                (reorder ? '<div class="base-card-item-arrows base-row-arrows"></div>' : '') +
                (collapsible ? '<span class="base-collapsible-icon base-card-item-chevron material-icons" aria-hidden="true">expand_more</span>' : '') +
            '</div>' +
            '<div class="base-card-item-body"></div>';
        var arrows = card.querySelector('.base-card-item-arrows');
        if (arrows) {
            var title = spec.title === undefined || spec.title === null || spec.title === '' ? '' : String(spec.title);
            moveButtons({
                index: index, count: items.length, name: title || 'Item ' + (index + 1),
                upTitle: options.moveUpTitle, downTitle: options.moveDownTitle,
                upLabel: options.moveUpLabel, downLabel: options.moveDownLabel
            }).forEach(function (btn) { arrows!.appendChild(btn); });
        }
        return card;
    }

    // Rebuilds every card from the items and puts the editor back in the open one.
    function render(): void {
        parkEditor();
        if (!list) {
            list = createList<T>({
                element: listEl,
                layout: 'plain',
                wrap: false,
                role: null,
                emptyText: null,
                height: height,
                maxHeight: maxHeight,
                minHeight: options.minHeight,
                render: renderCard
            });
        }
        listEl.classList.add('base-card-list');
        list.setItems(items);
        placeEditor();
    }

    // Opens a card, or folds the open one when it is clicked again.
    function open(index: number): void {
        if (index === selected) {
            if (collapsible) {
                collapsed = !collapsed;
                render();
            }
            return;
        }
        if (selected >= 0 && options.onBeforeLeave) options.onBeforeLeave(selected);
        selected = index;
        collapsed = false;
        if (options.onSelect) options.onSelect(index);
        render();
    }

    // Moves a record, keeping the open card the same record, and reports it to onMove.
    function move(from: number, to: number): void {
        if (from < 0 || from >= items.length || to < 0 || to >= items.length || from === to) return;
        if (selected >= 0 && options.onBeforeLeave) options.onBeforeLeave(selected);
        var moved = items.splice(from, 1)[0];
        items.splice(to, 0, moved);
        if (selected === from) selected = to;
        else if (from < selected && to >= selected) selected -= 1;
        else if (from > selected && to <= selected) selected += 1;
        render();
        if (options.onMove) options.onMove(from, to);
    }

    // Routes a click on a head to its arrow buttons or to opening the card.
    function onClick(e: CardTargetEvent<MouseEvent>): void {
        var head = e.target.closest<HTMLElement>('.base-card-item-head');
        if (!head || !listEl.contains(head)) return;
        var index = parseInt((head.parentNode as HTMLElement).getAttribute('data-index')!, 10);
        var moveBtn = e.target.closest<HTMLButtonElement>('[data-move]');
        if (moveBtn) {
            if (moveBtn.disabled) return;
            var to = index + parseInt(moveBtn.getAttribute('data-move')!, 10);
            move(index, to);
            refocusAfterMove(listEl, index, to);
            return;
        }
        open(index);
    }

    function onKey(e: CardTargetEvent<KeyboardEvent>): void {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        var head = e.target.closest<HTMLElement>('.base-card-item-head');
        if (!head || e.target !== head) return;
        e.preventDefault();
        open(parseInt((head.parentNode as HTMLElement).getAttribute('data-index')!, 10));
    }

    function clearDropMarks(): void {
        listEl.querySelectorAll<HTMLElement>('.base-card-item').forEach(function (c) { c.classList.remove('drop-before', 'drop-after'); });
    }

    function onDragStart(e: CardTargetEvent<DragEvent>): void {
        var head = e.target.closest<HTMLElement>('.base-card-item-head');
        if (!head) return;
        var card = head.parentNode as HTMLElement;
        dragIndex = parseInt(card.getAttribute('data-index')!, 10);
        card.classList.add('dragging');
        e.dataTransfer!.effectAllowed = 'move';
        try { e.dataTransfer!.setData('text/plain', String(dragIndex)); } catch (err) { /* older WebKit */ }
    }

    // Marks the half of the hovered card where the dragged card would land.
    function onDragOver(e: CardTargetEvent<DragEvent>): void {
        var card = e.target.closest<HTMLElement>('.base-card-item');
        if (!card || dragIndex < 0) return;
        e.preventDefault();
        e.dataTransfer!.dropEffect = 'move';
        var rect = card.getBoundingClientRect();
        clearDropMarks();
        card.classList.add((e.clientY - rect.top) > rect.height / 2 ? 'drop-after' : 'drop-before');
    }

    // Moves the dragged card to the marked position.
    function onDrop(e: CardTargetEvent<DragEvent>): void {
        var card = e.target.closest<HTMLElement>('.base-card-item');
        if (!card || dragIndex < 0) return;
        e.preventDefault();
        var target = parseInt(card.getAttribute('data-index')!, 10);
        if (card.classList.contains('drop-after')) target += 1;
        if (target > dragIndex) target -= 1;
        var from = dragIndex;
        dragIndex = -1;
        move(from, target);
    }

    function onDragEnd(): void {
        dragIndex = -1;
        clearDropMarks();
        listEl.querySelectorAll<HTMLElement>('.base-card-item.dragging').forEach(function (c) { c.classList.remove('dragging'); });
    }

    listEl.addEventListener('click', onClick as EventListener);
    listEl.addEventListener('keydown', onKey as EventListener);
    if (reorder) {
        listEl.addEventListener('dragstart', onDragStart as EventListener);
        listEl.addEventListener('dragover', onDragOver as EventListener);
        listEl.addEventListener('drop', onDrop as EventListener);
        listEl.addEventListener('dragend', onDragEnd);
    }

    return {
        render: render,
        setItems: function (next: T[] | null) { items = next || []; if (selected >= items.length) selected = items.length - 1; render(); },
        getSelected: function () { return selected; },
        setSelected: function (index: number | null, opts?: { collapsed?: boolean }) {
            selected = typeof index === 'number' && index >= 0 && index < items.length ? index : -1;
            collapsed = !!(opts && opts.collapsed);
            if (selected >= 0 && options.onSelect) options.onSelect(selected);
            render();
        },
        setHeight: function (next: ListHeight, nextMax?: number | string | null) {
            height = next;
            maxHeight = nextMax;
            if (list) list.setHeight(next, nextMax);
        },
        destroy: function () {
            listEl.removeEventListener('click', onClick as EventListener);
            listEl.removeEventListener('keydown', onKey as EventListener);
            listEl.removeEventListener('dragstart', onDragStart as EventListener);
            listEl.removeEventListener('dragover', onDragOver as EventListener);
            listEl.removeEventListener('drop', onDrop as EventListener);
            listEl.removeEventListener('dragend', onDragEnd);
            parkEditor();
            if (list) list.destroy();
        }
    };
}
