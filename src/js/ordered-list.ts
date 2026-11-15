import type { ComponentHandle } from './types.js';

/** What createOrderedList takes. render draws each row, and onMove runs after a move so the caller can save. */
export interface OrderedListOptions<T = any> {
    items?: T[];
    render(item: T, index: number): Node | string;
    label?(item: T, index: number): string;
    onMove?(fromIndex: number, toIndex: number, items: T[]): void;
    moveUpTitle?: string;
    moveDownTitle?: string;
    moveUpLabel?(name: string): string;
    moveDownLabel?(name: string): string;
}

/** What createOrderedList returns. getItems gives a copy of the items in their current order. */
export interface OrderedListHandle<T = any> extends ComponentHandle {
    element: HTMLOListElement;
    setItems(next: T[] | null): void;
    getItems(): T[];
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
 *   moveUpTitle   : tooltip of the up button (default 'Move Up')
 *   moveDownTitle : tooltip of the down button (default 'Move Down')
 *   moveUpLabel   : function(name) returning the up button's aria-label (default "Move Name up")
 *   moveDownLabel : function(name) returning the down button's aria-label (default "Move Name down")
 * }
 * @returns { element, setItems, getItems, destroy }.
 * The first row's up button and the last row's down button are disabled. A move that leaves the pressed button disabled puts focus on the other button of the row.
 */
export function createOrderedList<T = any>(options: OrderedListOptions<T>): OrderedListHandle<T> {
    options = options || {} as OrderedListOptions<T>;
    if (typeof options.render !== 'function') throw new Error('createOrderedList needs a render function');

    var items = (options.items || []).slice();
    var destroyed = false;

    var list = document.createElement('ol');
    list.className = 'jpk-ordered-list';

    function nameOf(item: T, index: number): string {
        return options.label ? options.label(item, index) : 'Item ' + (index + 1);
    }

    // Builds one row button for a direction, with its title, label, and click.
    function moveButton(item: T, index: number, delta: number): HTMLButtonElement {
        var up = delta < 0;
        var name = nameOf(item, index);
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'jpk-row-btn jpk-ordered-' + (up ? 'up' : 'down');
        btn.title = up ? (options.moveUpTitle || 'Move Up') : (options.moveDownTitle || 'Move Down');
        var label = up ? options.moveUpLabel : options.moveDownLabel;
        btn.setAttribute('aria-label', label ? label(name) : 'Move ' + name + (up ? ' up' : ' down'));
        btn.disabled = up ? index === 0 : index === items.length - 1;
        var icon = document.createElement('span');
        icon.className = 'material-icons';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = up ? 'keyboard_arrow_up' : 'keyboard_arrow_down';
        btn.appendChild(icon);
        btn.addEventListener('click', function () { move(index, index + delta); });
        return btn;
    }

    // Redraws every row from the items.
    function render(): void {
        list.innerHTML = '';
        items.forEach(function (item, index) {
            var row = document.createElement('li');
            row.className = 'jpk-ordered-item';
            var main = document.createElement('div');
            main.className = 'jpk-ordered-main';
            var content = options.render(item, index);
            if (content instanceof Node) main.appendChild(content);
            else if (typeof content === 'string') main.innerHTML = content;
            var arrows = document.createElement('div');
            arrows.className = 'jpk-ordered-arrows';
            arrows.appendChild(moveButton(item, index, -1));
            arrows.appendChild(moveButton(item, index, 1));
            row.appendChild(main);
            row.appendChild(arrows);
            list.appendChild(row);
        });
    }

    // Moves one item, redraws, reports it, and refocuses the pressed button of the moved row.
    function move(from: number, to: number): void {
        if (destroyed || from === to || to < 0 || to >= items.length) return;
        var moved = items.splice(from, 1)[0];
        items.splice(to, 0, moved);
        render();
        var row = list.children[to];
        var pressed = row && row.querySelector<HTMLButtonElement>(to < from ? '.jpk-ordered-up' : '.jpk-ordered-down');
        var other = row && row.querySelector<HTMLButtonElement>(to < from ? '.jpk-ordered-down' : '.jpk-ordered-up');
        var target = pressed && !pressed.disabled ? pressed : other;
        if (target && !target.disabled) target.focus();
        if (options.onMove) options.onMove(from, to, items.slice());
    }

    render();

    return {
        element: list,
        setItems: function (next: T[] | null) { items = (next || []).slice(); render(); },
        getItems: function () { return items.slice(); },
        destroy: function () { destroyed = true; list.innerHTML = ''; }
    };
}
