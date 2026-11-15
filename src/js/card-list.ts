import { escapeHtml } from './escape.js';

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
}

/** What createSortableCardList returns. getSelected is the open card's index, or -1 when none is open. */
export interface SortableCardListHandle<T = any> {
    render(): void;
    setItems(next: T[] | null): void;
    getSelected(): number;
    setSelected(index: number | null, opts?: { collapsed?: boolean }): void;
    destroy(): void;
}

// CardTargetEvent
// An event whose target is a card list element.
type CardTargetEvent<E extends Event> = E & { target: HTMLElement };

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
 * }
 * @returns { render, setItems, getSelected, setSelected, destroy }.
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
        var body = listEl.querySelector<HTMLElement>('.jpk-card-item.selected > .jpk-card-item-body');
        if (body) body.appendChild(options.editor);
        else parkEditor();
    }

    // Rebuilds every card from the items and puts the editor back in the open one.
    function render(): void {
        parkEditor();
        listEl.innerHTML = '';
        listEl.classList.add('jpk-card-list');
        items.forEach(function (item, index) {
            var spec: CardSpec = options.render(item, index) || {};
            var isSelected = index === selected;
            var card = document.createElement('div');
            card.className = 'jpk-card-item' + (isSelected ? ' selected' : '') + (isSelected && collapsed ? ' collapsed' : '') + (spec.disabled ? ' disabled' : '');
            card.setAttribute('data-index', String(index));
            var dot = spec.dot || 'none';
            var badges = (spec.badges || []).map(function (b) {
                return '<span class="jpk-badge ' + esc(b.cls || 'gray') + '">' + esc(b.label) + '</span>';
            }).join('');
            card.innerHTML =
                '<div class="jpk-card-item-head"' + (reorder ? ' draggable="true"' : '') + ' role="button" tabindex="0" aria-expanded="' + (isSelected && !collapsed ? 'true' : 'false') + '">' +
                    (reorder ? '<span class="jpk-card-item-grip material-icons" title="Drag to Reorder">drag_indicator</span>' : '') +
                    '<span class="jpk-card-item-num">' + (index + 1) + '</span>' +
                    '<div class="jpk-card-item-main">' +
                        '<div class="jpk-card-item-title">' +
                            (dot !== 'none' ? '<span class="jpk-card-item-dot ' + esc(dot) + '"' + (spec.dotTitle ? ' title="' + esc(spec.dotTitle) + '"' : '') + '></span>' : '') +
                            '<span>' + esc(spec.title) + '</span>' + badges +
                        '</div>' +
                        (spec.subtitle ? '<div class="jpk-card-item-sub">' + esc(spec.subtitle) + '</div>' : '') +
                    '</div>' +
                    (reorder ? '<div class="jpk-card-item-arrows">' +
                        '<button type="button" class="jpk-row-btn" data-move="-1" title="Move Up"' + (index === 0 ? ' disabled' : '') + '><span class="material-icons">keyboard_arrow_up</span></button>' +
                        '<button type="button" class="jpk-row-btn" data-move="1" title="Move Down"' + (index === items.length - 1 ? ' disabled' : '') + '><span class="material-icons">keyboard_arrow_down</span></button>' +
                    '</div>' : '') +
                    (collapsible ? '<span class="jpk-card-item-chevron material-icons" aria-hidden="true">expand_more</span>' : '') +
                '</div>' +
                '<div class="jpk-card-item-body"></div>';
            listEl.appendChild(card);
        });
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
        var head = e.target.closest<HTMLElement>('.jpk-card-item-head');
        if (!head || !listEl.contains(head)) return;
        var index = parseInt((head.parentNode as HTMLElement).getAttribute('data-index')!, 10);
        var moveBtn = e.target.closest<HTMLButtonElement>('[data-move]');
        if (moveBtn) {
            if (!moveBtn.disabled) move(index, index + parseInt(moveBtn.getAttribute('data-move')!, 10));
            return;
        }
        open(index);
    }

    function onKey(e: CardTargetEvent<KeyboardEvent>): void {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        var head = e.target.closest<HTMLElement>('.jpk-card-item-head');
        if (!head || e.target !== head) return;
        e.preventDefault();
        open(parseInt((head.parentNode as HTMLElement).getAttribute('data-index')!, 10));
    }

    function clearDropMarks(): void {
        listEl.querySelectorAll<HTMLElement>('.jpk-card-item').forEach(function (c) { c.classList.remove('drop-before', 'drop-after'); });
    }

    function onDragStart(e: CardTargetEvent<DragEvent>): void {
        var head = e.target.closest<HTMLElement>('.jpk-card-item-head');
        if (!head) return;
        var card = head.parentNode as HTMLElement;
        dragIndex = parseInt(card.getAttribute('data-index')!, 10);
        card.classList.add('dragging');
        e.dataTransfer!.effectAllowed = 'move';
        try { e.dataTransfer!.setData('text/plain', String(dragIndex)); } catch (err) { /* older WebKit */ }
    }

    // Marks the half of the hovered card where the dragged card would land.
    function onDragOver(e: CardTargetEvent<DragEvent>): void {
        var card = e.target.closest<HTMLElement>('.jpk-card-item');
        if (!card || dragIndex < 0) return;
        e.preventDefault();
        e.dataTransfer!.dropEffect = 'move';
        var rect = card.getBoundingClientRect();
        clearDropMarks();
        card.classList.add((e.clientY - rect.top) > rect.height / 2 ? 'drop-after' : 'drop-before');
    }

    // Moves the dragged card to the marked position.
    function onDrop(e: CardTargetEvent<DragEvent>): void {
        var card = e.target.closest<HTMLElement>('.jpk-card-item');
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
        listEl.querySelectorAll<HTMLElement>('.jpk-card-item.dragging').forEach(function (c) { c.classList.remove('dragging'); });
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
        destroy: function () {
            listEl.removeEventListener('click', onClick as EventListener);
            listEl.removeEventListener('keydown', onKey as EventListener);
            listEl.removeEventListener('dragstart', onDragStart as EventListener);
            listEl.removeEventListener('dragover', onDragOver as EventListener);
            listEl.removeEventListener('drop', onDrop as EventListener);
            listEl.removeEventListener('dragend', onDragEnd);
            parkEditor();
        }
    };
}
