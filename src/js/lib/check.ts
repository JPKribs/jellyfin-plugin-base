// The checkbox core: the one checkbox and radio input Base draws, and the row label that holds one beside its text. The
// Checkbox component, the Filtered List's row and select all checks, the filter panel, the tree view, the inherit field,
// and the log viewer all build their boxes here, so every box looks and behaves the same. None of it is exported from
// the bundle.
import { make } from './dom.js';

/**
 * Makes a checkbox, or a radio, in Base's own look: an outlined box that fills with the accent and a drawn check while
 * on, a bar while partly on, and a dot for a radio.
 *
 * @param className extra classes for the input [optional]
 * @param attrs attributes for the input, such as name, data-id, or aria-label [optional]
 * @param type 'checkbox' or 'radio' (default 'checkbox')
 * @returns the input
 */
export function makeCheck(className?: string | null, attrs?: Record<string, unknown> | null, type?: 'checkbox' | 'radio'): HTMLInputElement {
    var all: Record<string, unknown> = { type: type || 'checkbox' };
    if (attrs) Object.keys(attrs).forEach(function (k) { all[k] = attrs[k]; });
    return make('input', 'base-check-row-input' + (className ? ' ' + className : ''), all);
}

/**
 * Wraps a check in a row label with its text after it, so a click anywhere on the row toggles the box.
 *
 * @param check the input from makeCheck
 * @param text the text beside the box, or null for none
 * @param className extra classes for the row [optional]
 * @param textClass the text's class (default 'base-check-label')
 * @returns the row label
 */
export function makeCheckRow(check: HTMLInputElement, text: string | null, className?: string | null, textClass?: string): HTMLLabelElement {
    var row = make('label', 'base-check-row' + (className ? ' ' + className : ''));
    row.appendChild(check);
    if (text !== null && text !== undefined && text !== '') row.appendChild(make('span', textClass || 'base-check-label', null, text));
    return row;
}
