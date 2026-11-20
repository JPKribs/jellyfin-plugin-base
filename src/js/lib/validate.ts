// validate.ts
// The validation core every Base field checks through. Rules come from a field's own attributes, plus an optional
// validate function, and an error shows through the Field Message under the field.

import { listen, runAll, fillAll, toText } from './dom.js';
import { setFieldState, fieldMessageOf, placeMessage } from '../field-message.js';
import type { FieldMessageHandle } from '../field-message.js';
import { baseText, labelText } from './base-text.js';
import type { BASE_TEXT } from './base-text.js';

/** A field the core checks: an input, a select, or a text area. */
export type ValidatedField = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

/** The rules a field is checked against. Each one reads from the field's attribute of the same name unless given. */
export interface ValidationRules {
    required?: boolean;
    min?: number | string | null;
    max?: number | string | null;
    step?: number | string | null;
    minLength?: number | string | null;
    maxLength?: number | string | null;
    pattern?: string | RegExp | null;
    type?: string | null;
}

/** The sentences the core shows. {min}, {max}, {step}, {minLength}, {maxLength}, {kind}, and {noun} are filled in. */
export interface ValidationMessages {
    required?: string;
    requiredNoun?: string;
    select?: string;
    check?: string;
    number?: string;
    whole?: string;
    step?: string;
    range?: string;
    rangeNoun?: string;
    min?: string;
    minNoun?: string;
    max?: string;
    maxNoun?: string;
    minLength?: string;
    maxLength?: string;
    pattern?: string;
    url?: string;
    email?: string;
    time?: string;
    date?: string;
    between?: string;
    earliest?: string;
    latest?: string;
}

/** What bindValidation and validateValue take. noun names the value in a message, such as 'port', and true reads it from the field's label. */
export interface ValidationOptions {
    rules?: ValidationRules;
    messages?: ValidationMessages;
    noun?: string | boolean;
    message?: FieldMessageHandle | null;
    inputs?: Element[];
    value?(): string;
    validate?(value: string, input: Element): string | null | undefined;
}

/** What bindValidation returns. check shows the result, isValid only reads it, and show and clear set the message by hand. */
export interface ValidationHandle {
    input: Element;
    check(): boolean;
    isValid(): boolean;
    show(text: string): void;
    clear(): void;
    destroy(): void;
}

/** The default sentences, in plain Base wording. A sentence left as shipped shows in the page's language. */
export var VALIDATION_MESSAGES: Required<ValidationMessages> = {
    required: 'Fill this in.',
    requiredNoun: 'Enter {noun}.',
    select: 'Select an option.',
    check: 'Check this box.',
    number: 'Enter a number.',
    whole: 'Enter a whole number.',
    step: 'Enter a multiple of {step}.',
    range: 'Enter a number from {min} to {max}.',
    rangeNoun: 'Enter {noun} from {min} to {max}.',
    min: 'Enter {min} or more.',
    minNoun: 'Enter {noun} of {min} or more.',
    max: 'Enter {max} or less.',
    maxNoun: 'Enter {noun} of {max} or less.',
    minLength: 'Enter at least {minLength} characters.',
    maxLength: 'Enter no more than {maxLength} characters.',
    pattern: 'Check the format.',
    url: 'Enter a web address.',
    email: 'Enter an email address.',
    time: 'Enter a time.',
    date: 'Enter a date.',
    between: 'Enter a {kind} from {min} to {max}.',
    earliest: 'Enter {min} or later.',
    latest: 'Enter {max} or earlier.'
};

var SHIPPED: Required<ValidationMessages> = Object.assign({}, VALIDATION_MESSAGES);

