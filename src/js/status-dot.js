import { make, has } from './dom-util.js';

var LABELS = { green: 'Active', red: 'Error', orange: 'Waiting', purple: 'Working', blue: 'Info', gray: 'Off', yellow: 'Note', pink: 'Note', teal: 'Note' };

// createStatusDot
// A small round dot in a status color with a text name for it, as a title and as the accessible name.
//
// Param: options | {
//   color : 'green', 'red', 'orange', 'purple', 'blue', 'gray', 'yellow', 'pink', or 'teal' (default 'gray')
//   label : the name of the state (default the color's meaning, such as 'Active' for green)
// }
// Returns { element, getValue, setValue, destroy }. getValue returns { color, label }, and setValue takes the same shape.
export function createStatusDot(options) {
    options = options || {};
    var root = make('span', 'jpk-dot', { role: 'img' });
    var state = { color: 'gray', label: '' };

    function setValue(next) {
        next = next || {};
        state.color = has(LABELS, next.color) ? next.color : 'gray';
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
