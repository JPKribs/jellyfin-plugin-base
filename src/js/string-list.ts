import { make, iconButton, listen, runAll, fill, claimEscape, applyFieldSize } from './lib/dom.js';
import { moveButtons, refocusAfterMove } from './lib/row-editor.js';
import { createFieldMessage } from './field-message.js';
import { bindValidation } from './lib/validate.js';
import { createList, fillRowParts } from './list.js';
import type { ListHeight } from './list.js';
import type { ComponentHandle } from './types.js';

/** What createStringList takes. validate returns an error sentence for a value, or an empty value when it is valid. */
export interface StringListOptions {
    values?: unknown[];
    placeholder?: string;
    inputLabel?: string;
    addText?: string;
    removeLabel?: string;
    moveUpLabel?: string;
    moveDownLabel?: string;
    moveUpTitle?: string;
    moveDownTitle?: string;
    emptyText?: string;
    duplicateText?: string;
    limitText?: string;
    duplicates?: boolean;
    reorder?: boolean;
    trim?: boolean;
    maxItems?: number;
    height?: ListHeight;
    maxHeight?: number | string | null;
    minHeight?: number | string | null;
    size?: 'small' | 'medium' | 'large';
    validate?(value: string): string | null | undefined;
    onChange?(values: string[]): void;
}

/** What createStringList returns. add returns true when the value was added and shows the error otherwise. */
export interface StringListHandle extends ComponentHandle {
    input: HTMLInputElement;
    getValue(): string[];
    setValue(next: unknown[] | null): void;
    setItems(next: unknown[] | null): void;
    add(raw: unknown): boolean;
    setHeight(height: ListHeight, maxHeight?: number | string | null): void;
    destroy(): void;
}

/**
 * An editor for a list of strings. The user types a value and presses Add or Enter, and each row has a Remove button and, when reorder is on, up and down buttons.
 *
 * @param options {
 *   values        : array of strings [optional]
 *   placeholder   : a valid example for the input [optional]
 *   inputLabel    : aria-label of the input (default 'New Item')
 *   addText       : text of the add button (default 'Add')
 *   removeLabel   : aria-label of a remove button, where {value} is the row's text (default 'Remove {value}')
 *   moveUpLabel   : aria-label of an up button (default 'Move {value} up')
 *   moveDownLabel : aria-label of a down button (default 'Move {value} down')
 *   moveUpTitle   : tooltip of an up button (default 'Move Up')
 *   moveDownTitle : tooltip of a down button (default 'Move Down')
 *   emptyText     : sentence shown while the list is empty [optional]
 *   duplicateText : message for a repeated value (default 'Already in the list.')
 *   limitText     : message when maxItems is reached (default 'The list is full.')
 *   duplicates    : true allows the same value twice (default false)
 *   reorder       : true adds up and down buttons (default false)
 *   trim          : true trims each value (default true)
 *   maxItems      : most rows allowed [optional]
 *   height        : height of the rows, as createList takes it (default 'auto')
 *   maxHeight     : height past which the rows scroll [optional]
 *   minHeight     : least height of a filling list [optional]
 *   size          : 'small', 'medium', or 'large' for its fields (default 'medium')
 *   validate      : function(value) returning an error sentence, or an empty value when valid, checked through the validation core [optional]
 *   onChange      : function(values) [optional]
 * }
 * @returns { element, input, getValue, setValue, setItems, add, setHeight, destroy }. add(value) returns true when the value was added and shows the error otherwise.
 */
