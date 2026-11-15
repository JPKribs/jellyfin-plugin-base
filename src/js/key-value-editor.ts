import { buildRepeater } from './repeater.js';
import type { ListHeight } from './list.js';
import type { ComponentHandle } from './types.js';

/** One row of the editor, as getValue and onChange give it. */
export interface KeyValuePair {
    key: string;
    value: string;
}

/** Rows to load, as an array of key and value records or an object whose properties become rows. */
export type KeyValueSource = Array<{ key?: unknown; value?: unknown }> | Record<string, unknown>;

/** What createKeyValueEditor takes. validate returns an error sentence for a row, or an empty value when it is valid. */
export interface KeyValueEditorOptions {
    values?: KeyValueSource | null;
    keyLabel?: string;
    valueLabel?: string;
    showLabels?: boolean;
    keyPlaceholder?: string;
    valuePlaceholder?: string;
    addText?: string;
    removeLabel?: string;
    rowName?: string;
    requiredText?: string;
    duplicateText?: string;
    duplicateKeys?: boolean;
    maxRows?: number;
    limitText?: string;
    emptyText?: string;
    height?: ListHeight;
    maxHeight?: number | string | null;
    minHeight?: number | string | null;
    size?: 'small' | 'medium' | 'large';
    validate?(key: string, value: string, index: number): string | null | undefined;
    onChange?(values: KeyValuePair[]): void;
}

/** What createKeyValueEditor returns. isValid checks every row and shows its error. */
export interface KeyValueEditorHandle extends ComponentHandle {
    getValue(): KeyValuePair[];
    setValue(next: KeyValueSource | null): void;
    setItems(next: KeyValueSource | null): void;
    isValid(): boolean;
    addRow(data?: { key?: string; value?: string } | null): boolean;
    setHeight(height: ListHeight, maxHeight?: number | string | null): void;
    destroy(): void;
}

/**
 * Rows of a key input and a value input with Add and Remove, for headers, tags, and mappings. It is a Repeater of two text fields. Each row validates its key and value as it is typed, and a repeated key is an error unless duplicateKeys is on.
 *
 * @param options {
 *   values         : array of { key, value }, or an object whose properties become rows [optional]
 *   keyLabel       : column label and aria-label of the key inputs (default 'Key')
 *   valueLabel     : column label and aria-label of the value inputs (default 'Value')
 *   showLabels     : true shows the column labels above the rows (default true)
 *   keyPlaceholder : a valid example key [optional]
 *   valuePlaceholder : a valid example value [optional]
 *   addText        : text of the add button (default 'Add')
 *   removeLabel    : aria-label of a remove button, where {value} is the key or "Row 2" (default 'Remove {value}')
 *   rowName        : prefix of that fallback row name (default 'Row')
 *   requiredText   : message for a value with no key (default 'Enter a key.')
 *   duplicateText  : message for a repeated key (default 'Key is already used.')
 *   duplicateKeys  : true allows a repeated key (default false)
 *   maxRows        : most rows allowed, after which Add is disabled and the limit message shows [optional]
 *   limitText      : message when maxRows is reached (default 'No more rows can be added.')
 *   emptyText      : sentence shown while there is no row [optional]
 *   height         : height of the rows, as createList takes it (default 'auto')
 *   maxHeight      : height past which the rows scroll [optional]
 *   minHeight      : least height of a filling list [optional]
 *   size           : 'small', 'medium', or 'large' for its fields (default 'medium')
 *   validate       : function(key, value, index) returning an error sentence, or an empty value when valid [optional]
 *   onChange       : function(values) [optional]
 * }
 * @returns { element, getValue, setValue, setItems, isValid, addRow, setHeight, destroy }.
 * getValue returns an array of { key, value } and leaves out a row where both are empty. isValid() checks every row and shows its error.
 */
export function createKeyValueEditor(options?: KeyValueEditorOptions): KeyValueEditorHandle {
    var opts = options || {};
    var keyLabel = opts.keyLabel || 'Key';
    var valueLabel = opts.valueLabel || 'Value';

    function toRows(source: KeyValueSource | null | undefined): KeyValuePair[] {
        if (!source) return [];
        if (Array.isArray(source)) return source.map(function (r) { return { key: String(r.key == null ? '' : r.key), value: String(r.value == null ? '' : r.value) }; });
        return Object.keys(source).map(function (k) { return { key: k, value: String(source[k]) }; });
    }

    // One message under the key holds every problem of the row: a value with no key, a repeated key, then validate.
    function rowProblem(key: string, item: Record<string, any>, index: number): string {
        var trimmed = key.trim();
        var value = String(item.value == null ? '' : item.value);
        if (value !== '' && trimmed === '') return opts.requiredText || 'Enter a key.';
        var others = editor.rows().map(function (r) { return String(r.group.getValue().key).trim(); });
        if (trimmed !== '' && !opts.duplicateKeys && others.some(function (k, i) { return i !== index && k === trimmed; })) return opts.duplicateText || 'Key is already used.';
        if (opts.validate && (trimmed !== '' || value !== '')) return opts.validate(trimmed, value, index) || '';
        return '';
    }

    // The editor is a repeater of two text fields, with its own class names and every problem shown as it is typed.
    var editor = buildRepeater({
        fields: [
            { key: 'key', label: keyLabel, placeholder: opts.keyPlaceholder, validate: function (v, item, index) { return rowProblem(String(v), item, index); } },
            { key: 'value', label: valueLabel, placeholder: opts.valuePlaceholder }
        ],
        addText: opts.addText,
        removeText: opts.removeLabel,
        rowName: opts.rowName,
        showLabels: opts.showLabels,
        maxRows: opts.maxRows,
        limitText: opts.limitText,
        emptyText: opts.emptyText,
        height: opts.height,
        maxHeight: opts.maxHeight,
        minHeight: opts.minHeight,
        size: opts.size,
        onChange: function (value) { if (opts.onChange) opts.onChange(value as KeyValuePair[]); }
    }, {
        rootClass: 'base-kv-editor',
        headClass: 'base-kv-head',
        rowsClass: 'base-kv-rows',
        rowClass: 'base-kv-row',
        addClass: 'base-kv-add',
        removeClass: 'base-kv-remove',
        emptyClass: 'base-kv-empty',
        cellClass: { key: 'base-kv-key', value: 'base-kv-value' },
        eager: true
    });

    function setValue(next: KeyValueSource | null | undefined): void { editor.setValue(toRows(next)); }

    setValue(opts.values);

    return {
        element: editor.element,
        getValue: function () { return editor.getValue() as KeyValuePair[]; },
        setValue: setValue,
        setItems: setValue,
        isValid: function () { return editor.checkAll(false); },
        addRow: function (data?: { key?: string; value?: string } | null) { return editor.addRow(data || null); },
        setHeight: function (height: ListHeight, maxHeight?: number | string | null) { editor.setHeight(height, maxHeight); },
        destroy: function () { editor.destroy(); }
    };
}
