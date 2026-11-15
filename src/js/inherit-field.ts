import { make, listen, runAll, fill, toText, nextId } from './lib/dom.js';
import { makeCheck, makeCheckRow } from './lib/check.js';
import { bindPressedGroup } from './lib/pressed-group.js';
import type { ComponentHandle } from './types.js';

/** What an inherit field reports: whether it inherits, and its own value, kept while it inherits. */
export interface InheritValue<V = unknown> {
    inherit: boolean;
    value: V;
}

/** A Base field handle an inherit field can wrap, such as a Number Unit Field or a Color Picker. */
export interface InheritableHandle<V = unknown> {
    element: HTMLElement;
    getValue(): V;
    setValue(value: V): void;
}

/** What createInheritField takes. field is a select, text, number, or checkbox input, or a Base field handle. */
export interface InheritFieldOptions<V = unknown> {
    field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | InheritableHandle<V>;
    inheritedValue?: V;
    inheritedText?: string;
    value?: Partial<InheritValue<V>> | null;
    toggle?: 'pressed' | 'checkbox';
    inheritText?: string;
    overrideText?: string;
    onText?: string;
    offText?: string;
    label?: string;
    onChange?(value: InheritValue<V>): void;
}

/** What createInheritField returns. setInherited changes the value shown while inheriting. */
export interface InheritFieldHandle<V = unknown> extends ComponentHandle {
    getValue(): InheritValue<V>;
    setValue(next?: Partial<InheritValue<V>> | null): void;
    setInherited(value: V, text?: string): void;
    destroy(): void;
}

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function isControl(field: unknown): field is Control {
    var tag = field && (field as Element).tagName;
    return tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA';
}

/**
 * Wraps any field with an Inherit state. While it inherits, the field shows the inherited value, dimmed and disabled, and
 * the toggle reads 'Inherit (value)'. The Override choice turns the field back on with its own value, which is kept while
 * it inherits. The toggle is two pills on the pressed group, or a checkbox.
 *
 * @param options {
 *   field          : the select, text, number, or checkbox input, or a Base field handle { element, getValue, setValue } [required]
 *   inheritedValue : the value shown while inheriting [optional]
 *   inheritedText  : how the inherited value reads in the toggle (default the chosen option's text for a select, onText or offText for a checkbox, else the value)
 *   value          : { inherit, value } to start with (default inheriting, with the field's own value)
 *   toggle         : 'pressed' for Inherit and Override pills, or 'checkbox' for an Override checkbox (default 'pressed')
 *   inheritText    : the Inherit pill, with {value} as the inherited text (default 'Inherit ({value})')
 *   overrideText   : the Override pill or checkbox label (default 'Override')
 *   onText         : how a checked checkbox reads (default 'On')
 *   offText        : how a cleared checkbox reads (default 'Off')
 *   label          : aria-label of the toggle group [optional]
 *   onChange       : function({ inherit, value }) after each change [optional]
 * }
 * @returns { element, getValue, setValue, setInherited, destroy }. getValue returns { inherit, value }, where value is the field's own value even while it inherits.
 */
