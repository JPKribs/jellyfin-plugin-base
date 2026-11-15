import { make, clear } from './dom-util.js';

// createDefinitionList
// A read-only list of label and value pairs. The label sits beside its value and stacks above it on a narrow screen.
//
// Param: options | {
//   items     : array of { label, value, mono } where mono shows the value in the mono font [optional]
//   emptyText : text for a missing value (default 'None')
// }
// Returns { element, getValue, setValue, setItems, destroy }.
export function createDefinitionList(options) {
    options = options || {};
    var items = [];
    var root = make('dl', 'jpk-defs');

    function render() {
        clear(root);
        items.forEach(function (item) {
            var row = make('div', 'jpk-defs-row');
            row.appendChild(make('dt', 'jpk-defs-label', null, item.label));
            var missing = item.value === undefined || item.value === null || item.value === '';
            row.appendChild(make('dd', 'jpk-defs-value' + (item.mono && !missing ? ' jpk-mono' : '') + (missing ? ' jpk-defs-missing' : ''), null, missing ? (options.emptyText || 'None') : String(item.value)));
            root.appendChild(row);
        });
    }

    function setValue(next) { items = (next || []).slice(); render(); }
    setValue(options.items);

    return {
        element: root,
        getValue: function () { return items.slice(); },
        setValue: setValue,
        setItems: setValue,
        destroy: function () { clear(root); }
    };
}
