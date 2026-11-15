import { make, icon, iconButton, nextId, listen, runAll, clear, claimEscape, placeBox, viewport } from './dom-util.js';
import type { ComponentHandle } from './types.js';

/** One action in an overflow menu. An item with no value reports its label. */
export interface OverflowMenuItem {
    label: string;
    value?: unknown;
    disabled?: boolean;
    destructive?: boolean;
    icon?: string;
}

/** What createOverflowMenu takes. onSelect runs with the chosen item's value and the item. */
export interface OverflowMenuOptions {
    items?: OverflowMenuItem[];
    label?: string;
    icon?: string;
    align?: 'start' | 'end';
    onSelect?(value: unknown, item: OverflowMenuItem): void;
}

/** What createOverflowMenu returns. */
export interface OverflowMenuHandle extends ComponentHandle {
    setItems(next: OverflowMenuItem[]): void;
    getItems(): OverflowMenuItem[];
    open(): void;
    close(): void;
    isOpen(): boolean;
    destroy(): void;
}

/**
 * A button, by default with the three dot icon, that opens a small menu of actions. Arrow keys move between the items, Enter and Space choose one, Escape closes the menu and returns focus to the button, and a click outside closes it.
 *
 * @param options {
 *   items    : array of { label, value, disabled, destructive, icon } [optional]
 *   label    : title and aria-label of the button and the menu (default 'More Actions')
 *   icon     : Material icon name on the button (default 'more_vert')
 *   align    : 'end' opens toward the left from the button's right edge, 'start' toward the right (default 'end')
 *   onSelect : function(value, item) called when an item is chosen [optional]
 * }
 * @returns { element, setItems, getItems, open, close, isOpen, destroy }.
 * An item with no value reports its label. A disabled item is skipped by the arrow keys.
 */
export function createOverflowMenu(options?: OverflowMenuOptions): OverflowMenuHandle {
    options = options || {};
    var items: OverflowMenuItem[] = (options.items || []).slice();
    var cleanups: Array<() => void> = [];
    var docCleanups: Array<() => void> = [];
    var isOpen: boolean = false;
    var label: string = options.label || 'More Actions';

    var root = make('div', 'jpk-menu' + (options.align === 'start' ? ' jpk-menu-start' : ''));
    var button = iconButton('jpk-row-btn jpk-menu-button', options.icon || 'more_vert', label);
    var list = make('div', 'jpk-menu-list', { role: 'menu', 'aria-label': label });
    list.id = nextId('menu');
    list.hidden = true;
    button.setAttribute('aria-haspopup', 'menu');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', list.id);
    root.appendChild(button);
    root.appendChild(list);

    function enabled(): HTMLButtonElement[] {
        return Array.prototype.filter.call(list.querySelectorAll<HTMLButtonElement>('.jpk-menu-item'), function (el: HTMLButtonElement): boolean { return !el.disabled; });
    }

    function focusAt(index: number): void {
        var all = enabled();
        if (!all.length) return;
        all[(index + all.length) % all.length].focus();
    }

    function render(): void {
        clear(list);
        items.forEach(function (item: OverflowMenuItem): void {
            var el = make('button', 'jpk-menu-item' + (item.destructive ? ' destructive' : ''), { type: 'button', role: 'menuitem', tabindex: '-1' });
            if (item.icon) el.appendChild(icon(item.icon));
            el.appendChild(make('span', 'jpk-menu-label', null, item.label));
            if (item.disabled) {
                el.disabled = true;
                el.setAttribute('aria-disabled', 'true');
            }
            el.addEventListener('click', function (): void {
                if (el.disabled) return;
                close(true);
                if (options!.onSelect) options!.onSelect(item.value === undefined ? item.label : item.value, item);
            });
            list.appendChild(el);
        });
    }

    // Fixed to the viewport so a panel or a scrolling area never clips it, below the button or above when there is no room.
    function place(): void {
        list.style.top = '0px';
        list.style.left = '0px';
        var box = list.getBoundingClientRect();
        var spot = placeBox(button.getBoundingClientRect(), { width: box.width, height: box.height }, viewport(), { align: options!.align === 'start' ? 'start' : 'end', gap: 4 });
        list.style.top = spot.top + 'px';
        list.style.left = spot.left + 'px';
    }

    function open(): void {
        if (isOpen) return;
        isOpen = true;
        list.hidden = false;
        claimEscape(root, true);
        place();
        docCleanups.push(listen(window, 'scroll', place, true));
        docCleanups.push(listen(window, 'resize', place));
        button.setAttribute('aria-expanded', 'true');
        docCleanups.push(listen(document, 'click', function (e: MouseEvent): void {
            if (!root.contains(e.target as Node)) close(false);
        }));
    }

    function close(refocus?: boolean): void {
        if (!isOpen) return;
        isOpen = false;
        list.hidden = true;
        claimEscape(root, false);
        button.setAttribute('aria-expanded', 'false');
        runAll(docCleanups);
        if (refocus) button.focus();
    }

    cleanups.push(listen(button, 'click', function (): void {
        if (isOpen) close(true);
        else { open(); focusAt(0); }
    }));

    cleanups.push(listen(button, 'keydown', function (e: KeyboardEvent): void {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            open();
            focusAt(e.key === 'ArrowDown' ? 0 : -1);
        } else if (e.key === 'Escape' && isOpen) {
            e.preventDefault();
            close(true);
        }
    }));

    cleanups.push(listen(list, 'keydown', function (e: KeyboardEvent): void {
        var all: HTMLButtonElement[] = enabled();
        var at: number = all.indexOf(e.target as HTMLButtonElement);
        if (e.key === 'ArrowDown') { e.preventDefault(); focusAt(at + 1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); focusAt(at - 1); }
        else if (e.key === 'Home') { e.preventDefault(); focusAt(0); }
        else if (e.key === 'End') { e.preventDefault(); focusAt(-1); }
        else if (e.key === 'Escape') { e.preventDefault(); close(true); }
        else if (e.key === 'Tab') close(false);
    }));

    render();

    return {
        element: root,
        setItems: function (next: OverflowMenuItem[]): void { items = (next || []).slice(); render(); },
        getItems: function (): OverflowMenuItem[] { return items.slice(); },
        open: open,
        close: function (): void { close(false); },
        isOpen: function (): boolean { return isOpen; },
        destroy: function (): void { runAll(docCleanups); runAll(cleanups); clear(list); }
    };
}