var MESSAGE_TEXT: Record<keyof ValidationMessages, keyof typeof BASE_TEXT> = {
    required: 'Base.ValidateRequired', requiredNoun: 'Base.ValidateRequiredNoun', select: 'Base.ValidateSelect', check: 'Base.ValidateCheck',
    number: 'Base.ValidateNumber', whole: 'Base.ValidateWhole', step: 'Base.ValidateStep', range: 'Base.ValidateRange',
    rangeNoun: 'Base.ValidateRangeNoun', min: 'Base.ValidateMin', minNoun: 'Base.ValidateMinNoun', max: 'Base.ValidateMax',
    maxNoun: 'Base.ValidateMaxNoun', minLength: 'Base.ValidateMinLength', maxLength: 'Base.ValidateMaxLength', pattern: 'Base.ValidatePattern',
    url: 'Base.ValidateUrl', email: 'Base.ValidateEmail', time: 'Base.ValidateTime', date: 'Base.ValidateDate', between: 'Base.ValidateBetween',
    earliest: 'Base.ValidateEarliest', latest: 'Base.ValidateLatest'
};

// The sentences in use: each as shipped in the page's language, or as the page replaced it in VALIDATION_MESSAGES.
function currentMessages(): Required<ValidationMessages> {
    var m = {} as Required<ValidationMessages>;
    (Object.keys(MESSAGE_TEXT) as Array<keyof ValidationMessages>).forEach(function (k) {
        m[k] = VALIDATION_MESSAGES[k] === SHIPPED[k] ? baseText(MESSAGE_TEXT[k]) : VALIDATION_MESSAGES[k];
    });
    return m;
}

var SKIPPED_TYPES = ['hidden', 'button', 'submit', 'reset', 'image', 'file', 'search'];
var TYPED = ['number', 'url', 'email', 'time', 'date'];
var URL_TEXT = /^[a-z][a-z0-9+.-]*:\/\/[^\s/?#]+\S*$/i;
var EMAIL_TEXT = /^[^\s@]+@[^\s@]+$/;
var TIME_TEXT = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d(\.\d+)?)?$/;
var DATE_TEXT = /^(\d{4,})-(\d{2})-(\d{2})$/;

var byField: WeakMap<Element, ValidationHandle> = new WeakMap();

function attr(input: Element, name: string): string | null {
    var v = input.getAttribute(name);
    return v === null || v === '' ? null : v;
}

/**
 * Reads the rules a field carries in its attributes: required, min, max, step, minlength, maxlength, pattern, and type.
 *
 * @param input the field
 * @returns the rules, with each missing one left out
 */
export function readRules(input: Element): ValidationRules {
    var rules: ValidationRules = {};
    if (input.hasAttribute('required')) rules.required = true;
    if (attr(input, 'min') !== null) rules.min = attr(input, 'min');
    if (attr(input, 'max') !== null) rules.max = attr(input, 'max');
    if (attr(input, 'step') !== null) rules.step = attr(input, 'step');
    if (attr(input, 'minlength') !== null) rules.minLength = attr(input, 'minlength');
    if (attr(input, 'maxlength') !== null) rules.maxLength = attr(input, 'maxlength');
    if (attr(input, 'pattern') !== null) rules.pattern = attr(input, 'pattern');
    var type = (input.getAttribute('type') || '').toLowerCase();
    if (TYPED.indexOf(type) !== -1) rules.type = type;
    return rules;
}

/**
 * Says whether a field carries a rule the core checks, so createConfigPage and validateAll bind it without being asked.
 *
 * @param input the field
 */
export function hasRules(input: Element): boolean {
    var tag = input.tagName;
    if (tag !== 'INPUT' && tag !== 'SELECT' && tag !== 'TEXTAREA') return false;
    if (SKIPPED_TYPES.indexOf((input.getAttribute('type') || '').toLowerCase()) !== -1) return false;
    var rules = readRules(input);
    return Object.keys(rules).length > 0;
}

function num(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    var n = typeof value === 'number' ? value : parseFloat(String(value));
    return isFinite(n) ? n : null;
}

