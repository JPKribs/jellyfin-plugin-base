import { make } from './lib/dom.js';
import type { ComponentHandle } from './types.js';

/** What createDivider takes. A divider without a label is a plain rule. */
export interface DividerOptions {
    label?: string;
}

/** What createDivider returns. getValue returns the label. */
export interface DividerHandle extends ComponentHandle {
    getValue(): string;
    setValue(label: string): void;
    destroy(): void;
}

/**
 * A horizontal rule with an optional label in the middle, with role separator.
 *
 * @param options { label: text in the middle [optional] }
 * @returns { element, getValue, setValue, destroy }. getValue returns the label.
 */
export function createDivider(options?: DividerOptions): DividerHandle {
    options = options || {};
    var root = make('div', 'base-divider', { role: 'separator' });
    var text = make('span', 'base-divider-label');
    root.appendChild(text);

    function setValue(label: string | undefined): void {
        text.textContent = label || '';
        root.classList.toggle('base-divider-plain', !label);
    }

    setValue(options.label);
    return {
        element: root,
        getValue: function () { return text.textContent; },
        setValue: setValue,
        destroy: function () { if (root.parentNode) root.parentNode.removeChild(root); }
    };
}
