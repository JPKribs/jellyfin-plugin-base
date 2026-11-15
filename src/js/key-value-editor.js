import { make, iconButton, listen, runAll, clear, fill } from './dom-util.js';
import { createFieldMessage } from './field-message.js';

// createKeyValueEditor
// Rows of a key input and a value input with Add and Remove, for headers, tags, and mappings. Each row validates its key and value, and a repeated key is an error unless duplicateKeys is on.
//
// Param: options | {
//   values         : array of { key, value }, or an object whose properties become rows [optional]
//   keyLabel       : column label and aria-label of the key inputs (default 'Key')
//   valueLabel     : column label and aria-label of the value inputs (default 'Value')
//   showLabels     : true shows the column labels above the rows (default true)
//   keyPlaceholder : a valid example key [optional]
//   valuePlaceholder : a valid example value [optional]
//   addText        : text of the add button (default 'Add')
//   removeLabel    : aria-label of a remove button, where {value} is the key or "Row 2" (default 'Remove {value}')
//   rowName        : prefix of that fallback row name (default 'Row')
//   requiredText   : message for a value with no key (default 'Enter a key.')
//   duplicateText  : message for a repeated key (default 'Key is already used.')
//   duplicateKeys  : true allows a repeated key (default false)
//   maxRows        : most rows allowed, after which Add is disabled and the limit message shows [optional]
//   limitText      : message when maxRows is reached (default 'No more rows can be added.')
//   validate       : function(key, value, index) returning an error sentence, or an empty value when valid [optional]
//   onChange       : function(values) [optional]
// }
// Returns { element, getValue, setValue, setItems, isValid, addRow, destroy }.
// getValue returns an array of { key, value } and leaves out a row where both are empty. isValid() checks every row and shows its error.
export function createKeyValueEditor(options) {
    options = options || {};
    var cleanups = [];
    var rows = [];

    var root = make('div', 'jpk-kv-editor');
    var head = make('div', 'jpk-kv-head');
    head.appendChild(make('span', '', null, options.keyLabel || 'Key'));
    head.appendChild(make('span', '', null, options.valueLabel || 'Value'));
    head.hidden = options.showLabels === false;
    var body = make('div', 'jpk-kv-rows');
    var addButton = make('button', 'raised jpk-button-small jpk-kv-add', { type: 'button' }, options.addText || 'Add');
    root.appendChild(head);
    root.appendChild(body);
    root.appendChild(addButton);
    var limit = createFieldMessage();
    root.appendChild(limit.element);

    function toRows(source) {
        if (!source) return [];
        if (Array.isArray(source)) return source.map(function (r) { return { key: String(r.key == null ? '' : r.key), value: String(r.value == null ? '' : r.value) }; });
        return Object.keys(source).map(function (k) { return { key: k, value: String(source[k]) }; });
    }

    function snapshot() {
        return rows.map(function (r) { return { key: r.key.value, value: r.value.value }; })
            .filter(function (r) { return r.key !== '' || r.value !== ''; });
    }

    // Validates one row against the others, shows its message, and returns whether it is valid.
    function check(row) {
        var key = row.key.value.trim();
        var problem = '';
        if (row.value.value !== '' && key === '') problem = options.requiredText || 'Enter a key.';
        else if (key !== '' && !options.duplicateKeys && rows.some(function (r) { return r !== row && r.key.value.trim() === key; })) problem = options.duplicateText || 'Key is already used.';
        else if (options.validate && (key !== '' || row.value.value !== '')) problem = options.validate(key, row.value.value, rows.indexOf(row)) || '';
        row.message.set(problem ? 'error' : '', problem);
        return !problem;
    }

    // Disables Add and says why once maxRows is reached, and lifts both when a row goes.
    function syncLimit() {
        var full = !!(options.maxRows && rows.length >= options.maxRows);
        addButton.disabled = full;
        if (full) limit.set('info', options.limitText || 'No more rows can be added.');
        else limit.clear();
    }

    function changed() {
        rows.forEach(check);
        if (options.onChange) options.onChange(snapshot());
    }

    function addRow(data, silent) {
        if (options.maxRows && rows.length >= options.maxRows) return null;
        data = data || {};
        var el = make('div', 'jpk-kv-row');
        var key = make('input', '', { type: 'text', 'aria-label': options.keyLabel || 'Key', autocomplete: 'off' });
        var value = make('input', '', { type: 'text', 'aria-label': options.valueLabel || 'Value', autocomplete: 'off' });
        if (options.keyPlaceholder) key.setAttribute('placeholder', options.keyPlaceholder);
        if (options.valuePlaceholder) value.setAttribute('placeholder', options.valuePlaceholder);
        key.value = data.key || '';
        value.value = data.value || '';
        var message = createFieldMessage({ input: key });
        var remove = iconButton('jpk-row-btn jpk-kv-remove', 'close', '');
        var row = { el: el, key: key, value: value, message: message, remove: remove, off: [] };
        function label() {
            var name = row.key.value.trim() || ((options.rowName || 'Row') + ' ' + (rows.indexOf(row) + 1));
            var text = fill(options.removeLabel || 'Remove {value}', name);
            remove.title = text;
            remove.setAttribute('aria-label', text);
        }
        row.label = label;
        row.off.push(listen(key, 'input', function () { label(); changed(); }));
        row.off.push(listen(value, 'input', changed));
        row.off.push(listen(remove, 'click', function () {
            var at = rows.indexOf(row);
            dropRow(row);
            changed();
            var next = rows[Math.min(at, rows.length - 1)];
            (next ? next.key : addButton).focus();
        }));
        var cell = make('div', 'jpk-kv-key');
        cell.appendChild(key);
        cell.appendChild(message.element);
        el.appendChild(cell);
        el.appendChild(value);
        el.appendChild(remove);
        rows.push(row);
        body.appendChild(el);
        label();
        syncLimit();
        if (!silent) changed();
        return row;
    }

    function dropRow(row) {
        runAll(row.off);
        row.message.destroy();
        body.removeChild(row.el);
        rows.splice(rows.indexOf(row), 1);
        rows.forEach(function (r) { r.label(); });
        syncLimit();
    }

    function setValue(next) {
        rows.slice().forEach(dropRow);
        clear(body);
        toRows(next).forEach(function (r) { addRow(r, true); });
        rows.forEach(check);
        syncLimit();
    }

    cleanups.push(listen(addButton, 'click', function () {
        var row = addRow();
        if (row) row.key.focus();
    }));

    setValue(options.values);

    return {
        element: root,
        getValue: snapshot,
        setValue: setValue,
        setItems: setValue,
        isValid: function () { return rows.map(check).every(Boolean); },
        addRow: function (data) { return !!addRow(data); },
        destroy: function () { rows.slice().forEach(dropRow); runAll(cleanups); limit.destroy(); }
    };
}