function realDate(text: string): boolean {
    var m = DATE_TEXT.exec(text);
    if (!m) return false;
    var month = parseInt(m[2], 10);
    var day = parseInt(m[3], 10);
    if (month < 1 || month > 12 || day < 1) return false;
    var days = new Date(Date.UTC(parseInt(m[1], 10), month, 0)).getUTCDate();
    return day <= days;
}

// The noun with its article, such as 'a port' or 'an hour'. A noun that already starts with an article stays.
function withArticle(noun: string): string {
    if (/^(a|an|the)\s/i.test(noun)) return noun;
    return (/^[aeiou]/i.test(noun) ? 'an ' : 'a ') + noun;
}

// The noun a message names, from the option, the field's data-base-label, or its label with true.
function nounOf(input: Element | null, noun: string | boolean | undefined): string {
    if (typeof noun === 'string') return noun;
    if (!input) return '';
    var named = input.getAttribute('data-base-label');
    if (named) return named;
    if (noun !== true) return '';
    var id = input.getAttribute('id');
    var label: Element | null = id && typeof document !== 'undefined' ? document.querySelector('label[for="' + id + '"]') : null;
    if (!label && input.closest) label = input.closest('label');
    var text = label ? toText(label.textContent).trim() : (input.getAttribute('aria-label') || '');
    return labelText(text, true);
}

/**
 * Checks one value against rules and returns the first problem as a sentence, or '' when the value is valid.
 * An empty value fails only required. The validate function runs last, on any value, once the rules pass.
 *
 * @param value the text to check
 * @param rules the rules, as readRules returns them
 * @param options { messages, noun, validate } [optional]
 * @param input the field the value came from, passed to validate and read for its noun [optional]
 * @returns the message, or ''
 */
export function validateValue(value: string, rules: ValidationRules, options?: ValidationOptions | null, input?: Element | null): string {
    options = options || {};
    var m: Required<ValidationMessages> = Object.assign(currentMessages(), options.messages || {});
    var noun = nounOf(input || null, options.noun);
    var named = noun ? withArticle(noun) : '';
    var text = toText(value);
    var type = (rules.type || '').toLowerCase();
    var tag = input ? input.tagName : '';
    var problem = '';
    var fill = function (template: string, extra?: Record<string, unknown>): string {
        return fillAll(template, Object.assign({ noun: named, min: rules.min, max: rules.max, step: rules.step, minLength: rules.minLength, maxLength: rules.maxLength, kind: type }, extra || {}));
    };
    // A browser keeps text it cannot read as a number, date, or time out of value, so it looks empty but is not.
    var unreadable = !!(input && (input as HTMLInputElement).validity && (input as HTMLInputElement).validity.badInput);

    if (text.trim() === '' && !unreadable) {
        if (rules.required) {
            if (tag === 'SELECT') problem = m.select;
            else if (input && (input.getAttribute('type') || '') === 'checkbox') problem = m.check;
            else problem = named ? fill(m.requiredNoun) : m.required;
        }
    } else if (unreadable) {
        problem = type === 'date' || type === 'time' ? m[type] : m.number;
    } else if (type === 'number') {
        var n = num(text.trim());
        var low = num(rules.min);
        var high = num(rules.max);
        var step = rules.step === 'any' ? null : num(rules.step);
        if (n === null || !/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(text.trim())) problem = m.number;
        else if ((low !== null && n < low) || (high !== null && n > high)) {
            if (low !== null && high !== null) problem = fill(named ? m.rangeNoun : m.range);
            else if (low !== null) problem = fill(named ? m.minNoun : m.min);
            else problem = fill(named ? m.maxNoun : m.max);
        } else if (step !== null && step > 0) {
            var steps = (n - (low !== null ? low : 0)) / step;
            if (Math.abs(steps - Math.round(steps)) > 1e-9) problem = step === 1 && (low === null || low % 1 === 0) ? m.whole : fill(m.step);
        }
    } else if (type === 'url' && !URL_TEXT.test(text.trim())) {
        problem = m.url;
    } else if (type === 'email' && !EMAIL_TEXT.test(text.trim())) {
        problem = m.email;
    } else if (type === 'time' || type === 'date') {
        var good = type === 'time' ? TIME_TEXT.test(text) : realDate(text);
        var first = rules.min ? String(rules.min) : '';
        var last = rules.max ? String(rules.max) : '';
        if (!good) problem = m[type];
        else if ((first && text < first) || (last && text > last)) {
            if (first && last) problem = fill(m.between);
            else if (first) problem = fill(m.earliest);
            else problem = fill(m.latest);
        }
    }
    if (!problem && text !== '') {
        var shortest = num(rules.minLength);
        var longest = num(rules.maxLength);
        if (shortest !== null && text.length < shortest) problem = fill(m.minLength);
        else if (longest !== null && text.length > longest) problem = fill(m.maxLength);
        else if (rules.pattern) {
            var re: RegExp | null = null;
            try { re = rules.pattern instanceof RegExp ? rules.pattern : new RegExp('^(?:' + rules.pattern + ')$'); } catch (e) { re = null; }
            if (re && !re.test(text)) problem = m.pattern;
        }
    }
    if (!problem && options.validate) problem = toText(options.validate(text, input || (null as unknown as Element)));
    return problem;
}

