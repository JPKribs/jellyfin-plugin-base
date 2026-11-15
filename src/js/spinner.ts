import { make } from './dom-util.js';
import type { ComponentHandle } from './types.js';

/** What createSpinner takes. label is the text a screen reader reads. */
export interface SpinnerOptions {
    size?: 'small' | 'medium' | 'large' | string;
    label?: string;
}

/** What createSpinner returns. getValue returns the label, and setValue replaces it. */
export interface SpinnerHandle extends ComponentHandle {
    getValue(): string;
    setValue(label: string): void;
    destroy(): void;
}

/**
 * An inline spinner with a hidden status label. Its size is small, medium, or large.
 *
 * @param options {
 *   size  : 'small', 'medium', or 'large' (default 'medium')
 *   label : text a screen reader reads (default 'Loading')
 * }
 * @returns { element, getValue, setValue, destroy }. getValue returns the label, and setValue replaces it.
 */
export function createSpinner(options?: SpinnerOptions): SpinnerHandle {
    options = options || {};
    var size = options.size === 'small' || options.size === 'large' ? options.size : 'medium';
    var root = make('span', 'jpk-loading jpk-loading-' + size, { role: 'status' });
    var text = make('span', 'jpk-sr-only', null, options.label || 'Loading');
    root.appendChild(make('span', 'jpk-loading-ring', { 'aria-hidden': 'true' }));
    root.appendChild(text);
    return {
        element: root,
        getValue: function () { return text.textContent; },
        setValue: function (label) { text.textContent = label || ''; },
        destroy: function () { if (root.parentNode) root.parentNode.removeChild(root); }
    };
}