export function createInheritField<V = unknown>(options: InheritFieldOptions<V>): InheritFieldHandle<V> {
    var opts = options || ({} as InheritFieldOptions<V>);
    if (!opts.field) throw new Error('createInheritField needs a field');
    var field = opts.field;
    var control: Control | null = isControl(field) ? field : null;
    var checkbox = !!control && (control.getAttribute('type') || '') === 'checkbox';
    var holder = control && control.parentNode as HTMLElement | null;
    // A checkbox moves with the label it sits in, so its text stays beside it, and an adorned field moves with its box.
    var moves = !!holder && ((checkbox && holder.tagName === 'LABEL') || (!!holder.classList && holder.classList.contains('base-adorned')));
    var fieldEl: HTMLElement = control ? (moves ? holder as HTMLElement : control) : (field as InheritableHandle<V>).element;
    var cleanups: Array<() => void> = [];
    var inherited: V = opts.inheritedValue as V;
    var inheritedText: string | undefined = opts.inheritedText;
    var inherit = true;
    var own: V;

    function read(): V {
        if (!control) return (field as InheritableHandle<V>).getValue();
        return (checkbox ? (control as HTMLInputElement).checked : control.value) as unknown as V;
    }

    function write(v: V): void {
        if (!control) { (field as InheritableHandle<V>).setValue(v); return; }
        if (checkbox) (control as HTMLInputElement).checked = !!v;
        else control.value = toText(v);
    }

    // How the inherited value reads: a select's option text, On or Off for a checkbox, else the value.
    function shownText(): string {
        if (inheritedText !== undefined) return inheritedText;
        if (checkbox) return inherited ? opts.onText || 'On' : opts.offText || 'Off';
        if (control && control.tagName === 'SELECT') {
            var match = Array.prototype.filter.call((control as HTMLSelectElement).options, function (o: HTMLOptionElement) { return o.value === toText(inherited); })[0] as HTMLOptionElement | undefined;
            if (match) return toText(match.textContent);
        }
        return toText(inherited);
    }

    var root = make('div', 'base-inherit' + (checkbox ? ' check' : ''));
    var slot = make('div', 'base-inherit-field');
    if (fieldEl.parentNode) fieldEl.parentNode.insertBefore(root, fieldEl);
    slot.appendChild(fieldEl);
    root.appendChild(slot);

    var inheritPill: HTMLButtonElement | null = null;
    var overrideBox: HTMLInputElement | null = null;
    var group: ReturnType<typeof bindPressedGroup> | null = null;
    if (opts.toggle === 'checkbox') {
        overrideBox = makeCheck(null, { id: nextId('inherit') });
        root.appendChild(makeCheckRow(overrideBox, opts.overrideText || 'Override', 'base-inherit-toggle', 'base-check-text'));
        cleanups.push(listen(overrideBox, 'change', function () { apply(!overrideBox!.checked); changed(); }));
    } else {
        var pills = make('div', 'base-pill-group base-inherit-toggle', { role: 'group' });
        if (opts.label) pills.setAttribute('aria-label', opts.label);
        inheritPill = make('button', 'base-pill', { type: 'button', 'data-value': 'inherit', 'aria-pressed': 'false' });
        pills.appendChild(inheritPill);
        pills.appendChild(make('button', 'base-pill', { type: 'button', 'data-value': 'override', 'aria-pressed': 'false' }, opts.overrideText || 'Override'));
        root.appendChild(pills);
        group = bindPressedGroup(pills, { selector: '.base-pill', onChange: function (values) { apply(values[0] === 'inherit'); changed(); } });
        cleanups.push(group.destroy);
    }

    // The controls inside the field, with whether each was disabled before inheriting turned it off.
    var parts: Array<{ el: HTMLInputElement; was: boolean }> = [];

    function apply(next: boolean): void {
        var before = inherit;
        if (next && !before) own = read();
        inherit = next;
        root.classList.toggle('inheriting', inherit);
        if (inherit) {
            if (!before) {
                parts = Array.prototype.map.call(control ? [control] : fieldEl.querySelectorAll('input, select, textarea, button'), function (el: HTMLInputElement) { return { el: el, was: el.disabled }; }) as Array<{ el: HTMLInputElement; was: boolean }>;
                parts.forEach(function (p) { p.el.disabled = true; });
            }
            write(inherited);
        } else if (before) {
            parts.forEach(function (p) { p.el.disabled = p.was; });
            parts = [];
            write(own);
        }
        if (inheritPill) inheritPill.textContent = fill(opts.inheritText || 'Inherit ({value})', shownText());
        if (group) group.setValues([inherit ? 'inherit' : 'override']);
        if (overrideBox) overrideBox.checked = !inherit;
    }

    function value(): InheritValue<V> { return { inherit: inherit, value: inherit ? own : read() }; }

    function changed(): void { if (opts.onChange) opts.onChange(value()); }

    function setValue(next?: Partial<InheritValue<V>> | null): void {
        next = next || {};
        var wanted = next.inherit === undefined ? inherit : !!next.inherit;
        if (inherit && next.value !== undefined) own = next.value as V;
        apply(wanted);
        if (inherit && next.value !== undefined) own = next.value as V;
        if (!inherit && next.value !== undefined) write(next.value as V);
    }

    own = read();
    inherit = false;
    var start = opts.value || {};
    if (start.value !== undefined) own = start.value as V;
    write(own);
    apply(start.inherit !== false);

    return {
        element: root,
        getValue: value,
        setValue: setValue,
        setInherited: function (v: V, text?: string) {
            inherited = v;
            inheritedText = text;
            if (inherit) apply(true);
            else if (inheritPill) inheritPill.textContent = fill(opts.inheritText || 'Inherit ({value})', shownText());
        },
        destroy: function () {
            runAll(cleanups);
            if (inherit) { parts.forEach(function (p) { p.el.disabled = p.was; }); write(own); }
        }
    };
}