// The value of a field as text: a checkbox reads as 'on' when checked, and a secret that is stored counts as filled.
function fieldValue(input: Element): string {
    var el = input as HTMLInputElement;
    var type = (input.getAttribute('type') || '').toLowerCase();
    if (type === 'checkbox' || type === 'radio') return el.checked ? 'on' : '';
    var value = toText(el.value);
    if (!value && el.dataset && el.dataset.baseSecretStored && !el.dataset.baseSecretCleared) return '•';
    return value;
}

/**
 * The binding of a field, or null when the core does not check it yet.
 *
 * @param input the field
 */
export function validationOf(input: Element): ValidationHandle | null {
    return byField.get(input) || null;
}

/**
 * Checks a field through the core. Rules come from its attributes, and options.rules adds to or replaces them. It checks
 * when the reader leaves the field after changing it, then on every change while its error shows. An error shows
 * through the Field Message under the field, with a red border, aria-invalid, and aria-describedby.
 * Binding a field again replaces its earlier binding.
 *
 * @param input the field
 * @param options {
 *   rules    : rules that add to or replace the attributes', such as { step: 'any' } [optional]
 *   messages : sentences that replace the defaults by key, such as { range: 'Pick a port from {min} to {max}.' } [optional]
 *   noun     : the name of the value in a message, such as 'port', or true to read the field's label (default its data-base-label) [optional]
 *   message  : the Field Message to show through (default one made under the field) [optional]
 *   inputs   : more fields that share the message and are checked together, such as the boxes of a duration [optional]
 *   value    : function() returning the text to check (default the field's value) [optional]
 *   validate : function(value, input) returning an error sentence, or an empty value when valid [optional]
 * }
 * @returns { input, check, isValid, show, clear, destroy }. check shows the result and returns whether the field is valid.
 */
