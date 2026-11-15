import { make, icon, nextId, addToken, removeToken, has } from './dom-util.js';
import type { ComponentHandle } from './types.js';

/** A message state, such as 'error', 'warn', 'success', 'info', or '' for none, and its sentence. */
export interface FieldMessageValue {
    state: string;
    text: string;
}

/** What createFieldMessage takes. input is the field whose aria-invalid and aria-describedby it keeps in step. */
export interface FieldMessageOptions {
    state?: string;
    text?: string;
    input?: Element | null;
    id?: string;
}

/** What createFieldMessage and setFieldState return. */
export interface FieldMessageHandle extends ComponentHandle {
    getValue(): FieldMessageValue;
    setValue(value?: Partial<FieldMessageValue> | null): void;
    set(state?: string, text?: string): void;
    clear(): void;
    bind(target?: Element | null): void;
    destroy(): void;
}

var GLYPHS: Record<string, string> = { error: 'error', warn: 'warning', success: 'check_circle', info: 'info' };
var fieldMessages: WeakMap<Element, FieldMessageHandle> | null = typeof WeakMap === 'function' ? new WeakMap() : null;

/**
 * Builds a message for under a field, with a state of error, warn, success, or info. Bound to an input, it keeps aria-invalid and aria-describedby in step, and it is a persistent polite live region so a screen reader hears each change.
 *
 * @param options {
 *   state : 'error', 'warn', 'success', or 'info', or '' for none [optional]
 *   text  : the message sentence [optional]
 *   input : input, select, or textarea to wire with aria-invalid (error only) and aria-describedby [optional]
 *   id    : id for the message element (default generated) [optional]
 * }
 * @returns { element, getValue, setValue, set, clear, bind, destroy }. getValue returns { state, text }, and setValue takes the same shape.
 * The message shows nothing while it has no state or no text, and its element stays in the page as a live region.
 */
export function createFieldMessage(options?: FieldMessageOptions): FieldMessageHandle {
    options = options || {};
    var state: string = '';
    var text: string = '';
    var input: Element | null = null;

    // The element is the live region and stays in the page, since a region that appears with its text is often not announced. An empty message hides its parts instead.
    var el = make('div', 'jpk-field-message', { 'aria-live': 'polite' });
    el.id = options.id || nextId('message');
    var glyph = icon('');
    glyph.hidden = true;
    var textEl = make('span', 'jpk-field-message-text');
    el.appendChild(glyph);
    el.appendChild(textEl);

    // Draws the current state and keeps the bound input's aria attributes in step.
    function reflect(): void {
        var shown = !!(state && text);
        el.className = 'jpk-field-message' + (shown ? ' ' + state : '');
        glyph.hidden = !shown;
        textEl.hidden = !shown;
        glyph.textContent = shown && has(GLYPHS, state) ? GLYPHS[state] : '';
        textEl.textContent = shown ? text : '';
        if (!input) return;
        if (shown && state === 'error') input.setAttribute('aria-invalid', 'true');
        else input.removeAttribute('aria-invalid');
        if (shown) addToken(input, 'aria-describedby', el.id);
        else removeToken(input, 'aria-describedby', el.id);
    }

    function unbind(): void {
        if (!input) return;
        input.removeAttribute('aria-invalid');
        removeToken(input, 'aria-describedby', el.id);
        input = null;
    }

    function set(nextState?: string, nextText?: string): void {
        state = nextState || '';
        text = nextText || '';
        reflect();
    }

    var handle: FieldMessageHandle = {
        element: el,
        getValue: function () { return { state: state, text: text }; },
        setValue: function (value?: Partial<FieldMessageValue> | null) { value = value || {}; set(value.state, value.text); },
        set: set,
        clear: function () { set('', ''); },
        bind: function (target?: Element | null) { unbind(); input = target || null; reflect(); },
        destroy: function () { unbind(); if (el.parentNode) el.parentNode.removeChild(el); }
    };
    if (options.input) input = options.input;
    set(options.state, options.text);
    return handle;
}

/**
 * Shows a message under an input, creating it on first use, and wires aria-invalid and aria-describedby. An empty state clears the message and the attributes.
 *
 * @param input input, select, or textarea
 * @param state 'error', 'warn', 'success', or 'info', or '' to clear
 * @param text the message sentence [optional]
 * @returns the field message handle from createFieldMessage, the same one on every call for the input.
 */
export function setFieldState(input: Element, state: string, text?: string): FieldMessageHandle {
    var handle = fieldMessages && fieldMessages.get(input);
    if (!handle) {
        handle = createFieldMessage({ input: input });
        if (fieldMessages) fieldMessages.set(input, handle);
        if (input.parentNode) input.parentNode.insertBefore(handle.element, input.nextSibling || null);
    }
    handle.set(state, text);
    return handle;
}
