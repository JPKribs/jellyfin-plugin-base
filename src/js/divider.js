import { make } from './dom-util.js';

// createDivider
// A horizontal rule with an optional label in the middle, with role separator.
//
// Param: options | { label: text in the middle [optional] }
// Returns { element, getValue, setValue, destroy }. getValue returns the label.
export function createDivider(options) {
    options = options || {};
    var root = make('div', 'jpk-divider', { role: 'separator' });
    var text = make('span', 'jpk-divider-label');
    root.appendChild(text);

    function setValue(label) {
        text.textContent = label || '';
        root.classList.toggle('jpk-divider-plain', !label);
    }

    setValue(options.label);
    return {
        element: root,
        getValue: function () { return text.textContent; },
        setValue: setValue,
        destroy: function () { if (root.parentNode) root.parentNode.removeChild(root); }
    };
}
