import { make, listen, runAll } from './lib/dom.js';
import { makeCheck, makeCheckRow } from './lib/check.js';
import type { ComponentHandle } from './types.js';

/** The three checkbox sizes. small is the plain box most pages use, and large is a tile that fills its row. */
export type CheckboxSize = 'small' | 'medium' | 'large';

/** What createCheckbox takes. label is the text beside the box, description a line under it, and ariaLabel names a box drawn with no text. */
export interface CheckboxOptions {
    label?: string;
    description?: string;
    size?: CheckboxSize;
    ariaLabel?: string;
    checked?: boolean;
    indeterminate?: boolean;
    disabled?: boolean;
    field?: boolean;
    boxed?: boolean;
    id?: string;
    name?: string;
    value?: string;
    className?: string;
    onChange?(checked: boolean): void;
}

/** What createCheckbox returns. */
export interface CheckboxHandle extends ComponentHandle {
    input: HTMLInputElement;
    getValue(): boolean;
    setValue(checked: boolean): void;
    setIndeterminate(on: boolean): void;
    setDisabled(disabled: boolean): void;
    setLabel(text: string): void;
    setDescription(text: string): void;
    destroy(): void;
}

/**
 * One checkbox in Base's own look, with its text beside it, built on the checkbox core every Base box shares. The box
 * fills with the accent and a drawn check while on, and shows a bar while partly on. A click anywhere on its text
 * toggles it. It comes in three sizes on the same scale as buttons: small, the plain box and text most pages use; medium,
 * a size up; and large, a bordered tile that fills the room its row has, outlined and washed in the accent while on.
 * With field, a small or medium box stands a field tall with the box centered, so it lines up beside text boxes and
 * selects in a row. With boxed, it sits in a frame drawn like a text box, the same height, border, and corners, so it
 * matches the fields beside it edge for edge. With no label, ariaLabel names it.
 *
 * @param options {
 *   label         : the text beside the box [optional]
 *   description   : a dimmed line under the label [optional]
 *   size          : 'small', 'medium', or 'large' (default 'small')
 *   ariaLabel     : the box's name when it has no label [optional]
 *   checked       : whether it starts on (default false)
 *   indeterminate : whether it starts partly on (default false)
 *   disabled      : whether it starts disabled (default false)
 *   field         : true stands a small or medium box a field tall, to sit in a row of fields (default false)
 *   boxed         : true frames a small or medium box and its text like a text box, a field tall (default false)
 *   id            : the input's id [optional]
 *   name          : the input's name [optional]
 *   value         : the input's value [optional]
 *   className     : extra classes for the row [optional]
 *   onChange      : function(checked) after the reader turns it on or off [optional]
 * }
 * @returns { element, input, getValue, setValue, setIndeterminate, setDisabled, setLabel, setDescription, destroy }
 */
export function createCheckbox(options?: CheckboxOptions): CheckboxHandle {
    var opts = options || {};
    var cleanups: Array<() => void> = [];
    var attrs: Record<string, unknown> = {};
    if (opts.id) attrs.id = opts.id;
    if (opts.name) attrs.name = opts.name;
    if (opts.value !== undefined) attrs.value = opts.value;
    if (!opts.label && opts.ariaLabel) { attrs['aria-label'] = opts.ariaLabel; attrs.title = opts.ariaLabel; }

    var size: CheckboxSize = opts.size === 'medium' || opts.size === 'large' ? opts.size : 'small';
    var input = makeCheck('base-checkbox-input', attrs);
    input.checked = !!opts.checked;
    input.indeterminate = !!opts.indeterminate;
    var root = makeCheckRow(input, null, 'base-checkbox ' + size + (opts.field && size !== 'large' ? ' field' : '') + (opts.boxed && size !== 'large' ? ' field boxed' : '') + (opts.className ? ' ' + opts.className : ''));
    // The text block the Checkbox List rows use: the label, with the description under it.
    var text = make('span', 'base-check-text');
    var labelEl = make('span', 'base-check-label');
    var descEl = make('span', 'base-check-sub');
    text.appendChild(labelEl);
    text.appendChild(descEl);

    function setText(label: string, description: string): void {
        labelEl.textContent = label;
        descEl.textContent = description;
        labelEl.hidden = !label;
        descEl.hidden = !description;
        if (label || description) {
            if (!text.parentNode) root.appendChild(text);
            input.removeAttribute('aria-label');
            input.removeAttribute('title');
        } else if (text.parentNode) {
            root.removeChild(text);
        }
    }
    setText(opts.label || '', opts.description || '');

    // A large tile shows its state on the whole tile, so it carries the state as a class.
    function paint(): void { root.classList.toggle('checked', input.checked); }
    paint();

    function setDisabled(disabled: boolean): void {
        input.disabled = !!disabled;
        root.classList.toggle('disabled', !!disabled);
    }
    setDisabled(!!opts.disabled);

    cleanups.push(listen(input, 'change', function () {
        input.indeterminate = false;
        paint();
        if (opts.onChange) opts.onChange(input.checked);
    }));

    return {
        element: root,
        input: input,
        getValue: function () { return input.checked; },
        setValue: function (checked) { input.checked = !!checked; input.indeterminate = false; paint(); },
        setIndeterminate: function (on) { input.indeterminate = !!on; },
        setDisabled: setDisabled,
        setLabel: function (label) { setText(label || '', descEl.textContent || ''); },
        setDescription: function (description) { setText(labelEl.textContent || '', description || ''); },
        destroy: function () { runAll(cleanups); }
    };
}