export function createStringList(options?: StringListOptions): StringListHandle {
    options = options || {};
    var values: string[] = [];
    var cleanups: Array<() => void> = [];
    var trim = options.trim !== false;

    var root = make('div', 'base-string-list');
    applyFieldSize(root, options.size);
    var list = make('ul', 'base-string-items');
    var add = make('div', 'base-string-add');
    var input = make('input', '', { type: 'text', 'aria-label': options.inputLabel || 'New Item', autocomplete: 'off' });
    if (options.placeholder) input.setAttribute('placeholder', options.placeholder);
    var addButton = make('button', 'raised base-button field', { type: 'button' }, options.addText || 'Add');
    var message = createFieldMessage({ input: input });
    add.appendChild(input);
    add.appendChild(addButton);

    // Escape clears the input and its message, so the dialog leaves it alone while either shows.
    function reflectEscape(): void {
        claimEscape(input, input.value !== '' || !!message.getValue().state);
    }

    function notify(): void {
        if (options!.onChange) options!.onChange(values.slice());
    }

    function changed(): void {
        render();
        notify();
    }

    function renderRow(value: string, index: number): HTMLLIElement {
        var row = make('li', 'base-string-item base-item-row');
        var text = make('span', 'base-string-text base-item-row-text');
        fillRowParts(text, { primary: value });
        row.appendChild(text);
        if (options!.reorder) {
            moveButtons({
                index: index, count: values.length, name: value, className: 'base-string',
                upTitle: options!.moveUpTitle, downTitle: options!.moveDownTitle,
                upLabel: options!.moveUpLabel, downLabel: options!.moveDownLabel,
                onMove: move
            }).forEach(function (btn) { row.appendChild(btn); });
        }
        var remove = iconButton('base-row-btn base-string-remove', 'close', fill(options!.removeLabel || 'Remove {value}', value));
        remove.addEventListener('click', function () {
            values.splice(index, 1);
            validation.clear();
            changed();
            input.focus();
            reflectEscape();
        });
        row.appendChild(remove);
        return row;
    }

    var rows = createList<string>({
        element: list,
        layout: 'plain',
        wrap: false,
        role: null,
        emptyText: options.emptyText || null,
        height: options.height,
        maxHeight: options.maxHeight,
        minHeight: options.minHeight,
        render: renderRow
    });
    rows.emptyElement.classList.add('base-string-empty');
    root.appendChild(list);
    root.appendChild(rows.emptyElement);
    root.appendChild(add);
    root.appendChild(message.element);

    function render(): void {
        rows.setItems(values);
    }

    function move(from: number, to: number): void {
        if (to < 0 || to >= values.length) return;
        var moved = values.splice(from, 1)[0];
        values.splice(to, 0, moved);
        render();
        refocusAfterMove(list, from, to);
        notify();
    }

    function addValue(raw: unknown): boolean {
        var added = tryAdd(raw);
        reflectEscape();
        return added;
    }

    function clean(raw: unknown): string {
        var value = raw === undefined || raw === null ? '' : String(raw);
        return trim ? value.trim() : value;
    }

    // Why a value cannot be added, or '' when it can.
    function problemOf(value: string): string {
        if (!value) return '';
        if (options!.maxItems && values.length >= options!.maxItems) return options!.limitText || 'The list is full.';
        if (!options!.duplicates && values.indexOf(value) !== -1) return options!.duplicateText || 'Already in the list.';
        return options!.validate ? options!.validate(value) || '' : '';
    }

    function tryAdd(raw: unknown): boolean {
        var value = clean(raw);
        if (!value) return false;
        var problem = problemOf(value);
        if (problem) {
            validation.show(problem);
            return false;
        }
        values.push(value);
        validation.clear();
        changed();
        return true;
    }

    function submit(): void {
        if (addValue(input.value)) input.value = '';
        input.focus();
        reflectEscape();
    }

    cleanups.push(listen(addButton, 'click', submit));
    cleanups.push(listen(input, 'keydown', function (e: KeyboardEvent) {
        if (e.key === 'Enter') { e.preventDefault(); submit(); }
        else if (e.key === 'Escape') { input.value = ''; validation.clear(); reflectEscape(); }
    }));
    cleanups.push(listen(input, 'input', function () { reflectEscape(); }));
    // The typed value is checked when the reader leaves the input, and again as it changes while an error shows.
    var validation = bindValidation(input, { message: message, validate: function (text) { return problemOf(clean(text)); } });
    cleanups.push(validation.destroy);

    values = (options.values || []).map(String);
    render();

    function setValue(next: unknown[] | null): void { values = (next || []).map(String); validation.clear(); render(); reflectEscape(); }

    return {
        element: root,
        input: input,
        getValue: function () { return values.slice(); },
        setValue: setValue,
        setItems: setValue,
        add: addValue,
        setHeight: function (height: ListHeight, maxHeight?: number | string | null) { rows.setHeight(height, maxHeight); },
        destroy: function () { runAll(cleanups); message.destroy(); rows.destroy(); }
    };
}
