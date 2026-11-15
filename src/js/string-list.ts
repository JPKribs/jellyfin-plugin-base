import { make, icon, iconButton, listen, runAll, clear, fill, claimEscape } from './dom-util.js';
import { createFieldMessage } from './field-message.js';
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
    emptyText?: string;
    duplicateText?: string;
    limitText?: string;
    duplicates?: boolean;
    reorder?: boolean;
    trim?: boolean;
    maxItems?: number;
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
 *   emptyText     : sentence shown while the list is empty [optional]
 *   duplicateText : message for a repeated value (default 'Already in the list.')
 *   limitText     : message when maxItems is reached (default 'The list is full.')
 *   duplicates    : true allows the same value twice (default false)
 *   reorder       : true adds up and down buttons (default false)
 *   trim          : true trims each value (default true)
 *   maxItems      : most rows allowed [optional]
 *   validate      : function(value) returning an error sentence, or an empty value when valid [optional]
 *   onChange      : function(values) [optional]
 * }
 * @returns { element, input, getValue, setValue, setItems, add, destroy }. add(value) returns true when the value was added and shows the error otherwise.
 */
export function createStringList(options?: StringListOptions): StringListHandle {
    options = options || {};
    var values: string[] = [];
    var cleanups: Array<() => void> = [];
    var trim = options.trim !== false;

    var root = make('div', 'jpk-string-list');
    var list = make('ul', 'jpk-string-items');
    var empty = make('div', 'jpk-string-empty', null, options.emptyText || '');
    var add = make('div', 'jpk-string-add');
    var input = make('input', '', { type: 'text', 'aria-label': options.inputLabel || 'New Item', autocomplete: 'off' });
    if (options.placeholder) input.setAttribute('placeholder', options.placeholder);
    var addButton = make('button', 'raised jpk-button-small', { type: 'button' }, options.addText || 'Add');
    var message = createFieldMessage({ input: input });
    add.appendChild(input);
    add.appendChild(addButton);
    root.appendChild(list);
    root.appendChild(empty);
    root.appendChild(add);
    root.appendChild(message.element);

    // Escape clears the input and its message, so the dialog leaves it alone while either shows.
    function reflectEscape(): void {
        claimEscape(input, input.value !== '' || !!message.getValue().state);
    }

    function changed(): void {
        render();
        if (options!.onChange) options!.onChange(values.slice());
    }

    function rowButton(className: string, iconName: string, label: string, handler: () => void, disabled?: boolean): HTMLButtonElement {
        var btn = iconButton('jpk-row-btn ' + className, iconName, label);
        btn.disabled = !!disabled;
        btn.addEventListener('click', handler);
        return btn;
    }

    function render(): void {
        clear(list);
        empty.hidden = values.length > 0 || !options!.emptyText;
        values.forEach(function (value, index) {
            var row = make('li', 'jpk-string-item');
            row.appendChild(make('span', 'jpk-string-text', null, value));
            if (options!.reorder) {
                row.appendChild(rowButton('jpk-string-up', 'keyboard_arrow_up', fill(options!.moveUpLabel || 'Move {value} up', value), function () { move(index, index - 1); }, index === 0));
                row.appendChild(rowButton('jpk-string-down', 'keyboard_arrow_down', fill(options!.moveDownLabel || 'Move {value} down', value), function () { move(index, index + 1); }, index === values.length - 1));
            }
            row.appendChild(rowButton('jpk-string-remove', 'close', fill(options!.removeLabel || 'Remove {value}', value), function () {
                values.splice(index, 1);
                message.clear();
                changed();
                input.focus();
                reflectEscape();
            }));
            list.appendChild(row);
        });
    }

    function move(from: number, to: number): void {
        if (to < 0 || to >= values.length) return;
        var moved = values.splice(from, 1)[0];
        values.splice(to, 0, moved);
        changed();
        var row = list.children[to];
        var target = row && row.querySelector<HTMLButtonElement>(to < from ? '.jpk-string-up' : '.jpk-string-down');
        if (!target || target.disabled) target = row && row.querySelector<HTMLButtonElement>(to < from ? '.jpk-string-down' : '.jpk-string-up');
        if (target && !target.disabled) target.focus();
    }

    function addValue(raw: unknown): boolean {
        var added = tryAdd(raw);
        reflectEscape();
        return added;
    }

    function tryAdd(raw: unknown): boolean {
        var value = raw === undefined || raw === null ? '' : String(raw);
        if (trim) value = value.trim();
        if (!value) return false;
        if (options!.maxItems && values.length >= options!.maxItems) {
            message.set('error', options!.limitText || 'The list is full.');
            return false;
        }
        if (!options!.duplicates && values.indexOf(value) !== -1) {
            message.set('error', options!.duplicateText || 'Already in the list.');
            return false;
        }
        var problem = options!.validate ? options!.validate(value) : '';
        if (problem) {
            message.set('error', problem);
            return false;
        }
        values.push(value);
        message.clear();
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
        else if (e.key === 'Escape') { input.value = ''; message.clear(); reflectEscape(); }
    }));
    cleanups.push(listen(input, 'input', function () { if (message.getValue().state) message.clear(); reflectEscape(); }));

    values = (options.values || []).map(String);
    render();

    function setValue(next: unknown[] | null): void { values = (next || []).map(String); message.clear(); render(); reflectEscape(); }

    return {
        element: root,
        input: input,
        getValue: function () { return values.slice(); },
        setValue: setValue,
        setItems: setValue,
        add: addValue,
        destroy: function () { runAll(cleanups); message.destroy(); }
    };
}
