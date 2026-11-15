import { make, has } from './lib/dom.js';
import { applyColor, isHexColor, colorClass, colorStyle } from './lib/color.js';
import { escapeHtml } from './browser-helpers.js';
import type { ComponentHandle } from './types.js';

/** What createStatusDot takes. The label defaults to the color's meaning. */
export interface StatusDotOptions {
    color?: 'green' | 'red' | 'orange' | 'purple' | 'blue' | 'gray' | 'yellow' | 'pink' | 'teal' | string;
    label?: string;
}

/** What createStatusDot returns. getValue returns the color and label as drawn. */
export interface StatusDotHandle extends ComponentHandle {
    getValue(): { color: string; label: string };
    setValue(next: StatusDotOptions): void;
    destroy(): void;
}

var LABELS: Record<string, string> = { green: 'Active', red: 'Error', orange: 'Waiting', purple: 'Working', blue: 'Info', gray: 'Off', yellow: 'Note', pink: 'Note', teal: 'Note' };

// Keeps a known color or hex code, else gray, and names it by the label or the color's meaning.
function dotState(color: unknown, label: unknown): { color: string; label: string } {
    var c = has(LABELS, color as string) || isHexColor(color) ? color as string : 'gray';
    return { color: c, label: label ? String(label) : LABELS[c] || 'Note' };
}

/**
 * Builds the markup of the dot createStatusDot draws, for a component that renders text. The label is escaped.
 * Internal to the web components.
 *
 * @param color a status color name or a hex code (default gray)
 * @param label the name of the state (default the color's meaning) [optional]
 * @returns the span markup
 */
export function statusDotHtml(color: unknown, label?: unknown): string {
    var state = dotState(color, label);
    var name = escapeHtml(state.label);
    return '<span class="base-dot ' + colorClass(state.color, 'gray') + '" role="img" title="' + name + '" aria-label="' + name + '"' + colorStyle(state.color) + '></span>';
}

/**
 * A small round dot in a status color with a text name for it, as a title and as the accessible name.
 *
 * @param options {
 *   color : 'green', 'red', 'orange', 'purple', 'blue', 'gray', 'yellow', 'pink', 'teal', or a hex code such as '#e91e63' (default 'gray')
 *   label : the name of the state (default the color's meaning, such as 'Active' for green)
 * }
 * @returns { element, getValue, setValue, destroy }. getValue returns { color, label }, and setValue takes the same shape.
 */
export function createStatusDot(options?: StatusDotOptions): StatusDotHandle {
    options = options || {};
    var root = make('span', 'base-dot', { role: 'img' });
    var state: { color: string; label: string } = { color: 'gray', label: '' };

    function setValue(next: StatusDotOptions): void {
        next = next || {};
        state = dotState(next.color, next.label);
        root.className = 'base-dot';
        applyColor(root, state.color, 'gray');
        root.title = state.label;
        root.setAttribute('aria-label', state.label);
    }

    setValue(options);
    return {
        element: root,
        getValue: function () { return { color: state.color, label: state.label }; },
        setValue: setValue,
        destroy: function () { if (root.parentNode) root.parentNode.removeChild(root); }
    };
}
