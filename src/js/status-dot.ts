import { make, has } from './dom-util.js';
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

/**
 * A small round dot in a status color with a text name for it, as a title and as the accessible name.
 *
 * @param options {
 *   color : 'green', 'red', 'orange', 'purple', 'blue', 'gray', 'yellow', 'pink', or 'teal' (default 'gray')
 *   label : the name of the state (default the color's meaning, such as 'Active' for green)
 * }
 * @returns { element, getValue, setValue, destroy }. getValue returns { color, label }, and setValue takes the same shape.
 */
export function createStatusDot(options?: StatusDotOptions): StatusDotHandle {
    options = options || {};
    var root = make('span', 'jpk-dot', { role: 'img' });
    var state: { color: string; label: string } = { color: 'gray', label: '' };

    function setValue(next: StatusDotOptions): void {
        next = next || {};
        state.color = has(LABELS, next.color) ? next.color! : 'gray';
        state.label = next.label || LABELS[state.color];
        root.className = 'jpk-dot ' + state.color;
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