export function bindValidation(input: Element, options?: ValidationOptions | null): ValidationHandle {
    options = options || {};
    var old = validationOf(input);
    if (old && old.input === input) old.destroy();
    var opts = options;
    var cleanups: Array<() => void> = [];
    var fields: Element[] = [input].concat((opts.inputs || []).filter(function (f) { return f && f !== input; }));
    var touched = false;
    var showing = false;
    var own: FieldMessageHandle | null = opts.message || null;

    function rules(): ValidationRules { return Object.assign(readRules(input), opts.rules || {}); }

    function current(): string { return opts.value ? toText(opts.value()) : fieldValue(input); }

    function problem(): string {
        if ((input as HTMLInputElement).disabled) return '';
        return validateValue(current(), rules(), opts, input);
    }

    // The fields beside the main one share its red border, since one message speaks for all of them.
    function markOthers(on: boolean, id: string): void {
        fields.slice(1).forEach(function (f) {
            if (on) {
                f.setAttribute('aria-invalid', 'true');
                if ((' ' + (f.getAttribute('aria-describedby') || '') + ' ').indexOf(' ' + id + ' ') === -1) f.setAttribute('aria-describedby', ((f.getAttribute('aria-describedby') || '') + ' ' + id).trim());
            } else {
                f.removeAttribute('aria-invalid');
                var left = (f.getAttribute('aria-describedby') || '').split(/\s+/).filter(function (t) { return t && t !== id; }).join(' ');
                if (left) f.setAttribute('aria-describedby', left);
                else f.removeAttribute('aria-describedby');
            }
        });
    }

    function show(text: string): void {
        showing = !!text;
        var handle: FieldMessageHandle | null;
        if (own) {
            own.set(text ? 'error' : '', text);
            handle = own;
        } else if (text) {
            handle = setFieldState(input, 'error', text);
        } else {
            handle = fieldMessageOf(input);
            if (handle) handle.clear();
        }
        if (handle) {
            if (!own && text) placeMessage(input, handle.element);
            markOthers(!!text, handle.element.id);
        }
    }

    function check(): boolean {
        touched = true;
        var text = problem();
        show(text);
        return !text;
    }

    fields.forEach(function (f) {
        cleanups.push(listen(f, 'input', function () { touched = true; if (showing) check(); }));
        cleanups.push(listen(f, 'change', function () { touched = true; if (showing) check(); }));
        cleanups.push(listen(f, 'blur', function (e: FocusEvent) {
            // Moving between the fields of one value waits until the reader leaves them all.
            if (e && e.relatedTarget && fields.indexOf(e.relatedTarget as Element) !== -1) return;
            if (touched || showing) check();
        }));
    });

    var handle: ValidationHandle = {
        input: input,
        check: check,
        isValid: function () { return !problem(); },
        show: function (text: string) { touched = true; show(toText(text)); },
        clear: function () { show(''); },
        destroy: function () {
            runAll(cleanups);
            if (showing) show('');
            fields.forEach(function (f) { if (byField.get(f) === handle) byField.delete(f); });
        }
    };
    // Every field of the value maps to this binding, so an automatic scan never binds one of them on its own.
    fields.forEach(function (f) { byField.set(f, handle); });
    return handle;
}

/**
 * Checks every field under root: each bound one, and each field with a rule in its attributes, which it binds. It shows
 * every message, moves focus to the first invalid field, and returns whether all of them are valid. Disabled fields are skipped.
 *
 * @param root the form, dialog, or page to check
 * @returns true when every field is valid
 */
export function validateAll(root: ParentNode): boolean {
    var first: HTMLElement | null = null;
    var ok = true;
    root.querySelectorAll<HTMLElement>('input, select, textarea').forEach(function (field) {
        if ((field as HTMLInputElement).disabled) return;
        var binding = validationOf(field);
        if (!binding && !hasRules(field)) return;
        if (!binding) binding = bindValidation(field);
        if (!binding.check()) {
            ok = false;
            if (!first) first = field;
        }
    });
    if (first) (first as HTMLElement).focus();
    return ok;
}

/**
 * Binds the core on every field under root that carries a rule in its attributes and has no binding yet.
 * bindFieldAdornments, and so createConfigPage, run it.
 * Internal to the web components.
 *
 * @param root the page or element to search within
 * @returns the bindings it made
 */
export function bindRuledFields(root: ParentNode): ValidationHandle[] {
    var made: ValidationHandle[] = [];
    root.querySelectorAll<HTMLElement>('input, select, textarea').forEach(function (field) {
        if (validationOf(field) || !hasRules(field)) return;
        made.push(bindValidation(field));
    });
    return made;
}
