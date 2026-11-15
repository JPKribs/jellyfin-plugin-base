import { make, icon, listen, runAll, clear } from './dom-util.js';
import type { ComponentHandle } from './types.js';

/** One place in a breadcrumb trail. An item with an href is a link, and one without is a button. */
export interface BreadcrumbItem {
    label?: string;
    value?: unknown;
    href?: string;
}

/** What createBreadcrumbs takes. onSelect gets the item's value, or its label when it has none. */
export interface BreadcrumbsOptions {
    items?: BreadcrumbItem[];
    navLabel?: string;
    onSelect?(value: unknown, item: BreadcrumbItem): void;
}

/** What createBreadcrumbs returns. setItems is the same function as setValue. */
export interface BreadcrumbsHandle extends ComponentHandle {
    getValue(): BreadcrumbItem[];
    setValue(next: BreadcrumbItem[]): void;
    setItems(next: BreadcrumbItem[]): void;
    destroy(): void;
}

/**
 * A trail of places ending at the current one. An item with an href is a link and an item without one is a button that reports itself, and the last item is the current page and is not a control.
 *
 * @param options {
 *   items    : array of { label, value, href } [optional]
 *   navLabel : aria-label of the nav (default 'Breadcrumb')
 *   onSelect : function(value, item) called when a button item is pressed [optional]
 * }
 * @returns { element, getValue, setValue, setItems, destroy }.
 * An item with no value reports its label.
 */
export function createBreadcrumbs(options?: BreadcrumbsOptions): BreadcrumbsHandle {
    options = options || {};
    var items: BreadcrumbItem[] = [];
    var cleanups: Array<() => void> = [];

    var root = make('nav', 'jpk-breadcrumbs', { 'aria-label': options.navLabel || 'Breadcrumb' });
    var list = make('ol', 'jpk-breadcrumb-list');
    root.appendChild(list);

    function render(): void {
        clear(list);
        items.forEach(function (item, index) {
            var li = make('li', 'jpk-breadcrumb');
            if (index === items.length - 1) {
                li.appendChild(make('span', 'jpk-breadcrumb-current', { 'aria-current': 'page' }, item.label));
            } else {
                var control = item.href
                    ? make('a', 'jpk-breadcrumb-link', { href: item.href }, item.label)
                    : make('button', 'jpk-breadcrumb-link', { type: 'button' }, item.label);
                if (!item.href) control.addEventListener('click', function () { if (options!.onSelect) options!.onSelect(item.value === undefined ? item.label : item.value, item); });
                li.appendChild(control);
                li.appendChild(icon('chevron_right'));
            }
            list.appendChild(li);
        });
    }

    function setValue(next: BreadcrumbItem[] | undefined): void { items = (next || []).slice(); render(); }
    setValue(options.items);

    return {
        element: root,
        getValue: function () { return items.slice(); },
        setValue: setValue,
        setItems: setValue,
        destroy: function () { runAll(cleanups); clear(list); }
    };
}
