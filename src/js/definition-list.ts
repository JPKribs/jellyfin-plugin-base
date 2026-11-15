import { make, clear } from './dom-util.js';
import type { ComponentHandle } from './types.js';

/** One label and value pair. mono shows the value in the mono font. */
export interface DefinitionItem {
    label?: string;
    value?: unknown;
    mono?: boolean;
}

/** What createDefinitionList takes. emptyText stands in for a missing value. */
export interface DefinitionListOptions {
    items?: DefinitionItem[];
    emptyText?: string;
}

/** What createDefinitionList returns. setItems is the same function as setValue. */
export interface DefinitionListHandle extends ComponentHandle {
    getValue(): DefinitionItem[];
    setValue(next: DefinitionItem[]): void;
    setItems(next: DefinitionItem[]): void;
    destroy(): void;
}

/**
 * A read-only list of label and value pairs. The label sits beside its value and stacks above it on a narrow screen.
 *
 * @param options {
 *   items     : array of { label, value, mono } where mono shows the value in the mono font [optional]
 *   emptyText : text for a missing value (default 'None')
 * }
 * @returns { element, getValue, setValue, setItems, destroy }.
 */
export function createDefinitionList(options?: DefinitionListOptions): DefinitionListHandle {
    options = options || {};
    var items: DefinitionItem[] = [];
    var root = make('dl', 'jpk-defs');

    function render(): void {
        clear(root);
        items.forEach(function (item) {
            var row = make('div', 'jpk-defs-row');
            row.appendChild(make('dt', 'jpk-defs-label', null, item.label));
            var missing = item.value === undefined || item.value === null || item.value === '';
            row.appendChild(make('dd', 'jpk-defs-value' + (item.mono && !missing ? ' jpk-mono' : '') + (missing ? ' jpk-defs-missing' : ''), null, missing ? (options!.emptyText || 'None') : String(item.value)));
            root.appendChild(row);
        });
    }

    function setValue(next: DefinitionItem[] | undefined): void { items = (next || []).slice(); render(); }
    setValue(options.items);

    return {
        element: root,
        getValue: function () { return items.slice(); },
        setValue: setValue,
        setItems: setValue,
        destroy: function () { clear(root); }
    };
}
